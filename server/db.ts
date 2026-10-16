import fs from 'fs';
import path from 'path';

export interface Contact {
  id: string;
  email: string;
  name: string;
  company?: string;
  phone?: string;
  city?: string;
  tags: string[];
  status: 'active' | 'unsubscribed' | 'bounced';
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  filterTag?: string;
  contactCount: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  htmlContent: string;
  plainTextContent: string;
  targetType: 'all' | 'segment' | 'custom';
  targetSegmentId?: string;
  selectedContactIds?: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'cancelled';
  scheduledAt?: string;
  rateLimitPerMin: number; // e.g. 30/min
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  failedCount: number;
  unsubscribedCount: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueueItem {
  id: string;
  campaignId: string;
  campaignName: string;
  contactId: string;
  recipientEmail: string;
  recipientName: string;
  recipientCompany?: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'bounced' | 'suppressed';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  error?: string;
  createdAt: string;
}

export interface DeliveryLog {
  id: string;
  campaignId: string;
  campaignName: string;
  recipientEmail: string;
  recipientName: string;
  event: 
    | 'queued'
    | 'sending'
    | 'smtp_accepted'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'soft_bounce'
    | 'hard_bounce'
    | 'rejected'
    | 'unsubscribed'
    | 'spam_complaint';
  status: 'info' | 'success' | 'warning' | 'error';
  smtpCode?: number;
  smtpResponse?: string;
  messageId?: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: 'unsubscribed' | 'hard_bounce' | 'spam_complaint' | 'manual';
  sourceCampaignId?: string;
  notes?: string;
  createdAt: string;
}

export interface SmtpConfig {
  id: string;
  mode: 'simulator' | 'custom';
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  enableTracking: boolean;
  maxBatchSize: number;
  retryAttempts: number;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;
  domain: string;
  spfRecord?: string;
  dkimSelector?: string;
  dmarcPolicy?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  plainTextContent: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  entityType: string;
  entityId?: string;
  details: string;
  timestamp: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'superadmin' | 'manager' | 'viewer';
  createdAt: string;
}

export interface DatabaseSchema {
  contacts: Contact[];
  segments: Segment[];
  campaigns: Campaign[];
  queue: QueueItem[];
  logs: DeliveryLog[];
  suppression: SuppressionEntry[];
  smtpConfig: SmtpConfig;
  templates: EmailTemplate[];
  auditLogs: AuditLog[];
  users: AdminUser[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getDefaultDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  
  const initialContacts: Contact[] = [
    {
      id: 'cnt-1',
      email: 'sarah.jenkins@acmecorp.com',
      name: 'Sarah Jenkins',
      company: 'Acme Corp',
      phone: '+1 (555) 234-5678',
      city: 'San Francisco',
      tags: ['Enterprise', 'Tech', 'Newsletter'],
      status: 'active',
      source: 'csv_import_q4_leads.csv',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: now,
    },
    {
      id: 'cnt-2',
      email: 'david.chen@cloudscale.io',
      name: 'David Chen',
      company: 'CloudScale Technologies',
      phone: '+1 (555) 345-6789',
      city: 'Seattle',
      tags: ['SaaS', 'Founder', 'Product'],
      status: 'active',
      source: 'excel_import_saas_conf.xlsx',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: now,
    },
    {
      id: 'cnt-3',
      email: 'elena.rostova@fintechvanguard.eu',
      name: 'Elena Rostova',
      company: 'FinTech Vanguard',
      phone: '+44 20 7946 0912',
      city: 'London',
      tags: ['Finance', 'Enterprise', 'Newsletter'],
      status: 'active',
      source: 'csv_import_q4_leads.csv',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: now,
    },
    {
      id: 'cnt-4',
      email: 'marcus.vance@apexlogistics.com',
      name: 'Marcus Vance',
      company: 'Apex Logistics',
      phone: '+1 (555) 456-7890',
      city: 'Chicago',
      tags: ['Logistics', 'Operations'],
      status: 'active',
      source: 'excel_import_partners.xlsx',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: now,
    },
    {
      id: 'cnt-5',
      email: 'priya.sharma@innovatehub.in',
      name: 'Priya Sharma',
      company: 'InnovateHub India',
      phone: '+91 98765 43210',
      city: 'Bangalore',
      tags: ['Startups', 'Tech', 'Newsletter'],
      status: 'active',
      source: 'excel_import_partners.xlsx',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: now,
    },
    {
      id: 'cnt-6',
      email: 'alex.rivera@solardynamics.net',
      name: 'Alex Rivera',
      company: 'Solar Dynamics',
      phone: '+1 (555) 789-0123',
      city: 'Austin',
      tags: ['CleanTech', 'Newsletter'],
      status: 'active',
      source: 'csv_import_q4_leads.csv',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: now,
    },
    {
      id: 'cnt-7',
      email: 'inactive.user@olddomain-bounced.org',
      name: 'Old User',
      company: 'Old Domain LLC',
      tags: ['Bounced'],
      status: 'bounced',
      source: 'csv_import_q4_leads.csv',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      updatedAt: now,
    },
    {
      id: 'cnt-8',
      email: 'optout@privacy-first.com',
      name: 'Jordan Miller',
      company: 'Miller Analytics',
      tags: ['Unsubscribed'],
      status: 'unsubscribed',
      source: 'csv_import_q4_leads.csv',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: now,
    }
  ];

  const initialSegments: Segment[] = [
    {
      id: 'seg-1',
      name: 'Enterprise VIPs',
      description: 'High-value enterprise prospects and strategic enterprise accounts',
      filterTag: 'Enterprise',
      contactCount: 2,
      createdAt: now,
    },
    {
      id: 'seg-2',
      name: 'Weekly Newsletter Subscribers',
      description: 'Opted-in contacts receiving our weekly product updates and digest',
      filterTag: 'Newsletter',
      contactCount: 4,
      createdAt: now,
    },
    {
      id: 'seg-3',
      name: 'Tech & SaaS Leaders',
      description: 'CTOs, VP Engineering, and Product Leads in Cloud & Tech',
      filterTag: 'Tech',
      contactCount: 2,
      createdAt: now,
    }
  ];

  const initialTemplates: EmailTemplate[] = [
    {
      id: 'tmpl-product-update',
      name: 'Feature Release & Product Update',
      category: 'Product',
      subject: '✨ What’s new in AutoMail: Faster delivery, smart segmentation & more',
      previewText: 'Discover the latest speed boosts and enterprise controls available today.',
      htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">AutoMail Monthly Release</h1>
    <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 15px;">New powerful capabilities built for {{Company}}</p>
  </div>
  <div style="padding: 32px 30px; color: #1e293b; line-height: 1.6;">
    <p style="font-size: 16px; margin-top: 0;">Hi {{Name}},</p>
    <p style="font-size: 15px; color: #475569;">We have rolled out significant performance upgrades to streamline your email workflow. Here are the highlights tailored for your team at <strong>{{Company}}</strong>:</p>
    
    <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 6px; margin: 24px 0;">
      <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #1e293b;">🚀 High-Throughput Delivery Queue</h3>
      <p style="margin: 0; font-size: 14px; color: #64748b;">Schedule and deliver up to 50,000 personalized emails per hour with automated rate-throttling and instant bounce detection.</p>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #06b6d4; padding: 16px; border-radius: 6px; margin: 24px 0;">
      <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #1e293b;">📊 Live SMTP Event Inspector</h3>
      <p style="margin: 0; font-size: 14px; color: #64748b;">Inspect raw SMTP handshakes (250 OK, TLS ciphers, SPF & DKIM validation) in real time directly from your dashboard.</p>
    </div>

    <div style="text-align: center; margin: 36px 0 24px 0;">
      <a href="https://automail.io/dashboard" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">Explore New Features</a>
    </div>

    <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">Warm regards,<br><strong>The AutoMail Product Team</strong></p>
  </div>
  <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px 0;">You received this email because you are registered at {{Company}}.</p>
    <p style="margin: 0;"><a href="{{UnsubscribeLink}}" style="color: #64748b; text-decoration: underline;">Unsubscribe from this list</a> &bull; <a href="https://automail.io/privacy" style="color: #64748b; text-decoration: underline;">Privacy Policy</a></p>
  </div>
</div>`,
      plainTextContent: `Hi {{Name}},\n\nWe have rolled out significant performance upgrades to streamline your email workflow at {{Company}}.\n\nHighlights:\n- High-Throughput Delivery Queue\n- Live SMTP Event Inspector\n\nExplore new features: https://automail.io/dashboard\n\nTo unsubscribe: {{UnsubscribeLink}}`,
      createdAt: now,
    },
    {
      id: 'tmpl-welcome-onboard',
      name: 'Customer Onboarding & Welcome',
      category: 'Onboarding',
      subject: 'Welcome to the platform, {{Name}}! Let’s get started.',
      previewText: 'A personalized quick-start guide for {{Company}}.',
      htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  <div style="background: #0f172a; padding: 32px 24px; text-align: center;">
    <span style="display:inline-block; background: #38bdf8; color: #0f172a; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 12px;">Welcome Aboard</span>
    <h1 style="color: #f8fafc; margin: 0; font-size: 24px; font-weight: 700;">We are thrilled to partner with {{Company}}</h1>
  </div>
  <div style="padding: 28px 24px; color: #334155; line-height: 1.5;">
    <p>Dear {{Name}},</p>
    <p>Welcome to our network. Your account for <strong>{{Email}}</strong> is fully activated and ready for your first campaign launch.</p>
    <p>To ensure 99.9% inbox placement, check out our recommended setup steps:</p>
    <ol style="padding-left: 20px; color: #475569;">
      <li style="margin-bottom: 8px;">Upload your subscriber list via CSV or Excel</li>
      <li style="margin-bottom: 8px;">Verify SPF & DKIM DNS records</li>
      <li style="margin-bottom: 8px;">Create a personalized campaign with dynamic merge tags</li>
    </ol>
    <div style="margin: 28px 0; text-align: center;">
      <a href="https://automail.io/onboarding" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Launch First Campaign</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">Questions? Reply directly to this email to reach our dedicated technical onboarding specialist.</p>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0;">Sent to {{Email}} &bull; <a href="{{UnsubscribeLink}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
      plainTextContent: `Welcome {{Name}}!\n\nYour account for {{Email}} at {{Company}} is ready.\n\nStart now: https://automail.io/onboarding\n\nUnsubscribe: {{UnsubscribeLink}}`,
      createdAt: now,
    },
    {
      id: 'tmpl-webinar-invite',
      name: 'Executive Webinar & Event Invitation',
      category: 'Events',
      subject: 'Exclusive Invitation: High-Deliverability Masterclass for {{Company}}',
      previewText: 'Join industry experts this Thursday at 11 AM EST.',
      htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
  <div style="background: #1e1b4b; padding: 32px 24px; text-align: center; color: white;">
    <p style="color: #a5b4fc; text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin: 0 0 8px 0;">Live Masterclass &bull; Limited Capacity</p>
    <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Achieving 99.4% Inbox Placement in 2026</h2>
  </div>
  <div style="padding: 28px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
    <p>Hello {{Name}},</p>
    <p>With Gmail and Yahoo's stricter sender authentication mandates (strict DMARC, one-click unsubscribe, and spam rate thresholds below 0.1%), marketing teams at companies like <strong>{{Company}}</strong> must adopt modernized delivery architectures.</p>
    <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #3730a3;">🗓 Thursday, 11:00 AM EST (45 mins)</p>
      <p style="margin: 0; color: #4338ca; font-size: 14px;">Live Q&A with Senior Postmasters and SMTP Engineers</p>
    </div>
    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="https://automail.io/webinar/register" style="background: #4338ca; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 6px; font-weight: 600; display: inline-block;">Reserve Seat for {{Name}}</a>
    </div>
  </div>
  <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0;"><a href="{{UnsubscribeLink}}" style="color: #64748b;">Manage preferences or unsubscribe</a></p>
  </div>
</div>`,
      plainTextContent: `Hello {{Name}},\n\nJoin our exclusive masterclass on email deliverability for {{Company}}.\n\nThursday, 11:00 AM EST\nReserve seat: https://automail.io/webinar/register\n\nUnsubscribe: {{UnsubscribeLink}}`,
      createdAt: now,
    }
  ];

  const initialCampaigns: Campaign[] = [
    {
      id: 'cmp-101',
      name: 'Q4 Product Showcase & Innovation Digest',
      subject: '✨ What’s new in AutoMail: Faster delivery, smart segmentation & more',
      senderName: 'AutoMail Team',
      senderEmail: 'marketing@automail.io',
      replyTo: 'support@automail.io',
      htmlContent: initialTemplates[0].htmlContent,
      plainTextContent: initialTemplates[0].plainTextContent,
      targetType: 'all',
      status: 'completed',
      rateLimitPerMin: 60,
      totalRecipients: 6,
      sentCount: 6,
      deliveredCount: 5,
      openedCount: 4,
      clickedCount: 2,
      bouncedCount: 1,
      failedCount: 0,
      unsubscribedCount: 0,
      startedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      completedAt: new Date(Date.now() - 3600000 * 3.8).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: now,
    },
    {
      id: 'cmp-102',
      name: 'Enterprise VIP Strategy Invite',
      subject: 'Exclusive Invitation: High-Deliverability Masterclass for {{Company}}',
      senderName: 'David from AutoMail',
      senderEmail: 'david@automail.io',
      replyTo: 'david@automail.io',
      htmlContent: initialTemplates[2].htmlContent,
      plainTextContent: initialTemplates[2].plainTextContent,
      targetType: 'segment',
      targetSegmentId: 'seg-1',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 3600000 * 12).toISOString(),
      rateLimitPerMin: 30,
      totalRecipients: 2,
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      failedCount: 0,
      unsubscribedCount: 0,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: now,
    }
  ];

