import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ContactsView } from './components/ContactsView';
import { CampaignsView } from './components/CampaignsView';
import { TemplatesView } from './components/TemplatesView';
import { LogsView } from './components/LogsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SmtpSettingsView } from './components/SmtpSettingsView';
import { AuditView } from './components/AuditView';
import {
  DashboardStats,
  Contact,
  Segment,
  Campaign,
  EmailTemplate,
  DeliveryLog,
  SuppressionEntry,
  SmtpConfig,
} from './types';
import { dataService } from './services/dataService';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsTotalPages, setContactsTotalPages] = useState(1);
  const [contactSearch, setContactSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState('all');
  const [contactTagFilter, setContactTagFilter] = useState('all');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Segments & Suppression
  const [segments, setSegments] = useState<Segment[]>([]);
  const [suppression, setSuppression] = useState<SuppressionEntry[]>([]);

  // Campaigns & Templates
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);

  // Delivery Logs state
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsCampaignFilter, setLogsCampaignFilter] = useState('all');
  const [logsEventFilter, setLogsEventFilter] = useState('all');
  const [logsStatusFilter, setLogsStatusFilter] = useState('all');

  // Fetch Dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await dataService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  }, []);

  // Fetch SMTP Configuration
  const fetchSmtpConfig = useCallback(async () => {
    try {
      const cfg = await dataService.getSmtpConfig();
      setSmtpConfig(cfg);
    } catch (err) {
      console.error('Failed to fetch SMTP config:', err);
    }
  }, []);

  // Fetch Contacts
  const fetchContacts = useCallback(async () => {
    try {
      const data = await dataService.getContacts({
        search: contactSearch,
        status: contactStatusFilter,
        tag: contactTagFilter,
        page: contactsPage,
      });
      setContacts(data.contacts || []);
      setTotalContacts(data.total || 0);
      setContactsTotalPages(data.totalPages || 1);
      setAvailableTags(data.availableTags || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  }, [contactsPage, contactSearch, contactStatusFilter, contactTagFilter]);

  // Fetch Segments & Suppression
  const fetchSegmentsAndSuppression = useCallback(async () => {
    try {
      const [segs, sups] = await Promise.all([
        dataService.getSegments(),
        dataService.getSuppression(),
      ]);
      setSegments(segs || []);
      setSuppression(sups || []);
    } catch (err) {
      console.error('Failed to fetch segments/suppression:', err);
    }
  }, []);

  // Fetch Campaigns & Templates
  const fetchCampaignsAndTemplates = useCallback(async () => {
    try {
      const [camps, tmpls] = await Promise.all([
        dataService.getCampaigns(),
        dataService.getTemplates(),
      ]);
      setCampaigns(camps || []);
      setTemplates(tmpls || []);
    } catch (err) {
      console.error('Failed to fetch campaigns/templates:', err);
    }
  }, []);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    try {
      const data = await dataService.getLogs({
        search: logsSearch,
        campaignId: logsCampaignFilter,
        event: logsEventFilter,
        status: logsStatusFilter,
      });
      setLogs(data.logs || []);
      setTotalLogs(data.total || 0);
      setLogsTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, [logsSearch, logsCampaignFilter, logsEventFilter, logsStatusFilter]);

  // Initial Load
  useEffect(() => {
    fetchStats();
    fetchSmtpConfig();
    fetchContacts();
    fetchSegmentsAndSuppression();
    fetchCampaignsAndTemplates();
    fetchLogs();
  }, []);

  // Polling for live dashboard & delivery telemetry (every 2.5s)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStats();
      if (activeTab === 'logs') {
        fetchLogs();
      }
      if (activeTab === 'campaigns') {
        fetchCampaignsAndTemplates();
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [fetchStats, fetchLogs, fetchCampaignsAndTemplates, activeTab]);

  // Refresh all
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchStats(),
      fetchSmtpConfig(),
      fetchContacts(),
      fetchSegmentsAndSuppression(),
      fetchCampaignsAndTemplates(),
      fetchLogs(),
    ]);
    setIsRefreshing(false);
  };

  // Campaign Handlers
  const handleSendNow = async (campaignId: string) => {
    try {
      await dataService.sendCampaignNow(campaignId);
      handleRefreshAll();
      return true;
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      return false;
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await dataService.pauseCampaign(campaignId);
      fetchCampaignsAndTemplates();
      fetchStats();
      return true;
    } catch {
      return false;
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await dataService.resumeCampaign(campaignId);
      fetchCampaignsAndTemplates();
      fetchStats();
      return true;
    } catch {
      return false;
    }
  };

  const handleCancelCampaign = async (campaignId: string) => {
    try {
      await dataService.cancelCampaign(campaignId);
      fetchCampaignsAndTemplates();
      fetchStats();
      return true;
    } catch {
      return false;
    }
  };

  const handleDuplicateCampaign = async (campaignId: string) => {
    try {
      await dataService.duplicateCampaign(campaignId);
      fetchCampaignsAndTemplates();
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return false;
    try {
      await dataService.deleteCampaign(campaignId);
      fetchCampaignsAndTemplates();
      fetchStats();
      return true;
    } catch {
      return false;
    }
  };

  const handleSendTestEmail = async (campaignId: string, testEmail: string) => {
    try {
      const res = await dataService.sendTestEmail(campaignId, testEmail);
      fetchLogs();
      fetchStats();
      return res;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const handleCreateCampaign = async (data: Partial<Campaign>) => {
    try {
      await dataService.createCampaign(data);
      fetchCampaignsAndTemplates();
      fetchStats();
      return true;
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      return false;
    }
  };

  // Contact Handlers
  const handleCreateContact = async (data: Partial<Contact>) => {
    try {
      await dataService.createContact(data);
      fetchContacts();
      fetchStats();
      return true;
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      return false;
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return false;
    try {
      await dataService.deleteContact(id);
      fetchContacts();
      fetchStats();
      return true;
    } catch {
      return false;
    }
  };

  // Segments & Suppression Handlers
  const handleCreateSegment = async (data: { name: string; description: string; filterTag: string }) => {
    try {
      await dataService.createSegment(data);
      fetchSegmentsAndSuppression();
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteSegment = async (id: string) => {
    try {
      await dataService.deleteSegment(id);
      fetchSegmentsAndSuppression();
      return true;
    } catch {
      return false;
    }
  };

  const handleAddSuppression = async (email: string, reason: any, notes?: string) => {
    try {
      await dataService.addSuppression(email, reason, notes);
      fetchSegmentsAndSuppression();
      fetchContacts();
      fetchStats();
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteSuppression = async (id: string) => {
    try {
      await dataService.deleteSuppression(id);
      fetchSegmentsAndSuppression();
      fetchStats();
      return true;
    } catch {
      return false;
    }
  };

  // SMTP Settings Handlers
  const handleUpdateSmtpConfig = async (config: Partial<SmtpConfig>) => {
    try {
      await dataService.updateSmtpConfig(config);
      setSmtpConfig((prev) => (prev ? { ...prev, ...config } : null));
      return true;
    } catch {
      return false;
    }
  };

  const handleTestSmtpConnection = async (config: Partial<SmtpConfig>) => {
    return await dataService.testSmtp(config);
  };

  // Template Handlers
  const handleCreateTemplate = async (data: Partial<EmailTemplate>) => {
    try {
      await dataService.createTemplate(data);
      fetchCampaignsAndTemplates();
      return true;
    } catch {
      return false;
    }
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    setActiveTab('campaigns');
    setIsCreateCampaignOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={stats?.workerStatus?.queuePending || 0}
        workerRunning={stats?.workerStatus?.isRunning ?? true}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          smtpConfig={smtpConfig || undefined}
          workerStatus={stats?.workerStatus}
          onOpenImport={() => setActiveTab('contacts')}
          onOpenCreateCampaign={() => {
            setActiveTab('campaigns');
            setIsCreateCampaignOpen(true);
          }}
          onOpenSmtp={() => setActiveTab('smtp')}
          onRefresh={handleRefreshAll}
          isRefreshing={isRefreshing}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                smtpConfig={smtpConfig || undefined}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCreateCampaign={() => {
                  setActiveTab('campaigns');
                  setIsCreateCampaignOpen(true);
                }}
                onOpenImport={() => setActiveTab('contacts')}
                onSendNow={handleSendNow}
                onPauseCampaign={handlePauseCampaign}
                onResumeCampaign={handleResumeCampaign}
                onDuplicateCampaign={handleDuplicateCampaign}
              />
            )}

            {activeTab === 'contacts' && (
              <ContactsView
                contacts={contacts}
                segments={segments}
                suppression={suppression}
                availableTags={availableTags}
                totalContacts={totalContacts}
                page={contactsPage}
                totalPages={contactsTotalPages}
                search={contactSearch}
                statusFilter={contactStatusFilter}
                tagFilter={contactTagFilter}
                onSearchChange={(s) => {
                  setContactSearch(s);
                  setContactsPage(1);
                }}
                onStatusFilterChange={(s) => {
                  setContactStatusFilter(s);
                  setContactsPage(1);
                }}
                onTagFilterChange={(t) => {
                  setContactTagFilter(t);
                  setContactsPage(1);
                }}
                onPageChange={setContactsPage}
                onRefresh={fetchContacts}
                onCreateContact={handleCreateContact}
                onDeleteContact={handleDeleteContact}
                onCreateSegment={handleCreateSegment}
                onDeleteSegment={handleDeleteSegment}
                onAddSuppression={handleAddSuppression}
                onDeleteSuppression={handleDeleteSuppression}
                onImportConfirmed={() => {
                  fetchContacts();
                  fetchStats();
                  fetchSegmentsAndSuppression();
                }}
              />
            )}

            {activeTab === 'campaigns' && (
              <CampaignsView
                campaigns={campaigns}
                segments={segments}
                templates={templates}
                contacts={contacts}
                onRefresh={fetchCampaignsAndTemplates}
                onCreateCampaign={handleCreateCampaign}
                onSendNow={handleSendNow}
                onPauseCampaign={handlePauseCampaign}
                onResumeCampaign={handleResumeCampaign}
                onCancelCampaign={handleCancelCampaign}
                onDuplicateCampaign={handleDuplicateCampaign}
                onDeleteCampaign={handleDeleteCampaign}
                onSendTestEmail={handleSendTestEmail}
                isCreateModalOpen={isCreateCampaignOpen}
                setIsCreateModalOpen={setIsCreateCampaignOpen}
              />
            )}

            {activeTab === 'templates' && (
              <TemplatesView
                templates={templates}
                onUseTemplate={handleUseTemplate}
                onCreateTemplate={handleCreateTemplate}
              />
            )}

            {activeTab === 'logs' && (
              <LogsView
                logs={logs}
                campaigns={campaigns}
                totalLogs={totalLogs}
                page={logsPage}
                totalPages={logsTotalPages}
                search={logsSearch}
                campaignFilter={logsCampaignFilter}
                eventFilter={logsEventFilter}
                statusFilter={logsStatusFilter}
                onSearchChange={(s) => {
                  setLogsSearch(s);
                  setLogsPage(1);
                }}
                onCampaignFilterChange={(c) => {
                  setLogsCampaignFilter(c);
                  setLogsPage(1);
                }}
                onEventFilterChange={(e) => {
                  setLogsEventFilter(e);
                  setLogsPage(1);
                }}
                onStatusFilterChange={(st) => {
                  setLogsStatusFilter(st);
                  setLogsPage(1);
                }}
                onPageChange={setLogsPage}
                onRefresh={fetchLogs}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView campaigns={campaigns} stats={stats} />
            )}

            {activeTab === 'smtp' && (
              <SmtpSettingsView
                smtpConfig={smtpConfig}
                onUpdateConfig={handleUpdateSmtpConfig}
                onTestConnection={handleTestSmtpConnection}
              />
            )}

            {activeTab === 'audit' && <AuditView />}
          </div>
        </main>
      </div>
    </div>
  );
}
