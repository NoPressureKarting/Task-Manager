import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Plus,
  CheckCircle2,
  Edit2,
} from 'lucide-react';
import { TaskItem, GoogleCalendarEvent } from '../types';
import { getTodayDateString } from '../lib/storage';

interface CalendarScheduleViewProps {
  tasks: TaskItem[];
  calendarEvents: GoogleCalendarEvent[];
  onSelectDate: (dateStr: string) => void;
  selectedDate: string;
  onAddTaskForDate: (dateStr: string) => void;
  onEditTask?: (task: TaskItem) => void;
}

export const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({
  tasks,
  calendarEvents,
  onSelectDate,
  selectedDate,
  onAddTaskForDate,
  onEditTask,
}) => {
  const todayStr = getTodayDateString();
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const monthName = currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Compute days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create grid cells
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    days.push(`${year}-${monthStr}-${dayStr}`);
  }

  // Helper to check if task spans across a date
  const isTaskOnDate = (task: TaskItem, dateStr: string) => {
    const start = task.assignedDate || task.dueDate;
    const end = task.dueDate >= start ? task.dueDate : start;
    return dateStr >= start && dateStr <= end;
  };

  // Helper to check if calendar event covers a date
  const isEventOnDate = (evt: GoogleCalendarEvent, dateStr: string) => {
    const startStr = (evt.start.dateTime ? evt.start.dateTime.split('T')[0] : evt.start.date) || '';
    const endStr = (evt.end.dateTime ? evt.end.dateTime.split('T')[0] : evt.end.date) || startStr;
    
    if (evt.start.date && evt.end.date) {
      // In Google Calendar all-day events, end date is exclusive
      return dateStr >= startStr && dateStr < endStr;
    }
    return dateStr >= startStr && dateStr <= endStr;
  };

  // Selected date tasks & calendar events
  const selectedTasks = tasks.filter((t) => isTaskOnDate(t, selectedDate));
  const selectedEvents = calendarEvents.filter((evt) => isEventOnDate(evt, selectedDate));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid (2 Cols) */}
      <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-2xs transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/60">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{monthName}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentMonthDate(new Date())}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day header names */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((dateStr, idx) => {
            if (!dateStr) {
              return <div key={`empty-${idx}`} className="h-20 sm:h-22 rounded-xl bg-slate-100/50 dark:bg-slate-950/40 border border-transparent" />;
            }

            const dayNum = parseInt(dateStr.split('-')[2], 10);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dateTasks = tasks.filter((t) => isTaskOnDate(t, dateStr));
            const pendingTasksCount = dateTasks.filter((t) => !t.completed).length;
            const dateEvents = calendarEvents.filter((evt) => isEventOnDate(evt, dateStr));

            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`group relative h-20 sm:h-22 rounded-xl p-1.5 sm:p-2 cursor-pointer border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-xs ring-2 ring-indigo-500/30'
                    : isToday
                    ? 'border-indigo-500/60 bg-indigo-50/60 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800/70 bg-slate-50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTaskForDate(dateStr);
                    }}
                    title="Add task for this date"
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity p-0.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Badges indicators */}
                <div className="space-y-0.5 overflow-hidden">
                  {pendingTasksCount > 0 && (
                    <div className="truncate rounded-md bg-indigo-100 dark:bg-indigo-950/80 px-1 py-0.5 text-[10px] font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                      {pendingTasksCount} task{pendingTasksCount > 1 ? 's' : ''}
                    </div>
                  )}
                  {dateEvents.length > 0 && (
                    <div className="truncate rounded-md bg-blue-100 dark:bg-blue-950/80 px-1 py-0.5 text-[10px] font-semibold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                      {dateEvents.length} cal
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Detail (1 Col) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 p-5 shadow-2xs space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {new Date(selectedDate.replace(/-/g, '/')).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Day Schedule & Task Sync</p>
          </div>
          <button
            onClick={() => onAddTaskForDate(selectedDate)}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/70 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </button>
        </div>

        {/* Tasks on this day */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Tasks ({selectedTasks.length})
          </h4>
          {selectedTasks.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No tasks scheduled for this day.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedTasks.map((task) => {
                const isMultiDay = task.assignedDate && task.assignedDate !== task.dueDate;
                return (
                  <div
                    key={task.id}
                    className={`rounded-xl p-2.5 text-xs border transition-all ${
                      task.completed
                        ? 'bg-slate-100/60 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/50 opacity-50'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 shadow-2xs text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {task.dueTime && <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">{task.dueTime}</span>}
                        {onEditTask && (
                          <button
                            onClick={() => onEditTask(task)}
                            title="Edit Task"
                            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {isMultiDay && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Span: <span className="text-slate-700 dark:text-slate-300 font-medium">{task.assignedDate}</span> → <span className="text-indigo-600 dark:text-indigo-300 font-medium">{task.dueDate}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {task.syncedToGoogleCalendar && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">✓ Google Calendar</span>
                      )}
                      {task.syncedToGoogleTasks && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">✓ Google Tasks</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Google Calendar Events on this day */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Calendar Events ({selectedEvents.length})
          </h4>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No Google Calendar events for this day.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-2.5 text-xs border border-blue-200 dark:border-blue-900/50 flex items-start justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{evt.summary}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {evt.start.dateTime
                        ? new Date(evt.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'All Day'}
                    </p>
                  </div>
                  {evt.htmlLink && (
                    <a
                      href={evt.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-500 ml-2"
                      title="Open in Google Calendar"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
