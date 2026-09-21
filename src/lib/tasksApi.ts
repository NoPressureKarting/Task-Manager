import { GoogleTask, GoogleTaskList, TaskItem } from '../types';
import { getAccessToken } from './auth';

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

/**
 * List all task lists for the user
 */
export async function listGoogleTaskLists(tokenOverride?: string | null): Promise<GoogleTaskList[]> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Tasks access token is required. Please sign in with Google.');
  }

  const res = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch Google task lists (${res.status})`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleTaskList[];
}

/**
 * Get the primary / default task list or the first available list
 */
export async function getPrimaryTaskListId(tokenOverride?: string | null): Promise<string> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Tasks access token is required.');
  }

  const lists = await listGoogleTaskLists(token);
  if (lists.length > 0) {
    return lists[0].id;
  }
  return '@default';
}

/**
 * List tasks from a specific Google Tasks list (defaults to @default)
 */
export async function listGoogleTasks(
  taskListId = '@default',
  tokenOverride?: string | null
): Promise<GoogleTask[]> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Tasks access token is required.');
  }

  const url = new URL(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks`);
  url.searchParams.set('showCompleted', 'true');
  url.searchParams.set('showHidden', 'true');
  url.searchParams.set('maxResults', '100');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Google Tasks API error (${res.status})`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleTask[];
}

/**
 * Format a dueDate (YYYY-MM-DD) and optional dueTime (HH:mm) into RFC 3339 timestamp required by Google Tasks
 */
function formatTaskDueDateRFC3339(dueDate: string, dueTime?: string): string {
  if (dueTime) {
    const dateTimeStr = `${dueDate}T${dueTime}:00`;
    const dateObj = new Date(dateTimeStr);
    return dateObj.toISOString();
  }
  // For date-only in Google Tasks, an RFC 3339 timestamp with 00:00:00.000Z is standard
  const parts = dueDate.split('-').map(Number);
  const dateObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0));
  return dateObj.toISOString();
}

function buildTaskNotes(task: TaskItem): string {
  const isMultiDay = task.assignedDate && task.assignedDate !== task.dueDate;
  const dateRangeLabel = isMultiDay
    ? `Assigned: ${task.assignedDate} → Due: ${task.dueDate}`
    : `Due Date: ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''}`;

  return [
    task.description || '',
    dateRangeLabel,
    `Category: ${task.category.toUpperCase()} | Priority: ${task.priority.toUpperCase()}`,
    task.dueTime ? `Scheduled Time: ${task.dueTime}` : '',
    task.reminderEnabled ? `Daily Reminder Active (${task.reminderMinutesBefore || 15}m prior)` : '',
    'Managed via TaskSync Daily',
  ].filter(Boolean).join('\n');
}

/**
 * Create a new task in Google Tasks
 */
export async function createGoogleTask(
  task: TaskItem,
  taskListId = '@default',
  tokenOverride?: string | null
): Promise<GoogleTask> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Tasks access token is required.');
  }

  const dueRFC3339 = formatTaskDueDateRFC3339(task.dueDate, task.dueTime);
  const notes = buildTaskNotes(task);

  const body = {
    title: task.title,
    notes,
    due: dueRFC3339,
    status: task.completed ? 'completed' : 'needsAction',
    ...(task.completed ? { completed: new Date().toISOString() } : {}),
  };

  const res = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const rawMsg = errorBody?.error?.message || `Failed to create Google Task (${res.status})`;
    if (rawMsg.includes('has not been used in project') || rawMsg.includes('disabled')) {
      throw new Error('Google Tasks API is not enabled in your Google Cloud project. Please enable the Tasks API in Google Cloud Console or continue using local task storage.');
    }
    throw new Error(rawMsg);
  }

  return (await res.json()) as GoogleTask;
}

/**
 * Update an existing task in Google Tasks
 */
export async function updateGoogleTask(
  taskId: string,
  task: TaskItem,
  taskListId = '@default',
  tokenOverride?: string | null
): Promise<GoogleTask> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Tasks access token is required.');
  }

  const dueRFC3339 = formatTaskDueDateRFC3339(task.dueDate, task.dueTime);
  const notes = buildTaskNotes(task);

  const body = {
    id: taskId,
    title: task.title,
    notes,
    due: dueRFC3339,
    status: task.completed ? 'completed' : 'needsAction',
    completed: task.completed ? (task.completedAt || new Date().toISOString()) : null,
  };

  const res = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const rawMsg = errorBody?.error?.message || `Failed to update Google Task (${res.status})`;
    if (rawMsg.includes('has not been used in project') || rawMsg.includes('disabled')) {
      throw new Error('Google Tasks API is not enabled in your Google Cloud project. Please enable the Tasks API in Google Cloud Console or continue using local task storage.');
    }
    throw new Error(rawMsg);
  }

  return (await res.json()) as GoogleTask;
}

/**
 * Delete a task from Google Tasks
 */
export async function deleteGoogleTask(
  taskId: string,
  taskListId = '@default',
  tokenOverride?: string | null
): Promise<void> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Tasks access token is required.');
  }

  const res = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to delete Google Task (${res.status})`);
  }
}

/**
 * Toggle or set direct status of a Google Task (needsAction vs completed)
 */
export async function setGoogleTaskStatus(
  taskId: string,
  completed: boolean,
  taskListId = '@default',
  tokenOverride?: string | null
): Promise<GoogleTask> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Tasks access token is required.');
  }

  const body = {
    status: completed ? 'completed' : 'needsAction',
    completed: completed ? new Date().toISOString() : null,
  };

  const res = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to update Google Task status (${res.status})`);
  }

  return (await res.json()) as GoogleTask;
}

