import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, AlertCircle, Tag, X, CheckSquare, Edit3, Sparkles } from 'lucide-react';
import { TaskItem } from '../types';
import { getTodayDateString } from '../lib/storage';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<TaskItem, 'id' | 'createdAt'>) => Promise<void>;
  initialTask?: TaskItem | null;
  initialDate?: string;
  syncWithGoogleTasksByDefault?: boolean;
  syncWithGoogleCalendarByDefault?: boolean;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
  initialDate,
  syncWithGoogleTasksByDefault = false,
  syncWithGoogleCalendarByDefault = false,
}) => {
  const today = getTodayDateString();

  const isEditing = Boolean(initialTask && initialTask.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDate, setAssignedDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [dueTime, setDueTime] = useState('');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number>(30);
  const [priority, setPriority] = useState<TaskItem['priority']>('medium');
  const [category, setCategory] = useState<TaskItem['category']>('work');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(15);
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(syncWithGoogleCalendarByDefault);
  const [syncToTasks, setSyncToTasks] = useState<boolean>(syncWithGoogleTasksByDefault);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize form state whenever modal opens or initialTask / initialDate changes
  useEffect(() => {
    if (isOpen) {
      if (initialTask && initialTask.id) {
        // Editing existing task: populate all existing fields including title and notes
        setTitle(initialTask.title || '');
        setDescription(initialTask.description || '');
        setAssignedDate(initialTask.assignedDate || initialTask.dueDate || today);
        setDueDate(initialTask.dueDate || today);
        setDueTime(initialTask.dueTime || '');
        setEstimatedDurationMinutes(initialTask.estimatedDurationMinutes || 30);
        setPriority(initialTask.priority || 'medium');
        setCategory(initialTask.category || 'work');
        setReminderEnabled(initialTask.reminderEnabled !== undefined ? initialTask.reminderEnabled : true);
        setReminderMinutesBefore(initialTask.reminderMinutesBefore || 15);
        setSyncToCalendar(
          initialTask.syncedToGoogleCalendar !== undefined
            ? initialTask.syncedToGoogleCalendar
            : syncWithGoogleCalendarByDefault
        );
        setSyncToTasks(
          initialTask.syncedToGoogleTasks !== undefined
            ? initialTask.syncedToGoogleTasks
            : syncWithGoogleTasksByDefault
        );
      } else {
        // Creating new task: populate with clean defaults
        const defaultDate = initialTask?.dueDate || initialDate || today;
        setTitle(initialTask?.title || '');
        setDescription(initialTask?.description || '');
        setAssignedDate(initialTask?.assignedDate || defaultDate);
        setDueDate(defaultDate);
        setDueTime(initialTask?.dueTime || '');
        setEstimatedDurationMinutes(initialTask?.estimatedDurationMinutes || 30);
        setPriority(initialTask?.priority || 'medium');
        setCategory(initialTask?.category || 'work');
        setReminderEnabled(true);
        setReminderMinutesBefore(15);
        setSyncToCalendar(false);
        setSyncToTasks(false);
      }
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialTask, initialDate, syncWithGoogleCalendarByDefault, syncWithGoogleTasksByDefault, today]);

  if (!isOpen) return null;

  // Calculate day span
  const calculateDaySpan = () => {
    if (!assignedDate || !dueDate) return 1;
    const start = new Date(assignedDate);
    const end = new Date(dueDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const daySpan = calculateDaySpan();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!dueDate) {
      setError('Due date is required.');
      return;
    }

    // Ensure valid date order
    const finalAssignedDate = assignedDate || dueDate;
    const finalDueDate = dueDate >= finalAssignedDate ? dueDate : finalAssignedDate;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        assignedDate: finalAssignedDate,
        dueDate: finalDueDate,
        dueTime: dueTime || undefined,
        estimatedDurationMinutes: dueTime ? Number(estimatedDurationMinutes) : undefined,
        priority,
        category,
        completed: initialTask?.completed || false,
        completedAt: initialTask?.completedAt,
        syncedToGoogleCalendar: syncToCalendar,
        googleCalendarEventId: initialTask?.googleCalendarEventId,
        googleCalendarHtmlLink: initialTask?.googleCalendarHtmlLink,
        syncedToGoogleTasks: syncToTasks,
        googleTaskId: initialTask?.googleTaskId,
        googleTaskListId: initialTask?.googleTaskListId,
        googleTaskWebViewLink: initialTask?.googleTaskWebViewLink,
        reminderEnabled,
        reminderMinutesBefore: reminderEnabled ? Number(reminderMinutesBefore) : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="task-form-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        id="task-form-modal"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xs">
              {isEditing ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Task' : 'Create New Running Task'}
              </h2>
              {isEditing && (
                <p className="text-[11px] text-indigo-600 dark:text-indigo-300 font-medium">Update title, notes, dates, and sync settings</p>
              )}
            </div>
          </div>
          <button
            id="close-task-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3 text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Task Title *
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              placeholder="e.g., Finalize project roadmap & sync with calendar"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Description / Notes
            </label>
            <textarea
              id="task-description-input"
              rows={3}
              placeholder="Add key context, notes, links, or checklist items..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none transition-all leading-relaxed"
            />
          </div>

          {/* Assigned Date & Due Date Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Assigned / Start Date
              </label>
              <div className="relative">
                <input
                  id="task-assigned-date-input"
                  type="date"
                  value={assignedDate}
                  onChange={(e) => {
                    setAssignedDate(e.target.value);
                    if (e.target.value > dueDate) {
                      setDueDate(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all font-medium"
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Due Date (Deadline) *
              </label>
              <div className="relative">
                <input
                  id="task-due-date-input"
                  type="date"
                  required
                  value={dueDate}
                  min={assignedDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all font-medium"
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Multi-day schedule indicator banner */}
          {daySpan > 1 && (
            <div className="flex items-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 px-3.5 py-2 text-xs text-indigo-700 dark:text-indigo-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                <strong>Multi-Day Span:</strong> Active across <strong>{daySpan} days</strong> on your schedule until completion.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Specific Time (Optional)
              </label>
              <div className="relative">
                <input
                  id="task-due-time-input"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all font-medium"
                />
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Estimated Duration
              </label>
              <select
                id="task-duration-select"
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(Number(e.target.value))}
                disabled={!dueTime}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none disabled:opacity-40 font-medium"
              >
                <option value={15} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">15 minutes</option>
                <option value={30} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">30 minutes</option>
                <option value={45} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">45 minutes</option>
                <option value={60} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">1 hour</option>
                <option value={90} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">1.5 hours</option>
                <option value={120} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">2 hours</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Priority
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none font-medium"
              >
                <option value="low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Low Priority</option>
                <option value="medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Medium Priority</option>
                <option value="high" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">High Priority</option>
                <option value="urgent" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <select
                id="task-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none font-medium"
              >
                <option value="work" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Work & Projects</option>
                <option value="personal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Personal</option>
                <option value="health" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Health & Fitness</option>
                <option value="errands" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Errands & Bills</option>
                <option value="learning" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Learning & Reading</option>
                <option value="other" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Other</option>
              </select>
            </div>
          </div>

          {/* Sync Controls: Google Calendar & Google Tasks */}
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Sync to Google Calendar
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {daySpan > 1
                    ? `Displays across all ${daySpan} days (from ${assignedDate} to ${dueDate})`
                    : 'Creates calendar event on scheduled date'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="task-sync-calendar-toggle"
                  type="checkbox"
                  checked={syncToCalendar}
                  onChange={(e) => setSyncToCalendar(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-indigo-200 dark:border-indigo-900/40 pt-2.5">
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Sync to Google Tasks
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Add directly to your Google Tasks account</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="task-sync-tasks-toggle"
                  type="checkbox"
                  checked={syncToTasks}
                  onChange={(e) => setSyncToTasks(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-indigo-200 dark:border-indigo-900/40 pt-2.5">
              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Daily Reminder Notice</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Highlight in daily morning brief and send alerts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="task-reminder-toggle"
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              id="cancel-task-btn"
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-task-btn"
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Add to Running List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
