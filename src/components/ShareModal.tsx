import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Link as LinkIcon,
  ExternalLink,
  QrCode,
  Code,
  Sparkles,
  Send,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  BarChart2,
} from 'lucide-react';
import { ShortenedUrl } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortlinks: ShortenedUrl[];
  onCreateShortlink: (link: Omit<ShortenedUrl, 'id' | 'createdAt' | 'clicks'>) => Promise<void>;
  onDeleteShortlink: (id: string) => Promise<void>;
  onNavigateToView?: (view: any) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shortlinks,
  onCreateShortlink,
  onDeleteShortlink,
  onNavigateToView,
}) => {
  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tasksync.app';

  // Target links
  const quickSubmitUrl = `${currentOrigin}?view=quick-submit`;
  const sharedCalendarUrl = `${currentOrigin}?view=shared-calendar`;
  const teamInboxUrl = `${currentOrigin}?view=inbox`;

  // Copied states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quick_links' | 'shortener' | 'embed'>('quick_links');
  const [showQrForUrl, setShowQrForUrl] = useState<string | null>(null);

  // URL Shortener Form State
  const [customSlug, setCustomSlug] = useState('');
  const [shortlinkTitle, setShortlinkTitle] = useState('');
  const [targetDestination, setTargetDestination] = useState<'quick-submit' | 'shared-calendar' | 'inbox'>('quick-submit');
  const [isCreating, setIsCreating] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateShortlink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = (customSlug.trim() || Math.random().toString(36).substring(2, 8)).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const destUrl = `${currentOrigin}?view=${targetDestination}`;
    const title = shortlinkTitle.trim() || (targetDestination === 'quick-submit' ? 'Quick Task Portal' : 'Team Schedule');

    setIsCreating(true);
    try {
      await onCreateShortlink({
        originalUrl: destUrl,
        shortSlug: cleanSlug,
        shortUrl: `tsk.sync/${cleanSlug}`,
        title,
      });
      setCustomSlug('');
      setShortlinkTitle('');
    } finally {
      setIsCreating(false);
    }
  };

  const embedCodeSnippet = `<iframe src="${quickSubmitUrl}" width="100%" height="680" style="border:none; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08);" title="Quick Submit Task Portal"></iframe>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/60">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Share Link & URL Shortener
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Share access with teammates, generate branded short links, and embed portals.
              </p>
            </div>
          </div>

          <button
            id="close-share-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <button
            id="share-tab-quick-links"
            type="button"
            onClick={() => setActiveTab('quick_links')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quick_links'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Direct Share Links</span>
          </button>

          <button
            id="share-tab-shortener"
            type="button"
            onClick={() => setActiveTab('shortener')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'shortener'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>URL Shortener</span>
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.2 text-[10px] text-indigo-700 dark:text-indigo-300 font-extrabold">
              {shortlinks.length}
            </span>
          </button>

          <button
            id="share-tab-embed"
            type="button"
            onClick={() => setActiveTab('embed')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'embed'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Embed Widget</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Direct Share Links */}
          {activeTab === 'quick_links' && (
            <div className="space-y-4">
              {/* Quick Submit Link Card */}
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Dedicated Quick-Submit Portal Link
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Share this link with team members or external clients to let them submit tasks directly into your Review Inbox.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={quickSubmitUrl}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300"
                  />
                  <button
                    id="copy-quick-submit-btn"
                    type="button"
                    onClick={() => handleCopy(quickSubmitUrl, 'quick-submit')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    {copiedId === 'quick-submit' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToView?.('quick-submit');
                      onClose();
                    }}
                    title="Open View"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Shared Calendar Link Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Shared Calendar & Collaborator View Link
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Allow team members to view team scheduled tasks alongside Google Calendar events and authorized collaborators.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={sharedCalendarUrl}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300"
                  />
                  <button
                    id="copy-shared-cal-btn"
                    type="button"
                    onClick={() => handleCopy(sharedCalendarUrl, 'shared-calendar')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    {copiedId === 'shared-calendar' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToView?.('collaborators');
                      onClose();
                    }}
                    title="Open View"
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* QR Code Quick Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowQrForUrl(showQrForUrl ? null : quickSubmitUrl)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <QrCode className="h-4 w-4" />
                  <span>{showQrForUrl ? 'Hide QR Code' : 'Display Scannable Mobile QR Code'}</span>
                </button>

                {showQrForUrl && (
                  <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 text-center flex flex-col items-center">
                    {/* Visual QR Code Matrix */}
                    <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                      <svg className="h-36 w-36" viewBox="0 0 100 100" fill="none">
                        <rect width="100" height="100" fill="white" />
                        {/* Corner squares */}
                        <rect x="10" y="10" width="26" height="26" fill="#1e1b4b" />
                        <rect x="14" y="14" width="18" height="18" fill="white" />
                        <rect x="18" y="18" width="10" height="10" fill="#4f46e5" />

                        <rect x="64" y="10" width="26" height="26" fill="#1e1b4b" />
                        <rect x="68" y="14" width="18" height="18" fill="white" />
                        <rect x="72" y="18" width="10" height="10" fill="#4f46e5" />

                        <rect x="10" y="64" width="26" height="26" fill="#1e1b4b" />
                        <rect x="14" y="68" width="18" height="18" fill="white" />
                        <rect x="18" y="72" width="10" height="10" fill="#4f46e5" />

                        {/* Pixel pattern */}
                        <rect x="42" y="12" width="6" height="6" fill="#1e1b4b" />
                        <rect x="52" y="16" width="6" height="6" fill="#4f46e5" />
                        <rect x="44" y="24" width="6" height="6" fill="#1e1b4b" />
                        <rect x="40" y="40" width="8" height="8" fill="#4f46e5" />
                        <rect x="52" y="44" width="6" height="6" fill="#1e1b4b" />
                        <rect x="64" y="44" width="6" height="6" fill="#4f46e5" />
                        <rect x="14" y="44" width="6" height="6" fill="#1e1b4b" />
                        <rect x="24" y="52" width="6" height="6" fill="#4f46e5" />
                        <rect x="44" y="60" width="6" height="6" fill="#1e1b4b" />
                        <rect x="60" y="60" width="6" height="6" fill="#4f46e5" />
                        <rect x="72" y="60" width="6" height="6" fill="#1e1b4b" />
                        <rect x="80" y="72" width="6" height="6" fill="#4f46e5" />
                        <rect x="50" y="76" width="8" height="8" fill="#1e1b4b" />
                        <rect x="64" y="80" width="6" height="6" fill="#4f46e5" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
                      Scan to open Quick-Submit form instantly on mobile
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Built-in URL Shortener */}
          {activeTab === 'shortener' && (
            <div className="space-y-6">
              {/* Shortlink Generator Form */}
              <form
                onSubmit={handleCreateShortlink}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-indigo-500" />
                  Generate New Custom Shortened Link
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Label / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Q3 Design Sprint"
                      value={shortlinkTitle}
                      onChange={(e) => setShortlinkTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Target Destination
                    </label>
                    <select
                      value={targetDestination}
                      onChange={(e) => setTargetDestination(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="quick-submit">Quick-Submit Portal</option>
                      <option value="shared-calendar">Shared Calendar</option>
                      <option value="inbox">Review Inbox</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Custom Short Slug
                    </label>
                    <div className="flex items-center">
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-200 dark:bg-slate-800 px-2 py-1.5 rounded-l-xl border-y border-l border-slate-300 dark:border-slate-700">
                        tsk.sync/
                      </span>
                      <input
                        type="text"
                        placeholder="my-link"
                        value={customSlug}
                        onChange={(e) => setCustomSlug(e.target.value)}
                        className="w-full rounded-r-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    id="create-shortlink-btn"
                    type="submit"
                    disabled={isCreating}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isCreating ? 'Creating...' : 'Create Short Link'}</span>
                  </button>
                </div>
              </form>

              {/* Existing Shortlinks List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Shortened Links ({shortlinks.length})
                </h4>

                <div className="space-y-2">
                  {shortlinks.map((link) => (
                    <div
                      key={link.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {link.title}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            <BarChart2 className="h-2.5 w-2.5 text-indigo-500" />
                            {link.clicks || 0} visits
                          </span>
                        </div>
                        <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {link.shortUrl}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-sm">
                          → {link.originalUrl}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(`${currentOrigin}?view=${link.shortSlug === 'quick-submit' ? 'quick-submit' : 'shared-calendar'}`, link.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedId === link.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteShortlink(link.id)}
                          className="rounded-xl p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete shortlink"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Embed Widget Snippet */}
          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Embed Quick-Submit Portal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Copy and paste this HTML snippet into Notion, confluence, employee handbook, or your internal web portal.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto relative group">
                <pre className="whitespace-pre-wrap">{embedCodeSnippet}</pre>
                <button
                  type="button"
                  onClick={() => handleCopy(embedCodeSnippet, 'embed-code')}
                  className="absolute top-3 right-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer"
                >
                  {copiedId === 'embed-code' ? 'Copied Code!' : 'Copy Code'}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  💡 Tips for embedding:
                </span>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                  <li>In Notion: Type <code className="text-indigo-600 dark:text-indigo-400">/embed</code> and paste the Quick-Submit direct link.</li>
                  <li>In Confluence / Jira: Use the iframe or Web Page macro.</li>
                  <li>Tasks submitted through the widget sync directly to your real-time Review Inbox.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
