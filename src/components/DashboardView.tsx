import React from 'react';
import {
  Users,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Server,
  ArrowUpRight,
  ShieldCheck,
  Play,
  Pause,
  Copy,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { DashboardStats, Campaign, SmtpConfig } from '../types';
import { formatTimeAgo, downloadSampleExcel } from '../utils/sampleData';

interface DashboardViewProps {
  stats: DashboardStats | null;
  smtpConfig?: SmtpConfig;
  onNavigateTab: (tab: any) => void;
  onOpenCreateCampaign: () => void;
  onOpenImport: () => void;
  onSendNow: (campaignId: string) => void;
  onPauseCampaign: (campaignId: string) => void;
  onResumeCampaign: (campaignId: string) => void;
  onDuplicateCampaign: (campaignId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  smtpConfig,
  onNavigateTab,
  onOpenCreateCampaign,
  onOpenImport,
  onSendNow,
  onPauseCampaign,
  onResumeCampaign,
  onDuplicateCampaign,
}) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading delivery engine telemetry...</p>
        </div>
      </div>
    );
  }

  const { metrics, workerStatus, recentLogs, activeCampaignsList } = stats;

  const totalDelivered = metrics.totalDelivered;
  const totalBounced = metrics.totalBounced;
  const totalFailed = metrics.totalFailed;
  const totalTracked = totalDelivered + totalBounced + totalFailed;

  const deliveredPct = totalTracked > 0 ? Math.round((totalDelivered / totalTracked) * 100) : 100;
  const bouncePct = totalTracked > 0 ? Math.round((totalBounced / totalTracked) * 100) : 0;
  const failPct = totalTracked > 0 ? Math.round((totalFailed / totalTracked) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Email Operations Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise high-throughput dispatch engine &bull; Real-time SMTP telemetry and queue scheduler
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadSampleExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
            title="Download test Excel spreadsheet with sample subscribers"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Get Sample Excel (.xlsx)</span>
          </button>
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20"
          >
            <Users className="w-4 h-4" />
            <span>Import Contacts</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Contacts</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.totalContacts.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">{metrics.activeContacts} active</span>
            <span>&bull;</span>
            <span>{metrics.suppressionCount} suppressed</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Emails Sent</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.totalEmailsSent.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <span className="text-cyan-400 font-medium">{metrics.deliveryRate}%</span>
            <span>inbox delivery rate</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Delivered</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {metrics.totalDelivered.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">{metrics.openRate}%</span>
            <span>opened &bull; {metrics.clickRate}% clicked</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Bounces &amp; Fails</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {(metrics.totalBounced + metrics.totalFailed).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <span className="text-rose-400 font-medium">{metrics.bounceRate}%</span>
            <span>bounce rate</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Queue &amp; Scheduled</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {metrics.pendingEmails}
          </div>
          <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
            <span className="text-amber-400 font-medium">{metrics.scheduledCampaigns}</span>
            <span>scheduled campaigns</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Charts & Engine Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Performance Visual Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Delivery Breakdown
              </h2>
              <span className="text-xs text-slate-400">RFC 5321</span>
            </div>

            {/* Visual Progress Bar Distribution */}
            <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex mb-4">
              <div
                style={{ width: `${deliveredPct}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Delivered: ${deliveredPct}%`}
              />
              <div
                style={{ width: `${bouncePct}%` }}
                className="bg-rose-500 h-full transition-all duration-500"
                title={`Bounced: ${bouncePct}%`}
              />
              <div
                style={{ width: `${failPct}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Failed: ${failPct}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-slate-800">
              <div>
                <div className="text-xs text-slate-400">Delivered</div>
                <div className="text-lg font-bold text-emerald-400">{deliveredPct}%</div>
                <div className="text-[11px] text-slate-400">{metrics.totalDelivered} sent</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Bounced</div>
                <div className="text-lg font-bold text-rose-400">{bouncePct}%</div>
                <div className="text-[11px] text-slate-400">{metrics.totalBounced} MTA</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Failed/Retry</div>
                <div className="text-lg font-bold text-amber-400">{failPct}%</div>
                <div className="text-[11px] text-slate-400">{metrics.totalFailed} retry</div>
              </div>
            </div>
          </div>

          {/* Engagement Ratios */}
          <div className="mt-5 space-y-3">
            <div className="text-xs font-semibold uppercase text-slate-400">
              Recipient Engagement Metrics
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Open Rate</span>
                <span className="text-indigo-400 font-semibold">{metrics.openRate}% ({metrics.totalOpened})</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(metrics.openRate, 100)}%` }}
                  className="bg-indigo-500 h-full rounded-full"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Click-Through Rate (CTR)</span>
                <span className="text-cyan-400 font-semibold">{metrics.clickRate}% ({metrics.totalClicked})</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(metrics.clickRate, 100)}%` }}
                  className="bg-cyan-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Server & SMTP Engine Health */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                MTA &amp; Scheduler Health
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Operational
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Active Delivery Mode</span>
                <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded">
                  {smtpConfig?.mode === 'simulator' ? 'Simulated Sandbox MTA' : 'Live External SMTP'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Relay Host &amp; Port</span>
                <span className="font-mono text-slate-300">
                  {smtpConfig?.host}:{smtpConfig?.port} ({smtpConfig?.secure ? 'SSL/465' : 'TLS/STARTTLS'})
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Daemon Poll Rate</span>
                <span className="text-slate-300 font-medium">1.8s tick (async queue)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Sender Identity (From)</span>
                <span className="font-mono text-slate-300 truncate max-w-[180px]">
                  {smtpConfig?.fromEmail}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">DNS Authentication</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SPF / DKIM / DMARC Configured
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Worker Uptime: <strong>{workerStatus.uptimeSeconds}s</strong>
            </span>
            <button
              onClick={() => onNavigateTab('smtp')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              Configure SMTP <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Event Activity Feed */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Live SMTP Event Stream
              </h2>
              <button
                onClick={() => onNavigateTab('logs')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
              >
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {recentLogs.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-8">
                  No delivery logs recorded yet. Send a campaign or test email to see real-time events.
                </div>
              ) : (
                recentLogs.slice(0, 6).map((log) => {
                  let badge = 'bg-slate-800 text-slate-300';
                  if (log.event === 'delivered') badge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                  else if (log.event === 'hard_bounce' || log.event === 'rejected') badge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                  else if (log.event === 'soft_bounce') badge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                  else if (log.event === 'opened') badge = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
                  else if (log.event === 'clicked') badge = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';

                  return (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${badge}`}>
                            {log.event.replace('_', ' ')}
                          </span>
                          <span className="text-slate-300 font-medium truncate">
                            {log.recipientEmail}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {log.details || log.campaignName}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Listening to outbound SMTP socket events in real time
            </span>
          </div>
        </div>
      </div>

      {/* Active & Scheduled Campaigns Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Active &amp; Scheduled Delivery Tasks</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated campaign dispatches currently sending or queued for future delivery
            </p>
          </div>
          <button
            onClick={onOpenCreateCampaign}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Schedule New Campaign</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Campaign Name &amp; Subject</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Recipients</th>
                <th className="py-3 px-4">Delivery Progress</th>
                <th className="py-3 px-4">Scheduled / Start</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {activeCampaignsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active or scheduled campaigns right now. Create a new campaign to begin sending!
                  </td>
                </tr>
              ) : (
                activeCampaignsList.map((campaign) => {
                  const progressPct =
                    campaign.totalRecipients > 0
                      ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
                      : 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{campaign.name}</div>
                        <div className="text-slate-400 text-[11px] truncate max-w-xs">{campaign.subject}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                            campaign.status === 'sending'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                              : campaign.status === 'scheduled'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : campaign.status === 'paused'
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium">
                        {campaign.totalRecipients}
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span>{campaign.sentCount} / {campaign.totalRecipients} sent</span>
                          <span className="font-semibold">{progressPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${progressPct}%` }}
                            className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {campaign.scheduledAt
                          ? new Date(campaign.scheduledAt).toLocaleString()
                          : campaign.startedAt
                          ? formatTimeAgo(campaign.startedAt)
                          : 'Immediate'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {campaign.status === 'scheduled' && (
                          <button
                            onClick={() => onSendNow(campaign.id)}
                            className="p-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg transition-colors"
                            title="Send Now (Bypass Schedule)"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {campaign.status === 'sending' && (
                          <button
                            onClick={() => onPauseCampaign(campaign.id)}
                            className="p-1.5 bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg transition-colors"
                            title="Pause Dispatch"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {campaign.status === 'paused' && (
                          <button
                            onClick={() => onResumeCampaign(campaign.id)}
                            className="p-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg transition-colors"
                            title="Resume Dispatch"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDuplicateCampaign(campaign.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title="Duplicate Campaign"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
