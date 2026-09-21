import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar as CalendarIcon,
  RefreshCw,
  SlidersHorizontal,
  Bell,
  CheckCircle2,
  ListTodo,
  Sparkles,
  CalendarCheck,
  CheckSquare,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { TaskItem, GoogleCalendarEvent, GoogleTask, Collaborator, ShortenedUrl } from './types';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/auth';
import {
  listGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from './lib/calendarApi';
import {
  createGoogleTask,
  updateGoogleTask,
  deleteGoogleTask,
  listGoogleTasks,
  setGoogleTaskStatus,
} from './lib/tasksApi';
import {
  getStoredTasks,
  saveStoredTasks,
  getTodayDateString,
  getStoredTheme,
  saveStoredTheme,
  getStoredCollaborators,
  saveStoredCollaborators,
  getDefaultCollaborators,
  getStoredShortlinks,
  saveStoredShortlinks,
} from './lib/storage';
import {
  subscribeToFirestoreTasks,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  syncLocalTasksToFirestoreIfEmpty,
  subscribeToFirestoreCollaborators,
  saveCollaboratorToFirestore,
  deleteCollaboratorFromFirestore,
  seedInitialCollaboratorsIfEmpty,
  subscribeToFirestoreShortlinks,
  saveShortlinkToFirestore,
  deleteShortlinkFromFirestore,
} from './lib/firebase';
import { Navbar, AppView } from './components/Navbar';
import { DailyReminderDashboard } from './components/DailyReminderDashboard';
import { TaskCard } from './components/TaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { CalendarScheduleView } from './components/CalendarScheduleView';
import { ConfirmationModal } from './components/ConfirmationModal';
import { QuickSubmitForm } from './components/QuickSubmitForm';
import { TaskInboxReview } from './components/TaskInboxReview';
import { ShareModal } from './components/ShareModal';
import { SharedCalendarCollaborators } from './components/SharedCalendarCollaborators';

export default function App() {
  const todayStr = getTodayDateString();

  // Theme State (Dark mode default as on)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());

  // Synchronize Theme class and storage
  useEffect(() => {
    saveStoredTheme(theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  // Auth & Token State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App Navigation & Views with URL query param support
  const [activeView, setActiveView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get('view');
      if (requestedView === 'quick-submit') return 'quick-submit';
      if (requestedView === 'inbox') return 'inbox';
      if (requestedView === 'shared-calendar' || requestedView === 'collaborators') return 'collaborators';
      if (requestedView === 'calendar') return 'calendar';
      if (requestedView === 'tasks') return 'tasks';
    }
    return 'dashboard';
  });

  // Tasks, Collaborators & Shortlinks Data
  const [tasks, setTasks] = useState<TaskItem[]>(() => getStoredTasks());
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => getStoredCollaborators());
  const [shortlinks, setShortlinks] = useState<ShortenedUrl[]>(() => getStoredShortlinks());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleTasksList, setGoogleTasksList] = useState<GoogleTask[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingGoogleTasks, setIsLoadingGoogleTasks] = useState(false);
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Calendar Schedule View State
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);

  // Modals & User Feedback
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskModalInitialDate, setTaskModalInitialDate] = useState<string>(todayStr);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Confirmation Modals State (for destructive or mutative external ops)
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  // Save tasks to local storage whenever tasks state updates
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  // Save collaborators to local storage whenever state updates
  useEffect(() => {
    saveStoredCollaborators(collaborators);
  }, [collaborators]);

  // Save shortlinks to local storage whenever state updates
  useEffect(() => {
    saveStoredShortlinks(shortlinks);
  }, [shortlinks]);

  // Realtime Cloud Database (Firestore) synchronization across all devices
  useEffect(() => {
    // Only subscribe to cloud data updates when user is authenticated (conforming to Firestore security rules)
    if (!user) return;

    // Seed initial local tasks and collaborators if cloud is freshly initialized
    syncLocalTasksToFirestoreIfEmpty(tasks);
    seedInitialCollaboratorsIfEmpty(getDefaultCollaborators());

    // Subscribe to live cloud tasks updates
    const unsubscribeFirestoreTasks = subscribeToFirestoreTasks((cloudTasks) => {
      if (cloudTasks && cloudTasks.length > 0) {
        setTasks(cloudTasks);
        saveStoredTasks(cloudTasks);
      }
    });

    // Subscribe to live cloud collaborators updates
    const unsubscribeFirestoreCollaborators = subscribeToFirestoreCollaborators((cloudCollabs) => {
      if (cloudCollabs && cloudCollabs.length > 0) {
        setCollaborators(cloudCollabs);
        saveStoredCollaborators(cloudCollabs);
      }
    });

    // Subscribe to live cloud shortlinks updates
    const unsubscribeFirestoreShortlinks = subscribeToFirestoreShortlinks((cloudLinks) => {
      if (cloudLinks && cloudLinks.length > 0) {
        setShortlinks(cloudLinks);
        saveStoredShortlinks(cloudLinks);
      }
    });

    return () => {
      unsubscribeFirestoreTasks();
      unsubscribeFirestoreCollaborators();
      unsubscribeFirestoreShortlinks();
    };
  }, [user]);

  // Toast Auto Dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Calendar Events when user is authenticated
  const fetchCalendar = async (currentToken?: string | null) => {
    const activeToken = currentToken || token || (await getAccessToken());
    if (!activeToken) return;

    setIsLoadingCalendar(true);
    try {
      const events = await listGoogleCalendarEvents(undefined, undefined, activeToken);
      setCalendarEvents(events);
    } catch (err: any) {
      console.warn('Could not load Google Calendar events:', err);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Fetch Google Tasks list when user is authenticated
  const fetchGoogleTasksList = async (currentToken?: string | null) => {
    const activeToken = currentToken || token || (await getAccessToken());
    if (!activeToken) return;

    setIsLoadingGoogleTasks(true);
    try {
      const gTasks = await listGoogleTasks('@default', activeToken);
      setGoogleTasksList(gTasks);
    } catch (err: any) {
      console.warn('Could not load Google Tasks:', err);
    } finally {
      setIsLoadingGoogleTasks(false);
    }
  };

  // Refresh both Google Calendar and Google Tasks
  const refreshAllGoogleData = async (currentToken?: string | null) => {
    const activeToken = currentToken || token || (await getAccessToken());
    if (!activeToken) return;

    await Promise.allSettled([
      fetchCalendar(activeToken),
      fetchGoogleTasksList(activeToken),
    ]);
  };

  useEffect(() => {
    if (token) {
      refreshAllGoogleData(token);
    }
  }, [token]);

  // Sign In Handler
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setToastMessage({ text: 'Connected to Google Tasks & Calendar successfully!', type: 'success' });
        await refreshAllGoogleData(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const errMsg = err?.message || '';
      if (errMsg.includes('access_denied') || errMsg.includes('developer-approved') || err?.code === 'auth/popup-closed-by-user') {
        if (err?.code === 'auth/popup-closed-by-user') {
          setToastMessage({ text: 'Sign in was cancelled.', type: 'info' });
        } else {
          setToastMessage({
            text: 'Access blocked: Please add your email to "Test Users" in Google Cloud Console or publish the OAuth consent screen.',
            type: 'error',
          });
        }
      } else {
        setToastMessage({ text: err.message || 'Failed to sign in with Google.', type: 'error' });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setCalendarEvents([]);
    setGoogleTasksList([]);
    setToastMessage({ text: 'Signed out of Google account.', type: 'info' });
  };

  // Toggle Google Task status directly from Google Tasks item
  const handleToggleGoogleTaskStatus = async (taskId: string, completed: boolean) => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) return;

    // Optimistic UI update for Google Tasks list
    setGoogleTasksList((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: completed ? 'completed' : 'needsAction',
              completed: completed ? new Date().toISOString() : undefined,
              updated: new Date().toISOString(),
            }
          : t
      )
    );

    // Also sync local tasks if matching taskId
    setTasks((prev) =>
      prev.map((t) =>
        t.googleTaskId === taskId
          ? {
              ...t,
              completed,
              completedAt: completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );

    try {
      await setGoogleTaskStatus(taskId, completed, '@default', currentToken);
      setToastMessage({
        text: completed ? 'Google Task marked as completed' : 'Google Task marked as pending',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Failed to update Google Task status:', err);
      setToastMessage({ text: `Google Task update error: ${err.message}`, type: 'error' });
      fetchGoogleTasksList(currentToken);
    }
  };

  // Import a Google Task into local schedule
  const handleImportGoogleTask = (gTask: GoogleTask) => {
    const existing = tasks.find((t) => t.googleTaskId === gTask.id);
    if (existing) {
      setToastMessage({ text: `"${gTask.title}" is already in your schedule queue!`, type: 'info' });
      return;
    }

    let dueDate = todayStr;
    if (gTask.due) {
      dueDate = gTask.due.split('T')[0] || todayStr;
    }

    const newTask: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: gTask.title || 'Untitled Task',
      description: gTask.notes,
      assignedDate: dueDate,
      dueDate: dueDate,
      priority: 'medium',
      category: 'work',
      completed: gTask.status === 'completed',
      completedAt: gTask.completed,
      createdAt: new Date().toISOString(),
      syncedToGoogleTasks: true,
      googleTaskId: gTask.id,
      googleTaskListId: '@default',
      googleTaskWebViewLink: gTask.webViewLink,
      reminderEnabled: true,
    };

    saveTaskToFirestore(newTask).catch((err) => console.warn('Cloud sync error on import:', err));
    setTasks((prev) => [newTask, ...prev]);
    setToastMessage({ text: `Added "${gTask.title}" to your schedule queue!`, type: 'success' });
  };

  // Toggle Task Completion & Sync with Google Tasks if connected
  const handleToggleComplete = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const newCompleted = !target.completed;
    const updatedTask: TaskItem = {
      ...target,
      completed: newCompleted,
      completedAt: newCompleted ? new Date().toISOString() : undefined,
    };

    saveTaskToFirestore(updatedTask).catch((err) => console.warn('Cloud sync error on toggle:', err));
    setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)));

    // If task is synced to Google Tasks, update its completion status on Google Tasks
    if (target.syncedToGoogleTasks && target.googleTaskId) {
      const currentAccessToken = token || (await getAccessToken());
      if (currentAccessToken) {
        try {
          await updateGoogleTask(
            target.googleTaskId,
            updatedTask,
            target.googleTaskListId || '@default',
            currentAccessToken
          );
        } catch (e) {
          console.warn('Could not update Google Task completion status:', e);
        }
      }
    }

    // If task is synced to Google Calendar, update its calendar event title
    if (target.syncedToGoogleCalendar && target.googleCalendarEventId) {
      const currentAccessToken = token || (await getAccessToken());
      if (currentAccessToken) {
        try {
          await updateGoogleCalendarEvent(target.googleCalendarEventId, updatedTask, currentAccessToken);
          fetchCalendar(currentAccessToken);
        } catch (e) {
          console.warn('Could not update Google Calendar event status:', e);
        }
      }
    }
  };

  // Save / Update Task handler
  const handleSaveTask = async (taskData: Omit<TaskItem, 'id' | 'createdAt'>) => {
    let savedTask: TaskItem;

    if (editingTask) {
      savedTask = {
        ...editingTask,
        ...taskData,
      };

      const currentAccessToken = token || (await getAccessToken());

      // Sync to Google Calendar if requested
      if (taskData.syncedToGoogleCalendar && currentAccessToken) {
        try {
          if (savedTask.googleCalendarEventId) {
            const calEvent = await updateGoogleCalendarEvent(
              savedTask.googleCalendarEventId,
              savedTask,
              currentAccessToken
            );
            savedTask.googleCalendarEventId = calEvent.id;
            savedTask.googleCalendarHtmlLink = calEvent.htmlLink;
          } else {
            const calEvent = await createGoogleCalendarEvent(savedTask, currentAccessToken);
            savedTask.googleCalendarEventId = calEvent.id;
            savedTask.googleCalendarHtmlLink = calEvent.htmlLink;
          }
          fetchCalendar(currentAccessToken);
        } catch (err: any) {
          console.error('Google Calendar sync error during edit:', err);
        }
      }

      // Check if we should sync to Google Tasks
      if (taskData.syncedToGoogleTasks && currentAccessToken) {
        try {
          if (savedTask.googleTaskId) {
            // Update existing task in Google Tasks
            const gTask = await updateGoogleTask(
              savedTask.googleTaskId,
              savedTask,
              savedTask.googleTaskListId || '@default',
              currentAccessToken
            );
            savedTask.googleTaskId = gTask.id;
            savedTask.googleTaskWebViewLink = gTask.webViewLink;
            savedTask.lastSyncedAt = new Date().toISOString();
          } else {
            // Create new task in Google Tasks
            const gTask = await createGoogleTask(savedTask, '@default', currentAccessToken);
            savedTask.googleTaskId = gTask.id;
            savedTask.googleTaskListId = '@default';
            savedTask.googleTaskWebViewLink = gTask.webViewLink;
            savedTask.lastSyncedAt = new Date().toISOString();
          }
        } catch (err: any) {
          console.error('Google Tasks sync error during edit:', err);
          const isAuthError =
            err.message?.includes('insufficient') ||
            err.message?.includes('401') ||
            err.message?.includes('403') ||
            err.message?.includes('scopes');
          const errorMsg = isAuthError
            ? 'Task saved. Please sign in again to refresh Google Tasks permissions.'
            : `Task saved, but Google Tasks sync failed: ${err.message}`;
          setToastMessage({ text: errorMsg, type: 'error' });
        }
      }

      saveTaskToFirestore(savedTask).catch((err) => console.warn('Cloud sync error on task edit:', err));
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? savedTask : t)));
      setToastMessage({ text: 'Task updated successfully!', type: 'success' });
    } else {
      // Create new task
      const newId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      savedTask = {
        ...taskData,
        id: newId,
        createdAt: new Date().toISOString(),
      };

      const currentAccessToken = token || (await getAccessToken());

      // Sync with Google Calendar if enabled
      if (taskData.syncedToGoogleCalendar && currentAccessToken) {
        try {
          const calEvent = await createGoogleCalendarEvent(savedTask, currentAccessToken);
          savedTask.googleCalendarEventId = calEvent.id;
          savedTask.googleCalendarHtmlLink = calEvent.htmlLink;
          fetchCalendar(currentAccessToken);
        } catch (err: any) {
          console.error('Google Calendar sync error on creation:', err);
          setToastMessage({
            text: `Task saved, but Google Calendar push failed: ${err.message}`,
            type: 'error',
          });
        }
      }

      if (taskData.syncedToGoogleTasks) {
        if (currentAccessToken) {
          try {
            const gTask = await createGoogleTask(savedTask, '@default', currentAccessToken);
            savedTask.googleTaskId = gTask.id;
            savedTask.googleTaskListId = '@default';
            savedTask.googleTaskWebViewLink = gTask.webViewLink;
            savedTask.lastSyncedAt = new Date().toISOString();
          } catch (err: any) {
            console.error('Google Tasks sync error on creation:', err);
            const isAuthError =
              err.message?.includes('insufficient') ||
              err.message?.includes('401') ||
              err.message?.includes('403') ||
              err.message?.includes('scopes');
            const errorMsg = isAuthError
              ? 'Task saved. Google Tasks sync requires signing in again to grant permissions.'
              : `Task saved, but Google Tasks sync failed: ${err.message}`;
            setToastMessage({ text: errorMsg, type: 'error' });
          }
        } else {
          setToastMessage({
            text: 'Task saved! Sign in with Google to automatically add tasks to Google Tasks & Calendar.',
            type: 'info',
          });
        }
      }

      saveTaskToFirestore(savedTask).catch((err) => console.warn('Cloud sync error on task create:', err));
      setTasks((prev) => [savedTask, ...prev]);
      setToastMessage({ text: 'Task added to running list!', type: 'success' });
    }

    setEditingTask(null);
  };

  // Sync / Push single task to Google Calendar
  const handleSyncSingleTaskToCalendar = async (task: TaskItem) => {
    const currentAccessToken = token || (await getAccessToken());
    if (!currentAccessToken) {
      setConfirmModalState({
        isOpen: true,
        title: 'Sign In to Google Calendar',
        description: 'You need to sign in with your Google account to push this multi-day task to your Google Calendar.',
        confirmLabel: 'Sign In & Push',
        onConfirm: async () => {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          await handleSignIn();
        },
      });
      return;
    }

    setSyncingTaskId(task.id);
    try {
      if (task.googleCalendarEventId) {
        // Re-sync / Update existing event in Google Calendar
        const calEvent = await updateGoogleCalendarEvent(
          task.googleCalendarEventId,
          task,
          currentAccessToken
        );
        const updated = {
          ...task,
          syncedToGoogleCalendar: true,
          googleCalendarHtmlLink: calEvent.htmlLink,
          lastSyncedAt: new Date().toISOString(),
        };
        saveTaskToFirestore(updated).catch((err) => console.warn('Cloud sync error:', err));
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        fetchCalendar(currentAccessToken);
        setToastMessage({ text: `Updated "${task.title}" on Google Calendar.`, type: 'success' });
      } else {
        // Create new event in Google Calendar
        const calEvent = await createGoogleCalendarEvent(task, currentAccessToken);
        const updated = {
          ...task,
          syncedToGoogleCalendar: true,
          googleCalendarEventId: calEvent.id,
          googleCalendarHtmlLink: calEvent.htmlLink,
          lastSyncedAt: new Date().toISOString(),
        };
        saveTaskToFirestore(updated).catch((err) => console.warn('Cloud sync error:', err));
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        fetchCalendar(currentAccessToken);
        setToastMessage({ text: `Pushed "${task.title}" to Google Calendar across full span!`, type: 'success' });
      }
    } catch (err: any) {
      console.error('Failed to sync Google calendar event:', err);
      setToastMessage({ text: `Google Calendar sync failed: ${err.message}`, type: 'error' });
    } finally {
      setSyncingTaskId(null);
    }
  };

  // Sync / Push single task to Google Tasks
  const handleSyncSingleTask = async (task: TaskItem) => {
    const currentAccessToken = token || (await getAccessToken());
    if (!currentAccessToken) {
      setConfirmModalState({
        isOpen: true,
        title: 'Sign In to Google Tasks',
        description: 'You need to sign in with your Google account to add this task directly to your Google Tasks.',
        confirmLabel: 'Sign In & Sync',
        onConfirm: async () => {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          await handleSignIn();
        },
      });
      return;
    }

    setSyncingTaskId(task.id);
    try {
      if (task.googleTaskId) {
        // Re-sync / Update existing task in Google Tasks
        const gTask = await updateGoogleTask(
          task.googleTaskId,
          task,
          task.googleTaskListId || '@default',
          currentAccessToken
        );
        const updated = {
          ...task,
          syncedToGoogleTasks: true,
          googleTaskWebViewLink: gTask.webViewLink,
          lastSyncedAt: new Date().toISOString(),
        };
        saveTaskToFirestore(updated).catch((err) => console.warn('Cloud sync error:', err));
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        setToastMessage({ text: `Synced "${task.title}" with Google Tasks.`, type: 'success' });
      } else {
        // Create new task in Google Tasks
        const gTask = await createGoogleTask(task, '@default', currentAccessToken);
        const updated = {
          ...task,
          syncedToGoogleTasks: true,
          googleTaskId: gTask.id,
          googleTaskListId: '@default',
          googleTaskWebViewLink: gTask.webViewLink,
          lastSyncedAt: new Date().toISOString(),
        };
        saveTaskToFirestore(updated).catch((err) => console.warn('Cloud sync error:', err));
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        setToastMessage({ text: `Added "${task.title}" to Google Tasks.`, type: 'success' });
      }
    } catch (err: any) {
      console.error('Failed to sync Google task:', err);
      setToastMessage({ text: `Google Tasks sync failed: ${err.message}`, type: 'error' });
    } finally {
      setSyncingTaskId(null);
    }
  };

  // Delete Task with confirmation
  const handleDeleteTask = (task: TaskItem) => {
    const hasGoogleTaskSync = Boolean(task.syncedToGoogleTasks && task.googleTaskId);
    const hasGoogleCalSync = Boolean(task.syncedToGoogleCalendar && task.googleCalendarEventId);
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Task?',
      description: hasGoogleTaskSync || hasGoogleCalSync
        ? `Are you sure you want to delete "${task.title}"? This will also remove the synced items from your Google account.`
        : `Are you sure you want to delete "${task.title}" from your task list?`,
      confirmLabel: 'Delete Task',
      isDestructive: true,
      onConfirm: async () => {
        const currentAccessToken = token || (await getAccessToken());
        if (currentAccessToken) {
          if (hasGoogleTaskSync && task.googleTaskId) {
            try {
              await deleteGoogleTask(task.googleTaskId, task.googleTaskListId || '@default', currentAccessToken);
            } catch (err) {
              console.warn('Failed to delete Google Task during task removal:', err);
            }
          }
          if (hasGoogleCalSync && task.googleCalendarEventId) {
            try {
              await deleteGoogleCalendarEvent(task.googleCalendarEventId, currentAccessToken);
              fetchCalendar(currentAccessToken);
            } catch (err) {
              console.warn('Failed to delete Google Calendar event during task removal:', err);
            }
          }
        }
        deleteTaskFromFirestore(task.id).catch((err) => console.warn('Cloud delete error:', err));
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        setToastMessage({ text: 'Task deleted.', type: 'info' });
      },
    });
  };

  // Inbox count for badge & notifications
  const inboxCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'inbox').length;
  }, [tasks]);

  // Quick Submit Form Task handler
  const handleQuickSubmitTask = async (taskData: Omit<TaskItem, 'id' | 'createdAt'>) => {
    const newTask: TaskItem = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      status: 'inbox',
      createdAt: new Date().toISOString(),
    };

    try {
      await saveTaskToFirestore(newTask);
      setTasks((prev) => [newTask, ...prev]);
      setToastMessage({
        text: `Proposal "${newTask.title}" sent to Inbox for review!`,
        type: 'success',
      });
    } catch (err: any) {
      console.warn('Firestore task submit warning:', err);
      setTasks((prev) => [newTask, ...prev]);
      setToastMessage({
        text: `Proposal "${newTask.title}" saved locally.`,
        type: 'info',
      });
    }
  };

  // Inbox Review: Approve Task and schedule to calendar/tasks
  const handleApproveInboxTask = async (
    taskId: string,
    details?: {
      assignedDate?: string;
      dueDate?: string;
      scheduledDate?: string;
      priority?: TaskItem['priority'];
      category?: TaskItem['category'];
      assignedTo?: string;
      reviewNotes?: string;
      syncToGoogleTasks?: boolean;
      syncToGoogleCalendar?: boolean;
      syncToCalendar?: boolean;
    }
  ) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return;

    const currentAccessToken = token || (await getAccessToken());

    const scheduledDate =
      details?.assignedDate ||
      details?.scheduledDate ||
      details?.dueDate ||
      existing.assignedDate ||
      existing.dueDate ||
      todayStr;
    const dueDate = details?.dueDate || scheduledDate;
    const assignedDate = details?.assignedDate || scheduledDate;

    let updated: TaskItem = {
      ...existing,
      status: 'approved',
      dueDate: dueDate,
      assignedDate: assignedDate,
      priority: details?.priority || existing.priority || 'medium',
      category: details?.category || existing.category || 'work',
      assignedTo: details?.assignedTo || existing.assignedTo,
      reviewNotes: details?.reviewNotes !== undefined ? details.reviewNotes : existing.reviewNotes,
      reviewedBy: user?.displayName || user?.email || 'Admin Reviewer',
      reviewedAt: new Date().toISOString(),
    };

    const shouldSyncCalendar = Boolean(details?.syncToGoogleCalendar || details?.syncToCalendar);
    const shouldSyncTasks = Boolean(details?.syncToGoogleTasks);

    // Optional Google Calendar sync on approval
    if (shouldSyncCalendar && currentAccessToken) {
      try {
        const gEvent = await createGoogleCalendarEvent(updated, currentAccessToken);
        updated.syncedToGoogleCalendar = true;
        updated.googleCalendarEventId = gEvent.id;
        updated.googleCalendarHtmlLink = gEvent.htmlLink;
        fetchCalendar(currentAccessToken);
      } catch (err) {
        console.warn('Failed to sync to Google Calendar on approval:', err);
      }
    }

    // Optional Google Tasks sync on approval
    if (shouldSyncTasks && currentAccessToken) {
      try {
        const gTask = await createGoogleTask(updated, '@default', currentAccessToken);
        updated.syncedToGoogleTasks = true;
        updated.googleTaskId = gTask.id;
        updated.googleTaskListId = '@default';
        updated.googleTaskWebViewLink = gTask.webViewLink;
      } catch (err) {
        console.warn('Failed to sync to Google Tasks on approval:', err);
      }
    }

    try {
      await saveTaskToFirestore(updated);
    } catch (err) {
      console.warn('Firestore task update warning:', err);
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    setToastMessage({
      text: `Approved "${updated.title}" and added to Running List!`,
      type: 'success',
    });
  };

  // Inbox Review: Reject Task
  const handleRejectInboxTask = async (taskId: string, reason?: string) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return;

    const updated: TaskItem = {
      ...existing,
      status: 'rejected',
      reviewNotes: reason || 'Task proposal declined by reviewer.',
      reviewedBy: user?.displayName || user?.email || 'Admin Reviewer',
      reviewedAt: new Date().toISOString(),
    };

    try {
      await saveTaskToFirestore(updated);
    } catch (err) {
      console.warn('Firestore task reject warning:', err);
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    setToastMessage({
      text: `Proposal "${updated.title}" marked as rejected.`,
      type: 'info',
    });
  };

  // Collaborator Handlers
  const handleAddCollaborator = async (collabData: Omit<Collaborator, 'id' | 'addedAt'>) => {
    const newCollab: Collaborator = {
      ...collabData,
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      addedAt: new Date().toISOString(),
      status: 'active',
    };

    try {
      await saveCollaboratorToFirestore(newCollab);
    } catch (err) {
      console.warn('Collaborator firestore save warning:', err);
    }

    setCollaborators((prev) => [...prev, newCollab]);
    setToastMessage({
      text: `Added ${newCollab.name} (${newCollab.email}) as ${newCollab.role}.`,
      type: 'success',
    });
  };

  const handleUpdateCollaboratorRole = async (id: string, role: Collaborator['role']) => {
    const existing = collaborators.find((c) => c.id === id);
    if (!existing) return;

    const updated: Collaborator = { ...existing, role };
    try {
      await saveCollaboratorToFirestore(updated);
    } catch (err) {
      console.warn('Collaborator firestore update warning:', err);
    }

    setCollaborators((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setToastMessage({
      text: `Updated role for ${existing.name} to ${role}.`,
      type: 'success',
    });
  };

  const handleRemoveCollaborator = async (id: string) => {
    const existing = collaborators.find((c) => c.id === id);
    if (!existing) return;

    setConfirmModalState({
      isOpen: true,
      title: 'Remove Collaborator?',
      description: `Are you sure you want to revoke authorized access for ${existing.name} (${existing.email})?`,
      confirmLabel: 'Remove Access',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteCollaboratorFromFirestore(id);
        } catch (err) {
          console.warn('Collaborator delete warning:', err);
        }
        setCollaborators((prev) => prev.filter((c) => c.id !== id));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        setToastMessage({
          text: `Revoked access for ${existing.name}.`,
          type: 'info',
        });
      },
    });
  };

  // Shortlinks Handlers
  const handleCreateShortlink = async (linkData: Omit<ShortenedUrl, 'id' | 'createdAt' | 'clicks'>) => {
    const newLink: ShortenedUrl = {
      ...linkData,
      id: `short_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      clicks: 0,
    };

    try {
      await saveShortlinkToFirestore(newLink);
    } catch (err) {
      console.warn('Shortlink firestore save warning:', err);
    }

    setShortlinks((prev) => [newLink, ...prev]);
    setToastMessage({
      text: `Shortlink "${newLink.shortSlug}" created successfully!`,
      type: 'success',
    });
  };

  const handleDeleteShortlink = async (id: string) => {
    try {
      await deleteShortlinkFromFirestore(id);
    } catch (err) {
      console.warn('Shortlink delete warning:', err);
    }
    setShortlinks((prev) => prev.filter((l) => l.id !== id));
    setToastMessage({
      text: 'Shortened link removed.',
      type: 'info',
    });
  };

  // Only tasks that are approved (or legacy/direct tasks without inbox/rejected status) appear in the running list & schedule
  const runningTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== 'inbox' && t.status !== 'rejected');
  }, [tasks]);

  // Filtered Tasks for Running List view
  const filteredTasks = useMemo(() => {
    return runningTasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      // Status
      if (statusFilter === 'pending' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      // Category
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      // Priority
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      return true;
    });
  }, [runningTasks, searchQuery, statusFilter, categoryFilter, priorityFilter]);

  const pendingCount = useMemo(() => {
    return runningTasks.filter((t) => !t.completed).length;
  }, [runningTasks]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased flex flex-col transition-colors">
      {/* Navigation Header */}
      <Navbar
        user={user}
        token={token}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isLoggingIn={isLoggingIn}
        activeView={activeView}
        onViewChange={setActiveView}
        pendingCount={pendingCount}
        inboxCount={inboxCount}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {/* Toast notifications */}
        {toastMessage && (
          <div
            id="toast-notification"
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-white/95 dark:bg-slate-900/95 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                : toastMessage.type === 'error'
                ? 'bg-white/95 dark:bg-slate-900/95 text-rose-700 dark:text-rose-300 border-rose-500/40 shadow-rose-500/10'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 dark:text-white/60 hover:text-slate-700 dark:hover:text-white ml-1">
              ✕
            </button>
          </div>
        )}

        {/* View 1: Today's Brief / Daily Reminder Dashboard */}
        {activeView === 'dashboard' && (
          <DailyReminderDashboard
            tasks={runningTasks}
            calendarEvents={calendarEvents}
            googleTasksList={googleTasksList}
            onCompleteTask={handleToggleComplete}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onOpenTaskModal={() => {
              setEditingTask(null);
              setTaskModalInitialDate(todayStr);
              setIsTaskModalOpen(true);
            }}
            onRefreshGoogleData={() => refreshAllGoogleData()}
            onToggleGoogleTaskStatus={handleToggleGoogleTaskStatus}
            onImportGoogleTask={handleImportGoogleTask}
            onSyncTaskToGoogleCalendar={handleSyncSingleTaskToCalendar}
            onSyncTaskToGoogleTasks={handleSyncSingleTask}
            isAuthenticated={Boolean(user && token)}
            onSignIn={handleSignIn}
            isLoadingGoogleData={isLoadingCalendar || isLoadingGoogleTasks}
          />
        )}

        {/* View 2: Running Task List View */}
        {activeView === 'tasks' && (
          <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Running Task List</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Organized by due date, urgency, and automatic Google Tasks synchronization.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  id="add-task-btn"
                  onClick={() => {
                    setEditingTask(null);
                    setTaskModalInitialDate(todayStr);
                    setIsTaskModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add New Task
                </button>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 p-4 shadow-2xs space-y-3 transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search Box */}
                <div className="relative">
                  <input
                    id="search-tasks-input"
                    type="text"
                    placeholder="Search tasks by title or note..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    id="status-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Statuses ({runningTasks.length})</option>
                    <option value="pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending Only ({pendingCount})</option>
                    <option value="completed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Completed ({runningTasks.length - pendingCount})</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    id="category-filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Categories</option>
                    <option value="work" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Work & Projects</option>
                    <option value="personal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Personal</option>
                    <option value="health" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Health & Fitness</option>
                    <option value="errands" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Errands & Bills</option>
                    <option value="learning" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Learning & Reading</option>
                    <option value="other" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Other</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <select
                    id="priority-filter-select"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Priorities</option>
                    <option value="urgent" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Urgent</option>
                    <option value="high" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">High Priority</option>
                    <option value="medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Medium Priority</option>
                    <option value="low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Low Priority</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tasks List Grid */}
            {filteredTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-12 text-center shadow-2xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/60 mb-3.5">
                  <ListTodo className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No tasks match your filters</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Try adjusting your search criteria or create a new task to add to your running queue.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                  className="mt-4 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsTaskModalOpen(true);
                    }}
                    onDelete={handleDeleteTask}
                    onSyncTasks={handleSyncSingleTask}
                    onSyncCalendar={handleSyncSingleTaskToCalendar}
                    isSyncing={syncingTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* View 3: Quick-Submit Form View */}
        {activeView === 'quick-submit' && (
          <div className="py-4">
            <QuickSubmitForm
              onSubmitTask={handleQuickSubmitTask}
              onSubmit={handleQuickSubmitTask}
              currentUserEmail={user?.email}
              currentUserName={user?.displayName}
              onNavigateToInbox={() => setActiveView('inbox')}
              onOpenShareModal={() => setIsShareModalOpen(true)}
            />
          </div>
        )}

        {/* View 4: Task Inbox & Review System */}
        {activeView === 'inbox' && (
          <div className="py-2">
            <TaskInboxReview
              tasks={tasks}
              collaborators={collaborators}
              onApproveTask={handleApproveInboxTask}
              onRejectTask={handleRejectInboxTask}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onOpenQuickSubmit={() => setActiveView('quick-submit')}
              onNavigateToSubmit={() => setActiveView('quick-submit')}
              onOpenShareModal={() => setIsShareModalOpen(true)}
              isAuthenticated={Boolean(user && token)}
              onSignIn={handleSignIn}
            />
          </div>
        )}

        {/* View 5: Shared Calendar & Authorized Collaborators View */}
        {(activeView === 'collaborators' || activeView === 'calendar') && (
          <div className="py-2">
            <SharedCalendarCollaborators
              tasks={runningTasks}
              calendarEvents={calendarEvents}
              collaborators={collaborators}
              selectedDate={selectedCalendarDate}
              onSelectDate={setSelectedCalendarDate}
              onAddTaskForDate={(dateStr) => {
                setEditingTask(null);
                setTaskModalInitialDate(dateStr);
                setIsTaskModalOpen(true);
              }}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onToggleComplete={handleToggleComplete}
              onAddCollaborator={handleAddCollaborator}
              onUpdateCollaboratorRole={handleUpdateCollaboratorRole}
              onRemoveCollaborator={handleRemoveCollaborator}
              onSyncGoogleCalendar={() => fetchCalendar()}
              isLoadingGoogleCalendar={isLoadingCalendar}
              isAuthenticated={Boolean(user && token)}
              onSignIn={handleSignIn}
              onOpenShareModal={() => setIsShareModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        initialTask={editingTask}
        initialDate={taskModalInitialDate}
        syncWithGoogleCalendarByDefault={false}
        syncWithGoogleTasksByDefault={false}
      />

      {/* Share Link & URL Shortener Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shortlinks={shortlinks}
        onCreateShortlink={handleCreateShortlink}
        onDeleteShortlink={handleDeleteShortlink}
        onNavigateToView={setActiveView}
      />

      {/* Confirmation Modal for destructive / mutating workspace operations */}
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        description={confirmModalState.description}
        confirmLabel={confirmModalState.confirmLabel}
        isDestructive={confirmModalState.isDestructive}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

