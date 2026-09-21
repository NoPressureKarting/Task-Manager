import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  User as UserIcon,
  Mail,
  AlertTriangle,
  Tag,
  ArrowRight,
  Share2,
  Inbox,
  Check,
} from 'lucide-react';
import { TaskItem } from '../types';
import { getTodayDateString } from '../lib/storage';

interface QuickSubmitFormProps {
  onSubmitTask?: (task: Omit<TaskItem, 'id' | 'createdAt'>) => Promise<void>;
  onSubmit?: (task: Omit<TaskItem, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitted?: () => void;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  onNavigateToInbox?: () => void;
  onOpenShareModal?: () => void;
}

const QUICK_TAG_PRESETS = [
  '🚀 Feature Request',
  '🐛 Bug Fix',
  '📅 Meeting / Sync',
  '⚡ Urgent Action',
  '📄 Document Review',
  '🎨 Design / Creative',
];

export const QuickSubmitForm: React.FC<QuickSubmitFormProps> = ({
  onSubmitTask,
  onSubmit,
  onSubmitted,
  currentUserEmail,
  currentUserName,
  onNavigateToInbox,
  onOpenShareModal,
}) => {
  const todayStr = getTodayDateString();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskItem['category']>('work');
  const [priority, setPriority] = useState<TaskItem['priority']>('medium');
  const [dueDate, setDueDate] = useState(todayStr);
  const [dueTime, setDueTime] = useState('17:00');
  const [submitterName, setSubmitterName] = useState(currentUserName || '');
  const [submitterEmail, setSubmitterEmail] = useState(currentUserEmail || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTaskInfo, setSubmittedTaskInfo] = useState<{ title: string; id: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync user info if loaded after initial mount
  React.useEffect(() => {
    if (currentUserName && !submitterName) {
      setSubmitterName(currentUserName);
    }
    if (currentUserEmail && !submitterEmail) {
      setSubmitterEmail(currentUserEmail);
    }
  }, [currentUserName, currentUserEmail]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const submitFn = onSubmitTask || onSubmit;
    if (!submitFn) {
      setSubmitError('Submit handler is not configured.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const finalPriority = isUrgent ? 'urgent' : priority;
      const cleanSubmitterName = submitterName.trim() || currentUserName || 'External Contributor';
      const cleanSubmitterEmail = submitterEmail.trim() || currentUserEmail || 'contributor@tasksync.io';

      await submitFn({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority: finalPriority,
        assignedDate: dueDate,
        dueDate,
        dueTime: dueTime.trim() || undefined,
        completed: false,
        status: 'inbox', // Lands directly in the Review Inbox
        submittedBy: {
          name: cleanSubmitterName,
          email: cleanSubmitterEmail,
        },
        tags: selectedTags,
        reminderEnabled: true,
        reminderMinutesBefore: 30,
      });

      const generatedId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmittedTaskInfo({
        title: title.trim(),
        id: generatedId,
      });

      if (onSubmitted) {
        onSubmitted();
      }

      // Reset fields
      setTitle('');
      setDescription('');
      setSelectedTags([]);
      setIsUrgent(false);
    } catch (err: any) {
      console.error('Failed to submit quick task:', err);
      setSubmitError(err?.message || 'Failed to submit task. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyQuickSubmitLink = () => {
    const url = `${window.location.origin}?view=quick-submit`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
            <Send className="h-3.5 w-3.5" />
            Dedicated Quick-Submit Form
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Submit a Task or Action Item
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Send tasks directly to the team's review inbox. Submissions are triaged, scheduled, and synced with Google Calendar.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            id="copy-quick-submit-link-btn"
            type="button"
            onClick={handleCopyQuickSubmitLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Share Form Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Submission Success Notice */}
      {submittedTaskInfo ? (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30 p-8 text-center shadow-lg backdrop-blur-xs space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-500/20 shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200 text-xs font-mono font-bold mb-2">
              Ref ID: {submittedTaskInfo.id}
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Task Submitted Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
              "{submittedTaskInfo.title}" has been placed into the <strong>Task Review Inbox</strong>. Collaborators will review and assign schedule priority.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="submit-another-task-btn"
              type="button"
              onClick={() => setSubmittedTaskInfo(null)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
            >
              Submit Another Task
            </button>
            {onNavigateToInbox && (
              <button
                id="view-inbox-btn"
                type="button"
                onClick={onNavigateToInbox}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Inbox className="h-4 w-4 text-indigo-500" />
                View in Task Inbox
              </button>
            )}
          </div>
        </div>
      ) : (
        /* The Quick-Submit Form */
        <form
          id="quick-submit-task-form"
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xs space-y-6"
        >
          {submitError && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>{submitError}</span>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="text-rose-500 hover:text-rose-700 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Submitter Metadata Banner */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Submitter Details
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Your Full Name
                </label>
                <input
                  id="submitter-name-input"
                  type="text"
                  placeholder="e.g. Sarah Lin"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Your Email (for status updates)
                </label>
                <input
                  id="submitter-email-input"
                  type="email"
                  placeholder="e.g. sarah@example.com"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="quick-task-title-input"
              type="text"
              required
              placeholder="What needs to be accomplished? (e.g. Prepare keynote presentation slides)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            />
          </div>

          {/* Quick Tag Pills */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Quick Tags / Preset Types
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAG_PRESETS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description & Requirements */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Description & Specifications
            </label>
            <textarea
              id="quick-task-description-input"
              rows={4}
              placeholder="Provide background, links, requirements, or deliverables to help the team review..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 resize-y"
            />
          </div>

          {/* Parameters: Category, Priority, Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                id="quick-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="work">Work & Projects</option>
                <option value="personal">Personal</option>
                <option value="health">Health & Fitness</option>
                <option value="errands">Errands & Operations</option>
                <option value="learning">Learning & Research</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                id="quick-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Target Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Requested Due Date
              </label>
              <input
                id="quick-due-date-input"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Target Due Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Requested Time
              </label>
              <input
                id="quick-due-time-input"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Urgent Attention Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Mark as High-Urgency Review
                </p>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                  Flags this submission at the top of the reviewer's inbox queue with immediate attention markers.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="urgent-toggle-checkbox"
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ⚡ Directly pushes into the realtime cloud database & triggers review notifications.
            </p>

            <button
              id="submit-quick-task-btn"
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'Submitting Task...' : 'Submit to Task Inbox'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
