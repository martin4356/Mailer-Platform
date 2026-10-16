import React, { useState } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  XCircle,
  Copy,
  Trash2,
  Clock,
  CheckCircle2,
  Calendar,
  Eye,
  Smartphone,
  Monitor,
  Code,
  Tag,
  FileCode,
  AlertCircle,
  Mail,
  Zap,
} from 'lucide-react';
import { Campaign, Segment, EmailTemplate, Contact } from '../types';
import { formatTimeAgo } from '../utils/sampleData';

interface CampaignsViewProps {
  campaigns: Campaign[];
  segments: Segment[];
  templates: EmailTemplate[];
  contacts: Contact[];
  onRefresh: () => void;
  onCreateCampaign: (data: Partial<Campaign>) => Promise<boolean>;
  onSendNow: (campaignId: string) => Promise<boolean>;
  onPauseCampaign: (campaignId: string) => Promise<boolean>;
  onResumeCampaign: (campaignId: string) => Promise<boolean>;
  onCancelCampaign: (campaignId: string) => Promise<boolean>;
  onDuplicateCampaign: (campaignId: string) => Promise<boolean>;
  onDeleteCampaign: (campaignId: string) => Promise<boolean>;
  onSendTestEmail: (campaignId: string, testEmail: string) => Promise<{ success: boolean; message: string }>;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  segments,
  templates,
  contacts,
  onRefresh,
  onCreateCampaign,
  onSendNow,
  onPauseCampaign,
  onResumeCampaign,
  onCancelCampaign,
  onDuplicateCampaign,
  onDeleteCampaign,
  onSendTestEmail,
  isCreateModalOpen,
  setIsCreateModalOpen,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Builder Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [senderName, setSenderName] = useState('AutoMail Team');
  const [senderEmail, setSenderEmail] = useState('marketing@automail.io');
  const [replyTo, setReplyTo] = useState('support@automail.io');
  const [targetType, setTargetType] = useState<'all' | 'segment' | 'custom'>('all');
  const [targetSegmentId, setTargetSegmentId] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState('');
  const [plainTextContent, setPlainTextContent] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [rateLimitPerMin, setRateLimitPerMin] = useState(60);

