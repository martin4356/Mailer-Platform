import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  Lock,
  Key,
  Database,
  CheckCircle2,
  Terminal,
  Activity,
  UserCheck,
} from 'lucide-react';
import { AuditLog } from '../types';
import { formatTimeAgo } from '../utils/sampleData';

export const AuditView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setAuditLogs(data.auditLogs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const downloadBackup = () => {
    // Generate snapshot download
    window.open('/api/dashboard/stats', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Security Posture, RBAC &amp; Administrative Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of administrative events, contact modifications, and campaign actions
          </p>
        </div>

        <button
          onClick={downloadBackup}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export System Telemetry Snapshot</span>
        </button>
      </div>

      {/* Security Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
            <Lock className="w-4 h-4" />
            <span>Password Hashing</span>
          </div>
          <div className="text-white font-bold text-sm">Bcrypt (Cost 10)</div>
          <p className="text-[11px] text-slate-400">Salted password hashing with constant-time verification.</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Role-Based Access</span>
          </div>
          <div className="text-white font-bold text-sm">Superadmin Active</div>
          <p className="text-[11px] text-slate-400">Full administrative authorization on API routes.</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
            <Database className="w-4 h-4" />
            <span>Persistence &amp; Storage</span>
          </div>
          <div className="text-white font-bold text-sm">Atomic Disk I/O</div>
          <p className="text-[11px] text-slate-400">Crash-safe write-and-rename serialization.</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <Activity className="w-4 h-4" />
            <span>Queue Isolation</span>
          </div>
          <div className="text-white font-bold text-sm">Async Daemon</div>
          <p className="text-[11px] text-slate-400">Runs detached in background with automatic retries.</p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Administrative Actions Log</h2>
          <span className="text-xs text-slate-400">{auditLogs.length} events recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Details &amp; Parameters</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{log.user}</td>
                    <td className="py-3 px-4 capitalize text-slate-400">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-300 max-w-md truncate">{log.details}</td>
                    <td className="py-3 px-4 text-slate-400 text-right whitespace-nowrap">
                      {formatTimeAgo(log.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
