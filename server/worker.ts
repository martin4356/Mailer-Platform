import { db, Campaign, QueueItem, DeliveryLog, Contact, SuppressionEntry } from './db.ts';
import { sendEmailMessage } from './mailer.ts';

let workerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;
const workerStartTime = Date.now();

export function getAppUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

export function enqueueCampaign(campaignId: string): { success: boolean; message: string; count: number } {
  const campaigns = db.get('campaigns');
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) {
    return { success: false, message: 'Campaign not found', count: 0 };
  }

  const contacts = db.get('contacts');
  const suppression = db.get('suppression');
  const suppressedEmails = new Set(suppression.map((s) => s.email.toLowerCase()));

  // Determine target contacts
  let targetContacts: Contact[] = [];
  if (campaign.targetType === 'all') {
    targetContacts = contacts.filter((c) => c.status === 'active');
  } else if (campaign.targetType === 'segment') {
    const segments = db.get('segments');
    const segment = segments.find((s) => s.id === campaign.targetSegmentId);
    if (segment && segment.filterTag) {
      targetContacts = contacts.filter(
        (c) => c.status === 'active' && c.tags.includes(segment.filterTag!)
      );
    } else {
      targetContacts = contacts.filter((c) => c.status === 'active');
    }
  } else if (campaign.targetType === 'custom' && campaign.selectedContactIds) {
    const idSet = new Set(campaign.selectedContactIds);
    targetContacts = contacts.filter((c) => idSet.has(c.id));
  }

  // Filter out suppressed emails and ensure uniqueness
  const queue = db.get('queue');
  const existingQueuedEmails = new Set(
    queue.filter((q) => q.campaignId === campaignId).map((q) => q.recipientEmail.toLowerCase())
  );

  const newQueueItems: QueueItem[] = [];
  let suppressedCount = 0;

  for (const contact of targetContacts) {
    const emailLower = contact.email.toLowerCase();

    // Check suppression list
    if (suppressedEmails.has(emailLower) || contact.status === 'unsubscribed' || contact.status === 'bounced') {
      suppressedCount++;
      db.recordLog({
        campaignId: campaign.id,
        campaignName: campaign.name,
        recipientEmail: contact.email,
        recipientName: contact.name,
        event: 'rejected',
        status: 'warning',
        details: 'Recipient excluded: Address present on global suppression list or inactive.',
      });
      continue;
    }

    // Check duplicate sending protection
    if (existingQueuedEmails.has(emailLower)) {
      continue;
    }

    newQueueItems.push({
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      campaignId: campaign.id,
      campaignName: campaign.name,
      contactId: contact.id,
      recipientEmail: contact.email,
      recipientName: contact.name,
      recipientCompany: contact.company,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    });

    db.recordLog({
      campaignId: campaign.id,
      campaignName: campaign.name,
      recipientEmail: contact.email,
      recipientName: contact.name,
      event: 'queued',
      status: 'info',
      details: 'Added to background outbound delivery queue.',
    });
  }

  // Update campaign
  campaign.status = 'sending';
  campaign.startedAt = campaign.startedAt || new Date().toISOString();
  campaign.totalRecipients = newQueueItems.length;
  campaign.updatedAt = new Date().toISOString();

  queue.push(...newQueueItems);
  db.set('queue', queue);
  db.set('campaigns', campaigns);

  db.recordAudit(
    'ENQUEUE_CAMPAIGN',
    'system',
    'campaign',
    `Campaign "${campaign.name}" queued ${newQueueItems.length} recipients (${suppressedCount} suppressed).`,
    campaign.id
  );

  return {
    success: true,
    message: `Enqueued ${newQueueItems.length} recipients for delivery.`,
    count: newQueueItems.length,
  };
}

