import React from 'react';
import {
  LayoutDashboard,
  Users,
  Send,
  FileCode,
  Activity,
  BarChart3,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'contacts'
  | 'campaigns'
  | 'templates'
  | 'logs'
  | 'analytics'
  | 'smtp'
  | 'audit';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingCount?: number;
  workerRunning?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  workerRunning = true,
}) => {
  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'contacts' as TabType,
      label: 'Contacts & Import',
      icon: Users,
      badge: 'Excel / CSV',
    },
    {
      id: 'campaigns' as TabType,
      label: 'Campaigns',
      icon: Send,
      badge: pendingCount > 0 ? `${pendingCount} queue` : null,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    },
    {
      id: 'templates' as TabType,
      label: 'Email Templates',
      icon: FileCode,
      badge: null,
    },
    {
      id: 'logs' as TabType,
      label: 'Live Delivery Logs',
      icon: Activity,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse',
    },
    {
      id: 'analytics' as TabType,
      label: 'Campaign Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'smtp' as TabType,
      label: 'Mail Server & SMTP',
      icon: Server,
      badge: null,
    },
    {
      id: 'audit' as TabType,
      label: 'Compliance & Audit',
      icon: ShieldCheck,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            AutoMail
            <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
              PRO
            </span>
          </span>
          <span className="text-[11px] text-slate-400 block -mt-0.5">Marketing Automation</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    item.badgeColor ||
                    (isActive
                      ? 'bg-indigo-700/60 text-white'
                      : 'bg-slate-800 text-slate-400')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Worker System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-2 font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                workerRunning ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
              }`}
            />
            Queue Worker
          </span>
          <span
            className={`font-semibold ${
              workerRunning ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {workerRunning ? 'Active (Auto)' : 'Idle'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 leading-relaxed">
          Asynchronous background email dispatcher polling every 1.8s.
        </div>
      </div>
    </aside>
  );
};
