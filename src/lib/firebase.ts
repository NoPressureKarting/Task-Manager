import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { TaskItem, Collaborator, ShortenedUrl } from '../types';
import { auth } from './auth';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with long-polling to prevent proxy/iframe connection dropouts
let firestoreDb: any;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId || undefined
  );
} catch (e) {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
}
export const db = firestoreDb;

// Standardized Operation Types conforming to Firebase Skill specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standardized error handler for Firestore operations.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as mandated by Firebase Skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.warn('Firestore connection check: Client operating in offline/cached mode until backend connects.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

const TASKS_COLLECTION = 'tasks';

/**
 * Subscribe to realtime task updates from Firestore.
 */
export function subscribeToFirestoreTasks(
  onTasksUpdated: (tasks: TaskItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef);

    return onSnapshot(
      q,
      (snapshot) => {
        const tasks: TaskItem[] = [];
        snapshot.forEach((docSnapshot) => {
          tasks.push({ id: docSnapshot.id, ...docSnapshot.data() } as TaskItem);
        });
        tasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onTasksUpdated(tasks);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, TASKS_COLLECTION);
        } catch (formattedError: any) {
          if (onError) onError(formattedError);
        }
      }
    );
  } catch (error: any) {
    try {
      handleFirestoreError(error, OperationType.LIST, TASKS_COLLECTION);
    } catch (formattedError: any) {
      if (onError) onError(formattedError);
    }
    return () => {};
  }
}

/**
 * Clean data recursively to strip any undefined values before sending to Firestore
 */
function cleanFirestoreData<T extends Record<string, any>>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item));
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        cleanObj[key] = cleanFirestoreData(value);
      } else {
        cleanObj[key] = value;
      }
    }
  }
  return cleanObj;
}

/**
 * Save or update a task in Firestore.
 */
export async function saveTaskToFirestore(task: TaskItem): Promise<void> {
  const path = `${TASKS_COLLECTION}/${task.id}`;
  try {
    const taskRef = doc(db, TASKS_COLLECTION, task.id);
    const cleaned = cleanFirestoreData(task);
    await setDoc(taskRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a task in Firestore.
 */
export async function deleteTaskFromFirestore(taskId: string): Promise<void> {
  const path = `${TASKS_COLLECTION}/${taskId}`;
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Bulk upload initial tasks if cloud database is empty.
 */
export async function syncLocalTasksToFirestoreIfEmpty(localTasks: TaskItem[]): Promise<void> {
  if (!localTasks || localTasks.length === 0) return;
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const snapshot = await getDocs(tasksRef);
    if (snapshot.empty) {
      for (const task of localTasks) {
        await saveTaskToFirestore(task);
      }
    }
  } catch (error) {
    console.warn('Notice: Local tasks seeding deferred or completed.');
  }
}

const COLLABORATORS_COLLECTION = 'collaborators';

/**
 * Subscribe to realtime collaborator updates from Firestore.
 */
export function subscribeToFirestoreCollaborators(
  onCollaboratorsUpdated: (collaborators: Collaborator[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, COLLABORATORS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const collaborators: Collaborator[] = [];
        snapshot.forEach((docSnapshot) => {
          collaborators.push({ id: docSnapshot.id, ...docSnapshot.data() } as Collaborator);
        });
        collaborators.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
        onCollaboratorsUpdated(collaborators);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, COLLABORATORS_COLLECTION);
        } catch (formattedError: any) {
          if (onError) onError(formattedError);
        }
      }
    );
  } catch (error: any) {
    try {
      handleFirestoreError(error, OperationType.LIST, COLLABORATORS_COLLECTION);
    } catch (formattedError: any) {
      if (onError) onError(formattedError);
    }
    return () => {};
  }
}

/**
 * Save or update collaborator in Firestore.
 */
export async function saveCollaboratorToFirestore(collab: Collaborator): Promise<void> {
  const path = `${COLLABORATORS_COLLECTION}/${collab.id}`;
  try {
    const docRef = doc(db, COLLABORATORS_COLLECTION, collab.id);
    const cleaned = cleanFirestoreData(collab);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete collaborator in Firestore.
 */
export async function deleteCollaboratorFromFirestore(collabId: string): Promise<void> {
  const path = `${COLLABORATORS_COLLECTION}/${collabId}`;
  try {
    const docRef = doc(db, COLLABORATORS_COLLECTION, collabId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Seed initial default collaborators if collection is empty.
 */
export async function seedInitialCollaboratorsIfEmpty(initialCollabs: Collaborator[]): Promise<void> {
  if (!initialCollabs || initialCollabs.length === 0) return;
  try {
    const colRef = collection(db, COLLABORATORS_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      for (const collab of initialCollabs) {
        await saveCollaboratorToFirestore(collab);
      }
    }
  } catch (error) {
    console.warn('Notice: Collaborators seeding deferred or completed.');
  }
}

const SHORTLINKS_COLLECTION = 'shortlinks';

/**
 * Subscribe to realtime shortlink updates from Firestore.
 */
export function subscribeToFirestoreShortlinks(
  onLinksUpdated: (links: ShortenedUrl[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, SHORTLINKS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const links: ShortenedUrl[] = [];
        snapshot.forEach((docSnapshot) => {
          links.push({ id: docSnapshot.id, ...docSnapshot.data() } as ShortenedUrl);
        });
        links.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onLinksUpdated(links);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, SHORTLINKS_COLLECTION);
        } catch (formattedError: any) {
          if (onError) onError(formattedError);
        }
      }
    );
  } catch (error: any) {
    try {
      handleFirestoreError(error, OperationType.LIST, SHORTLINKS_COLLECTION);
    } catch (formattedError: any) {
      if (onError) onError(formattedError);
    }
    return () => {};
  }
}

/**
 * Save or update shortlink in Firestore.
 */
export async function saveShortlinkToFirestore(link: ShortenedUrl): Promise<void> {
  const path = `${SHORTLINKS_COLLECTION}/${link.id}`;
  try {
    const docRef = doc(db, SHORTLINKS_COLLECTION, link.id);
    const cleaned = cleanFirestoreData(link);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Increment click count on a shortlink.
 */
export async function recordShortlinkClick(linkId: string, currentClicks: number): Promise<void> {
  const path = `${SHORTLINKS_COLLECTION}/${linkId}`;
  try {
    const docRef = doc(db, SHORTLINKS_COLLECTION, linkId);
    await setDoc(docRef, { clicks: (currentClicks || 0) + 1 }, { merge: true });
  } catch (error) {
    console.warn('Notice: Click count update error for link', linkId);
  }
}

/**
 * Delete a shortlink from Firestore.
 */
export async function deleteShortlinkFromFirestore(linkId: string): Promise<void> {
  const path = `${SHORTLINKS_COLLECTION}/${linkId}`;
  try {
    const docRef = doc(db, SHORTLINKS_COLLECTION, linkId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
