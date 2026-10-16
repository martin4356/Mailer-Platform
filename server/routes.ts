import { Router, Request, Response } from 'express';
import * as xlsx from 'xlsx';
import { db, Contact, Campaign, Segment, SmtpConfig, SuppressionEntry } from './db.ts';
import { enqueueCampaign, getWorkerStatus, getAppUrl } from './worker.ts';
import { testSmtpSettings, sendEmailMessage } from './mailer.ts';
import { loginAdmin, validateSession, destroySession } from './auth.ts';

export const apiRouter = Router();

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  const result = loginAdmin(username, password);
  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  return res.json({ token: result.token, user: result.user });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    destroySession(token);
  }
  return res.json({ success: true });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const user = validateSession(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser });
});

// -------------------------------------------------------------
// Dashboard Analytics & Health
// -------------------------------------------------------------
apiRouter.get('/dashboard/stats', (req: Request, res: Response) => {
  const contacts = db.get('contacts');
  const campaigns = db.get('campaigns');
  const queue = db.get('queue');
  const logs = db.get('logs');
  const suppression = db.get('suppression');

  const totalContacts = contacts.length;
  const activeContacts = contacts.filter((c) => c.status === 'active').length;
  const unsubscribedContacts = contacts.filter((c) => c.status === 'unsubscribed').length;
  const bouncedContacts = contacts.filter((c) => c.status === 'bounced').length;

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

  const pendingEmails = queue.filter((q) => q.status === 'pending' || q.status === 'processing').length;
  const scheduledCampaigns = campaigns.filter((c) => c.status === 'scheduled').length;

  // Calculate rates
  const deliveryRate = totalEmailsSent > 0 ? ((totalDelivered / totalEmailsSent) * 100).toFixed(1) : '100.0';
  const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0.0';
  const clickRate = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : '0.0';
  const bounceRate = totalEmailsSent > 0 ? ((totalBounced / totalEmailsSent) * 100).toFixed(1) : '0.0';

  // Recent logs
  const recentLogs = logs.slice(0, 15);
  const workerStatus = getWorkerStatus();

  return res.json({
    metrics: {
      totalContacts,
      activeContacts,
      unsubscribedContacts,
      bouncedContacts,
      suppressionCount: suppression.length,
      totalEmailsSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      totalFailed,
      pendingEmails,
      scheduledCampaigns,
      deliveryRate: Number(deliveryRate),
      openRate: Number(openRate),
      clickRate: Number(clickRate),
      bounceRate: Number(bounceRate),
    },
    workerStatus,
    recentLogs,
    activeCampaignsList: campaigns.filter((c) => c.status === 'sending' || c.status === 'scheduled'),
  });
});

