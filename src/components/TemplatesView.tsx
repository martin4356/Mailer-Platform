import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  Eye,
  Send,
  Sparkles,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { EmailTemplate } from '../types';

interface TemplatesViewProps {
  templates: EmailTemplate[];
  onUseTemplate: (template: EmailTemplate) => void;
  onCreateTemplate: (data: Partial<EmailTemplate>) => Promise<boolean>;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onUseTemplate,
  onCreateTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  // New Template form
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState('Marketing');
  const [newSubj, setNewSubj] = useState('');
  const [newHtml, setNewHtml] = useState('');
  const [newText, setNewText] = useState('');

  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))];

  const filtered = templates.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newHtml) return;
    const ok = await onCreateTemplate({
      name: newName,
      category: newCat,
      subject: newSubj,
      htmlContent: newHtml,
      plainTextContent: newText,
    });
    if (ok) {
      setShowNewModal(false);
      setNewName('');
      setNewSubj('');
      setNewHtml('');
      setNewText('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            Reusable HTML Email Templates
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pre-designed responsive marketing and transactional templates with merge tag support
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Custom Template</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              selectedCategory === c
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              {/* Mini Preview Window */}
              <div className="h-44 bg-slate-950 border-b border-slate-800 p-3 overflow-hidden relative">
                <div
                  dangerouslySetInnerHTML={{
                    __html: tmpl.htmlContent
                      .replace(/{{Name}}/g, 'Alex')
                      .replace(/{{Company}}/g, 'Acme Corp')
                      .replace(/{{UnsubscribeLink}}/g, '#'),
                  }}
                  className="scale-[0.55] origin-top-left w-[180%] pointer-events-none select-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-40 group-hover:opacity-0 transition-opacity" />
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                    {tmpl.category}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm">{tmpl.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {tmpl.subject || tmpl.previewText}
                </p>
              </div>
            </div>

            <div className="p-4 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedTemplate(tmpl)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Preview</span>
              </button>

              <button
                onClick={() => onUseTemplate(tmpl)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Use in Campaign</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Full Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">{selectedTemplate.name}</h2>
                <p className="text-xs text-slate-400">{selectedTemplate.subject}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-950 flex-1 flex justify-center">
              <div className="bg-white rounded-xl shadow-lg max-w-[620px] w-full p-2 overflow-hidden">
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedTemplate.htmlContent
                      .replace(/{{Name}}/g, 'Sarah Jenkins')
                      .replace(/{{Company}}/g, 'Acme Corp')
                      .replace(/{{Email}}/g, 'sarah.jenkins@acmecorp.com')
                      .replace(/{{UnsubscribeLink}}/g, '#'),
                  }}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const t = selectedTemplate;
                  setSelectedTemplate(null);
                  onUseTemplate(t);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Use This Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Custom Email Template</h3>
            <p className="text-xs text-slate-400 mb-4">Save reusable HTML layout and subject line</p>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Template Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Monthly Newsletter"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    placeholder="Marketing, Transactional..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Default Subject Line</label>
                <input
                  type="text"
                  value={newSubj}
                  onChange={(e) => setNewSubj(e.target.value)}
                  placeholder="Subject line with {{Name}}..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">HTML Code</label>
                <textarea
                  rows={8}
                  required
                  value={newHtml}
                  onChange={(e) => setNewHtml(e.target.value)}
                  placeholder="<div><h1>Hello {{Name}}</h1>...</div>"
                  className="w-full bg-slate-950 font-mono text-indigo-200 border border-slate-800 rounded-lg p-3 text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
