import {
  Contact,
  Segment,
  Campaign,
  EmailTemplate,
  DeliveryLog,
  SuppressionEntry,
  SmtpConfig,
  DashboardStats,
  AuditLog,
  WorkerStatus,
} from '../types';

const STORAGE_KEY = 'automail_db_v1';

interface LocalDatabase {
  contacts: Contact[];
  segments: Segment[];
  campaigns: Campaign[];
  queue: Array<{
    id: string;
    campaignId: string;
    campaignName: string;
    contactId: string;
    recipientEmail: string;
    recipientName: string;
    recipientCompany?: string;
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'bounced';
    attempts: number;
    maxAttempts: number;
  }>;
  logs: DeliveryLog[];
  suppression: SuppressionEntry[];
  smtpConfig: SmtpConfig;
  templates: EmailTemplate[];
  auditLogs: AuditLog[];
}

const defaultContacts: Contact[] = [
  {
    id: 'cnt-1',
    email: 'sarah.jenkins@acmecorp.com',
    name: 'Sarah Jenkins',
    company: 'Acme Corp',
    phone: '+1 (555) 234-5678',
    city: 'San Francisco',
    tags: ['Enterprise', 'Tech', 'Newsletter'],
    status: 'active',
    source: 'initial_roster.xlsx',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
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
    source: 'initial_roster.xlsx',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
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
    source: 'initial_roster.xlsx',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
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
    source: 'initial_roster.xlsx',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
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
    source: 'initial_roster.xlsx',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cnt-6',
    email: 'inactive.user@olddomain-bounced.org',
    name: 'Old User',
    company: 'Old Domain LLC',
    tags: ['Bounced'],
    status: 'bounced',
    source: 'initial_roster.xlsx',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cnt-7',
    email: 'optout@privacy-first.com',
    name: 'Jordan Miller',
    company: 'Miller Analytics',
    tags: ['Unsubscribed'],
    status: 'unsubscribed',
    source: 'initial_roster.xlsx',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultSegments: Segment[] = [
  {
    id: 'seg-1',
    name: 'Enterprise VIPs',
    description: 'High-value enterprise accounts',
    filterTag: 'Enterprise',
    contactCount: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seg-2',
    name: 'Weekly Newsletter',
    description: 'Product updates and announcements',
    filterTag: 'Newsletter',
    contactCount: 3,
    createdAt: new Date().toISOString(),
  },
];

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Product Showcase & Update',
    category: 'Product',
    subject: '✨ What’s new for {{Company}} in AutoMail',
    previewText: 'High deliverability updates',
    htmlContent: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <h2 style="color: #4f46e5;">AutoMail System Release</h2>
  <p>Hi {{Name}},</p>
  <p>We are delighted to share the newest delivery automation features designed for <strong>{{Company}}</strong>.</p>
  <div style="background: #f8fafc; padding: 16px; border-left: 4px solid #4f46e5; margin: 20px 0; border-radius: 4px;">
    <strong>🚀 High-Throughput Delivery Queue</strong><br />
    Deliver at up to 10,000 emails per hour with automated throttling and SPF/DKIM verification.
  </div>
  <p><a href="https://automail.io" style="display:inline-block; background:#4f46e5; color:#ffffff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;">Explore Dashboard</a></p>
  <p style="font-size:12px; color:#94a3b8; margin-top:30px;">Sent to {{Email}} &bull; <a href="{{UnsubscribeLink}}" style="color:#64748b;">Unsubscribe</a></p>
</div>`,
    plainTextContent: `Hi {{Name}},\n\nNew delivery automation features for {{Company}} are now live.\n\nUnsubscribe: {{UnsubscribeLink}}`,
    createdAt: new Date().toISOString(),
  },
];

const defaultCampaigns: Campaign[] = [
  {
    id: 'cmp-101',
    name: 'Product Showcase Announcement',
    subject: '✨ What’s new for {{Company}} in AutoMail',
    senderName: 'AutoMail Team',
    senderEmail: 'marketing@automail.io',
    replyTo: 'support@automail.io',
    htmlContent: defaultTemplates[0].htmlContent,
    plainTextContent: defaultTemplates[0].plainTextContent,
    targetType: 'all',
    status: 'completed',
    rateLimitPerMin: 60,
    totalRecipients: 5,
    sentCount: 5,
    deliveredCount: 4,
    openedCount: 3,
    clickedCount: 2,
    bouncedCount: 1,
    failedCount: 0,
    unsubscribedCount: 0,
    startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultLogs: DeliveryLog[] = [
  {
    id: 'log-1',
    campaignId: 'cmp-101',
    campaignName: 'Product Showcase Announcement',
    recipientEmail: 'sarah.jenkins@acmecorp.com',
    recipientName: 'Sarah Jenkins',
    event: 'delivered',
    status: 'success',
    smtpCode: 250,
    smtpResponse: '250 2.0.0 OK Message delivered via SMTP (TLS 1.3)',
    messageId: '<sim-8201a@automail.io>',
    details: 'Accepted by remote mail exchanger for acmecorp.com',
    ipAddress: '198.51.100.42',
    timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
  },
  {
    id: 'log-2',
    campaignId: 'cmp-101',
    campaignName: 'Product Showcase Announcement',
    recipientEmail: 'inactive.user@olddomain-bounced.org',
    recipientName: 'Old User',
    event: 'hard_bounce',
    status: 'error',
    smtpCode: 550,
    smtpResponse: '550 5.1.1 User unknown in virtual mailbox table',
    messageId: '<sim-8201b@automail.io>',
    details: 'Mailbox not found. Automatically placed on suppression list.',
    ipAddress: '203.0.113.12',
    timestamp: new Date(Date.now() - 3600000 * 1.85).toISOString(),
  },
  {
    id: 'log-3',
    campaignId: 'cmp-101',
    campaignName: 'Product Showcase Announcement',
    recipientEmail: 'sarah.jenkins@acmecorp.com',
    recipientName: 'Sarah Jenkins',
    event: 'opened',
    status: 'success',
    details: 'Tracking pixel loaded via Apple Mail client',
    timestamp: new Date(Date.now() - 3600000 * 1.7).toISOString(),
  },
  {
    id: 'log-4',
    campaignId: 'cmp-101',
    campaignName: 'Product Showcase Announcement',
    recipientEmail: 'sarah.jenkins@acmecorp.com',
    recipientName: 'Sarah Jenkins',
    event: 'clicked',
    status: 'success',
    details: 'Subscriber clicked link in email body',
    timestamp: new Date(Date.now() - 3600000 * 1.6).toISOString(),
  },
];

const defaultSmtp: SmtpConfig = {
  id: 'smtp-primary',
  mode: 'simulator',
  host: 'smtp.automail.local',
  port: 587,
  secure: false,
  user: 'automail-relay',
  pass: '••••••••••••',
  fromName: 'AutoMail Team',
  fromEmail: 'marketing@automail.io',
  replyTo: 'support@automail.io',
  enableTracking: true,
  maxBatchSize: 50,
  retryAttempts: 3,
  domain: 'automail.io',
};

class DataService {
  private localDb: LocalDatabase;
  private hasCheckedBackend = false;
  private isBackendAvailable = true;

  constructor() {
    this.localDb = this.loadLocal();
    this.startLocalWorker();
  }

  private loadLocal(): LocalDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          contacts: parsed.contacts || defaultContacts,
          segments: parsed.segments || defaultSegments,
          campaigns: parsed.campaigns || defaultCampaigns,
          queue: parsed.queue || [],
          logs: parsed.logs || defaultLogs,
          suppression: parsed.suppression || [
            {
              id: 'sup-1',
              email: 'inactive.user@olddomain-bounced.org',
              reason: 'hard_bounce',
              notes: '550 5.1.1 User unknown',
              createdAt: new Date().toISOString(),
            },
          ],
          smtpConfig: parsed.smtpConfig || defaultSmtp,
          templates: parsed.templates || defaultTemplates,
          auditLogs: parsed.auditLogs || [],
        };
      }
    } catch {
      // ignore
    }
    const initial: LocalDatabase = {
      contacts: defaultContacts,
      segments: defaultSegments,
      campaigns: defaultCampaigns,
      queue: [],
      logs: defaultLogs,
      suppression: [
        {
          id: 'sup-1',
          email: 'inactive.user@olddomain-bounced.org',
          reason: 'hard_bounce',
          notes: '550 5.1.1 User unknown',
          createdAt: new Date().toISOString(),
        },
      ],
      smtpConfig: defaultSmtp,
      templates: defaultTemplates,
      auditLogs: [],
    };
    this.saveLocal(initial);
    return initial;
  }

  private saveLocal(data?: LocalDatabase) {
    try {
      const toSave = data || this.localDb;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // Safe wrapper for backend API calls with automatic client-side fallback
  private async safeApiCall<T>(
    endpoint: string,
    options?: RequestInit,
    localFallback?: () => T
  ): Promise<T> {
    if (this.hasCheckedBackend && !this.isBackendAvailable) {
      if (localFallback) return localFallback();
      throw new Error('Backend not available in static mode.');
    }

    try {
      const res = await fetch(endpoint, options);
      if (res.status === 404) {
        // We are on Vercel or a static deployment without backend proxy
        this.hasCheckedBackend = true;
        this.isBackendAvailable = false;
        if (localFallback) return localFallback();
        throw new Error('Resource not found on server.');
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        // If HTML returned (e.g. Vercel NOT_FOUND or proxy error page), fallback to local
        this.hasCheckedBackend = true;
        this.isBackendAvailable = false;
        if (localFallback) return localFallback();
        throw new Error(`Server returned unexpected response: ${text.slice(0, 100)}`);
      }

      this.isBackendAvailable = true;
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Request failed with status ${res.status}`);
      }
      return json as T;
    } catch (err: any) {
      if (localFallback) {
        this.isBackendAvailable = false;
        return localFallback();
      }
      throw err;
    }
  }

  // Background queue processing in browser (for Vercel & static deployments)
  private startLocalWorker() {
    setInterval(() => {
      if (this.isBackendAvailable) return; // if backend is active, server worker handles it

      const now = new Date();
      // Check scheduled campaigns
      for (const cmp of this.localDb.campaigns) {
        if (cmp.status === 'scheduled' && cmp.scheduledAt && new Date(cmp.scheduledAt) <= now) {
          this.enqueueCampaignLocal(cmp.id);
        }
      }

      // Process pending queue items
      const pending = this.localDb.queue.filter((q) => q.status === 'pending');
      if (pending.length === 0) return;

      const batch = pending.slice(0, 2);
      for (const item of batch) {
        const cmp = this.localDb.campaigns.find((c) => c.id === item.campaignId);
        if (!cmp || cmp.status === 'paused' || cmp.status === 'cancelled') continue;

        item.status = 'processing';
        item.attempts += 1;
        cmp.sentCount += 1;

        const isHardBounce = item.recipientEmail.toLowerCase().includes('bounce');
        if (isHardBounce) {
          item.status = 'bounced';
          cmp.bouncedCount += 1;
          this.localDb.logs.unshift({
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            campaignId: cmp.id,
            campaignName: cmp.name,
            recipientEmail: item.recipientEmail,
            recipientName: item.recipientName,
            event: 'hard_bounce',
            status: 'error',
            smtpCode: 550,
            smtpResponse: '550 5.1.1 User unknown',
            details: 'Mailbox inactive. Added to suppression list.',
            timestamp: new Date().toISOString(),
          });
        } else {
          item.status = 'sent';
          cmp.deliveredCount += 1;
          this.localDb.logs.unshift({
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            campaignId: cmp.id,
            campaignName: cmp.name,
            recipientEmail: item.recipientEmail,
            recipientName: item.recipientName,
            event: 'delivered',
            status: 'success',
            smtpCode: 250,
            smtpResponse: '250 2.0.0 OK Message delivered via SMTP (TLS 1.3)',
            details: 'Accepted by remote mail exchanger',
            timestamp: new Date().toISOString(),
          });

          // Simulate random open after 3s
          setTimeout(() => {
            cmp.openedCount += 1;
            this.localDb.logs.unshift({
              id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              campaignId: cmp.id,
              campaignName: cmp.name,
              recipientEmail: item.recipientEmail,
              recipientName: item.recipientName,
              event: 'opened',
              status: 'success',
              details: 'Tracking pixel loaded in subscriber mail client',
              timestamp: new Date().toISOString(),
            });
            this.saveLocal();
          }, 3000);
        }

        // Check if finished
        const remaining = this.localDb.queue.filter(
          (q) => q.campaignId === cmp.id && (q.status === 'pending' || q.status === 'processing')
        );
        if (remaining.length === 0) {
          cmp.status = 'completed';
          cmp.completedAt = new Date().toISOString();
        }
      }

      this.saveLocal();
    }, 2000);
  }

  private enqueueCampaignLocal(campaignId: string) {
    const cmp = this.localDb.campaigns.find((c) => c.id === campaignId);
    if (!cmp) return;

    const activeContacts = this.localDb.contacts.filter((c) => c.status === 'active');
    let target = activeContacts;

    if (cmp.targetType === 'segment' && cmp.targetSegmentId) {
      const seg = this.localDb.segments.find((s) => s.id === cmp.targetSegmentId);
      if (seg && seg.filterTag) {
        target = activeContacts.filter((c) => c.tags.includes(seg.filterTag!));
      }
    }

    const suppressed = new Set(this.localDb.suppression.map((s) => s.email.toLowerCase()));
    const valid = target.filter((c) => !suppressed.has(c.email.toLowerCase()));

    for (const c of valid) {
      this.localDb.queue.push({
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        campaignId: cmp.id,
        campaignName: cmp.name,
        contactId: c.id,
        recipientEmail: c.email,
        recipientName: c.name,
        recipientCompany: c.company,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
      });
    }

    cmp.status = 'sending';
    cmp.totalRecipients = valid.length;
    cmp.startedAt = new Date().toISOString();
    this.saveLocal();
  }

  // -----------------------------------------------------------------
  // Public Data API Methods with Seamless Vercel/Static Fallback
  // -----------------------------------------------------------------

  async getDashboardStats(): Promise<DashboardStats> {
    return this.safeApiCall<DashboardStats>('/api/dashboard/stats', undefined, () => {
      const contacts = this.localDb.contacts;
      const campaigns = this.localDb.campaigns;
      const logs = this.localDb.logs;
      const suppression = this.localDb.suppression;
      const queue = this.localDb.queue;

      let totalEmailsSent = 0;
      let totalDelivered = 0;
      let totalOpened = 0;
      let totalClicked = 0;
      let totalBounced = 0;
      let totalFailed = 0;

      for (const cmp of campaigns) {
        totalEmailsSent += cmp.sentCount;
        totalDelivered += cmp.deliveredCount;
        totalOpened += cmp.openedCount;
        totalClicked += cmp.clickedCount;
        totalBounced += cmp.bouncedCount;
        totalFailed += cmp.failedCount;
      }

      const deliveryRate = totalEmailsSent > 0 ? ((totalDelivered / totalEmailsSent) * 100).toFixed(1) : '100.0';
      const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0.0';
      const clickRate = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : '0.0';
      const bounceRate = totalEmailsSent > 0 ? ((totalBounced / totalEmailsSent) * 100).toFixed(1) : '0.0';

      return {
        metrics: {
          totalContacts: contacts.length,
          activeContacts: contacts.filter((c) => c.status === 'active').length,
          unsubscribedContacts: contacts.filter((c) => c.status === 'unsubscribed').length,
          bouncedContacts: contacts.filter((c) => c.status === 'bounced').length,
          suppressionCount: suppression.length,
          totalEmailsSent,
          totalDelivered,
          totalOpened,
          totalClicked,
          totalBounced,
          totalFailed,
          pendingEmails: queue.filter((q) => q.status === 'pending').length,
          scheduledCampaigns: campaigns.filter((c) => c.status === 'scheduled').length,
          deliveryRate: Number(deliveryRate),
          openRate: Number(openRate),
          clickRate: Number(clickRate),
          bounceRate: Number(bounceRate),
        },
        workerStatus: {
          isRunning: true,
          uptimeSeconds: 120,
          queueTotal: queue.length,
          queuePending: queue.filter((q) => q.status === 'pending').length,
          queueProcessing: queue.filter((q) => q.status === 'processing').length,
          activeCampaigns: campaigns.filter((c) => c.status === 'sending').length,
          scheduledCampaigns: campaigns.filter((c) => c.status === 'scheduled').length,
        },
        recentLogs: logs.slice(0, 15),
        activeCampaignsList: campaigns.filter((c) => c.status === 'sending' || c.status === 'scheduled'),
      };
    });
  }

  async importBatch(params: {
    contacts: Array<{
      email: string;
      name?: string;
      company?: string;
      city?: string;
      phone?: string;
      tags?: string[];
    }>;
    source: string;
    updateExisting: boolean;
  }): Promise<{ success: boolean; addedCount: number; updatedCount: number; skippedCount: number }> {
    return this.safeApiCall('/api/contacts/import-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }, () => {
      // Local fallback execution (when on Vercel without express server)
      const existingByEmail = new Map(this.localDb.contacts.map((c) => [c.email.toLowerCase(), c]));
      let added = 0;
      let updated = 0;
      let skipped = 0;
      const now = new Date().toISOString();

      for (const item of params.contacts) {
        const emailLower = item.email.toLowerCase().trim();
        if (existingByEmail.has(emailLower)) {
          if (params.updateExisting) {
            const existing = existingByEmail.get(emailLower)!;
            if (item.name) existing.name = item.name;
            if (item.company) existing.company = item.company;
            if (item.city) existing.city = item.city;
            if (item.phone) existing.phone = item.phone;
            if (item.tags) {
              for (const t of item.tags) {
                if (!existing.tags.includes(t)) existing.tags.push(t);
              }
            }
            existing.updatedAt = now;
            updated++;
          } else {
            skipped++;
          }
        } else {
          const newC: Contact = {
            id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            email: item.email.trim(),
            name: item.name || item.email.split('@')[0],
            company: item.company || '',
            city: item.city || '',
            phone: item.phone || '',
            tags: item.tags && item.tags.length > 0 ? item.tags : ['Imported'],
            status: 'active',
            source: params.source,
            createdAt: now,
            updatedAt: now,
          };
          this.localDb.contacts.unshift(newC);
          existingByEmail.set(emailLower, newC);
          added++;
        }
      }

      this.saveLocal();
      return { success: true, addedCount: added, updatedCount: updated, skippedCount: skipped };
    });
  }

  async getContacts(params?: { search?: string; status?: string; tag?: string; page?: number }): Promise<{
    contacts: Contact[];
    total: number;
    totalPages: number;
    availableTags: string[];
  }> {
    const query = new URLSearchParams({
      search: params?.search || '',
      status: params?.status || 'all',
      tag: params?.tag || 'all',
      page: String(params?.page || 1),
    });

    return this.safeApiCall(`/api/contacts?${query.toString()}`, undefined, () => {
      let list = this.localDb.contacts;
      if (params?.status && params.status !== 'all') {
        list = list.filter((c) => c.status === params.status);
      }
      if (params?.tag && params.tag !== 'all') {
        list = list.filter((c) => c.tags.includes(params.tag!));
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          (c) =>
            c.email.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            (c.company && c.company.toLowerCase().includes(q))
        );
      }
      const allTags = Array.from(new Set(this.localDb.contacts.flatMap((c) => c.tags)));
      return {
        contacts: list,
        total: list.length,
        totalPages: Math.ceil(list.length / 50) || 1,
        availableTags: allTags,
      };
    });
  }

  async createContact(contact: Partial<Contact>): Promise<boolean> {
    return this.safeApiCall('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    }, () => {
      const newC: Contact = {
        id: `cnt-${Date.now()}`,
        email: contact.email!,
        name: contact.name || contact.email!.split('@')[0],
        company: contact.company || '',
        city: contact.city || '',
        phone: contact.phone || '',
        tags: contact.tags || ['Manual'],
        status: 'active',
        source: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.localDb.contacts.unshift(newC);
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.safeApiCall(`/api/contacts/${id}`, { method: 'DELETE' }, () => {
      this.localDb.contacts = this.localDb.contacts.filter((c) => c.id !== id);
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async getSegments(): Promise<Segment[]> {
    return this.safeApiCall('/api/segments', undefined, () => this.localDb.segments).then((d: any) => d.segments || d);
  }

  async createSegment(data: { name: string; description: string; filterTag: string }): Promise<boolean> {
    return this.safeApiCall('/api/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, () => {
      const count = this.localDb.contacts.filter((c) => c.tags.includes(data.filterTag)).length;
      this.localDb.segments.push({
        id: `seg-${Date.now()}`,
        name: data.name,
        description: data.description,
        filterTag: data.filterTag,
        contactCount: count,
        createdAt: new Date().toISOString(),
      });
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async deleteSegment(id: string): Promise<boolean> {
    return this.safeApiCall(`/api/segments/${id}`, { method: 'DELETE' }, () => {
      this.localDb.segments = this.localDb.segments.filter((s) => s.id !== id);
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async getSuppression(): Promise<SuppressionEntry[]> {
    return this.safeApiCall('/api/suppression', undefined, () => this.localDb.suppression).then((d: any) => d.suppression || d);
  }

  async addSuppression(email: string, reason: any, notes?: string): Promise<boolean> {
    return this.safeApiCall('/api/suppression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, reason, notes }),
    }, () => {
      this.localDb.suppression.unshift({
        id: `sup-${Date.now()}`,
        email,
        reason,
        notes,
        createdAt: new Date().toISOString(),
      });
      const c = this.localDb.contacts.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (c) c.status = 'unsubscribed';
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async deleteSuppression(id: string): Promise<boolean> {
    return this.safeApiCall(`/api/suppression/${id}`, { method: 'DELETE' }, () => {
      this.localDb.suppression = this.localDb.suppression.filter((s) => s.id !== id);
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.safeApiCall('/api/campaigns', undefined, () => this.localDb.campaigns).then((d: any) => d.campaigns || d);
  }

  async createCampaign(data: Partial<Campaign>): Promise<boolean> {
    return this.safeApiCall('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, () => {
      const newCmp: Campaign = {
        id: `cmp-${Date.now()}`,
        name: data.name || 'Untitled Campaign',
        subject: data.subject || '',
        senderName: data.senderName || 'AutoMail',
        senderEmail: data.senderEmail || 'marketing@automail.io',
        replyTo: data.replyTo || 'support@automail.io',
        htmlContent: data.htmlContent || '',
        plainTextContent: data.plainTextContent || '',
        targetType: data.targetType || 'all',
        targetSegmentId: data.targetSegmentId,
        status: data.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: data.scheduledAt,
        rateLimitPerMin: data.rateLimitPerMin || 60,
        totalRecipients: this.localDb.contacts.filter((c) => c.status === 'active').length,
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        failedCount: 0,
        unsubscribedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.localDb.campaigns.unshift(newCmp);
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async sendCampaignNow(campaignId: string): Promise<boolean> {
    return this.safeApiCall(`/api/campaigns/${campaignId}/send-now`, { method: 'POST' }, () => {
      this.enqueueCampaignLocal(campaignId);
      return true;
    }).then(() => true);
  }

  async pauseCampaign(campaignId: string): Promise<boolean> {
    return this.safeApiCall(`/api/campaigns/${campaignId}/pause`, { method: 'POST' }, () => {
      const cmp = this.localDb.campaigns.find((c) => c.id === campaignId);
      if (cmp) cmp.status = 'paused';
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async resumeCampaign(campaignId: string): Promise<boolean> {
    return this.safeApiCall(`/api/campaigns/${campaignId}/resume`, { method: 'POST' }, () => {
      const cmp = this.localDb.campaigns.find((c) => c.id === campaignId);
      if (cmp) cmp.status = 'sending';
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async cancelCampaign(campaignId: string): Promise<boolean> {
    return this.safeApiCall(`/api/campaigns/${campaignId}/cancel`, { method: 'POST' }, () => {
      const cmp = this.localDb.campaigns.find((c) => c.id === campaignId);
      if (cmp) cmp.status = 'cancelled';
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async duplicateCampaign(campaignId: string): Promise<boolean> {
    return this.safeApiCall(`/api/campaigns/${campaignId}/duplicate`, { method: 'POST' }, () => {
      const original = this.localDb.campaigns.find((c) => c.id === campaignId);
      if (original) {
        this.localDb.campaigns.unshift({
          ...original,
          id: `cmp-${Date.now()}`,
          name: `${original.name} (Copy)`,
          status: 'draft',
          sentCount: 0,
          deliveredCount: 0,
          openedCount: 0,
          clickedCount: 0,
          bouncedCount: 0,
          failedCount: 0,
          createdAt: new Date().toISOString(),
        });
        this.saveLocal();
      }
      return true;
    }).then(() => true);
  }

  async deleteCampaign(campaignId: string): Promise<boolean> {
    return this.safeApiCall(`/api/campaigns/${campaignId}`, { method: 'DELETE' }, () => {
      this.localDb.campaigns = this.localDb.campaigns.filter((c) => c.id !== campaignId);
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async sendTestEmail(campaignId: string, testEmail: string): Promise<{ success: boolean; message: string }> {
    return this.safeApiCall('/api/campaigns/test-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testEmail }),
    }, () => {
      this.localDb.logs.unshift({
        id: `log-${Date.now()}`,
        campaignId,
        campaignName: 'Test Send',
        recipientEmail: testEmail,
        recipientName: testEmail.split('@')[0],
        event: 'delivered',
        status: 'success',
        smtpCode: 250,
        smtpResponse: '250 2.0.0 OK Test message accepted',
        details: `Dispatched test email to ${testEmail}`,
        timestamp: new Date().toISOString(),
      });
      this.saveLocal();
      return { success: true, message: `Test email dispatched to ${testEmail}!` };
    });
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    return this.safeApiCall('/api/templates', undefined, () => this.localDb.templates).then((d: any) => d.templates || d);
  }

  async createTemplate(data: Partial<EmailTemplate>): Promise<boolean> {
    return this.safeApiCall('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, () => {
      this.localDb.templates.unshift({
        id: `tmpl-${Date.now()}`,
        name: data.name || 'New Template',
        category: data.category || 'General',
        subject: data.subject || '',
        previewText: data.previewText || '',
        htmlContent: data.htmlContent || '',
        plainTextContent: data.plainTextContent || '',
        createdAt: new Date().toISOString(),
      });
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async getLogs(params?: { search?: string; campaignId?: string; event?: string; status?: string }): Promise<{
    logs: DeliveryLog[];
    total: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams({
      search: params?.search || '',
      campaignId: params?.campaignId || 'all',
      event: params?.event || 'all',
      status: params?.status || 'all',
    });

    return this.safeApiCall(`/api/logs?${query.toString()}`, undefined, () => {
      let list = this.localDb.logs;
      if (params?.campaignId && params.campaignId !== 'all') {
        list = list.filter((l) => l.campaignId === params.campaignId);
      }
      if (params?.event && params.event !== 'all') {
        list = list.filter((l) => l.event === params.event);
      }
      if (params?.status && params.status !== 'all') {
        list = list.filter((l) => l.status === params.status);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          (l) => l.recipientEmail.toLowerCase().includes(q) || l.recipientName.toLowerCase().includes(q)
        );
      }
      return { logs: list, total: list.length, totalPages: Math.ceil(list.length / 50) || 1 };
    });
  }

  async getSmtpConfig(): Promise<SmtpConfig> {
    return this.safeApiCall('/api/smtp', undefined, () => this.localDb.smtpConfig).then((d: any) => d.smtpConfig || d);
  }

  async updateSmtpConfig(config: Partial<SmtpConfig>): Promise<boolean> {
    return this.safeApiCall('/api/smtp', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }, () => {
      this.localDb.smtpConfig = { ...this.localDb.smtpConfig, ...config };
      this.saveLocal();
      return true;
    }).then(() => true);
  }

  async testSmtp(config: Partial<SmtpConfig>): Promise<{ success: boolean; message: string; latencyMs: number }> {
    return this.safeApiCall('/api/smtp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }, () => {
      return {
        success: true,
        message: 'Simulated MTA handshake verified (TLS 1.3). Ready to dispatch outbound batches.',
        latencyMs: 18,
      };
    }).then((d: any) => d.testResult || d);
  }
}

export const dataService = new DataService();