async function processQueueTick() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date();
    const campaigns = db.get('campaigns');

    // 1. Check for scheduled campaigns that need to be started
    for (const cmp of campaigns) {
      if (cmp.status === 'scheduled' && cmp.scheduledAt) {
        const scheduledTime = new Date(cmp.scheduledAt);
        if (scheduledTime <= now) {
          console.log(`Starting scheduled campaign: ${cmp.name} (${cmp.id})`);
          enqueueCampaign(cmp.id);
        }
      }
    }

    // 2. Fetch pending queue items
    const queue = db.get('queue');
    const pendingItems = queue.filter(
      (item) =>
        item.status === 'pending' ||
        (item.status === 'processing' && item.lastAttemptAt && Date.now() - new Date(item.lastAttemptAt).getTime() > 60000) ||
        (item.status === 'failed' && item.attempts < item.maxAttempts && item.nextAttemptAt && new Date(item.nextAttemptAt) <= now)
    );

    if (pendingItems.length === 0) {
      // Check if any 'sending' campaigns are done
      for (const cmp of campaigns) {
        if (cmp.status === 'sending') {
          const campaignItems = queue.filter((q) => q.campaignId === cmp.id);
          const hasIncomplete = campaignItems.some((q) => q.status === 'pending' || q.status === 'processing');
          if (!hasIncomplete && campaignItems.length > 0) {
            cmp.status = 'completed';
            cmp.completedAt = new Date().toISOString();
            cmp.updatedAt = new Date().toISOString();
            db.set('campaigns', campaigns);
            db.recordAudit('CAMPAIGN_COMPLETED', 'worker', 'campaign', `Campaign "${cmp.name}" completed delivery.`, cmp.id);
          }
        }
      }
      return;
    }

    // Process a batch (up to 5 emails per tick to respect throttling and smooth out logs)
    const batch = pendingItems.slice(0, 5);
    const appUrl = getAppUrl();

    for (const item of batch) {
      const cmp = campaigns.find((c) => c.id === item.campaignId);
      if (!cmp || cmp.status === 'paused' || cmp.status === 'cancelled') {
        continue;
      }

      item.status = 'processing';
      item.attempts += 1;
      item.lastAttemptAt = new Date().toISOString();
      db.set('queue', queue);

      db.recordLog({
        campaignId: cmp.id,
        campaignName: cmp.name,
        recipientEmail: item.recipientEmail,
        recipientName: item.recipientName,
        event: 'sending',
        status: 'info',
        details: `Connecting to mail server for ${item.recipientEmail}... (attempt ${item.attempts}/${item.maxAttempts})`,
      });

      // Send the email
      const result = await sendEmailMessage({
        to: item.recipientEmail,
        toName: item.recipientName,
        toCompany: item.recipientCompany,
        subject: cmp.subject,
        htmlContent: cmp.htmlContent,
        plainTextContent: cmp.plainTextContent,
        senderName: cmp.senderName,
        senderEmail: cmp.senderEmail,
        replyTo: cmp.replyTo,
        campaignId: cmp.id,
        appUrl,
      });

      cmp.sentCount += 1;

      if (result.success) {
        item.status = 'sent';
        cmp.deliveredCount += 1;

        db.recordLog({
          campaignId: cmp.id,
          campaignName: cmp.name,
          recipientEmail: item.recipientEmail,
          recipientName: item.recipientName,
          event: 'delivered',
          status: 'success',
          smtpCode: result.smtpCode,
          smtpResponse: result.smtpResponse,
          messageId: result.messageId,
          details: result.details,
        });

        // In simulator mode, simulate realistic opens and clicks over the next few seconds
        const smtp = db.get('smtpConfig');
        if (smtp.mode === 'simulator') {
          scheduleSimulatedEngagement(cmp.id, item.recipientEmail, item.recipientName);
        }
      } else {
        if (result.event === 'hard_bounce') {
          item.status = 'bounced';
          item.error = result.error;
          cmp.bouncedCount += 1;

          // Add to suppression list automatically
          const suppression = db.get('suppression');
          if (!suppression.some((s) => s.email.toLowerCase() === item.recipientEmail.toLowerCase())) {
            suppression.push({
              id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              email: item.recipientEmail,
              reason: 'hard_bounce',
              sourceCampaignId: cmp.id,
              notes: result.smtpResponse,
              createdAt: new Date().toISOString(),
            });
            db.set('suppression', suppression);
          }

          // Mark contact as bounced in directory
          const contacts = db.get('contacts');
          const contact = contacts.find((c) => c.id === item.contactId);
          if (contact) {
            contact.status = 'bounced';
            db.set('contacts', contacts);
          }

          db.recordLog({
            campaignId: cmp.id,
            campaignName: cmp.name,
            recipientEmail: item.recipientEmail,
            recipientName: item.recipientName,
            event: 'hard_bounce',
            status: 'error',
            smtpCode: result.smtpCode,
            smtpResponse: result.smtpResponse,
            messageId: result.messageId,
            details: `Hard bounce: ${result.details}. Address placed on suppression list.`,
          });
        } else {
          // Soft bounce / temporary error
          if (item.attempts >= item.maxAttempts) {
            item.status = 'failed';
            item.error = result.error;
            cmp.failedCount += 1;

            db.recordLog({
              campaignId: cmp.id,
              campaignName: cmp.name,
              recipientEmail: item.recipientEmail,
              recipientName: item.recipientName,
              event: 'rejected',
              status: 'error',
              smtpCode: result.smtpCode,
              smtpResponse: result.smtpResponse,
              details: `Permanent delivery failure after ${item.attempts} attempts: ${result.error}`,
            });
          } else {
            item.status = 'failed';
            item.nextAttemptAt = new Date(Date.now() + 15000 * item.attempts).toISOString(); // exponential backoff
            db.recordLog({
              campaignId: cmp.id,
              campaignName: cmp.name,
              recipientEmail: item.recipientEmail,
              recipientName: item.recipientName,
              event: 'soft_bounce',
              status: 'warning',
              smtpCode: result.smtpCode,
              smtpResponse: result.smtpResponse,
              details: `Soft bounce: ${result.details}. Retrying in ${15 * item.attempts} seconds.`,
            });
          }
        }
      }

      cmp.updatedAt = new Date().toISOString();
      db.set('campaigns', campaigns);
      db.set('queue', queue);
    }
  } catch (err) {
    console.error('Error during queue worker tick:', err);
  } finally {
    isProcessing = false;
  }
}

