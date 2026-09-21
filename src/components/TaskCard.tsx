import React from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  ExternalLink,
  RefreshCw,
  Trash2,
  Edit2,
  Bell,
  Sparkles,
  Flame,
  AlertTriangle,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { TaskItem } from '../types';
import { getFormattedDateDisplay, getTodayDateString } from '../lib/storage';

interface TaskCardProps {
  task: TaskItem;
  onToggleComplete: (id: string) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onSyncTasks: (task: TaskItem) => void;
  onSyncCalendar?: (task: TaskItem) => void;
  isSyncing?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onSyncTasks,
  onSyncCalendar,
  isSyncing = false,
}) => {
  const today = getTodayDateString();
  const isToday = task.dueDate === today;
  const isOverdue = task.dueDate < today && !task.completed;
  const isMultiDay = Boolean(task.assignedDate && task.assignedDate !== task.dueDate);

  const priorityBadges = {
    urgent: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    high: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    medium: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
    low: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60',
  };

  const categoryBadges = {
    work: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    personal: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    health: 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
    errands: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    learning: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60',
    other: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60',
  };

  return (
    <div
      id={`task-item-${task.id}`}
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-150 ${
        task.completed
          ? 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50 opacity-60'
          : isOverdue
          ? 'bg-rose-50/90 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-2xs'
          : isToday
          ? 'bg-white dark:bg-slate-900/90 border-indigo-300 dark:border-indigo-500/40 shadow-xs hover:border-indigo-500'
          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Toggle Complete Checkbox */}
        <button
          id={`toggle-task-${task.id}`}
          onClick={() => onToggleComplete(task.id)}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition-colors cursor-pointer"
        >
          {task.completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500 fill-emerald-100 dark:fill-emerald-950/50" />
          ) : (
            <Circle className="h-5 w-5 hover:text-indigo-600 dark:hover:text-indigo-400" />
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                priorityBadges[task.priority]
              }`}
            >
              {task.priority === 'urgent' && <Flame className="h-3 w-3 text-rose-500 dark:text-rose-400" />}
              {task.priority}
            </span>

            <span
              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold capitalize border ${
                categoryBadges[task.category] || categoryBadges.other
              }`}
            >
              {task.category}
            </span>

            {task.reminderEnabled && (
              <span
                title={`Daily reminder notice active (${task.reminderMinutesBefore || 15}m prior)`}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60"
              >
                <Bell className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                <span>Reminder</span>
              </span>
            )}

            {task.syncedToGoogleCalendar && (
              <a
                href={task.googleCalendarHtmlLink || 'https://calendar.google.com'}
                target="_blank"
                rel="noreferrer"
                title={task.googleCalendarHtmlLink ? 'Open in Google Calendar' : 'Synced to Google Calendar'}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition-colors"
              >
                <Calendar className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                <span>Google Calendar</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
            )}

            {task.syncedToGoogleTasks && (
              <a
                href={task.googleTaskWebViewLink || 'https://tasks.google.com'}
                target="_blank"
                rel="noreferrer"
                title={task.googleTaskWebViewLink ? 'Open in Google Tasks' : 'Synced to Google Tasks'}
                className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800/60 transition-colors"
              >
                <CheckSquare className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                <span>Google Tasks</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
            )}
          </div>

          <h3
            className={`text-sm font-semibold leading-snug ${
              task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p
              className={`mt-1 text-xs leading-relaxed ${
                task.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {task.description}
            </p>
          )}

          {/* Date & Time metadata with Assigned -> Due span */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {isMultiDay ? (
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  isOverdue ? 'text-rose-600 dark:text-rose-400' : isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-slate-500 dark:text-slate-400 font-normal">Assigned:</span> {getFormattedDateDisplay(task.assignedDate!)}
                <ArrowRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                <span className="text-slate-500 dark:text-slate-400 font-normal">Due:</span> {getFormattedDateDisplay(task.dueDate)}
                {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 ml-0.5" />}
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  isOverdue
                    ? 'text-rose-600 dark:text-rose-400'
                    : isToday
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                {getFormattedDateDisplay(task.dueDate)}
                {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 ml-0.5" />}
              </span>
            )}

            {task.dueTime && (
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                {task.dueTime}
                {task.estimatedDurationMinutes ? ` (${task.estimatedDurationMinutes}m)` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {onSyncCalendar && (
            <button
              id={`sync-cal-${task.id}`}
              onClick={() => onSyncCalendar(task)}
              disabled={isSyncing}
              title={task.syncedToGoogleCalendar ? 'Re-sync with Google Calendar' : 'Push to Google Calendar'}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                task.syncedToGoogleCalendar
                  ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50'
                  : 'text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="h-4 w-4" />
            </button>
          )}

          <button
            id={`sync-tasks-${task.id}`}
            onClick={() => onSyncTasks(task)}
            disabled={isSyncing}
            title={task.syncedToGoogleTasks ? 'Re-sync with Google Tasks' : 'Sync to Google Tasks'}
            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
              task.syncedToGoogleTasks
                ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50'
                : 'text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
          </button>

          <button
            id={`edit-task-${task.id}`}
            onClick={() => onEdit(task)}
            title="Edit task"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Edit2 className="h-4 w-4" />
          </button>

          <button
            id={`delete-task-${task.id}`}
            onClick={() => onDelete(task)}
            title="Delete task"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