// -------------------------------------------------------------
// Excel & CSV Upload and Import Preview
// -------------------------------------------------------------
apiRouter.post('/contacts/import-preview', (req: Request, res: Response) => {
  try {
    const { fileBase64, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'No file data received.' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return res.status(400).json({ error: 'Spreadsheet has no sheets.' });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded spreadsheet contains no data rows.' });
    }

    const headers = Object.keys(rawRows[0]);

    // Smart Column Auto-Mapping
    const mapping: Record<string, string> = {
      email: '',
      name: '',
      company: '',
      city: '',
      phone: '',
      tags: '',
    };

    for (const h of headers) {
      const lower = h.toLowerCase().trim().replace(/[-_]/g, ' ');
      if (!mapping.email && (lower.includes('email') || lower.includes('e mail') || lower === 'mail')) {
        mapping.email = h;
      } else if (!mapping.name && (lower.includes('name') || lower === 'first name' || lower === 'full name' || lower === 'contact')) {
        mapping.name = h;
      } else if (!mapping.company && (lower.includes('company') || lower.includes('organization') || lower.includes('org') || lower.includes('business'))) {
        mapping.company = h;
      } else if (!mapping.city && (lower.includes('city') || lower.includes('location') || lower.includes('region'))) {
        mapping.city = h;
      } else if (!mapping.phone && (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell') || lower.includes('tel'))) {
        mapping.phone = h;
      } else if (!mapping.tags && (lower.includes('tag') || lower.includes('segment') || lower.includes('category'))) {
        mapping.tags = h;
      }
    }

    // Email validation regex (RFC 5322 compatible)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    const existingContacts = db.get('contacts');
    const existingEmails = new Set(existingContacts.map((c) => c.email.toLowerCase()));
    const seenInFile = new Set<string>();

    let validCount = 0;
    let invalidCount = 0;
    let duplicateInFileCount = 0;
    let duplicateInDbCount = 0;

    const sampleRows = rawRows.slice(0, 10);

    // Scan all rows to produce summary statistics
    for (const row of rawRows) {
      const emailVal = String(row[mapping.email] || '').trim();
      if (!emailVal || !emailRegex.test(emailVal)) {
        invalidCount++;
        continue;
      }

      const emailLower = emailVal.toLowerCase();
      if (seenInFile.has(emailLower)) {
        duplicateInFileCount++;
        continue;
      }
      seenInFile.add(emailLower);

      if (existingEmails.has(emailLower)) {
        duplicateInDbCount++;
      } else {
        validCount++;
      }
    }

    return res.json({
      fileName,
      totalRows: rawRows.length,
      headers,
      suggestedMapping: mapping,
      sampleRows,
      stats: {
        total: rawRows.length,
        valid: validCount,
        existingInDb: duplicateInDbCount,
        duplicatesInFile: duplicateInFileCount,
        invalidEmails: invalidCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
});

apiRouter.post('/contacts/import-batch', (req: Request, res: Response) => {
  try {
    const { contacts: incomingContacts, source = 'import', updateExisting = true } = req.body;
    if (!Array.isArray(incomingContacts)) {
      return res.status(400).json({ error: 'Expected contacts array' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const contacts = db.get('contacts');
    const existingByEmail = new Map<string, Contact>(contacts.map((c) => [c.email.toLowerCase(), c]));

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();

    for (const c of incomingContacts) {
      if (!c.email || typeof c.email !== 'string') {
        skippedCount++;
        continue;
      }
      const rawEmail = c.email.trim();
      if (!emailRegex.test(rawEmail)) {
        skippedCount++;
        continue;
      }

      const emailLower = rawEmail.toLowerCase();
      const tagsList: string[] = Array.isArray(c.tags) ? [...c.tags] : [];

      if (existingByEmail.has(emailLower)) {
        if (updateExisting) {
          const existing = existingByEmail.get(emailLower)!;
          if (c.name) existing.name = c.name;
          if (c.company) existing.company = c.company;
          if (c.city) existing.city = c.city;
          if (c.phone) existing.phone = c.phone;
          for (const t of tagsList) {
            if (!existing.tags.includes(t)) existing.tags.push(t);
          }
          existing.updatedAt = now;
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const newContact: Contact = {
          id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          email: rawEmail,
          name: c.name || rawEmail.split('@')[0],
          company: c.company || '',
          city: c.city || '',
          phone: c.phone || '',
          tags: tagsList.length > 0 ? tagsList : ['Imported'],
          status: 'active',
          source: source || 'direct_import',
          createdAt: now,
          updatedAt: now,
        };
        contacts.unshift(newContact);
        existingByEmail.set(emailLower, newContact);
        addedCount++;
      }
    }

    db.set('contacts', contacts);
    db.recordAudit(
      'IMPORT_BATCH_CONFIRMED',
      'admin',
      'contacts',
      `Imported batch (${source}): ${addedCount} added, ${updatedCount} updated, ${skippedCount} skipped.`
    );

    return res.json({
      success: true,
      addedCount,
      updatedCount,
      skippedCount,
      totalContacts: contacts.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Batch import failed: ${err.message}` });
  }
});

apiRouter.post('/contacts/import-confirm', (req: Request, res: Response) => {
  try {
    const { fileBase64, fileName, mapping, defaultTag, updateExisting } = req.body;
    if (!fileBase64 || !mapping || !mapping.email) {
      return res.status(400).json({ error: 'Missing file data or email column mapping.' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const contacts = db.get('contacts');
    const existingByEmail = new Map<string, Contact>(contacts.map((c) => [c.email.toLowerCase(), c]));

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();

    for (const row of rawRows) {
      const rawEmail = String(row[mapping.email] || '').trim();
      if (!rawEmail || !emailRegex.test(rawEmail)) {
        skippedCount++;
        continue;
      }

      const emailLower = rawEmail.toLowerCase();
      const rawName = mapping.name ? String(row[mapping.name] || '').trim() : '';
      const rawCompany = mapping.company ? String(row[mapping.company] || '').trim() : '';
      const rawCity = mapping.city ? String(row[mapping.city] || '').trim() : '';
      const rawPhone = mapping.phone ? String(row[mapping.phone] || '').trim() : '';
      const rawTags = mapping.tags ? String(row[mapping.tags] || '').trim() : '';

      const tagsList: string[] = [];
      if (defaultTag) tagsList.push(defaultTag);
      if (rawTags) {
        rawTags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean).forEach((t) => {
          if (!tagsList.includes(t)) tagsList.push(t);
        });
      }

      if (existingByEmail.has(emailLower)) {
        if (updateExisting) {
          const existing = existingByEmail.get(emailLower)!;
          existing.name = rawName || existing.name;
          existing.company = rawCompany || existing.company;
          existing.city = rawCity || existing.city;
          existing.phone = rawPhone || existing.phone;
          for (const t of tagsList) {
            if (!existing.tags.includes(t)) existing.tags.push(t);
          }
          existing.updatedAt = now;
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const newContact: Contact = {
          id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          email: rawEmail,
          name: rawName || rawEmail.split('@')[0],
          company: rawCompany,
          city: rawCity,
          phone: rawPhone,
          tags: tagsList.length > 0 ? tagsList : ['Imported'],
          status: 'active',
          source: fileName || 'direct_import',
          createdAt: now,
          updatedAt: now,
        };
        contacts.unshift(newContact);
        existingByEmail.set(emailLower, newContact);
        addedCount++;
      }
    }

    db.set('contacts', contacts);
    db.recordAudit(
      'IMPORT_CONTACTS_CONFIRMED',
      'admin',
      'contacts',
      `Imported from ${fileName}: ${addedCount} added, ${updatedCount} updated, ${skippedCount} skipped.`
    );

    return res.json({
      success: true,
      addedCount,
      updatedCount,
      skippedCount,
      totalContacts: contacts.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});

// -------------------------------------------------------------
// Contacts Directory CRUD
// -------------------------------------------------------------
apiRouter.get('/contacts', (req: Request, res: Response) => {
  const { search, status, tag, page = '1', limit = '50' } = req.query;
  let list = db.get('contacts');

  if (status && status !== 'all') {
    list = list.filter((c) => c.status === status);
  }

  if (tag && tag !== 'all') {
    list = list.filter((c) => c.tags.includes(String(tag)));
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }

  const p = parseInt(String(page), 10) || 1;
  const l = parseInt(String(limit), 10) || 50;
  const total = list.length;
  const paginated = list.slice((p - 1) * l, p * l);

  // Collect all unique tags for filter dropdown
  const allContacts = db.get('contacts');
  const allTags = Array.from(new Set(allContacts.flatMap((c) => c.tags)));

  return res.json({
    contacts: paginated,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    availableTags: allTags,
  });
});

apiRouter.post('/contacts', (req: Request, res: Response) => {
  const { email, name, company, city, phone, tags } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const contacts = db.get('contacts');
  if (contacts.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'A contact with this email already exists.' });
  }

  const newContact: Contact = {
    id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email,
    name: name || email.split('@')[0],
    company,
    city,
    phone,
    tags: Array.isArray(tags) ? tags : ['Manual'],
    status: 'active',
    source: 'manual_entry',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  contacts.unshift(newContact);
  db.set('contacts', contacts);
  db.recordAudit('CREATE_CONTACT', 'admin', 'contact', `Added contact ${email}`, newContact.id);

  return res.json({ contact: newContact });
});

apiRouter.put('/contacts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const contacts = db.get('contacts');
  const contact = contacts.find((c) => c.id === id);
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const { name, company, city, phone, tags, status } = req.body;
  if (name !== undefined) contact.name = name;
  if (company !== undefined) contact.company = company;
  if (city !== undefined) contact.city = city;
  if (phone !== undefined) contact.phone = phone;
  if (tags !== undefined) contact.tags = tags;
  if (status !== undefined) contact.status = status;
  contact.updatedAt = new Date().toISOString();

  db.set('contacts', contacts);
  return res.json({ contact });
});

apiRouter.delete('/contacts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const contacts = db.get('contacts');
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const removed = contacts.splice(idx, 1)[0];
  db.set('contacts', contacts);
  db.recordAudit('DELETE_CONTACT', 'admin', 'contact', `Deleted contact ${removed.email}`, id);

  return res.json({ success: true, removed });
});

apiRouter.get('/contacts/export-csv', (req: Request, res: Response) => {
  const contacts = db.get('contacts');
  const rows = contacts.map((c) => ({
    Email: c.email,
    Name: c.name,
    Company: c.company || '',
    City: c.city || '',
    Phone: c.phone || '',
    Tags: c.tags.join('; '),
    Status: c.status,
    Source: c.source,
    CreatedAt: c.createdAt,
  }));

  const worksheet = xlsx.utils.json_to_sheet(rows);
  const csv = xlsx.utils.sheet_to_csv(worksheet);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="automail_contacts.csv"');
  return res.send(csv);
});

// -------------------------------------------------------------
// Segments CRUD
// -------------------------------------------------------------
apiRouter.get('/segments', (req: Request, res: Response) => {
  const segments = db.get('segments');
  const contacts = db.get('contacts');

  // Recalculate dynamic counts
  for (const s of segments) {
    if (s.filterTag) {
      s.contactCount = contacts.filter((c) => c.status === 'active' && c.tags.includes(s.filterTag!)).length;
    }
  }

  return res.json({ segments });
});

apiRouter.post('/segments', (req: Request, res: Response) => {
  const { name, description, filterTag } = req.body;
  if (!name || !filterTag) {
    return res.status(400).json({ error: 'Name and tag filter are required.' });
  }

  const segments = db.get('segments');
  const contacts = db.get('contacts');
  const contactCount = contacts.filter((c) => c.status === 'active' && c.tags.includes(filterTag)).length;

  const newSeg: Segment = {
    id: `seg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    description: description || `Contacts tagged with "${filterTag}"`,
    filterTag,
    contactCount,
    createdAt: new Date().toISOString(),
  };

  segments.push(newSeg);
  db.set('segments', segments);
  db.recordAudit('CREATE_SEGMENT', 'admin', 'segment', `Created segment "${name}"`, newSeg.id);

  return res.json({ segment: newSeg });
});

apiRouter.delete('/segments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const segments = db.get('segments');
  const idx = segments.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Segment not found' });
  }
  const removed = segments.splice(idx, 1)[0];
  db.set('segments', segments);
  return res.json({ success: true, removed });
});

// -------------------------------------------------------------
// Email Campaigns Management
// -------------------------------------------------------------
apiRouter.get('/campaigns', (req: Request, res: Response) => {
  const campaigns = db.get('campaigns');
  return res.json({ campaigns });
});

apiRouter.get('/campaigns/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const campaigns = db.get('campaigns');
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const logs = db.get('logs').filter((l) => l.campaignId === id);
  const queue = db.get('queue').filter((q) => q.campaignId === id);

  return res.json({ campaign, logs, queue });
});

apiRouter.post('/campaigns', (req: Request, res: Response) => {
  const {
    name,
    subject,
    senderName,
    senderEmail,
    replyTo,
    htmlContent,
    plainTextContent,
    targetType,
    targetSegmentId,
    selectedContactIds,
    scheduledAt,
    rateLimitPerMin = 60,
  } = req.body;

  if (!name || !subject || !htmlContent) {
    return res.status(400).json({ error: 'Campaign name, subject, and HTML content are required.' });
  }

  const smtp = db.get('smtpConfig');
  const campaigns = db.get('campaigns');
  const isScheduled = !!scheduledAt && new Date(scheduledAt) > new Date();

  // Determine potential recipient count
  const contacts = db.get('contacts');
  let estimatedCount = 0;
  if (targetType === 'segment' && targetSegmentId) {
    const seg = db.get('segments').find((s) => s.id === targetSegmentId);
    if (seg && seg.filterTag) {
      estimatedCount = contacts.filter((c) => c.status === 'active' && c.tags.includes(seg.filterTag!)).length;
    }
  } else if (targetType === 'custom' && selectedContactIds) {
    estimatedCount = selectedContactIds.length;
  } else {
    estimatedCount = contacts.filter((c) => c.status === 'active').length;
  }

  const newCampaign: Campaign = {
    id: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    subject,
    senderName: senderName || smtp.fromName,
    senderEmail: senderEmail || smtp.fromEmail,
    replyTo: replyTo || smtp.replyTo,
    htmlContent,
    plainTextContent: plainTextContent || '',
    targetType: targetType || 'all',
    targetSegmentId,
    selectedContactIds,
    status: isScheduled ? 'scheduled' : 'draft',
    scheduledAt: isScheduled ? scheduledAt : undefined,
    rateLimitPerMin: Number(rateLimitPerMin) || 60,
    totalRecipients: estimatedCount,
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

  campaigns.unshift(newCampaign);
  db.set('campaigns', campaigns);

  db.recordAudit(
    'CREATE_CAMPAIGN',
    'admin',
    'campaign',
    `Created campaign "${name}" (${isScheduled ? 'Scheduled for ' + scheduledAt : 'Draft'})`,
    newCampaign.id
  );

  return res.json({ campaign: newCampaign });
});

apiRouter.put('/campaigns/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const campaigns = db.get('campaigns');
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Prevent modifying active sending campaigns
  if (campaign.status === 'sending') {
    return res.status(400).json({ error: 'Cannot modify a campaign while actively sending. Pause it first.' });
  }

  const fields = ['name', 'subject', 'senderName', 'senderEmail', 'replyTo', 'htmlContent', 'plainTextContent', 'targetType', 'targetSegmentId', 'selectedContactIds', 'scheduledAt', 'rateLimitPerMin', 'status'];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      (campaign as any)[f] = req.body[f];
    }
  }
  campaign.updatedAt = new Date().toISOString();
  db.set('campaigns', campaigns);

  return res.json({ campaign });
});

apiRouter.post('/campaigns/:id/send-now', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = enqueueCampaign(id);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  return res.json({ success: true, count: result.count });
});

apiRouter.post('/campaigns/:id/pause', (req: Request, res: Response) => {
  const { id } = req.params;
  const campaigns = db.get('campaigns');
  const cmp = campaigns.find((c) => c.id === id);
  if (!cmp) return res.status(404).json({ error: 'Campaign not found' });

  cmp.status = 'paused';
  cmp.updatedAt = new Date().toISOString();
  db.set('campaigns', campaigns);
  db.recordAudit('PAUSE_CAMPAIGN', 'admin', 'campaign', `Paused campaign "${cmp.name}"`, id);

  return res.json({ success: true, campaign: cmp });
});

apiRouter.post('/campaigns/:id/resume', (req: Request, res: Response) => {
  const { id } = req.params;
  const campaigns = db.get('campaigns');
  const cmp = campaigns.find((c) => c.id === id);
  if (!cmp) return res.status(404).json({ error: 'Campaign not found' });

  cmp.status = 'sending';
  cmp.updatedAt = new Date().toISOString();
  db.set('campaigns', campaigns);
  db.recordAudit('RESUME_CAMPAIGN', 'admin', 'campaign', `Resumed campaign "${cmp.name}"`, id);

  return res.json({ success: true, campaign: cmp });
});

apiRouter.post('/campaigns/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  const campaigns = db.get('campaigns');
  const cmp = campaigns.find((c) => c.id === id);
  if (!cmp) return res.status(404).json({ error: 'Campaign not found' });

  cmp.status = 'cancelled';
  cmp.updatedAt = new Date().toISOString();

  // Cancel any pending queue items
  const queue = db.get('queue');
  for (const item of queue) {
    if (item.campaignId === id && item.status === 'pending') {
      item.status = 'failed';
      item.error = 'Campaign cancelled by operator';
    }
  }
  db.set('queue', queue);
  db.set('campaigns', campaigns);
  db.recordAudit('CANCEL_CAMPAIGN', 'admin', 'campaign', `Cancelled campaign "${cmp.name}"`, id);

  return res.json({ success: true, campaign: cmp });
});

apiRouter.post('/campaigns/:id/duplicate', (req: Request, res: Response) => {
  const { id } = req.params;
  const campaigns = db.get('campaigns');
  const original = campaigns.find((c) => c.id === id);
  if (!original) return res.status(404).json({ error: 'Campaign not found' });

  const duplicated: Campaign = {
    ...original,
    id: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `${original.name} (Copy)`,
    status: 'draft',
    scheduledAt: undefined,
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    bouncedCount: 0,
    failedCount: 0,
    unsubscribedCount: 0,
    startedAt: undefined,
    completedAt: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  campaigns.unshift(duplicated);
  db.set('campaigns', campaigns);
  db.recordAudit('DUPLICATE_CAMPAIGN', 'admin', 'campaign', `Duplicated campaign "${original.name}"`, duplicated.id);

  return res.json({ campaign: duplicated });
});

apiRouter.post('/campaigns/:id/send-test', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { testEmail, testName = 'Test Recipient', testCompany = 'Acme Test' } = req.body;
  if (!testEmail) {
    return res.status(400).json({ error: 'Target test email address is required.' });
  }

  const campaigns = db.get('campaigns');
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const appUrl = getAppUrl();
  const result = await sendEmailMessage({
    to: testEmail,
    toName: testName,
    toCompany: testCompany,
    subject: `[TEST] ${campaign.subject}`,
    htmlContent: campaign.htmlContent,
    plainTextContent: campaign.plainTextContent,
    senderName: campaign.senderName,
    senderEmail: campaign.senderEmail,
    replyTo: campaign.replyTo,
    campaignId: campaign.id,
    appUrl,
  });

  db.recordLog({
    campaignId: campaign.id,
    campaignName: `[TEST] ${campaign.name}`,
    recipientEmail: testEmail,
    recipientName: testName,
    event: result.success ? 'delivered' : 'rejected',
    status: result.success ? 'success' : 'error',
    smtpCode: result.smtpCode,
    smtpResponse: result.smtpResponse,
    messageId: result.messageId,
    details: `Manual test email dispatched to ${testEmail}: ${result.details}`,
  });

  return res.json({ result });
});

apiRouter.post('/campaigns/test-direct', async (req: Request, res: Response) => {
  const { to, subject, htmlContent, plainTextContent, senderName, senderEmail, replyTo } = req.body;
  if (!to) return res.status(400).json({ error: 'Target email is required.' });

  const appUrl = getAppUrl();
  const result = await sendEmailMessage({
    to,
    toName: to.split('@')[0],
    toCompany: 'Acme Test',
    subject: subject || 'Test Email from AutoMail',
    htmlContent: htmlContent || '<p>Hello from AutoMail</p>',
    plainTextContent: plainTextContent || 'Hello from AutoMail',
    senderName: senderName || 'AutoMail Test',
    senderEmail: senderEmail || 'test@automail.io',
    replyTo: replyTo || 'test@automail.io',
    campaignId: 'cmp-test-draft',
    appUrl,
  });

  db.recordLog({
    campaignId: 'cmp-test-draft',
    campaignName: `[DRAFT TEST] ${subject || 'Direct Test'}`,
    recipientEmail: to,
    recipientName: to.split('@')[0],
    event: result.success ? 'delivered' : 'rejected',
    status: result.success ? 'success' : 'error',
    smtpCode: result.smtpCode,
    smtpResponse: result.smtpResponse,
    messageId: result.messageId,
    details: `Draft test email dispatched to ${to}: ${result.details}`,
  });

  return res.json({ result });
});

apiRouter.delete('/campaigns/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const campaigns = db.get('campaigns');
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Campaign not found' });

  const removed = campaigns.splice(idx, 1)[0];
  db.set('campaigns', campaigns);
  db.recordAudit('DELETE_CAMPAIGN', 'admin', 'campaign', `Deleted campaign "${removed.name}"`, id);

  return res.json({ success: true, removed });
});

// -------------------------------------------------------------
// Email Templates
// -------------------------------------------------------------
apiRouter.get('/templates', (req: Request, res: Response) => {
  const templates = db.get('templates');
  return res.json({ templates });
});

apiRouter.post('/templates', (req: Request, res: Response) => {
  const { name, category, subject, previewText, htmlContent, plainTextContent } = req.body;
  if (!name || !htmlContent) {
    return res.status(400).json({ error: 'Template name and HTML content are required.' });
  }

  const templates = db.get('templates');
  const newTemplate = {
    id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    category: category || 'General',
    subject: subject || '',
    previewText: previewText || '',
    htmlContent,
    plainTextContent: plainTextContent || '',
    createdAt: new Date().toISOString(),
  };

  templates.unshift(newTemplate);
  db.set('templates', templates);
  return res.json({ template: newTemplate });
});

// -------------------------------------------------------------
// Real-Time Delivery Logs & Filterable Reports
// -------------------------------------------------------------
apiRouter.get('/logs', (req: Request, res: Response) => {
  const { campaignId, status, event, search, page = '1', limit = '50' } = req.query;
  let logs = db.get('logs');

  if (campaignId && campaignId !== 'all') {
    logs = logs.filter((l) => l.campaignId === campaignId);
  }

  if (status && status !== 'all') {
    logs = logs.filter((l) => l.status === status);
  }

  if (event && event !== 'all') {
    logs = logs.filter((l) => l.event === event);
  }

  if (search) {
    const q = String(search).toLowerCase();
    logs = logs.filter(
      (l) =>
        l.recipientEmail.toLowerCase().includes(q) ||
        l.recipientName.toLowerCase().includes(q) ||
        (l.campaignName && l.campaignName.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q))
    );
  }

  const p = parseInt(String(page), 10) || 1;
  const l = parseInt(String(limit), 10) || 50;
  const total = logs.length;
  const paginated = logs.slice((p - 1) * l, p * l);

  return res.json({
    logs: paginated,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
  });
});

apiRouter.get('/logs/export-csv', (req: Request, res: Response) => {
  const { campaignId } = req.query;
  let logs = db.get('logs');
  if (campaignId && campaignId !== 'all') {
    logs = logs.filter((l) => l.campaignId === campaignId);
  }

  const rows = logs.map((l) => ({
    Timestamp: l.timestamp,
    Campaign: l.campaignName,
    RecipientEmail: l.recipientEmail,
    RecipientName: l.recipientName,
    Event: l.event,
    Status: l.status,
    SmtpCode: l.smtpCode || '',
    MessageId: l.messageId || '',
    SmtpResponse: l.smtpResponse || '',
    Details: l.details || '',
    IPAddress: l.ipAddress || '',
  }));

  const worksheet = xlsx.utils.json_to_sheet(rows);
  const csv = xlsx.utils.sheet_to_csv(worksheet);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="automail_delivery_logs.csv"');
  return res.send(csv);
});

// -------------------------------------------------------------
// Suppression Lists Management
// -------------------------------------------------------------
apiRouter.get('/suppression', (req: Request, res: Response) => {
  const suppression = db.get('suppression');
  return res.json({ suppression });
});

apiRouter.post('/suppression', (req: Request, res: Response) => {
  const { email, reason = 'manual', notes } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required' });

  const suppression = db.get('suppression');
  if (suppression.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email is already on suppression list.' });
  }

  const newEntry: SuppressionEntry = {
    id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email,
    reason,
    notes,
    createdAt: new Date().toISOString(),
  };

  suppression.unshift(newEntry);
  db.set('suppression', suppression);

  // Also update contact status if exists
  const contacts = db.get('contacts');
  const contact = contacts.find((c) => c.email.toLowerCase() === email.toLowerCase());
  if (contact) {
    contact.status = reason === 'unsubscribed' ? 'unsubscribed' : 'bounced';
    db.set('contacts', contacts);
  }

  db.recordAudit('ADD_SUPPRESSION', 'admin', 'suppression', `Suppressed ${email} (${reason})`, newEntry.id);
  return res.json({ entry: newEntry });
});

apiRouter.delete('/suppression/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const suppression = db.get('suppression');
  const idx = suppression.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Suppression entry not found' });

  const removed = suppression.splice(idx, 1)[0];
  db.set('suppression', suppression);
  db.recordAudit('REMOVE_SUPPRESSION', 'admin', 'suppression', `Removed ${removed.email} from suppression`, id);

  return res.json({ success: true, removed });
});

// -------------------------------------------------------------
// SMTP & DNS Authentication Settings
// -------------------------------------------------------------
apiRouter.get('/smtp', (req: Request, res: Response) => {
  const smtp = db.get('smtpConfig');
  // Mask password for security
  const safeConfig = {
    ...smtp,
    pass: smtp.pass ? '••••••••••••' : '',
  };
  return res.json({ smtpConfig: safeConfig });
});

apiRouter.put('/smtp', (req: Request, res: Response) => {
  const current = db.get('smtpConfig');
  const { mode, host, port, secure, user, pass, fromName, fromEmail, replyTo, enableTracking, maxBatchSize, retryAttempts, domain, spfRecord, dkimSelector, dmarcPolicy } = req.body;

  current.mode = mode || current.mode;
  if (host !== undefined) current.host = host;
  if (port !== undefined) current.port = Number(port);
  if (secure !== undefined) current.secure = Boolean(secure);
  if (user !== undefined) current.user = user;
  if (pass && pass !== '••••••••••••') current.pass = pass;
  if (fromName !== undefined) current.fromName = fromName;
  if (fromEmail !== undefined) current.fromEmail = fromEmail;
  if (replyTo !== undefined) current.replyTo = replyTo;
  if (enableTracking !== undefined) current.enableTracking = Boolean(enableTracking);
  if (maxBatchSize !== undefined) current.maxBatchSize = Number(maxBatchSize);
  if (retryAttempts !== undefined) current.retryAttempts = Number(retryAttempts);
  if (domain !== undefined) current.domain = domain;
  if (spfRecord !== undefined) current.spfRecord = spfRecord;
  if (dkimSelector !== undefined) current.dkimSelector = dkimSelector;
  if (dmarcPolicy !== undefined) current.dmarcPolicy = dmarcPolicy;

  db.set('smtpConfig', current);
  db.recordAudit('UPDATE_SMTP_CONFIG', 'admin', 'smtp', `Updated SMTP server configuration (${current.mode} mode).`);

  return res.json({
    success: true,
    smtpConfig: { ...current, pass: '••••••••••••' },
  });
});

apiRouter.post('/smtp/test', async (req: Request, res: Response) => {
  const current = db.get('smtpConfig');
  // If user passed unsaved test parameters in the body, use them
  const testConfig: SmtpConfig = {
    ...current,
    ...req.body,
    pass: (req.body.pass && req.body.pass !== '••••••••••••') ? req.body.pass : current.pass,
  };

  const testResult = await testSmtpSettings(testConfig);
  current.lastTestedAt = new Date().toISOString();
  current.lastTestStatus = testResult.success ? 'success' : 'failed';
  current.lastTestMessage = testResult.message;
  db.set('smtpConfig', current);

  return res.json({ testResult });
});

// -------------------------------------------------------------
// Audit Logs
// -------------------------------------------------------------
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const auditLogs = db.get('auditLogs');
  return res.json({ auditLogs: auditLogs.slice(0, 100) });
});

