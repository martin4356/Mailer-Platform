import React, { useState } from 'react';
import {
  Activity,
  Search,
  Filter,
  Download,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  MousePointer,
  ShieldAlert,
  Server,
  Info,
  RefreshCw,
} from 'lucide-react';
import { DeliveryLog, Campaign } from '../types';
import { formatTimeAgo } from '../utils/sampleData';

interface LogsViewProps {
  logs: DeliveryLog[];
  campaigns: Campaign[];
  totalLogs: number;
  page: number;
  totalPages: number;
  search: string;
  campaignFilter: string;
  eventFilter: string;
  statusFilter: string;
  onSearchChange: (val: string) => void;
  onCampaignFilterChange: (val: string) => void;
  onEventFilterChange: (val: string) => void;
  onStatusFilterChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({
  logs,
  campaigns,
  totalLogs,
  page,
  totalPages,
  search,
  campaignFilter,
  eventFilter,
  statusFilter,
  onSearchChange,
  onCampaignFilterChange,
  onEventFilterChange,
  onStatusFilterChange,
  onPageChange,
  onRefresh,
}) => {
  const [selectedLog, setSelectedLog] = useState<DeliveryLog | null>(null);

  const getEventBadge = (event: DeliveryLog['event']) => {
    switch (event) {
      case 'delivered':
        return {
          icon: CheckCircle2,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          label: 'Inbox Delivered',
        };
      case 'smtp_accepted':
        return {
          icon: Server,
          color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          label: 'MTA Accepted (250)',
        };
      case 'opened':
        return {
          icon: Eye,
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          label: 'Pixel Opened',
        };
      case 'clicked':
        return {
          icon: MousePointer,
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          label: 'Link Clicked',
        };
      case 'hard_bounce':
        return {
          icon: XCircle,
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          label: 'Hard Bounce (550)',
        };
      case 'soft_bounce':
        return {
          icon: AlertTriangle,
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          label: 'Soft Bounce (421)',
        };
      case 'unsubscribed':
        return {
          icon: ShieldAlert,
          color: 'bg-slate-700 text-amber-300 border-amber-500/20',
          label: 'Unsubscribed',
        };
      case 'sending':
        return {
          icon: Clock,
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse',
          label: 'Dispatching',
        };
      case 'queued':
      default:
        return {
          icon: Info,
          color: 'bg-slate-800 text-slate-300 border-slate-700',
          label: 'Queue Ingest',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Real-Time Delivery Logs &amp; SMTP Inspector
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Low-level socket events, remote MTA status codes, and recipient engagement tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Live Stream</span>
          </button>

          <a
            href={`/api/logs/export-csv?campaignId=${campaignFilter}`}
            download="automail_delivery_logs.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search recipient email, log details..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Campaign Filter */}
          <select
            value={campaignFilter}
            onChange={(e) => onCampaignFilterChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => onEventFilterChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="all">All Events</option>
            <option value="delivered">Delivered (Confirmed)</option>
            <option value="smtp_accepted">SMTP Accepted (250 OK)</option>
            <option value="opened">Opened (Pixel)</option>
            <option value="clicked">Clicked (Link Redirect)</option>
            <option value="hard_bounce">Hard Bounce (550)</option>
            <option value="soft_bounce">Soft Bounce (421 Retry)</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="queued">Queued</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="all">All Severities</option>
            <option value="success">Success</option>
            <option value="warning">Warning / Retry</option>
            <option value="error">Error / Bounce</option>
            <option value="info">Info / In-flight</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 shrink-0">
          Showing <strong>{logs.length}</strong> of <strong>{totalLogs}</strong> logs
        </div>
      </div>

      {/* Logs Stream Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">SMTP Code &amp; Details</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching logs found. Launch a campaign or dispatch a test message to stream live logs.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getEventBadge(log.event);
                  const Icon = badge.icon;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badge.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-white font-medium">{log.recipientEmail}</div>
                        <div className="text-[11px] text-slate-400">{log.recipientName}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {log.campaignName}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {log.smtpCode && (
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                log.smtpCode === 250
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : log.smtpCode >= 500
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {log.smtpCode}
                            </span>
                          )}
                          <span className="text-slate-400 text-[11px] truncate max-w-sm">
                            {log.details || log.smtpResponse || 'OK'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        <div>{formatTimeAgo(log.timestamp)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Inspect raw SMTP payload"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Raw SMTP Diagnostic Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">SMTP Socket &amp; Header Diagnostic</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Event Status</span>
                  <div className="font-semibold text-white capitalize">{selectedLog.event.replace('_', ' ')}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">SMTP Code</span>
                  <div className="font-mono font-bold text-indigo-400">{selectedLog.smtpCode || '250 (OK)'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Recipient</span>
                  <div className="font-mono text-white truncate">{selectedLog.recipientEmail}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Campaign</span>
                  <div className="text-white truncate">{selectedLog.campaignName}</div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-1">
                  MTA Raw Response &amp; Handshake Transcript
                </span>
                <div className="bg-slate-950 font-mono text-[11px] p-3 rounded-xl text-emerald-400 border border-slate-800 break-all leading-relaxed">
                  {selectedLog.smtpResponse || selectedLog.details || '250 2.0.0 OK Message queued for delivery'}
                </div>
              </div>

              {selectedLog.messageId && (
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-1">
                    RFC 5322 Message-ID
                  </span>
                  <div className="bg-slate-950 font-mono text-[11px] p-2.5 rounded-xl text-slate-300 border border-slate-800 select-all">
                    {selectedLog.messageId}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Remote IP: <strong>{selectedLog.ipAddress || '198.51.100.42'}</strong></span>
                <span>Timestamp: <strong>{new Date(selectedLog.timestamp).toISOString()}</strong></span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