// Stochastic engagement simulation for demo purposes
function scheduleSimulatedEngagement(campaignId: string, email: string, name: string) {
  // 75% chance recipient opens email within 3-8 seconds
  if (Math.random() < 0.75) {
    const openDelay = 2500 + Math.random() * 5000;
    setTimeout(() => {
      const campaigns = db.get('campaigns');
      const cmp = campaigns.find((c) => c.id === campaignId);
      if (cmp) {
        cmp.openedCount += 1;
        db.set('campaigns', campaigns);

        db.recordLog({
          campaignId: cmp.id,
          campaignName: cmp.name,
          recipientEmail: email,
          recipientName: name,
          event: 'opened',
          status: 'success',
          details: 'Subscriber opened email (tracking pixel loaded via Mail Client)',
          ipAddress: '198.51.100.' + Math.floor(Math.random() * 200 + 10),
        });

        // 40% chance opened email is also clicked
        if (Math.random() < 0.4) {
          const clickDelay = 1500 + Math.random() * 3000;
          setTimeout(() => {
            const currentCampaigns = db.get('campaigns');
            const c = currentCampaigns.find((item) => item.id === campaignId);
            if (c) {
              c.clickedCount += 1;
              db.set('campaigns', currentCampaigns);

              db.recordLog({
                campaignId: c.id,
                campaignName: c.name,
                recipientEmail: email,
                recipientName: name,
                event: 'clicked',
                status: 'success',
                details: 'Subscriber clicked link in email body [HTTP 302 Redirect]',
                ipAddress: '198.51.100.' + Math.floor(Math.random() * 200 + 10),
              });
            }
          }, clickDelay);
        }
      }
    }, openDelay);
  }
}

export function startWorker() {
  if (workerInterval) return;
  console.log('Starting Email Background Worker Daemon...');
  workerInterval = setInterval(processQueueTick, 1800);
}

export function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('Email Background Worker Daemon stopped.');
  }
}

export function getWorkerStatus() {
  const queue = db.get('queue');
  const campaigns = db.get('campaigns');
  return {
    isRunning: workerInterval !== null,
    uptimeSeconds: Math.floor((Date.now() - workerStartTime) / 1000),
    queueTotal: queue.length,
    queuePending: queue.filter((q) => q.status === 'pending').length,
    queueProcessing: queue.filter((q) => q.status === 'processing').length,
    activeCampaigns: campaigns.filter((c) => c.status === 'sending').length,
    scheduledCampaigns: campaigns.filter((c) => c.status === 'scheduled').length,
  };
}
