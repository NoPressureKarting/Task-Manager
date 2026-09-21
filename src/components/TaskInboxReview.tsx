import React, { useState, useMemo } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  User as UserIcon,
  Calendar as CalendarIcon,
  Check,
  X,
  Edit3,
  CalendarCheck,
  Tag,
  AlertTriangle,
  ArrowRight,
  Filter,
  Search,
  Sparkles,
  Share2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { TaskItem, Collaborator } from '../types';
import { getFormattedDateDisplay, getTodayDateString } from '../lib/storage';

interface TaskInboxReviewProps {
  tasks: TaskItem[];
  collaborators: Collaborator[];
  onApproveTask: (taskId: string, reviewDetails?: {
    assignedDate?: string;
    dueDate?: string;
    priority?: TaskItem['priority'];
    category?: TaskItem['category'];
    assignedTo?: string;
    reviewNotes?: string;
    syncToCalendar?: boolean;
    syncToGoogleTasks?: boolean;
  }) => Promise<void> | void;
  onRejectTask: (taskId: string, reason?: string) => Promise<void> | void;
  onEditTask?: (task: TaskItem) => void;
  onOpenQuickSubmit?: () => void;
  onNavigateToSubmit?: () => void;
  onOpenShareModal: () => void;
  isAuthenticated: boolean;
  onSignIn?: () => void;
}

