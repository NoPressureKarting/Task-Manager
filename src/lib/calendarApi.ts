import { GoogleCalendarEvent, TaskItem } from '../types';
import { getAccessToken } from './auth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Fetch calendar events for a specific date range or next 7 days
 */
export async function listGoogleCalendarEvents(
  timeMin?: string,
  timeMax?: string,
  tokenOverride?: string | null
): Promise<GoogleCalendarEvent[]> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Calendar access token is required. Please sign in with Google.');
  }

  const now = new Date();
  const startIso = timeMin || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const endIso = timeMax || new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14).toISOString();

  const url = new URL(`${CALENDAR_API_BASE}/calendars/primary/events`);
  url.searchParams.set('timeMin', startIso);
  url.searchParams.set('timeMax', endIso);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '50');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Calendar API error (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return (data.items || []) as GoogleCalendarEvent[];
}

/**
 * Helper to compute start and end payloads for Google Calendar events
 */
function buildCalendarEventDatePayloads(task: TaskItem) {
  const startDateStr = task.assignedDate || task.dueDate;
  const endDateStr = task.dueDate >= startDateStr ? task.dueDate : startDateStr;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // If time is specified and it's a single day
  if (task.dueTime && startDateStr === endDateStr) {
    const startDateTime = `${startDateStr}T${task.dueTime}:00`;
    const startDateObj = new Date(startDateTime);
    const durationMins = task.estimatedDurationMinutes || 45;
    const endDateObj = new Date(startDateObj.getTime() + durationMins * 60 * 1000);

    return {
      startPayload: { dateTime: startDateObj.toISOString(), timeZone },
      endPayload: { dateTime: endDateObj.toISOString(), timeZone },
    };
  }

  // If it's multi-day or all-day event:
  // In Google Calendar API, end date for all-day events is exclusive (day after last included day)
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
  const nextDay = new Date(Date.UTC(endYear, endMonth - 1, endDay + 1));
  const exclusiveEndDateStr = nextDay.toISOString().split('T')[0];

  return {
    startPayload: { date: startDateStr },
    endPayload: { date: exclusiveEndDateStr },
  };
}

/**
 * Sync a TaskItem to Google Calendar as an event
 */
export async function createGoogleCalendarEvent(task: TaskItem, tokenOverride?: string | null): Promise<GoogleCalendarEvent> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Calendar access token is required.');
  }

  const { startPayload, endPayload } = buildCalendarEventDatePayloads(task);

  const isMultiDay = task.assignedDate && task.assignedDate !== task.dueDate;
  const durationLabel = isMultiDay ? `\nAssigned: ${task.assignedDate} → Due: ${task.dueDate}` : `\nDue: ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''}`;

  const eventPayload = {
    summary: `[Task] ${task.title}`,
    description: `${task.description || ''}${durationLabel}\nCategory: ${task.category.toUpperCase()} | Priority: ${task.priority.toUpperCase()}\nStatus: ${task.completed ? 'Completed' : 'Active'}\nManaged via TaskSync Daily`,
    start: startPayload,
    end: endPayload,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: task.reminderMinutesBefore || 30 },
      ],
    },
  };

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to create calendar event (${res.status})`);
  }

  return (await res.json()) as GoogleCalendarEvent;
}

/**
 * Update an existing synced event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  eventId: string,
  task: TaskItem,
  tokenOverride?: string | null
): Promise<GoogleCalendarEvent> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Calendar access token is required.');
  }

  const { startPayload, endPayload } = buildCalendarEventDatePayloads(task);

  const prefix = task.completed ? '✅ [Done] ' : '[Task] ';
  const isMultiDay = task.assignedDate && task.assignedDate !== task.dueDate;
  const durationLabel = isMultiDay ? `\nAssigned: ${task.assignedDate} → Due: ${task.dueDate}` : `\nDue: ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''}`;

  const eventPayload = {
    summary: `${prefix}${task.title}`,
    description: `${task.description || ''}${durationLabel}\nCategory: ${task.category.toUpperCase()} | Priority: ${task.priority.toUpperCase()}\nStatus: ${task.completed ? 'Completed' : 'Active'}\nManaged via TaskSync Daily`,
    start: startPayload,
    end: endPayload,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: task.reminderMinutesBefore || 30 },
      ],
    },
  };

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to update calendar event (${res.status})`);
  }

  return (await res.json()) as GoogleCalendarEvent;
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(eventId: string, tokenOverride?: string | null): Promise<void> {
  const token = tokenOverride || (await getAccessToken());
  if (!token) {
    throw new Error('Google Calendar access token is required.');
  }

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to delete calendar event (${res.status})`);
  }
}