// -------------------------------------------------------------
// Email Engagement Tracking Endpoints (Open, Click, Unsubscribe)
// -------------------------------------------------------------

// 1. Transparent 1x1 GIF Tracking Pixel
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

apiRouter.get('/track/open/:token', (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [campaignId, recipientEmail] = decoded.split(':::');

    if (campaignId && recipientEmail) {
      const campaigns = db.get('campaigns');
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        campaign.openedCount += 1;
        db.set('campaigns', campaigns);

        db.recordLog({
          campaignId: campaign.id,
          campaignName: campaign.name,
          recipientEmail,
          recipientName: recipientEmail.split('@')[0],
          event: 'opened',
          status: 'success',
          details: 'Subscriber opened email (Tracking Pixel loaded via Mail Client)',
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        });
      }
    }
  } catch (err) {
    console.error('Error handling open tracking token:', err);
  }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.send(TRANSPARENT_GIF_BUFFER);
});

// 2. Click Tracking Redirect
apiRouter.get('/track/click/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const targetUrl = (req.query.url as string) || 'https://automail.io';

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [campaignId, recipientEmail] = decoded.split(':::');

    if (campaignId && recipientEmail) {
      const campaigns = db.get('campaigns');
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        campaign.clickedCount += 1;
        db.set('campaigns', campaigns);

        db.recordLog({
          campaignId: campaign.id,
          campaignName: campaign.name,
          recipientEmail,
          recipientName: recipientEmail.split('@')[0],
          event: 'clicked',
          status: 'success',
          details: `Clicked link: ${targetUrl}`,
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        });
      }
    }
  } catch (err) {
    console.error('Error handling click tracking token:', err);
  }

  return res.redirect(targetUrl);
});

