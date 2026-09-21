import { TaskItem, Collaborator, ShortenedUrl } from '../types';

const STORAGE_KEY = 'google_sync_tasks_v1';
const THEME_STORAGE_KEY = 'tasksync_theme_preference';
const COLLABORATORS_STORAGE_KEY = 'tasksync_collaborators_v1';
const SHORTLINKS_STORAGE_KEY = 'tasksync_shortlinks_v1';

export function getStoredTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // Dark mode is default as on
  } catch (e) {
    return 'dark';
  }
}

export function saveStoredTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme preference:', e);
  }
}

export function getStoredTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultTasks();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getDefaultTasks();
  } catch (e) {
    console.error('Failed to load stored tasks:', e);
    return getDefaultTasks();
  }
}

export function saveStoredTasks(tasks: TaskItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks:', e);
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getFormattedDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const todayStr = getTodayDateString();

  if (dateStr === todayStr) {
    return 'Today';
  }

  // Check tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  if (dateStr === tomorrowStr) {
    return 'Tomorrow';
  }

  // Check yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yesterdayStr) {
    return 'Yesterday (Overdue)';
  }

  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getDefaultTasks(): TaskItem[] {
  const today = getTodayDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  return [
    {
      id: 'task-1',
      title: 'Review quarterly project deliverables',
      description: 'Prepare key updates, metrics, and risk assessment for team sync.',
      dueDate: today,
      dueTime: '10:00',
      estimatedDurationMinutes: 45,
      priority: 'high',
      category: 'work',
      status: 'approved',
      completed: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      reminderEnabled: true,
      reminderMinutesBefore: 15,
      assignedTo: 'KingGoddeth@gmail.com',
    },
    {
      id: 'task-2',
      title: 'Daily 30-minute cardio & stretch workout',
      description: 'Outdoor jog or stationary bike session to boost energy.',
      dueDate: today,
      dueTime: '17:30',
      estimatedDurationMinutes: 30,
      priority: 'medium',
      category: 'health',
      status: 'approved',
      completed: false,
      createdAt: new Date(Date.now() - 72000000).toISOString(),
      reminderEnabled: true,
      reminderMinutesBefore: 30,
    },
    {
      id: 'task-3',
      title: 'Submit utility bill payments',
      description: 'Pay electric & high-speed internet monthly statements online.',
      dueDate: tomorrow,
      priority: 'medium',
      category: 'errands',
      status: 'approved',
      completed: false,
      createdAt: new Date(Date.now() - 50000000).toISOString(),
      reminderEnabled: true,
      reminderMinutesBefore: 60,
    },
    {
      id: 'task-inbox-1',
      title: 'Prepare client onboarding slide deck',
      description: 'Quick submission from Sarah via client form: include case study benchmarks and timeline milestones.',
      dueDate: tomorrow,
      priority: 'high',
      category: 'work',
      status: 'inbox',
      completed: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      submittedBy: {
        name: 'Sarah Lin',
        email: 'sarah.lin@partnercorp.io',
      },
      tags: ['Client Request', 'Presentation'],
      reminderEnabled: true,
    },
    {
      id: 'task-inbox-2',
      title: 'API Rate limit configuration audit',
      description: 'Review third-party webhook thresholds before upcoming launch.',
      dueDate: today,
      priority: 'urgent',
      category: 'work',
      status: 'inbox',
      completed: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      submittedBy: {
        name: 'Alex Chen',
        email: 'alex.chen@devops.co',
      },
      tags: ['Security', 'Backend'],
      reminderEnabled: true,
    },
    {
      id: 'task-4',
      title: 'Read chapter 4 of High Output Management',
      description: 'Take notes on operational leverage and managerial delegation.',
      dueDate: today,
      priority: 'low',
      category: 'learning',
      status: 'approved',
      completed: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 100000000).toISOString(),
      reminderEnabled: false,
    },
  ];
}

export function getDefaultCollaborators(): Collaborator[] {
  return [
    {
      id: 'collab-owner',
      name: 'Brian (Project Lead)',
      email: 'KingGoddeth@gmail.com',
      role: 'admin',
      status: 'active',
      department: 'Product & Leadership',
      addedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'collab-1',
      name: 'Sarah Lin',
      email: 'sarah.lin@partnercorp.io',
      role: 'editor',
      status: 'active',
      department: 'Client Operations',
      addedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      id: 'collab-2',
      name: 'Alex Chen',
      email: 'alex.chen@devops.co',
      role: 'contributor',
      status: 'active',
      department: 'Engineering',
      addedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'collab-3',
      name: 'Elena Rostova',
      email: 'elena@designstudio.org',
      role: 'viewer',
      status: 'invited',
      department: 'Design & UX',
      addedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];
}

export function getStoredCollaborators(): Collaborator[] {
  try {
    const raw = localStorage.getItem(COLLABORATORS_STORAGE_KEY);
    if (!raw) return getDefaultCollaborators();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultCollaborators();
  } catch (e) {
    return getDefaultCollaborators();
  }
}

export function saveStoredCollaborators(collabs: Collaborator[]): void {
  try {
    localStorage.setItem(COLLABORATORS_STORAGE_KEY, JSON.stringify(collabs));
  } catch (e) {
    console.error('Failed to save collaborators:', e);
  }
}

export function getDefaultShortlinks(): ShortenedUrl[] {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tasksync.app';
  return [
    {
      id: 'link-quick-submit',
      originalUrl: `${origin}?view=quick-submit`,
      shortSlug: 'quick-submit',
      shortUrl: 'tsk.sync/quick-submit',
      title: 'Team Quick-Submit Task Portal',
      clicks: 42,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'link-shared-calendar',
      originalUrl: `${origin}?view=shared-calendar`,
      shortSlug: 'shared-calendar',
      shortUrl: 'tsk.sync/team-cal',
      title: 'Shared Team Schedule & Calendar',
      clicks: 89,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  ];
}

export function getStoredShortlinks(): ShortenedUrl[] {
  try {
    const raw = localStorage.getItem(SHORTLINKS_STORAGE_KEY);
    if (!raw) return getDefaultShortlinks();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultShortlinks();
  } catch (e) {
    return getDefaultShortlinks();
  }
}

export function saveStoredShortlinks(links: ShortenedUrl[]): void {
  try {
    localStorage.setItem(SHORTLINKS_STORAGE_KEY, JSON.stringify(links));
  } catch (e) {
    console.error('Failed to save shortlinks:', e);
  }
}

