import React, { useState, useRef } from 'react';
import * as xlsx from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  ShieldBan,
  Tag,
  ArrowRight,
  RefreshCw,
  Edit2,
  Users,
} from 'lucide-react';
import { Contact, Segment, SuppressionEntry, ImportPreviewData } from '../types';
import { downloadSampleExcel, downloadSampleCsv, formatTimeAgo } from '../utils/sampleData';

interface ContactsViewProps {
  contacts: Contact[];
  segments: Segment[];
  suppression: SuppressionEntry[];
  availableTags: string[];
  totalContacts: number;
  page: number;
  totalPages: number;
  search: string;
  statusFilter: string;
  tagFilter: string;
  onSearchChange: (search: string) => void;
  onStatusFilterChange: (status: string) => void;
  onTagFilterChange: (tag: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onCreateContact: (data: Partial<Contact>) => Promise<boolean>;
  onDeleteContact: (id: string) => Promise<boolean>;
  onCreateSegment: (data: { name: string; description: string; filterTag: string }) => Promise<boolean>;
  onDeleteSegment: (id: string) => Promise<boolean>;
  onAddSuppression: (email: string, reason: any, notes?: string) => Promise<boolean>;
  onDeleteSuppression: (id: string) => Promise<boolean>;
  onImportConfirmed: () => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  segments,
  suppression,
  availableTags,
  totalContacts,
  page,
  totalPages,
  search,
  statusFilter,
  tagFilter,
  onSearchChange,
  onStatusFilterChange,
  onTagFilterChange,
  onPageChange,
  onRefresh,
  onCreateContact,
  onDeleteContact,
  onCreateSegment,
  onDeleteSegment,
  onAddSuppression,
  onDeleteSuppression,
  onImportConfirmed,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'contacts' | 'segments' | 'suppression'>('contacts');

  // File Upload & Preview State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState({
    email: '',
    name: '',
    company: '',
    city: '',
    phone: '',
    tags: '',
  });
  const [defaultImportTag, setDefaultImportTag] = useState('Imported');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);

  // Manual Add Contact Modal
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [newContactCity, setNewContactCity] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactTags, setNewContactTags] = useState('Manual');

  // Add Segment Modal
  const [showAddSegmentModal, setShowAddSegmentModal] = useState(false);
  const [newSegName, setNewSegName] = useState('');
  const [newSegDesc, setNewSegDesc] = useState('');
  const [newSegTag, setNewSegTag] = useState('');

  // Add Suppression Modal
  const [showAddSuppressionModal, setShowAddSuppressionModal] = useState(false);
  const [suppressEmail, setSuppressEmail] = useState('');
  const [suppressReason, setSuppressReason] = useState<'unsubscribed' | 'hard_bounce' | 'spam_complaint' | 'manual'>('manual');
  const [suppressNotes, setSuppressNotes] = useState('');

  // Handle File Selection with instant client-side SheetJS parsing (Zero network payload limits)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const buffer = await file.arrayBuffer();
      // Parse file using SheetJS (supports .xlsx, .xls, .csv, .tsv regardless of extension typo)
      const workbook = xlsx.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('Spreadsheet has no readable sheets or tabs.');
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('The uploaded spreadsheet contains no data rows.');
      }

      const headers = Object.keys(rawRows[0]);

      // Smart Column Auto-Mapping
      const mapping = {
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

      // If email wasn't matched by header title, check sample row values for '@'
      if (!mapping.email) {
        for (const h of headers) {
          const sample = String(rawRows[0][h] || '');
          if (sample.includes('@') && sample.includes('.')) {
            mapping.email = h;
            break;
          }
        }
      }

      // Email validation (RFC 5322 compatible)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const existingEmails = new Set(contacts.map((c) => c.email.toLowerCase()));
      const seenInFile = new Set<string>();

      let validCount = 0;
      let invalidCount = 0;
      let duplicateInFileCount = 0;
      let duplicateInDbCount = 0;

      for (const row of rawRows) {
        const emailVal = mapping.email ? String(row[mapping.email] || '').trim() : '';
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

      setParsedRows(rawRows);
      setUploadedFileName(file.name);
      setPreviewData({
        fileName: file.name,
        totalRows: rawRows.length,
        headers,
        suggestedMapping: mapping,
        sampleRows: rawRows.slice(0, 10),
        stats: {
          total: rawRows.length,
          valid: validCount,
          existingInDb: duplicateInDbCount,
          duplicatesInFile: duplicateInFileCount,
          invalidEmails: invalidCount,
        },
      });
      setColumnMapping(mapping);
      setDefaultImportTag(`Import-${file.name.replace(/\.[^/.]+$/, '').slice(0, 15)}`);
    } catch (err: any) {
      setUploadError(`Failed to process spreadsheet: ${err.message || 'Please check that the file is a valid Excel or CSV document.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!previewData || parsedRows.length === 0 || !columnMapping.email) return;

    setIsConfirmingImport(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const mappedContacts: Array<{
        email: string;
        name: string;
        company: string;
        city: string;
        phone: string;
        tags: string[];
      }> = [];

      for (const row of parsedRows) {
        const rawEmail = String(row[columnMapping.email] || '').trim();
        if (!rawEmail || !emailRegex.test(rawEmail)) continue;

        const rawName = columnMapping.name ? String(row[columnMapping.name] || '').trim() : '';
        const rawCompany = columnMapping.company ? String(row[columnMapping.company] || '').trim() : '';
        const rawCity = columnMapping.city ? String(row[columnMapping.city] || '').trim() : '';
        const rawPhone = columnMapping.phone ? String(row[columnMapping.phone] || '').trim() : '';
        const rawTags = columnMapping.tags ? String(row[columnMapping.tags] || '').trim() : '';

        const tagsList: string[] = [];
        if (defaultImportTag) tagsList.push(defaultImportTag);
        if (rawTags) {
          rawTags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean).forEach((t) => {
            if (!tagsList.includes(t)) tagsList.push(t);
          });
        }

        mappedContacts.push({
          email: rawEmail,
          name: rawName,
          company: rawCompany,
          city: rawCity,
          phone: rawPhone,
          tags: tagsList,
        });
      }

      if (mappedContacts.length === 0) {
        throw new Error('No valid email records found with the selected column mapping.');
      }

      const res = await fetch('/api/contacts/import-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: mappedContacts,
          source: uploadedFileName || 'excel_import',
          updateExisting,
        }),
      });

      const responseText = await res.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned unexpected response (status ${res.status}): ${responseText.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setPreviewData(null);
      setParsedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onImportConfirmed();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setIsConfirmingImport(false);
    }
  };

  // Create Manual Contact
  const handleCreateContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactEmail) return;

    const tagsArray = newContactTags
      .split(/[,;|]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const ok = await onCreateContact({
      email: newContactEmail,
      name: newContactName,
      company: newContactCompany,
      city: newContactCity,
      phone: newContactPhone,
      tags: tagsArray,
    });

    if (ok) {
      setShowAddContactModal(false);
      setNewContactEmail('');
      setNewContactName('');
      setNewContactCompany('');
      setNewContactCity('');
      setNewContactPhone('');
      setNewContactTags('Manual');
    }
  };

  // Create Segment Submit
  const handleCreateSegmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSegName || !newSegTag) return;
    const ok = await onCreateSegment({
      name: newSegName,
      description: newSegDesc,
      filterTag: newSegTag,
    });
    if (ok) {
      setShowAddSegmentModal(false);
      setNewSegName('');
      setNewSegDesc('');
      setNewSegTag('');
    }
  };

  // Add Suppression Submit
  const handleAddSuppressionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppressEmail) return;
    const ok = await onAddSuppression(suppressEmail, suppressReason, suppressNotes);
    if (ok) {
      setShowAddSuppressionModal(false);
      setSuppressEmail('');
      setSuppressNotes('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('contacts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'contacts'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Contacts ({totalContacts})
          </button>
          <button
            onClick={() => setActiveSubTab('segments')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'segments'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Segments &amp; Groups ({segments.length})
          </button>
          <button
            onClick={() => setActiveSubTab('suppression')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'suppression'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Suppression List ({suppression.length})
          </button>
        </div>

        {/* Global Import / Download Actions */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv,.exlx,.tsv"
            className="hidden"
          />

          <button
            onClick={downloadSampleExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Download sample Excel (.xlsx) file to test import"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sample .xlsx</span>
          </button>

          <button
            onClick={downloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Download sample CSV file to test import"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample .csv</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? 'Processing File...' : 'Upload Excel / CSV'}</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-white font-bold">
            &times;
          </button>
        </div>
      )}

      {/* ------------------- TAB 1: ALL CONTACTS ------------------- */}
      {activeSubTab === 'contacts' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by email, name, company..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => onStatusFilterChange(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                </select>
              </div>

              {/* Tag / Segment Filter */}
              <select
                value={tagFilter}
                onChange={(e) => onTagFilterChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Tags / Segments</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    Tag: {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddContactModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Add Contact</span>
              </button>

              <a
                href="/api/contacts/export-csv"
                download="automail_contacts.csv"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Company &amp; Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tags &amp; Segments</th>
                    <th className="py-3 px-4">Source / Added</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        No contacts found. Upload an Excel (.xlsx) or CSV file above, or add a contact manually.
                      </td>
                    </tr>
                  ) : (
                    contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{c.name || '—'}</div>
                          <div className="font-mono text-slate-400 text-[11px]">{c.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-300 font-medium">{c.company || '—'}</div>
                          <div className="text-slate-400 text-[11px]">{c.city || '—'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                              c.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : c.status === 'unsubscribed'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {c.tags.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          <div>{c.source}</div>
                          <div>{formatTimeAgo(c.createdAt)}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onDeleteContact(c.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing page {page} of {totalPages} ({totalContacts} total)
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
        </div>
      )}

      {/* ------------------- TAB 2: SEGMENTS ------------------- */}
      {activeSubTab === 'segments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <h2 className="text-sm font-semibold text-white">Target Segments &amp; Audiences</h2>
              <p className="text-xs text-slate-400">
                Dynamic groups computed by matching tags on imported contacts
              </p>
            </div>
            <button
              onClick={() => setShowAddSegmentModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Segment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {segments.map((s) => (
              <div
                key={s.id}
                className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Tag: {s.filterTag}
                    </span>
                    <button
                      onClick={() => onDeleteSegment(s.id)}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-white">{s.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Matched Active Contacts</span>
                  <span className="text-lg font-bold text-white">{s.contactCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------- TAB 3: SUPPRESSION LIST ------------------- */}
      {activeSubTab === 'suppression' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldBan className="w-4 h-4 text-rose-400" />
                Global Suppression &amp; Blocklist
              </h2>
              <p className="text-xs text-slate-400">
                Guaranteed protection: No emails will ever be dispatched to addresses on this list (RFC 8058 &amp; CAN-SPAM compliant)
              </p>
            </div>
            <button
              onClick={() => setShowAddSuppressionModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Blocked Email</span>
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Suppressed Email</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Notes / Server Diagnostic</th>
                  <th className="py-3 px-4">Suppressed Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {suppression.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Suppression list is currently clean. Unsubscribes and hard bounces will automatically register here.
                    </td>
                  </tr>
                ) : (
                  suppression.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-medium text-white">{entry.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            entry.reason === 'hard_bounce'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : entry.reason === 'unsubscribed'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {entry.reason.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-sm">
                        {entry.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatTimeAgo(entry.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onDeleteSuppression(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Remove from suppression list (Unblock)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------- INTERACTIVE IMPORT PREVIEW MODAL ------------------- */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                  Configure Import: {previewData.fileName}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify column mappings and audit preview rows before database insertion
                </p>
              </div>
              <button
                onClick={() => setPreviewData(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Validation Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl text-center">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Total Rows</span>
                  <div className="text-xl font-bold text-white">{previewData.stats.total}</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl text-center">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">New Contacts</span>
                  <div className="text-xl font-bold text-emerald-400">{previewData.stats.valid}</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl text-center">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Existing in DB</span>
                  <div className="text-xl font-bold text-cyan-400">{previewData.stats.existingInDb}</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl text-center">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Invalid / In-file Dupes</span>
                  <div className="text-xl font-bold text-rose-400">
                    {previewData.stats.invalidEmails + previewData.stats.duplicatesInFile}
                  </div>
                </div>
              </div>

              {/* Column Mapping Section */}
              <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Spreadsheet Column Mapping
                  </h3>
                  <span className="text-[11px] text-indigo-400 font-medium">Auto-detected mappings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={columnMapping.email}
                      onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="">— Select Column —</option>
                      {previewData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
                    <select
                      value={columnMapping.name}
                      onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="">— None (Extract from email) —</option>
                      {previewData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Company</label>
                    <select
                      value={columnMapping.company}
                      onChange={(e) => setColumnMapping({ ...columnMapping, company: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="">— None —</option>
                      {previewData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">City / Location</label>
                    <select
                      value={columnMapping.city}
                      onChange={(e) => setColumnMapping({ ...columnMapping, city: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="">— None —</option>
                      {previewData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                    <select
                      value={columnMapping.phone}
                      onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="">— None —</option>
                      {previewData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Tags / Segment Column</label>
                    <select
                      value={columnMapping.tags}
                      onChange={(e) => setColumnMapping({ ...columnMapping, tags: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    >
                      <option value="">— None —</option>
                      {previewData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Import Options */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="text-slate-400 font-medium">Assign Tag to Batch:</label>
                    <input
                      type="text"
                      value={defaultImportTag}
                      onChange={(e) => setDefaultImportTag(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white w-40"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <span>Update existing contact details if duplicate email matches</span>
                  </label>
                </div>
              </div>

              {/* Sample Data Table Preview */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                  Sample Data (First {previewData.sampleRows.length} Rows)
                </h4>
                <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-48">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 text-[10px] uppercase">
                      <tr>
                        {previewData.headers.map((h) => (
                          <th key={h} className="py-2 px-3 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {previewData.sampleRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          {previewData.headers.map((h) => (
                            <td key={h} className="py-1.5 px-3 whitespace-nowrap font-mono text-[11px]">
                              {String(row[h] || '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
              <span className="text-xs text-slate-400">
                {!columnMapping.email && (
                  <span className="text-rose-400">Please select an Email column mapping before importing.</span>
                )}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!columnMapping.email || isConfirmingImport}
                  onClick={handleConfirmImport}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
                >
                  {isConfirmingImport ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm &amp; Import Contacts</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- MODAL: ADD MANUAL CONTACT ------------------- */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Contact</h3>
            <p className="text-xs text-slate-400 mb-4">Manually register an individual subscriber</p>

            <form onSubmit={handleCreateContactSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="alex@example.com"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Alex Rivera"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Company</label>
                  <input
                    type="text"
                    value={newContactCompany}
                    onChange={(e) => setNewContactCompany(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Solar Dynamics"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    value={newContactCity}
                    onChange={(e) => setNewContactCity(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Austin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newContactTags}
                  onChange={(e) => setNewContactTags(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enterprise, Tech, Newsletter"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- MODAL: ADD SEGMENT ------------------- */}
      {showAddSegmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Audience Segment</h3>
            <p className="text-xs text-slate-400 mb-4">Define an automated filter tag</p>

            <form onSubmit={handleCreateSegmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Segment Name</label>
                <input
                  type="text"
                  required
                  value={newSegName}
                  onChange={(e) => setNewSegName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g. CleanTech Leads"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Filter Tag</label>
                <input
                  type="text"
                  required
                  value={newSegTag}
                  onChange={(e) => setNewSegTag(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g. CleanTech"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  value={newSegDesc}
                  onChange={(e) => setNewSegDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white h-20"
                  placeholder="Audience criteria details..."
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSegmentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Create Segment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- MODAL: ADD SUPPRESSION ------------------- */}
      {showAddSuppressionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Address to Blocklist</h3>
            <p className="text-xs text-slate-400 mb-4">Hard-suppress an address to block all outbound messages</p>

            <form onSubmit={handleAddSuppressionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={suppressEmail}
                  onChange={(e) => setSuppressEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="blocked@domain.com"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reason</label>
                <select
                  value={suppressReason}
                  onChange={(e: any) => setSuppressReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="manual">Manual Administrative Block</option>
                  <option value="unsubscribed">Explicit Unsubscribe Request</option>
                  <option value="hard_bounce">Mailbox Inactive (Hard Bounce)</option>
                  <option value="spam_complaint">Spam / Abuse Complaint</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Notes</label>
                <input
                  type="text"
                  value={suppressNotes}
                  onChange={(e) => setSuppressNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g. Requested via support ticket"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSuppressionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Block Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