// 3. User-Facing Unsubscribe Confirmation Page
apiRouter.get('/unsubscribe/:token', (req: Request, res: Response) => {
  let recipientEmail = 'subscriber';
  let campaignName = 'our mailing list';

  try {
    const { token } = req.params;
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [campaignId, email] = decoded.split(':::');

    if (email) {
      recipientEmail = email;
      const suppression = db.get('suppression');
      if (!suppression.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
        suppression.push({
          id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          email,
          reason: 'unsubscribed',
          sourceCampaignId: campaignId,
          notes: 'Direct 1-click email unsubscribe link',
          createdAt: new Date().toISOString(),
        });
        db.set('suppression', suppression);
      }

      // Update contact status
      const contacts = db.get('contacts');
      const contact = contacts.find((c) => c.email.toLowerCase() === email.toLowerCase());
      if (contact) {
        contact.status = 'unsubscribed';
        db.set('contacts', contacts);
      }

      const campaigns = db.get('campaigns');
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        campaign.unsubscribedCount += 1;
        campaignName = campaign.name;
        db.set('campaigns', campaigns);

        db.recordLog({
          campaignId: campaign.id,
          campaignName: campaign.name,
          recipientEmail: email,
          recipientName: email.split('@')[0],
          event: 'unsubscribed',
          status: 'warning',
          details: 'Recipient unsubscribed via email footer link.',
        });
      }
    }
  } catch (err) {
    console.error('Error handling unsubscribe token:', err);
  }

  // Render clean, modern confirmation page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Unsubscribed Successfully</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-4 font-sans text-slate-800">
  <div class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
    <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-slate-900 mb-2">Unsubscribed Successfully</h1>
    <p class="text-sm text-slate-600 mb-6">
      <strong>${recipientEmail}</strong> has been removed from <strong>${campaignName}</strong> and added to our global suppression list.
    </p>
    <div class="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 mb-6 border border-slate-200">
      You will no longer receive marketing communications from this sender. If this was a mistake, please contact the sender directly to re-subscribe.
    </div>
    <p class="text-xs text-slate-400">Powered by AutoMail Compliance Engine &bull; RFC 8058 Certified</p>
  </div>
</body>
</html>`;

  return res.send(html);
});
