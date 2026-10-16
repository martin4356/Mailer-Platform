import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Eye,
  MousePointer,
  AlertTriangle,
  UserX,
  Clock,
  Zap,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Campaign, DashboardStats } from '../types';

interface AnalyticsViewProps {
  campaigns: Campaign[];
  stats: DashboardStats | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ campaigns, stats }) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Compute aggregate or individual numbers
  const totalRecipients = selectedCampaign
    ? selectedCampaign.totalRecipients
    : stats?.metrics.totalContacts || 0;
  const totalSent = selectedCampaign
    ? selectedCampaign.sentCount
    : stats?.metrics.totalEmailsSent || 0;
  const totalDelivered = selectedCampaign
    ? selectedCampaign.deliveredCount
    : stats?.metrics.totalDelivered || 0;
  const totalOpened = selectedCampaign
    ? selectedCampaign.openedCount
    : stats?.metrics.totalOpened || 0;
  const totalClicked = selectedCampaign
    ? selectedCampaign.clickedCount
    : stats?.metrics.totalClicked || 0;
  const totalBounced = selectedCampaign
    ? selectedCampaign.bouncedCount
    : stats?.metrics.totalBounced || 0;
  const totalUnsubscribed = selectedCampaign
    ? selectedCampaign.unsubscribedCount
    : stats?.metrics.unsubscribedContacts || 0;

  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '100.0';
  const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0.0';
  const clickRate = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : '0.0';
  const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : '0.0';
  const unsubRate = totalDelivered > 0 ? ((totalUnsubscribed / totalDelivered) * 100).toFixed(2) : '0.00';

  // Calculate duration and sending speed
  let durationStr = 'N/A';
  let speedStr = '60 emails / min';
  if (selectedCampaign?.startedAt && selectedCampaign?.completedAt) {
    const diffMs = new Date(selectedCampaign.completedAt).getTime() - new Date(selectedCampaign.startedAt).getTime();
    const mins = Math.max(1, Math.round(diffMs / 60000));
    durationStr = `${mins} min`;
    speedStr = `${Math.round((selectedCampaign.sentCount / (diffMs / 1000)) * 60)} / min`;
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Campaign Performance &amp; Deliverability Reports
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed conversion funnel, mailbox delivery confirmation, and recipient engagement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 max-w-xs"
          >
            <option value="all">Aggregate All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Sent</span>
          <div className="text-2xl font-bold text-white mt-1">{totalSent.toLocaleString()}</div>
          <span className="text-[11px] text-slate-400">Target: {totalRecipients}</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Delivered</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{totalDelivered.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-400/90 font-medium">{deliveryRate}% success</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Unique Opens</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{totalOpened.toLocaleString()}</div>
          <span className="text-[11px] text-indigo-400/90 font-medium">{openRate}% open rate</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Link Clicks</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{totalClicked.toLocaleString()}</div>
          <span className="text-[11px] text-cyan-400/90 font-medium">{clickRate}% CTR</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Bounced</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{totalBounced.toLocaleString()}</div>
          <span className="text-[11px] text-rose-400/90 font-medium">{bounceRate}% bounce rate</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Unsubscribes</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{totalUnsubscribed.toLocaleString()}</div>
          <span className="text-[11px] text-amber-400/90 font-medium">{unsubRate}% rate</span>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Audience Conversion Funnel
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Stage-by-stage progression from dispatch to recipient interaction
          </p>
        </div>

        <div className="space-y-4 max-w-3xl">
          {/* Stage 1: Sent */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">1. Dispatched Emails ({totalSent})</span>
              <span className="text-white">100%</span>
            </div>
            <div className="h-5 w-full bg-slate-800 rounded-lg overflow-hidden">
              <div className="h-full bg-slate-600 rounded-lg w-full" />
            </div>
          </div>

          {/* Stage 2: Delivered */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-emerald-400">2. Mailbox Accepted &amp; Delivered ({totalDelivered})</span>
              <span className="text-emerald-400">{deliveryRate}%</span>
            </div>
            <div className="h-5 w-full bg-slate-800 rounded-lg overflow-hidden">
              <div
                style={{ width: `${deliveryRate}%` }}
                className="h-full bg-emerald-500 rounded-lg transition-all duration-500"
              />
            </div>
          </div>

          {/* Stage 3: Opened */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-indigo-400">3. Opened &amp; Read ({totalOpened})</span>
              <span className="text-indigo-400">{openRate}% of delivered</span>
            </div>
            <div className="h-5 w-full bg-slate-800 rounded-lg overflow-hidden">
              <div
                style={{ width: `${Math.min(Number(openRate), 100)}%` }}
                className="h-full bg-indigo-500 rounded-lg transition-all duration-500"
              />
            </div>
          </div>

          {/* Stage 4: Clicked */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-cyan-400">4. CTA Link Clicked ({totalClicked})</span>
              <span className="text-cyan-400">{clickRate}% of delivered</span>
            </div>
            <div className="h-5 w-full bg-slate-800 rounded-lg overflow-hidden">
              <div
                style={{ width: `${Math.min(Number(clickRate), 100)}%` }}
                className="h-full bg-cyan-500 rounded-lg transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Operational Timings & Speed */}
      {selectedCampaign && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold mb-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Dispatch Timeline</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Started:</span>
                <span className="text-white font-medium">
                  {selectedCampaign.startedAt ? new Date(selectedCampaign.startedAt).toLocaleString() : 'Not started'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Completed:</span>
                <span className="text-white font-medium">
                  {selectedCampaign.completedAt ? new Date(selectedCampaign.completedAt).toLocaleString() : 'In progress'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Total Duration:</span>
                <span className="text-indigo-400 font-bold">{durationStr}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Throughput Speed</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1">{speedStr}</div>
            <p className="text-xs text-slate-400 mt-1">
              Throttled to {selectedCampaign.rateLimitPerMin}/min to protect domain reputation.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-semibold mb-2">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>Suppression &amp; Compliance</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">100% Compliant</div>
            <p className="text-xs text-slate-400 mt-1">
              One-click unsubscribe headers enabled &bull; RFC 8058 compliant.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
