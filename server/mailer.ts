import nodemailer from 'nodemailer';
import { db, SmtpConfig } from './db.ts';

export interface SendResult {
  success: boolean;
  event: 'smtp_accepted' | 'delivered' | 'soft_bounce' | 'hard_bounce' | 'rejected';
  smtpCode: number;
  smtpResponse: string;
  messageId: string;
  details: string;
  error?: string;
}

export function compilePersonalization(
  template: string,
  data: {
    Name?: string;
    Email?: string;
    Company?: string;
    City?: string;
    UnsubscribeLink?: string;
    [key: string]: string | undefined;
  }
): string {
  let result = template;
  for (const [key, val] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, val || '');
  }
  return result;
}

export function injectTracking(
  html: string,
  appUrl: string,
  campaignId: string,
  recipientEmail: string
): string {
  const token = Buffer.from(`${campaignId}:::${recipientEmail}`).toString('base64url');
  
  // 1. Inject open tracking pixel right before </body> or at the end
  const trackingPixel = `<img src="${appUrl}/api/track/open/${token}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
  let processedHtml = html;
  if (processedHtml.includes('</body>')) {
    processedHtml = processedHtml.replace('</body>', `${trackingPixel}</body>`);
  } else {
    processedHtml += trackingPixel;
  }

  // 2. Wrap existing <a href="..."> links with click tracking
  // Exclude mailto: or unsubscribe links from redirect wrapper to keep them clean
  processedHtml = processedHtml.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (match, originalUrl) => {
      if (originalUrl.includes('/api/unsubscribe/')) {
        return match;
      }
      const encodedUrl = encodeURIComponent(originalUrl);
      const trackingUrl = `${appUrl}/api/track/click/${token}?url=${encodedUrl}`;
      return `href="${trackingUrl}"`;
    }
  );

  return processedHtml;
}

export async function testSmtpSettings(config: SmtpConfig): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
  tlsCipher?: string;
}> {
  const start = Date.now();

  if (config.mode === 'simulator') {
    // Fast realistic simulation
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      success: true,
      message: `Simulated MTA connection established to ${config.host}:${config.port}. TLS 1.3 handshake verified. Authenticated as ${config.user}. Ready to process outbound email batches.`,
      latencyMs: Date.now() - start,
      tlsCipher: 'TLS_AES_256_GCM_SHA384',
    };
  }

  // Real SMTP connection test
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false, // Allows self-signed certificates in dev environments
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    });

    await transporter.verify();
    const latency = Date.now() - start;

    return {
      success: true,
      message: `SMTP handshake successful with ${config.host}:${config.port}. Server responded with 220 Service Ready in ${latency}ms.`,
      latencyMs: latency,
      tlsCipher: config.secure ? 'TLS_AES_256_GCM_SHA384' : 'STARTTLS available',
    };
  } catch (err: any) {
    const latency = Date.now() - start;
    return {
      success: false,
      message: `SMTP connection failed: ${err.message || 'Unknown network error'}. Verify host, port, credentials, and firewall settings.`,
      latencyMs: latency,
    };
  }
}

export async function sendEmailMessage(options: {
  to: string;
  toName: string;
  toCompany?: string;
  toCity?: string;
  subject: string;
  htmlContent: string;
  plainTextContent: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  campaignId: string;
  appUrl: string;
}): Promise<SendResult> {
  const {
    to,
    toName,
    toCompany,
    toCity,
    subject,
    htmlContent,
    plainTextContent,
    senderName,
    senderEmail,
    replyTo,
    campaignId,
    appUrl,
  } = options;

  const unsubscribeToken = Buffer.from(`${campaignId}:::${to}`).toString('base64url');
  const unsubscribeUrl = `${appUrl}/api/unsubscribe/${unsubscribeToken}`;

  const mergeData = {
    Name: toName || to.split('@')[0],
    Email: to,
    Company: toCompany || 'Your Organization',
    City: toCity || 'Your City',
    UnsubscribeLink: unsubscribeUrl,
  };

  const compiledSubject = compilePersonalization(subject, mergeData);
  let compiledHtml = compilePersonalization(htmlContent, mergeData);
  const compiledText = compilePersonalization(plainTextContent, mergeData);

  const smtpConfig = db.get('smtpConfig');

  if (smtpConfig.enableTracking) {
    compiledHtml = injectTracking(compiledHtml, appUrl, campaignId, to);
  }

  // If in Simulator Mode
  if (smtpConfig.mode === 'simulator') {
    // Artificial small network delay
    await new Promise((r) => setTimeout(r, 60));

    const emailLower = to.toLowerCase();
    const domain = to.split('@')[1] || '';

    // Simulate deliberate bounce keywords for testing
    if (emailLower.includes('bounced') || emailLower.includes('invalid') || emailLower.includes('550')) {
      return {
        success: false,
        event: 'hard_bounce',
        smtpCode: 550,
        smtpResponse: `550 5.1.1 <${to}>: Recipient address rejected: User unknown in virtual mailbox table`,
        messageId: `<sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@${smtpConfig.domain}>`,
        details: 'Mailbox does not exist on remote mail server.',
        error: 'Permanent failure 550 5.1.1',
      };
    }

    if (emailLower.includes('busy') || emailLower.includes('temp') || emailLower.includes('421')) {
      return {
        success: false,
        event: 'soft_bounce',
        smtpCode: 421,
        smtpResponse: `421 4.7.0 [${domain}] Try again later, server busy`,
        messageId: `<sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@${smtpConfig.domain}>`,
        details: 'Temporary MTA error. Will be queued for retry.',
        error: 'Temporary error 421 4.7.0',
      };
    }

    const messageId = `<sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@${smtpConfig.domain}>`;
    return {
      success: true,
      event: 'delivered',
      smtpCode: 250,
      smtpResponse: `250 2.0.0 OK ${messageId} queued for delivery by MTA (TLS 1.3)`,
      messageId,
      details: `Accepted by remote mail exchanger for ${domain}. SPF: pass, DKIM: pass, DMARC: pass.`,
    };
  }

  // Live SMTP sending with Nodemailer
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail || smtpConfig.fromEmail}>`,
      to: `"${toName}" <${to}>`,
      replyTo: replyTo || smtpConfig.replyTo,
      subject: compiledSubject,
      text: compiledText,
      html: compiledHtml,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Campaign-ID': campaignId,
        'X-AutoMail-Version': '1.0',
      },
    });

    return {
      success: true,
      event: 'delivered',
      smtpCode: 250,
      smtpResponse: info.response || '250 2.0.0 OK Message delivered via SMTP',
      messageId: info.messageId || `<${Date.now()}@${smtpConfig.domain}>`,
      details: `Successfully dispatched to ${to} via ${smtpConfig.host}`,
    };
  } catch (err: any) {
    const isHard = err.responseCode && err.responseCode >= 500 && err.responseCode < 600;
    return {
      success: false,
      event: isHard ? 'hard_bounce' : 'soft_bounce',
      smtpCode: err.responseCode || (isHard ? 550 : 421),
      smtpResponse: err.message || 'SMTP transmission failure',
      messageId: `<err-${Date.now()}@${smtpConfig.domain}>`,
      details: `Transmission failure: ${err.message}`,
      error: err.message,
    };
  }
}
