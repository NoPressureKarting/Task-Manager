export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  assignedDate?: string; // YYYY-MM-DD (start/assigned date for multi-day calendar visibility)
  assignedTime?: string; // HH:mm (24h)
  dueDate: string; // YYYY-MM-DD (due/target completion date)
  dueTime?: string; // HH:mm (24h)
  estimatedDurationMinutes?: number; // e.g. 30
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'work' | 'personal' | 'health' | 'errands' | 'learning' | 'other';
  completed: boolean;
  completedAt?: string;
  createdAt: string;

  // Workflow, Review & Inbox status
  status?: 'inbox' | 'approved' | 'rejected' | 'scheduled';
  submittedBy?: {
    name?: string;
    email?: string;
  };
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  assignedTo?: string; // Collaborator email or name
  tags?: string[];
  
  // Google Tasks Integration
  syncedToGoogleTasks?: boolean;
  googleTaskId?: string;
  googleTaskListId?: string;
  googleTaskWebViewLink?: string;

  // Google Calendar Integration
  syncedToGoogleCalendar?: boolean;
  googleCalendarEventId?: string;
  googleCalendarHtmlLink?: string;
  lastSyncedAt?: string;

  // Reminder settings
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number; // e.g. 15, 30, 60
  reminderDismissedForDay?: string; // date string when dismissed
  notes?: string;
}

export type CollaboratorRole = 'admin' | 'editor' | 'contributor' | 'viewer';

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: CollaboratorRole;
  avatarUrl?: string;
  status: 'active' | 'invited';
  addedAt: string;
  department?: string;
}

export interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortSlug: string;
  shortUrl: string;
  title: string;
  clicks: number;
  createdAt: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  webViewLink?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface DailySummary {
  date: string;
  totalTasks: number;
  completedTasks: number;
  urgentTasks: number;
  upcomingCalendarEvents: number;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  htmlLink?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  colorId?: string;
  status?: string;
}

export interface ReminderNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
  dueTime?: string;
  type: 'due_today' | 'due_soon' | 'overdue' | 'calendar_sync';
  timestamp: string;
  read: boolean;
}
