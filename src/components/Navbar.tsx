import React from 'react';
import {
  Send,
  Upload,
  Server,
  LogOut,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { SmtpConfig, WorkerStatus } from '../types';

interface NavbarProps {
  smtpConfig?: SmtpConfig;
  workerStatus?: WorkerStatus;
  onOpenImport: () => void;
  onOpenCreateCampaign: () => void;
  onOpenSmtp: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  smtpConfig,
  workerStatus,
  onOpenImport,
  onOpenCreateCampaign,
  onOpenSmtp,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {/* Mode & Health Badges */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSmtp}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              smtpConfig?.mode === 'simulator'
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800 hover:bg-cyan-900/60'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
            }`}
            title="Click to configure SMTP or switch between Simulated MTA and Live External SMTP"
          >
            <Server className="w-3.5 h-3.5" />
            <span>
              {smtpConfig?.mode === 'simulator'
                ? 'Sandbox MTA (Active)'
                : `Live SMTP: ${smtpConfig?.host || 'Connected'}`}
            </span>
          </button>

          {workerStatus && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>
                Queue: <strong>{workerStatus.queuePending}</strong> pending
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Refresh All Real-Time Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        <button
          onClick={onOpenImport}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Upload Excel / CSV</span>
        </button>

        <button
          onClick={onOpenCreateCampaign}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </button>

        {/* User profile dropdown indicator */}
        <div className="h-6 w-px bg-slate-800 mx-1"></div>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
          <div className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
            AD
          </div>
          <span className="font-medium hidden sm:inline">Admin (Superuser)</span>
        </div>
      </div>
    </header>
  );
};
