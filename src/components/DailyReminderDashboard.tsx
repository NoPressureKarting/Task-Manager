import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Bell,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sparkles,
  CheckSquare,
  RefreshCw,
  Plus,
  ArrowRight,
  Filter,
  Check,
  CalendarCheck,
  ListTodo,
  Edit2,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { TaskItem, GoogleCalendarEvent, GoogleTask } from '../types';
import { getTodayDateString, getFormattedDateDisplay } from '../lib/storage';

interface DailyReminderDashboardProps {
  tasks: TaskItem[];
  calendarEvents: GoogleCalendarEvent[];
  googleTasksList: GoogleTask[];
  onCompleteTask: (id: string) => void;
  onEditTask?: (task: TaskItem) => void;
  onOpenTaskModal: () => void;
  onRefreshGoogleData: () => void;
  onToggleGoogleTaskStatus?: (taskId: string, completed: boolean) => Promise<void>;
  onImportGoogleTask?: (gTask: GoogleTask) => void;
  onSyncTaskToGoogleCalendar?: (task: TaskItem) => void;
  onSyncTaskToGoogleTasks?: (task: TaskItem) => void;
  isAuthenticated: boolean;
  onSignIn: () => void;
  isLoadingGoogleData?: boolean;
}

export const DailyReminderDashboard: React.FC<DailyReminderDashboardProps> = ({
  tasks,
  calendarEvents,
  googleTasksList,
  onCompleteTask,
  onEditTask,
  onOpenTaskModal,
  onRefreshGoogleData,
  onToggleGoogleTaskStatus,
  onImportGoogleTask,
  onSyncTaskToGoogleCalendar,
  onSyncTaskToGoogleTasks,
  isAuthenticated,
  onSignIn,
  isLoadingGoogleData = false,
}) => {
  const todayStr = getTodayDateString();
  const [googleViewTab, setGoogleViewTab] = useState<'all' | 'calendar' | 'tasks'>('all');
  const [taskFilterTab, setTaskFilterTab] = useState<'all' | 'urgent' | 'synced'>('all');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [expandedGoogleTaskIds, setExpandedGoogleTaskIds] = useState<Record<string, boolean>>({});

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const toggleGoogleTaskExpanded = (gTaskId: string) => {
    setExpandedGoogleTaskIds((prev) => ({
      ...prev,
      [gTaskId]: !prev[gTaskId],
    }));
  };

  // Helper to get formatted notes combining description and any explicit notes field
  const getTaskNotes = (task: TaskItem): string => {
    const parts: string[] = [];
    if (task.description && task.description.trim()) {
      parts.push(task.description.trim());
    }
    if (task.notes && task.notes.trim() && task.notes.trim() !== task.description?.trim()) {
      parts.push(task.notes.trim());
    }
    return parts.join('\n\n');
  };

  // Helper to check if task is active today (including multi-day spans)
  const isTaskActiveToday = (t: TaskItem) => {
    const start = t.assignedDate || t.dueDate;
    const end = t.dueDate >= start ? t.dueDate : start;
    return todayStr >= start && todayStr <= end;
  };

  const todayTasks = tasks.filter((t) => isTaskActiveToday(t));
  const overdueTasks = tasks.filter((t) => t.dueDate < todayStr && !t.completed);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const pendingToday = todayTasks.filter((t) => !t.completed);
  const urgentCount = pendingToday.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate completion percentage
  const totalRelevant = todayTasks.length;
  const completionPercentage = totalRelevant > 0 ? Math.round((completedToday / totalRelevant) * 100) : 100;

  // Filter calendar events happening today (including multi-day spans)
  const isEventActiveToday = (evt: GoogleCalendarEvent) => {
    const startStr = (evt.start.dateTime ? evt.start.dateTime.split('T')[0] : evt.start.date) || '';
    const endStr = (evt.end.dateTime ? evt.end.dateTime.split('T')[0] : evt.end.date) || startStr;
    if (evt.start.date && evt.end.date) {
      return todayStr >= startStr && todayStr < endStr;
    }
    return todayStr >= startStr && todayStr <= endStr;
  };

  const todayCalendarEvents = calendarEvents.filter((event) => isEventActiveToday(event));

  // Helper to determine if a completed task is within 24 hours of completion
  const isGoogleTaskCompletedWithin24Hours = (gt: GoogleTask): boolean => {
    if (gt.status !== 'completed') return false;
    const timeStr = gt.completed || gt.updated;
    if (!timeStr) return false;
    const completedTimestamp = new Date(timeStr).getTime();
    if (isNaN(completedTimestamp)) return false;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return Date.now() - completedTimestamp <= twentyFourHoursMs;
  };

  const getCompletionTimeLabel = (gt: GoogleTask): string => {
    const timeStr = gt.completed || gt.updated;
    if (!timeStr) return 'Completed recently';
    const diffMs = Date.now() - new Date(timeStr).getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / (60 * 1000)));
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 5) return 'Completed just now';
    if (diffHours < 1) return `Completed ${diffMins}m ago`;
    return `Completed ${diffHours}h ago`;
  };

  // Filter Google Tasks (all active or completed within the last 24 hours)
  const pendingGoogleTasks = googleTasksList.filter((gt) => gt.status !== 'completed');
  const recentCompletedGoogleTasks = googleTasksList.filter((gt) => isGoogleTaskCompletedWithin24Hours(gt));
  const visibleGoogleTasks = googleTasksList.filter(
    (gt) => gt.status !== 'completed' || isGoogleTaskCompletedWithin24Hours(gt)
  );

  // Filtered Today's Tasks
  const filteredTodayTasks = pendingToday.filter((t) => {
    if (taskFilterTab === 'urgent') return t.priority === 'urgent' || t.priority === 'high';
    if (taskFilterTab === 'synced') return t.syncedToGoogleCalendar || t.syncedToGoogleTasks;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Morning Daily Focus Hero */}
      <div
        id="daily-focus-card"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-900 p-6 sm:p-7 text-white shadow-lg border border-slate-800/80"
      >
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
                <Bell className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                Daily Focus & Reminder Brief
              </span>
              <span className="text-xs text-indigo-300 font-medium">{todayDateFormatted}</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {pendingToday.length === 0 && todayCalendarEvents.length === 0 && pendingGoogleTasks.length === 0
                ? "You're completely caught up for today! 🎉"
                : `Today's Agenda & Action Plan`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              {urgentCount > 0
                ? `⚡ ${urgentCount} high priority item requires immediate attention.`
                : 'Steady momentum! Keep your Google Calendar and Google Tasks synchronized throughout the day.'}
              {overdueTasks.length > 0 && (
                <span className="ml-1.5 text-amber-300 font-semibold">
                  ({overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} carried over).
                </span>
              )}
            </p>
          </div>

          {/* Quick Action & Workspace Status Badges */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <button
                id="hero-refresh-google-btn"
                onClick={onRefreshGoogleData}
                disabled={isLoadingGoogleData}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-200 border border-slate-700/80 shadow-xs transition-all"
                title="Refresh Google Calendar and Google Tasks"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${isLoadingGoogleData ? 'animate-spin' : ''}`} />
                <span>Sync Google</span>
              </button>
            ) : (
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Connect Google Account</span>
              </button>
            )}

            <button
              id="hero-add-task-btn"
              onClick={onOpenTaskModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] transition-all ring-1 ring-indigo-400/30"
            >
              <Sparkles className="h-4 w-4 text-indigo-200" />
              Quick Add Task
            </button>
          </div>
        </div>

        {/* Integration metric indicators */}
        <div className="relative z-10 mt-6 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/70">
            <span className="text-slate-400 text-[11px] block">Today's Schedule</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-white">{todayTasks.length}</span>
              <span className="text-[11px] text-emerald-400 font-medium">({completedToday} done)</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/70">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <CalendarIcon className="h-3 w-3 text-indigo-400" />
              Google Calendar
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-indigo-300">{todayCalendarEvents.length}</span>
              <span className="text-[11px] text-slate-400 font-medium">events today</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/70">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <CheckSquare className="h-3 w-3 text-blue-400" />
              Google Tasks
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-blue-300">{pendingGoogleTasks.length}</span>
              <span className="text-[11px] text-slate-400 font-medium">active tasks</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/40 p-2.5 border border-slate-800/70">
            <span className="text-slate-400 text-[11px] block">Queue Progress</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden ring-1 ring-slate-800">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <span className="text-xs font-bold text-emerald-400 shrink-0">{completionPercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Daily Reminder Queue & Dual Google Workspace Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Actionable Reminders Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Today's Action & Reminder Queue
              </h2>
              <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                {pendingToday.length}
              </span>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setTaskFilterTab('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  taskFilterTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({pendingToday.length})
              </button>
              <button
                onClick={() => setTaskFilterTab('urgent')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  taskFilterTab === 'urgent'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Urgent ({urgentCount})
              </button>
              <button
                onClick={() => setTaskFilterTab('synced')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  taskFilterTab === 'synced'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Synced with Google
              </button>
            </div>
          </div>

          {/* Overdue tasks banner */}
          {overdueTasks.length > 0 && (
            <div
              id="overdue-tasks-reminder"
              className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-2xs"
            >
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-rose-950 dark:text-rose-100">Overdue Task Alert</h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                  You have {overdueTasks.length} unfinished task{overdueTasks.length > 1 ? 's' : ''} from earlier dates.
                  Review and reschedule or mark them done.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {overdueTasks.slice(0, 3).map((ot) => (
                    <div
                      key={ot.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 dark:bg-rose-900/50 px-2.5 py-1 text-xs font-semibold text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800/60 shadow-2xs"
                    >
                      <span className="truncate max-w-[160px]">{ot.title}</span>
                      <button
                        onClick={() => onCompleteTask(ot.id)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold ml-1 cursor-pointer"
                        title="Mark Done"
                      >
                        ✓
                      </button>
                    </div>
                  ))}
                  {overdueTasks.length > 3 && (
                    <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold self-center">
                      +{overdueTasks.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Task list items */}
          {filteredTodayTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 p-8 text-center shadow-2xs">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 dark:text-emerald-400 mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {taskFilterTab === 'all'
                  ? 'No pending tasks remaining for today'
                  : 'No tasks matching the selected filter'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {taskFilterTab === 'all'
                  ? 'Great job! Add tasks for tomorrow or check your Google Calendar & Google Tasks on the right.'
                  : 'Adjust filters or click Quick Add Task above to create new schedule items.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTodayTasks.map((task) => {
                const isMultiDay = task.assignedDate && task.assignedDate !== task.dueDate;
                const isExpanded = Boolean(expandedTaskIds[task.id]);
                const notesText = getTaskNotes(task);
                const hasNotes = Boolean(notesText || task.reviewNotes?.trim());

                return (
                  <div
                    key={task.id}
                    id={`today-task-${task.id}`}
                    onClick={() => {
                      toggleTaskExpanded(task.id);
                    }}
                    className={`group rounded-xl border transition-all duration-200 cursor-pointer ${
                      isExpanded
                        ? 'bg-slate-50/90 dark:bg-slate-900/95 border-indigo-300 dark:border-indigo-500/50 shadow-xs'
                        : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                    } p-3.5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          id={`complete-task-${task.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteTask(task.id);
                          }}
                          className="mt-0.5 rounded-full text-slate-400 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 focus:outline-none transition-colors shrink-0 cursor-pointer"
                          title="Mark task done"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                              {task.title}
                            </p>

                            {/* Notes Indicator Pill */}
                            {hasNotes && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskExpanded(task.id);
                                }}
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                                  isExpanded
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700/60 font-semibold'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'
                                }`}
                                title={isExpanded ? 'Click to collapse notes' : 'Click to view additional notes'}
                              >
                                <FileText className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                                <span>Notes</span>
                                <ChevronDown
                                  className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {task.dueTime && (
                              <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                                <Clock className="h-3 w-3" />
                                {task.dueTime}
                                {task.estimatedDurationMinutes ? ` (${task.estimatedDurationMinutes}m)` : ''}
                              </span>
                            )}

                            {isMultiDay && (
                              <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-transparent">
                                <span>Span:</span> {task.assignedDate} → {task.dueDate}
                              </span>
                            )}

                            <span className="capitalize text-slate-500 dark:text-slate-400">• {task.category}</span>

                            {task.priority === 'urgent' && (
                              <span className="text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/60">
                                Urgent
                              </span>
                            )}
                            {task.priority === 'high' && (
                              <span className="text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                                High
                              </span>
                            )}

                            {/* Google Calendar Link Badge */}
                            {task.syncedToGoogleCalendar && (
                              <a
                                href={task.googleCalendarHtmlLink || 'https://calendar.google.com'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60 transition-colors"
                                title="Synced with Google Calendar (Click to open)"
                              >
                                <CalendarIcon className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                                <span>Calendar</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}

                            {/* Google Tasks Link Badge */}
                            {task.syncedToGoogleTasks && (
                              <a
                                href={task.googleTaskWebViewLink || 'https://tasks.google.com'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60 transition-colors"
                                title="Synced with Google Tasks (Click to open)"
                              >
                                <CheckSquare className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                                <span>Google Tasks</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}

                            {task.assignedTo && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                Assigned: {task.assignedTo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div
                        className="flex items-center gap-1.5 shrink-0 ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Push to Google Calendar button if not yet synced */}
                        {!task.syncedToGoogleCalendar && onSyncTaskToGoogleCalendar && (
                          <button
                            onClick={() => onSyncTaskToGoogleCalendar(task)}
                            title="Push to Google Calendar"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                          >
                            <CalendarIcon className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Push to Google Tasks button if not yet synced */}
                        {!task.syncedToGoogleTasks && onSyncTaskToGoogleTasks && (
                          <button
                            onClick={() => onSyncTaskToGoogleTasks(task)}
                            title="Push to Google Tasks"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Edit Task button */}
                        {onEditTask && (
                          <button
                            onClick={() => onEditTask(task)}
                            title="Edit Task (Title, notes, dates, and sync)"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onCompleteTask(task.id)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>

                    {/* Expanded Notes Section */}
                    {isExpanded && (
                      <div
                        id={`task-expanded-section-${task.id}`}
                        className="mt-3 pt-3 border-t border-slate-200/90 dark:border-slate-800/80 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {hasNotes ? (
                          <div className="rounded-xl bg-slate-50/90 dark:bg-slate-950/70 p-3.5 border border-slate-200/90 dark:border-slate-800/90 space-y-2.5">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60 text-[11px]">
                              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
                                <FileText className="h-3.5 w-3.5" />
                                Additional Notes
                              </span>
                              <div className="flex items-center gap-2">
                                {onEditTask && (
                                  <button
                                    onClick={() => onEditTask(task)}
                                    className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 font-semibold text-xs cursor-pointer transition-colors"
                                    title="Edit notes & task details"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>Edit Notes</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleTaskExpanded(task.id)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium cursor-pointer"
                                  title="Collapse notes"
                                >
                                  Collapse
                                </button>
                              </div>
                            </div>

                            {notesText && (
                              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-normal select-text">
                                {notesText}
                              </p>
                            )}

                            {task.reviewNotes && (
                              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                                <span className="font-bold">Review Feedback:</span> {task.reviewNotes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl bg-slate-50/60 dark:bg-slate-950/40 p-3 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 text-xs italic">
                              No additional notes for this task.
                            </span>
                            {onEditTask && (
                              <button
                                onClick={() => onEditTask(task)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Notes</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Google Calendar & Google Tasks Workspace Hub */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Google Workspace
            </h2>

            {isAuthenticated && (
              <button
                onClick={onRefreshGoogleData}
                disabled={isLoadingGoogleData}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold cursor-pointer"
                title="Refresh Calendar & Tasks"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingGoogleData ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 p-4 shadow-2xs space-y-4 transition-colors">
            {!isAuthenticated ? (
              <div className="py-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/60">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Google Calendar & Tasks Connected</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 px-2 leading-relaxed">
                  Sign in with your Google account to automatically load today's live Google Calendar schedule and sync Google Tasks.
                </p>
                <button
                  onClick={onSignIn}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
                >
                  Sign in with Google
                </button>
              </div>
            ) : (
              <>
                {/* View switcher tabs for Calendar vs Tasks */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium">
                  <button
                    onClick={() => setGoogleViewTab('all')}
                    className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                      googleViewTab === 'all'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Both
                  </button>
                  <button
                    onClick={() => setGoogleViewTab('calendar')}
                    className={`py-1.5 rounded-lg text-center flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      googleViewTab === 'calendar'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <CalendarIcon className="h-3 w-3" />
                    <span>Cal ({todayCalendarEvents.length})</span>
                  </button>
                  <button
                    onClick={() => setGoogleViewTab('tasks')}
                    className={`py-1.5 rounded-lg text-center flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      googleViewTab === 'tasks'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <CheckSquare className="h-3 w-3" />
                    <span>Tasks ({pendingGoogleTasks.length})</span>
                  </button>
                </div>

                {/* Section 1: Google Calendar Agenda */}
                {(googleViewTab === 'all' || googleViewTab === 'calendar') && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Google Calendar ({todayCalendarEvents.length})
                      </span>
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 inline-flex items-center gap-1"
                      >
                        <span>Open Web</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>

                    {todayCalendarEvents.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 p-3.5 text-center border border-slate-200 dark:border-slate-800/60">
                        <CalendarIcon className="mx-auto h-5 w-5 text-slate-400 dark:text-slate-600 mb-1" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No Google Calendar events today.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {todayCalendarEvents.map((evt) => {
                          const startTime = evt.start.dateTime
                            ? new Date(evt.start.dateTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'All Day';
                          return (
                            <div
                              key={evt.id}
                              className="flex items-start justify-between rounded-xl bg-slate-50 dark:bg-slate-950/70 p-3 border border-slate-200 dark:border-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{evt.summary}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                                  <Clock className="h-3 w-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
                                  <span>{startTime}</span>
                                  {evt.location && <span className="truncate">• {evt.location}</span>}
                                </p>
                              </div>
                              {evt.htmlLink && (
                                <a
                                  href={evt.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mt-0.5 transition-colors"
                                  title="Open Event in Google Calendar"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Section 2: Google Tasks Live List */}
                {(googleViewTab === 'all' || googleViewTab === 'tasks') && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Google Tasks ({pendingGoogleTasks.length})
                      </span>
                      <a
                        href="https://tasks.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-500 inline-flex items-center gap-1"
                      >
                        <span>Open Web</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>

                    {visibleGoogleTasks.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 p-3.5 text-center border border-slate-200 dark:border-slate-800/60">
                        <CheckSquare className="mx-auto h-5 w-5 text-slate-400 dark:text-slate-600 mb-1" />
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {googleTasksList.length > 0
                            ? 'All completed Google Tasks older than 24 hours have rolled off.'
                            : 'No tasks found in your Google Tasks account.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {visibleGoogleTasks.map((gTask) => {
                          const isCompleted = gTask.status === 'completed';
                          const isAlreadyImported = tasks.some((t) => t.googleTaskId === gTask.id);
                          const isGTaskExpanded = Boolean(expandedGoogleTaskIds[gTask.id]);

                          return (
                            <div
                              key={gTask.id}
                              onClick={() => {
                                if (gTask.notes) {
                                  toggleGoogleTaskExpanded(gTask.id);
                                }
                              }}
                              className={`flex items-start justify-between rounded-xl p-3 border transition-all ${
                                gTask.notes ? 'cursor-pointer' : ''
                              } ${
                                isCompleted
                                  ? 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-900/80 opacity-70'
                                  : isGTaskExpanded
                                  ? 'bg-slate-100/90 dark:bg-slate-900/90 border-blue-300 dark:border-blue-700/60 shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 pr-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleGoogleTaskStatus &&
                                      onToggleGoogleTaskStatus(gTask.id, !isCompleted);
                                  }}
                                  className={`rounded mt-0.5 h-4 w-4 border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                                    isCompleted
                                      ? 'bg-blue-600 border-blue-500 text-white'
                                      : 'border-slate-400 dark:border-slate-600 hover:border-blue-500 text-transparent'
                                  }`}
                                  title={isCompleted ? 'Mark uncompleted' : 'Mark completed in Google Tasks'}
                                >
                                  <Check className="h-3 w-3" />
                                </button>

                                <div className="min-w-0">
                                  <p
                                    className={`text-xs font-semibold truncate ${
                                      isCompleted ? 'line-through text-slate-400 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
                                    }`}
                                  >
                                    {gTask.title || 'Untitled Google Task'}
                                  </p>

                                  {gTask.notes && (
                                    <p
                                      className={`text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed ${
                                        isGTaskExpanded ? 'whitespace-pre-wrap' : 'line-clamp-1 text-slate-500 dark:text-slate-400'
                                      }`}
                                    >
                                      {gTask.notes}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {gTask.due && (
                                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                        Due: {gTask.due.split('T')[0]}
                                      </span>
                                    )}

                                    {gTask.notes && (
                                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                        {isGTaskExpanded ? '• Click to collapse' : '• Click to expand notes'}
                                      </span>
                                    )}

                                    {isCompleted && (
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400/90 font-medium inline-flex items-center gap-1">
                                        <span>•</span>
                                        <span>{getCompletionTimeLabel(gTask)} (falls off in 24h)</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {!isAlreadyImported && onImportGoogleTask && !isCompleted && (
                                  <button
                                    onClick={() => onImportGoogleTask(gTask)}
                                    title="Import to local schedule"
                                    className="text-[10px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                                  >
                                    + Add
                                  </button>
                                )}

                                <a
                                  href={gTask.webViewLink || 'https://tasks.google.com'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-blue-500 p-0.5"
                                  title="Open in Google Tasks"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