  // Test send dialog state
  const [testEmailAddress, setTestEmailAddress] = useState('martin4356@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [editorMode, setEditorMode] = useState<'code' | 'preview'>('code');

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const handleApplyTemplate = (tmpl: EmailTemplate) => {
    setSubject(tmpl.subject);
    setHtmlContent(tmpl.htmlContent);
    setPlainTextContent(tmpl.plainTextContent);
  };

  const handleInsertMergeTag = (tag: string) => {
    setHtmlContent((prev) => prev + ` {{${tag}}} `);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subject || !htmlContent) {
      alert('Campaign name, subject line, and email content are required.');
      return;
    }

    const payload: Partial<Campaign> = {
      name,
      subject,
      senderName,
      senderEmail,
      replyTo,
      htmlContent,
      plainTextContent: plainTextContent || 'View this email in an HTML-compatible client.',
      targetType,
      targetSegmentId: targetType === 'segment' ? targetSegmentId : undefined,
      rateLimitPerMin: Number(rateLimitPerMin) || 60,
      scheduledAt: scheduleType === 'scheduled' && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined,
    };

    const ok = await onCreateCampaign(payload);
    if (ok) {
      setIsCreateModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setHtmlContent(templates[0]?.htmlContent || '');
    setPlainTextContent(templates[0]?.plainTextContent || '');
    setTargetType('all');
    setTargetSegmentId('');
    setScheduleType('now');
    setScheduledDateTime('');
    setWizardStep(1);
    setTestFeedback(null);
  };

  const handleQuickSendTest = async (campaignId: string) => {
    if (!testEmailAddress) {
      alert('Please enter a target email address for the test.');
      return;
    }
    setIsSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await onSendTestEmail(campaignId, testEmailAddress);
      setTestFeedback(res.message);
    } catch (err: any) {
      setTestFeedback(`Test failed: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Compile sample preview
  const sampleMergeData = {
    Name: 'Sarah Jenkins',
    Email: 'sarah.jenkins@acmecorp.com',
    Company: 'Acme Corp',
    City: 'San Francisco',
    UnsubscribeLink: '#unsubscribe-demo',
  };

  let compiledPreviewHtml = htmlContent;
  for (const [key, val] of Object.entries(sampleMergeData)) {
    compiledPreviewHtml = compiledPreviewHtml.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), val);
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Campaign Management &amp; Dispatcher</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, schedule, pause, and monitor outbound email marketing campaigns
          </p>
        </div>

        <button
          onClick={() => {
            if (!htmlContent && templates.length > 0) {
              handleApplyTemplate(templates[0]);
            }
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          {['all', 'sending', 'scheduled', 'completed', 'paused', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-60"
          />
        </div>
      </div>

      {/* Campaigns Grid / Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCampaigns.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Mail className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No campaigns found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Ready to send your first message? Click "New Campaign" to pick a template and dispatch to your subscribers.
            </p>
          </div>
        ) : (
          filteredCampaigns.map((camp) => {
            const progress =
              camp.totalRecipients > 0 ? Math.round((camp.sentCount / camp.totalRecipients) * 100) : 0;
            const openRate =
              camp.deliveredCount > 0 ? Math.round((camp.openedCount / camp.deliveredCount) * 100) : 0;
            const clickRate =
              camp.deliveredCount > 0 ? Math.round((camp.clickedCount / camp.deliveredCount) * 100) : 0;

            return (
              <div
                key={camp.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition-all shadow-xs"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Campaign Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white tracking-tight">{camp.name}</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          camp.status === 'sending'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                            : camp.status === 'scheduled'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : camp.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : camp.status === 'paused'
                            ? 'bg-slate-700/60 text-slate-300 border border-slate-600'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {camp.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                      <span className="text-slate-400">Subject:</span>
                      <span>{camp.subject}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                      <span>
                        Sender: <strong>{camp.senderName}</strong> &lt;{camp.senderEmail}&gt;
                      </span>
                      <span>&bull;</span>
                      <span>
                        Target:{' '}
                        <strong>
                          {camp.targetType === 'all'
                            ? 'All Active Subscribers'
                            : camp.targetType === 'segment'
                            ? `Segment ID: ${camp.targetSegmentId}`
                            : 'Custom Contacts'}
                        </strong>
                      </span>
                      <span>&bull;</span>
                      <span>Throttle: <strong>{camp.rateLimitPerMin}/min</strong></span>
                      {camp.scheduledAt && (
                        <>
                          <span>&bull;</span>
                          <span className="text-amber-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            Scheduled: {new Date(camp.scheduledAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delivery Metrics Bar */}
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <div className="text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Recipients</div>
                      <div className="text-lg font-bold text-white font-mono">{camp.totalRecipients}</div>
                    </div>
                    <div className="text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Delivered</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono">{camp.deliveredCount}</div>
                    </div>
                    <div className="text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Open Rate</div>
                      <div className="text-lg font-bold text-indigo-400 font-mono">{openRate}%</div>
                    </div>
                    <div className="text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">CTR</div>
                      <div className="text-lg font-bold text-cyan-400 font-mono">{clickRate}%</div>
                    </div>
                    <div className="text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Bounced</div>
                      <div className="text-lg font-bold text-rose-400 font-mono">{camp.bouncedCount}</div>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {camp.status === 'draft' || camp.status === 'scheduled' ? (
                      <button
                        onClick={() => onSendNow(camp.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                        title="Start Immediate Delivery"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Send Now</span>
                      </button>
                    ) : null}

                    {camp.status === 'sending' && (
                      <button
                        onClick={() => onPauseCampaign(camp.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                        title="Pause Dispatch"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    )}

                    {camp.status === 'paused' && (
                      <button
                        onClick={() => onResumeCampaign(camp.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        title="Resume Dispatch"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDuplicateCampaign(camp.id)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Duplicate Campaign"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleQuickSendTest(camp.id)}
                      className="p-2 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Send Instant Test Email to Martin"
                    >
                      <Zap className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteCampaign(camp.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar (if in sending or completed) */}
                {(camp.status === 'sending' || camp.status === 'completed' || camp.status === 'paused') && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>
                        Dispatched {camp.sentCount} of {camp.totalRecipients} emails
                      </span>
                      <span className="font-semibold text-slate-300">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${progress}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          camp.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ------------------- FULL CAMPAIGN BUILDER MODAL ------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-400" />
                  Campaign Builder &amp; Dispatch Studio
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Step {wizardStep} of 4: {wizardStep === 1 ? 'Metadata & Sender' : wizardStep === 2 ? 'Target Audience' : wizardStep === 3 ? 'HTML & Personalization' : 'Preview & Schedule'}
                </p>
              </div>

              {/* Wizard Steps Navigation */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-slate-800 p-1 text-xs">
                  {[1, 2, 3, 4].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setWizardStep(step as any)}
                      className={`px-3 py-1 rounded-md font-semibold ${
                        wizardStep === step
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Step {step}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xl font-bold ml-2"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* STEP 1: Metadata & Sender */}
              {wizardStep === 1 && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Campaign Internal Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Q4 Product Announcement & Special Offer"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">For your dashboard reference only.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Subject Line <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. ✨ New release announcement for {{Company}}"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Supports merge tags like <code className="text-indigo-400">{'{{Name}}'}</code> and <code className="text-indigo-400">{'{{Company}}'}</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Sender Display Name
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="e.g. AutoMail Team"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        From Email Address
                      </label>
                      <input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="marketing@automail.io"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Reply-To Email Address
                    </label>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="support@automail.io"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Target Audience */}
              {wizardStep === 2 && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Select Campaign Recipients
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label
                      onClick={() => setTargetType('all')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        targetType === 'all'
                          ? 'bg-indigo-600/10 border-indigo-500 text-white'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white text-sm mb-1">All Active Contacts</div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Broadcast to all verified, non-suppressed active contacts in your database.
                        </p>
                      </div>
                      <div className="mt-4 text-xs font-semibold text-indigo-400">
                        {contacts.filter((c) => c.status === 'active').length} active recipients
                      </div>
                    </label>

                    <label
                      onClick={() => setTargetType('segment')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        targetType === 'segment'
                          ? 'bg-indigo-600/10 border-indigo-500 text-white'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white text-sm mb-1">Target by Segment / Tag</div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Deliver exclusively to a specific tag or audience cluster.
                        </p>
                      </div>
                      <div className="mt-4 text-xs font-semibold text-indigo-400">
                        {segments.length} segments available
                      </div>
                    </label>
                  </div>

                  {targetType === 'segment' && (
                    <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                      <label className="block text-xs font-semibold text-slate-300">
                        Choose Segment
                      </label>
                      <select
                        value={targetSegmentId}
                        onChange={(e) => setTargetSegmentId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option value="">— Select Target Segment —</option>
                        {segments.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.contactCount} contacts matching tag "{s.filterTag}")
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>
                      Automatic Suppression Check: Unsubscribed recipients and hard bounces are guaranteed to be filtered out before sending.
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3: HTML & Personalization */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  {/* Merge Tag Insert Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold">Insert Merge Tag:</span>
                      {['Name', 'Email', 'Company', 'City', 'UnsubscribeLink'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleInsertMergeTag(tag)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-indigo-600 text-white font-mono text-[11px] transition-colors"
                        >
                          {`{{${tag}}}`}
                        </button>
                      ))}
                    </div>

                    {/* Pre-built template picker */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Load Template:</span>
                      <select
                        onChange={(e) => {
                          const tmpl = templates.find((t) => t.id === e.target.value);
                          if (tmpl) handleApplyTemplate(tmpl);
                        }}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      >
                        <option value="">— Choose Prebuilt Template —</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* HTML Editor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      HTML Email Source Code
                    </label>
                    <textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      rows={14}
                      className="w-full bg-slate-950 font-mono text-xs text-indigo-200 border border-slate-800 rounded-xl p-4 focus:outline-none focus:border-indigo-500 leading-relaxed"
                      placeholder="<html><body><p>Hello {{Name}}...</p></body></html>"
                    />
                  </div>

                  {/* Plain Text Fallback */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Plain-Text Alternative (RFC 2046)
                    </label>
                    <textarea
                      value={plainTextContent}
                      onChange={(e) => setPlainTextContent(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
                      placeholder="Hi {{Name}},\n\nText fallback for watch and CLI email clients.\n\nUnsubscribe: {{UnsubscribeLink}}"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Preview & Schedule */}
              {wizardStep === 4 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Live Responsive Preview */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-slate-400">
                        Live Preview (Personalized with Sample Data)
                      </span>
                      <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('desktop')}
                          className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                          title="Desktop View"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('mobile')}
                          className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                          title="Mobile View"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div
                      className={`mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-inner transition-all ${
                        previewDevice === 'mobile' ? 'max-w-[360px]' : 'w-full'
                      }`}
                    >
                      {/* Email Client Header Chrome */}
                      <div className="bg-slate-900 border border-slate-800 rounded-t-xl p-3 text-xs space-y-1 mb-2">
                        <div className="flex gap-1.5">
                          <span className="text-slate-400">From:</span>
                          <span className="text-white font-medium">{senderName} &lt;{senderEmail}&gt;</span>
                        </div>
                        <div className="flex gap-1.5">
                          <span className="text-slate-400">To:</span>
                          <span className="text-white font-medium">Sarah Jenkins &lt;sarah.jenkins@acmecorp.com&gt;</span>
                        </div>
                        <div className="flex gap-1.5">
                          <span className="text-slate-400">Subject:</span>
                          <span className="text-indigo-300 font-semibold">{subject.replace('{{Company}}', 'Acme Corp')}</span>
                        </div>
                      </div>

                      {/* Rendered HTML iFrame or preview box */}
                      <div className="bg-white rounded-b-xl overflow-hidden min-h-[360px] max-h-[460px] overflow-y-auto">
                        <div
                          dangerouslySetInnerHTML={{ __html: compiledPreviewHtml }}
                          className="text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Instant Test & Scheduler */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Instant Test Email Box */}
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                          Send Live Test Email
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Verify inbox rendering and test tracking links prior to broadcast.
                      </p>

                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={testEmailAddress}
                          onChange={(e) => setTestEmailAddress(e.target.value)}
                          placeholder="your-email@example.com"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                        <button
                          type="button"
                          disabled={isSendingTest}
                          onClick={async () => {
                            if (!testEmailAddress) return;
                            setIsSendingTest(true);
                            setTestFeedback(null);
                            try {
                              // Direct test send using temporary payload
                              const res = await fetch('/api/campaigns/test-direct', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  to: testEmailAddress,
                                  subject,
                                  htmlContent,
                                  plainTextContent,
                                  senderName,
                                  senderEmail,
                                  replyTo,
                                }),
                              });
                              // Also trigger test send feedback
                              setTestFeedback(`Test email dispatched to ${testEmailAddress}! Check your inbox or Delivery Logs.`);
                            } catch (e: any) {
                              setTestFeedback(`Error: ${e.message}`);
                            } finally {
                              setIsSendingTest(false);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                        >
                          {isSendingTest ? 'Sending...' : 'Send Test'}
                        </button>
                      </div>

                      {testFeedback && (
                        <div className="text-[11px] p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                          {testFeedback}
                        </div>
                      )}
                    </div>

                    {/* Schedule & Rate Limiting Settings */}
                    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                          Delivery Timing &amp; Speed
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="radio"
                            name="timing"
                            checked={scheduleType === 'now'}
                            onChange={() => setScheduleType('now')}
                            className="text-indigo-600"
                          />
                          <span>Send immediately upon launch</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="radio"
                            name="timing"
                            checked={scheduleType === 'scheduled'}
                            onChange={() => setScheduleType('scheduled')}
                            className="text-indigo-600"
                          />
                          <span>Schedule for specific future date and time</span>
                        </label>
                      </div>

                      {scheduleType === 'scheduled' && (
                        <div className="space-y-1.5 pl-5">
                          <label className="block text-[11px] text-slate-400">Date &amp; Time (Local / UTC):</label>
                          <input
                            type="datetime-local"
                            value={scheduledDateTime}
                            onChange={(e) => setScheduledDateTime(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-700/60">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Delivery Rate Throttle
                        </label>
                        <select
                          value={rateLimitPerMin}
                          onChange={(e) => setRateLimitPerMin(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        >
                          <option value={10}>10 emails / min (Gentle warmup)</option>
                          <option value={30}>30 emails / min (Recommended for shared SMTP)</option>
                          <option value={60}>60 emails / min (Standard throughput)</option>
                          <option value={120}>120 emails / min (Dedicated IP / Mail server)</option>
                          <option value={300}>300 emails / min (High throughput)</option>
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Prevents MTA rate limiting and maintains sender reputation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Navigation Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  {wizardStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      &larr; Previous Step
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>

                  {wizardStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25"
                    >
                      Next Step &rarr;
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{scheduleType === 'now' ? 'Launch Campaign' : 'Save & Schedule'}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
