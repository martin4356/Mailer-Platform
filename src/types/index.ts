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
  rateLimitPerMin: number;
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

export interface WorkerStatus {
  isRunning: boolean;
  uptimeSeconds: number;
  queueTotal: number;
  queuePending: number;
  queueProcessing: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
}

export interface DashboardStats {
  metrics: {
    totalContacts: number;
    activeContacts: number;
    unsubscribedContacts: number;
    bouncedContacts: number;
    suppressionCount: number;
    totalEmailsSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalFailed: number;
    pendingEmails: number;
    scheduledCampaigns: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  workerStatus: WorkerStatus;
  recentLogs: DeliveryLog[];
  activeCampaignsList: Campaign[];
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

export interface ImportPreviewData {
  fileName: string;
  totalRows: number;
  headers: string[];
  suggestedMapping: {
    email: string;
    name: string;
    company: string;
    city: string;
    phone: string;
    tags: string;
  };
  sampleRows: Record<string, any>[];
  stats: {
    total: number;
    valid: number;
    existingInDb: number;
    duplicatesInFile: number;
    invalidEmails: number;
  };
}