  const initialLogs: DeliveryLog[] = [
    {
      id: 'log-1',
      campaignId: 'cmp-101',
      campaignName: 'Q4 Product Showcase & Innovation Digest',
      recipientEmail: 'sarah.jenkins@acmecorp.com',
      recipientName: 'Sarah Jenkins',
      event: 'clicked',
      status: 'success',
      smtpCode: 250,
      smtpResponse: '250 2.0.0 OK 1749281928 s10si8492021plf.123 - gsmtp',
      messageId: '<c8201a@automail.io>',
      details: 'Clicked CTA link "Explore New Features" [200 OK]',
      ipAddress: '198.51.100.42',
      timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    },
    {
      id: 'log-2',
      campaignId: 'cmp-101',
      campaignName: 'Q4 Product Showcase & Innovation Digest',
      recipientEmail: 'sarah.jenkins@acmecorp.com',
      recipientName: 'Sarah Jenkins',
      event: 'opened',
      status: 'success',
      smtpCode: 250,
      messageId: '<c8201a@automail.io>',
      details: 'Tracking pixel loaded via Apple Mail client (Mozilla/5.0)',
      ipAddress: '198.51.100.42',
      timestamp: new Date(Date.now() - 3600000 * 3.6).toISOString(),
    },
    {
      id: 'log-3',
      campaignId: 'cmp-101',
      campaignName: 'Q4 Product Showcase & Innovation Digest',
      recipientEmail: 'david.chen@cloudscale.io',
      recipientName: 'David Chen',
      event: 'opened',
      status: 'success',
      smtpCode: 250,
      messageId: '<c8201b@automail.io>',
      details: 'Tracking pixel loaded via Chrome / Gmail Web',
      ipAddress: '198.51.100.99',
      timestamp: new Date(Date.now() - 3600000 * 3.4).toISOString(),
    },
    {
      id: 'log-4',
      campaignId: 'cmp-101',
      campaignName: 'Q4 Product Showcase & Innovation Digest',
      recipientEmail: 'inactive.user@olddomain-bounced.org',
      recipientName: 'Old User',
      event: 'hard_bounce',
      status: 'error',
      smtpCode: 550,
      smtpResponse: '550 5.1.1 <inactive.user@olddomain-bounced.org>: Recipient address rejected: User unknown in virtual mailbox table',
      messageId: '<c8201g@automail.io>',
      details: 'Permanent mailbox error. Address automatically placed on suppression list.',
      ipAddress: '203.0.113.12',
      timestamp: new Date(Date.now() - 3600000 * 3.7).toISOString(),
    },
    {
      id: 'log-5',
      campaignId: 'cmp-101',
      campaignName: 'Q4 Product Showcase & Innovation Digest',
      recipientEmail: 'elena.rostova@fintechvanguard.eu',
      recipientName: 'Elena Rostova',
      event: 'delivered',
      status: 'success',
      smtpCode: 250,
      smtpResponse: '250 2.0.0 Message accepted for delivery by mx1.fintechvanguard.eu',
      messageId: '<c8201c@automail.io>',
      details: 'TLS 1.3 encrypted handshake with remote MTA',
      ipAddress: '198.51.100.15',
      timestamp: new Date(Date.now() - 3600000 * 3.75).toISOString(),
    },
    {
      id: 'log-6',
      campaignId: 'cmp-101',
      campaignName: 'Q4 Product Showcase & Innovation Digest',
      recipientEmail: 'priya.sharma@innovatehub.in',
      recipientName: 'Priya Sharma',
      event: 'smtp_accepted',
      status: 'success',
      smtpCode: 250,
      smtpResponse: '250 2.1.5 Recipient priya.sharma@innovatehub.in OK',
      messageId: '<c8201e@automail.io>',
      details: 'Accepted by mail.innovatehub.in',
      ipAddress: '198.51.100.18',
      timestamp: new Date(Date.now() - 3600000 * 3.78).toISOString(),
    }
  ];

