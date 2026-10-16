import React, { useState } from 'react';
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Globe,
  Sliders,
  Lock,
} from 'lucide-react';
import { SmtpConfig } from '../types';

interface SmtpSettingsViewProps {
  smtpConfig: SmtpConfig | null;
  onUpdateConfig: (config: Partial<SmtpConfig>) => Promise<boolean>;
  onTestConnection: (config: Partial<SmtpConfig>) => Promise<{
    success: boolean;
    message: string;
    latencyMs: number;
    tlsCipher?: string;
  }>;
}

export const SmtpSettingsView: React.FC<SmtpSettingsViewProps> = ({
  smtpConfig,
  onUpdateConfig,
  onTestConnection,
}) => {
  if (!smtpConfig) return null;

  const [mode, setMode] = useState<'simulator' | 'custom'>(smtpConfig.mode);
  const [host, setHost] = useState(smtpConfig.host);
  const [port, setPort] = useState(smtpConfig.port);
  const [secure, setSecure] = useState(smtpConfig.secure);
  const [user, setUser] = useState(smtpConfig.user);
  const [pass, setPass] = useState(smtpConfig.pass);
  const [fromName, setFromName] = useState(smtpConfig.fromName);
  const [fromEmail, setFromEmail] = useState(smtpConfig.fromEmail);
  const [replyTo, setReplyTo] = useState(smtpConfig.replyTo);
  const [enableTracking, setEnableTracking] = useState(smtpConfig.enableTracking);
  const [domain, setDomain] = useState(smtpConfig.domain || 'automail.io');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
    tlsCipher?: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const ok = await onUpdateConfig({
        mode,
        host,
        port: Number(port),
        secure,
        user,
        pass,
        fromName,
        fromEmail,
        replyTo,
        enableTracking,
        domain,
      });
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection({
        mode,
        host,
        port: Number(port),
        secure,
        user,
        pass,
        fromEmail,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
        latencyMs: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const spfValue = `v=spf1 include:_spf.${domain} ~all`;
  const dkimSelector = `mail._domainkey.${domain}`;
  const dkimValue = `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3...`;
  const dmarcHost = `_dmarc.${domain}`;
  const dmarcValue = `v=DMARC1; p=reject; rua=mailto:dmarc-reports@${domain}; pct=100`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Mail Server, SMTP Relay &amp; DNS Authentication
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure outbound MTA transport, TLS certificates, and DNS authentication records (SPF, DKIM, DMARC)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isTesting}
            onClick={handleTest}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isTesting ? 'Testing Handshake...' : 'Test SMTP Handshake'}</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setMode('simulator')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            mode === 'simulator'
              ? 'bg-cyan-950/20 border-cyan-500 shadow-md shadow-cyan-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Sandbox Simulator MTA (Recommended for Evaluation)
            </span>
            {mode === 'simulator' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Zero external setup required. Fully emulates standard SMTP socket behavior, 250 OK transactions, bounce detection, and real-time open/click engagement events.
          </p>
        </div>

        <div
          onClick={() => setMode('custom')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            mode === 'custom'
              ? 'bg-indigo-950/20 border-indigo-500 shadow-md shadow-indigo-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              Live External SMTP Relay / Dedicated MTA
            </span>
            {mode === 'custom' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Dispatches through real external providers (SendGrid, Amazon SES, Mailgun, Postmark, Google Workspace SMTP) or your private Postfix/Exim mail server.
          </p>
        </div>
      </div>

      {/* Connection Test Diagnostics Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold text-white">
              {testResult.success ? 'SMTP Handshake Verified (220 Service Ready)' : 'Connection Failed'}
            </div>
            <p>{testResult.message}</p>
            {testResult.latencyMs > 0 && (
              <div className="text-[11px] opacity-80">
                Round-trip latency: <strong>{testResult.latencyMs}ms</strong> &bull; Cipher:{' '}
                <strong>{testResult.tlsCipher || 'TLS 1.3'}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Settings */}
      <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            SMTP Relay Configuration
          </h2>
          <span className="text-xs text-slate-400">Encrypted in session &amp; protected on disk</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              SMTP Relay Host <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp.example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Port Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              required
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="587"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">587 (STARTTLS), 465 (SSL), 25 (Standard)</span>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Security / TLS</label>
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Enforce SSL/TLS Direct Handshake (Port 465)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">SMTP Username</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="apikey or username"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              SMTP Password / API Key
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-t border-slate-800 pt-4">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Default Sender Name</label>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Default From Email</label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Default Reply-To</label>
            <input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={enableTracking}
              onChange={(e) => setEnableTracking(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0"
            />
            <span>Enable transparent 1x1 open tracking pixel &amp; click link redirection</span>
          </label>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settings Saved!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save SMTP Settings'}
            </button>
          </div>
        </div>
      </form>

      {/* DNS Setup & Email Authentication Guide */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              DNS Authentication Guide (SPF, DKIM &amp; DMARC)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Modern postmaster requirements for Gmail, Yahoo &amp; Microsoft 365 inbox placement
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Sending Domain:</span>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* SPF */}
          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">1. SPF Record</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 font-mono">TXT</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Authorizes AutoMail IP to dispatch on behalf of your domain.</p>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-cyan-300 break-all border border-slate-800 my-2">
                {spfValue}
              </div>
            </div>
            <button
              onClick={() => handleCopy(spfValue, 'spf')}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copiedKey === 'spf' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'spf' ? 'Copied' : 'Copy SPF Record'}</span>
            </button>
          </div>

          {/* DKIM */}
          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">2. DKIM Signature</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 font-mono">TXT</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Cryptographic key verifying message integrity.</p>
              <div className="text-[10px] text-slate-400 font-mono">Host: {dkimSelector}</div>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-cyan-300 break-all border border-slate-800 my-2 line-clamp-2">
                {dkimValue}
              </div>
            </div>
            <button
              onClick={() => handleCopy(dkimValue, 'dkim')}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copiedKey === 'dkim' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'dkim' ? 'Copied' : 'Copy DKIM Record'}</span>
            </button>
          </div>

          {/* DMARC */}
          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">3. DMARC Policy</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 font-mono">TXT</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Enforces policy against phishing and spoofing.</p>
              <div className="text-[10px] text-slate-400 font-mono">Host: {dmarcHost}</div>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-cyan-300 break-all border border-slate-800 my-2">
                {dmarcValue}
              </div>
            </div>
            <button
              onClick={() => handleCopy(dmarcValue, 'dmarc')}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copiedKey === 'dmarc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'dmarc' ? 'Copied' : 'Copy DMARC Record'}</span>
            </button>
          </div>
        </div>

        {/* Postmaster Best Practices Warning */}
        <div className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Important Deliverability Principles:</span>
          </div>
          <p>
            Installing or pointing to a mail server does not guarantee inbox delivery on its own. Ensure:
            (1) Reverse DNS (PTR) record matches your mail hostname,
            (2) New dedicated IPs are warmed up gradually using the throttle setting,
            (3) Global spam complaint rate stays strictly below 0.1%.
          </p>
        </div>
      </div>
    </div>
  );
};