export const TaskInboxReview: React.FC<TaskInboxReviewProps> = ({
  tasks,
  collaborators,
  onApproveTask,
  onRejectTask,
  onEditTask,
  onOpenQuickSubmit,
  onNavigateToSubmit,
  onOpenShareModal,
  isAuthenticated,
  onSignIn,
}) => {
  const todayStr = getTodayDateString();
  const handleOpenSubmit = onOpenQuickSubmit || onNavigateToSubmit || (() => {});

  // Tab: 'pending' | 'approved' | 'rejected' | 'all'
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [quickApprovingId, setQuickApprovingId] = useState<string | null>(null);

  // Approval Modal State
  const [approvingTask, setApprovingTask] = useState<TaskItem | null>(null);
  const [approveAssignedDate, setApproveAssignedDate] = useState(todayStr);
  const [approveDueDate, setApproveDueDate] = useState(todayStr);
  const [approvePriority, setApprovePriority] = useState<TaskItem['priority']>('medium');
  const [approveCategory, setApproveCategory] = useState<TaskItem['category']>('work');
  const [approveAssignedTo, setApproveAssignedTo] = useState<string>('');
  const [approveReviewNotes, setApproveReviewNotes] = useState<string>('');
  const [approveSyncCalendar, setApproveSyncCalendar] = useState<boolean>(false);
  const [approveSyncTasks, setApproveSyncTasks] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick Approve directly without requiring modal
  const handleQuickApprove = async (task: TaskItem) => {
    try {
      setQuickApprovingId(task.id);
      await onApproveTask(task.id, {
        assignedDate: task.assignedDate || task.dueDate || todayStr,
        dueDate: task.dueDate || todayStr,
        priority: task.priority || 'medium',
        category: task.category || 'work',
        assignedTo: task.assignedTo,
        reviewNotes: task.reviewNotes,
      });
    } catch (err) {
      console.error('Quick approve failed:', err);
    } finally {
      setQuickApprovingId(null);
    }
  };

  // Rejection Modal State
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Segregate Tasks by Inbox status
  // If task has no status, but is not completed, we treat tasks created without status as 'approved' (running list)
  const pendingInboxTasks = useMemo(
    () => tasks.filter((t) => t.status === 'inbox'),
    [tasks]
  );
  const approvedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'approved' || (!t.status && !t.completed)),
    [tasks]
  );
  const rejectedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'rejected'),
    [tasks]
  );

  // Filter based on active tab
  const displayedTasks = useMemo(() => {
    let list: TaskItem[] = [];
    if (tab === 'pending') list = pendingInboxTasks;
    else if (tab === 'approved') list = approvedTasks;
    else if (tab === 'rejected') list = rejectedTasks;
    else list = tasks;

    return list.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        const matchSubmitter = task.submittedBy?.name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSubmitter) return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tab, pendingInboxTasks, approvedTasks, rejectedTasks, tasks, searchQuery, priorityFilter]);

  const handleOpenApproveModal = (task: TaskItem) => {
    setApprovingTask(task);
    setApproveAssignedDate(task.assignedDate || todayStr);
    setApproveDueDate(task.dueDate || todayStr);
    setApprovePriority(task.priority || 'medium');
    setApproveCategory(task.category || 'work');
    setApproveAssignedTo(task.assignedTo || '');
    setApproveReviewNotes(task.reviewNotes || '');
    setApproveSyncCalendar(false);
    setApproveSyncTasks(false);
  };

  const handleConfirmApproval = async () => {
    if (!approvingTask) return;
    setIsProcessing(true);
    try {
      await onApproveTask(approvingTask.id, {
        assignedDate: approveAssignedDate,
        dueDate: approveDueDate,
        priority: approvePriority,
        category: approveCategory,
        assignedTo: approveAssignedTo || undefined,
        reviewNotes: approveReviewNotes.trim() || undefined,
        syncToCalendar: approveSyncCalendar,
        syncToGoogleTasks: approveSyncTasks,
      });
      setApprovingTask(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingTaskId) return;
    setIsProcessing(true);
    try {
      await onRejectTask(rejectingTaskId, rejectReason.trim() || 'Dismissed by reviewer');
      setRejectingTaskId(null);
      setRejectReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Sub-Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
            <Inbox className="h-3.5 w-3.5" />
            Task Inbox & Review System
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Incoming Tasks & Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review submissions from the Quick-Submit portal, assign collaborators, schedule dates, and push approved tasks to Google Calendar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            id="inbox-share-portal-btn"
            type="button"
            onClick={onOpenShareModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Share Submit Link</span>
          </button>
          <button
            id="inbox-open-quick-submit-btn"
            type="button"
            onClick={handleOpenSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>New Submission</span>
          </button>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto">
          <button
            id="inbox-tab-pending"
            type="button"
            onClick={() => setTab('pending')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              tab === 'pending'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Needs Review</span>
            {pendingInboxTasks.length > 0 && (
              <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-extrabold animate-pulse">
                {pendingInboxTasks.length}
              </span>
            )}
          </button>

          <button
            id="inbox-tab-approved"
            type="button"
            onClick={() => setTab('approved')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'approved'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Approved & Scheduled</span>
            <span className="text-[11px] text-slate-400">({approvedTasks.length})</span>
          </button>

          <button
            id="inbox-tab-rejected"
            type="button"
            onClick={() => setTab('rejected')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'rejected'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Rejected / Dismissed</span>
            <span className="text-[11px] text-slate-400">({rejectedTasks.length})</span>
          </button>

          <button
            id="inbox-tab-all"
            type="button"
            onClick={() => setTab('all')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>All ({tasks.length})</span>
          </button>
        </div>

        {/* Search & Priority Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <input
              id="inbox-search-input"
              type="text"
              placeholder="Search by title or submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          <select
            id="inbox-priority-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List Items */}
      {displayedTasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-12 text-center shadow-2xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/60 mb-3.5">
            <Inbox className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {tab === 'pending'
              ? "You're all caught up! No tasks need review."
              : 'No tasks match the selected review filter.'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {tab === 'pending'
              ? 'New requests submitted through the Quick-Submit form will appear here for prioritization and collaborator assignment.'
              : 'Try changing your tab or search filter to see other items in the review system.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              id="inbox-empty-submit-btn"
              type="button"
              onClick={handleOpenSubmit}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition-all cursor-pointer"
            >
              Submit New Task
            </button>
            <button
              id="inbox-empty-share-btn"
              type="button"
              onClick={onOpenShareModal}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Share Submit Form Link
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTasks.map((task) => {
            const isPending = task.status === 'inbox';
            const isApproved = task.status === 'approved' || (!task.status && !task.completed);
            const isRejected = task.status === 'rejected';

            return (
              <div
                key={task.id}
                className={`rounded-2xl border p-5 transition-all shadow-xs ${
                  isPending
                    ? 'border-amber-500/40 bg-white dark:bg-slate-900/90 shadow-amber-500/5'
                    : isApproved
                    ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70'
                    : 'border-rose-500/20 bg-rose-50/20 dark:bg-rose-950/10 opacity-75'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Submitter info, Title, Description, Tags */}
                  <div className="space-y-2 flex-1">
                    {/* Status & Submitter Pill Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Review Status Badge */}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          <Clock className="h-3 w-3" />
                          Pending Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved & Active
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </span>
                      )}

                      {/* Submitter details */}
                      {task.submittedBy && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <UserIcon className="h-3 w-3 text-indigo-500" />
                          <span>
                            From: <strong>{task.submittedBy.name || 'Anonymous'}</strong>
                            {task.submittedBy.email && (
                              <span className="text-slate-400 font-normal ml-1">
                                ({task.submittedBy.email})
                              </span>
                            )}
                          </span>
                        </span>
                      )}

                      {/* Priority indicator */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                          task.priority === 'urgent'
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : task.priority === 'high'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : task.priority === 'medium'
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                            : 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
                        }`}
                      >
                        {task.priority}
                      </span>

                      {/* Category */}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                        📁 {task.category}
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {task.title}
                    </h3>

                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl whitespace-pre-wrap">
                        {task.description}
                      </p>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {task.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          >
                            <Tag className="h-2.5 w-2.5 text-slate-400" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Review Notes or Rejection Reason if any */}
                    {task.reviewNotes && (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-700 dark:text-slate-300 mt-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">
                          Reviewer Note:
                        </span>
                        {task.reviewNotes}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Due Date, Assignee, Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/80">
                    <div className="text-left lg:text-right space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <CalendarIcon className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Due: {getFormattedDateDisplay(task.dueDate)}</span>
                        {task.dueTime && <span className="text-slate-400">@{task.dueTime}</span>}
                      </div>

                      {task.assignedTo && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Assigned: <strong className="text-slate-700 dark:text-slate-200">{task.assignedTo}</strong>
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isPending && (
                        <>
                          <button
                            id={`approve-schedule-btn-${task.id}`}
                            type="button"
                            onClick={() => handleOpenApproveModal(task)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
                          >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            Approve & Schedule
                          </button>

                          <button
                            id={`quick-approve-btn-${task.id}`}
                            type="button"
                            disabled={quickApprovingId === task.id || isProcessing}
                            title="Quick Approve without changes"
                            onClick={() => handleQuickApprove(task)}
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {quickApprovingId === task.id ? (
                              <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <span>{quickApprovingId === task.id ? 'Approving...' : 'Quick Approve'}</span>
                          </button>

                          <button
                            id={`reject-btn-${task.id}`}
                            type="button"
                            onClick={() => setRejectingTaskId(task.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </>
                      )}

                      {!isPending && (
                        <>
                          <button
                            id={`edit-task-btn-${task.id}`}
                            type="button"
                            onClick={() => onEditTask && onEditTask(task)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                            Edit Task
                          </button>

                          {isRejected && (
                            <button
                              id={`re-approve-btn-${task.id}`}
                              type="button"
                              disabled={quickApprovingId === task.id || isProcessing}
                              onClick={() => handleQuickApprove(task)}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {quickApprovingId === task.id ? (
                                <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span>{quickApprovingId === task.id ? 'Approving...' : 'Re-Approve'}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve & Schedule Modal */}
      {approvingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  Review & Schedule
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Approve Task: {approvingTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovingTask(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Spans */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Start Date
                  </label>
                  <input
                    id="approve-start-date-input"
                    type="date"
                    value={approveAssignedDate}
                    onChange={(e) => setApproveAssignedDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Due Date
                  </label>
                  <input
                    id="approve-due-date-input"
                    type="date"
                    value={approveDueDate}
                    onChange={(e) => setApproveDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    id="approve-priority-select"
                    value={approvePriority}
                    onChange={(e) => setApprovePriority(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    id="approve-category-select"
                    value={approveCategory}
                    onChange={(e) => setApproveCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="work">Work & Projects</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health & Fitness</option>
                    <option value="errands">Errands & Ops</option>
                    <option value="learning">Learning & Research</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Assign to Collaborator */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Collaborator
                </label>
                <select
                  id="approve-assignee-select"
                  value={approveAssignedTo}
                  onChange={(e) => setApproveAssignedTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Unassigned (General Queue)</option>
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.email}>
                      {c.name} ({c.email}) - {c.role.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reviewer Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reviewer Notes / Scheduling Context
                </label>
                <input
                  id="approve-notes-input"
                  type="text"
                  placeholder="e.g. Approved for sprint milestone; assigned to client leads."
                  value={approveReviewNotes}
                  onChange={(e) => setApproveReviewNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Google Integration Checkboxes */}
              {isAuthenticated && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 block">
                    ⚡ Instant Google Sync Options:
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      id="approve-sync-calendar-checkbox"
                      type="checkbox"
                      checked={approveSyncCalendar}
                      onChange={(e) => setApproveSyncCalendar(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Push event to Google Calendar across assigned date span</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      id="approve-sync-tasks-checkbox"
                      type="checkbox"
                      checked={approveSyncTasks}
                      onChange={(e) => setApproveSyncTasks(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Push task item into connected Google Tasks list</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingTask(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-approval-btn"
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmApproval}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>{isProcessing ? 'Approving...' : 'Confirm & Schedule Task'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Task Dialog */}
      {rejectingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Reject / Dismiss Submission
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please specify a reason or guidance for archiving this request.
            </p>
            <input
              id="reject-reason-input"
              type="text"
              placeholder="e.g. Duplicate request; already covered in ticket #204"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectingTaskId(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-reject-btn"
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                {isProcessing ? 'Rejecting...' : 'Reject Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