  const initialSuppression: SuppressionEntry[] = [
    {
      id: 'sup-1',
      email: 'inactive.user@olddomain-bounced.org',
      reason: 'hard_bounce',
      sourceCampaignId: 'cmp-101',
      notes: '550 5.1.1 User unknown',
      createdAt: new Date(Date.now() - 3600000 * 3.7).toISOString(),
    },
    {
      id: 'sup-2',
      email: 'optout@privacy-first.com',
      reason: 'unsubscribed',
      notes: 'Direct 1-click unsubscribe header click',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    }
  ];

  const initialSmtp: SmtpConfig = {
    id: 'smtp-primary',
    mode: 'simulator', // Simulator provides instantaneous local MTA behavior with realistic SMTP status codes & SPF/DKIM verification!
    host: 'smtp.automail.local',
    port: 587,
    secure: false,
    user: 'automail-relay',
    pass: '••••••••••••',
    fromName: 'AutoMail Notifications',
    fromEmail: 'marketing@automail.io',
    replyTo: 'support@automail.io',
    enableTracking: true,
    maxBatchSize: 50,
    retryAttempts: 3,
    lastTestedAt: now,
    lastTestStatus: 'success',
    lastTestMessage: 'Simulated MTA ready. Handshake latency: 12ms. TLS 1.3 cipher: TLS_AES_256_GCM_SHA384.',
    domain: 'automail.io',
    spfRecord: 'v=spf1 include:_spf.automail.io ~all',
    dkimSelector: 'mail._domainkey.automail.io',
    dmarcPolicy: 'v=DMARC1; p=reject; rua=mailto:dmarc-reports@automail.io; pct=100',
  };

  const initialAudit: AuditLog[] = [
    {
      id: 'aud-1',
      action: 'SYSTEM_BOOT',
      user: 'system',
      entityType: 'server',
      details: 'Email Marketing Engine initialized with SQLite/JSON persistence and background queue daemon.',
      timestamp: now,
    },
    {
      id: 'aud-2',
      action: 'IMPORT_CONTACTS',
      user: 'admin@automail.io',
      entityType: 'contacts',
      entityId: 'csv_import_q4_leads.csv',
      details: 'Imported 6 contacts with auto-detected mapping for Name, Email, Company, City.',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    }
  ];

  const initialUsers: AdminUser[] = [
    {
      id: 'usr-admin-1',
      username: 'admin',
      email: 'admin@automail.io',
      // bcrypt hash for 'admin123'
      passwordHash: '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR0JvIeJ7m10O8z3N4i3z5y4P6Pee', 
      role: 'superadmin',
      createdAt: now,
    }
  ];

  return {
    contacts: initialContacts,
    segments: initialSegments,
    campaigns: initialCampaigns,
    queue: [],
    logs: initialLogs,
    suppression: initialSuppression,
    smtpConfig: initialSmtp,
    templates: initialTemplates,
    auditLogs: initialAudit,
    users: initialUsers,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all top-level keys exist in case of schema migrations
        const def = getDefaultDatabase();
        return {
          contacts: parsed.contacts || def.contacts,
          segments: parsed.segments || def.segments,
          campaigns: parsed.campaigns || def.campaigns,
          queue: parsed.queue || def.queue,
          logs: parsed.logs || def.logs,
          suppression: parsed.suppression || def.suppression,
          smtpConfig: parsed.smtpConfig || def.smtpConfig,
          templates: parsed.templates || def.templates,
          auditLogs: parsed.auditLogs || def.auditLogs,
          users: parsed.users || def.users,
        };
      }
    } catch (err) {
      console.error('Failed to load database from file, falling back to defaults:', err);
    }
    const def = getDefaultDatabase();
    this.persist(def);
    return def;
  }

  private persist(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }

  public save() {
    this.persist(this.data);
  }

  public get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    return this.data[key];
  }

  public set<K extends keyof DatabaseSchema>(key: K, value: DatabaseSchema[K]) {
    this.data[key] = value;
    this.save();
  }

  public raw(): DatabaseSchema {
    return this.data;
  }

  // Helper audit log recorder
  public recordAudit(action: string, user: string, entityType: string, details: string, entityId?: string) {
    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      user,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.save();
  }

  // Helper delivery log recorder
  public recordLog(log: Omit<DeliveryLog, 'id' | 'timestamp'> & { timestamp?: string }) {
    const entry: DeliveryLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: log.timestamp || new Date().toISOString(),
      ...log,
    };
    this.data.logs.unshift(entry);
    if (this.data.logs.length > 2000) {
      this.data.logs.pop(); // keep latest 2000 logs
    }
    this.save();
    return entry;
  }
}

export const db = new Database();
