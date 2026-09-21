/**
 * Firestore Security Rules TDD Suite
 * Validating Data Invariants & The "Dirty Dozen" Malicious Payloads
 */

export interface TestPayloadAssertion {
  id: string;
  name: string;
  collection: string;
  docId: string;
  action: 'create' | 'update' | 'delete' | 'get' | 'list';
  auth: { uid?: string; email?: string; emailVerified?: boolean } | null;
  payload?: Record<string, any>;
  expectedOutcome: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TEST_CASES: TestPayloadAssertion[] = [
  {
    id: 'DD-01',
    name: 'Shadow Update (Ghost Field Injection)',
    collection: 'tasks',
    docId: 'task-101',
    action: 'update',
    auth: { uid: 'user-abc', email: 'user@example.com', emailVerified: true },
    payload: {
      title: 'Valid Title',
      isVerified: true, // Ghost field
      isAdmin: true, // Ghost field
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    name: 'Denial of Wallet (Oversized String Injection)',
    collection: 'tasks',
    docId: 'task-102',
    action: 'create',
    auth: { uid: 'user-abc', email: 'user@example.com', emailVerified: true },
    payload: {
      id: 'task-102',
      title: 'A'.repeat(500), // Exceeds 200 character max limit
      dueDate: '2026-09-20',
      category: 'work',
      priority: 'high',
      completed: false,
      createdAt: '2026-09-17T00:00:00.000Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    name: 'Invalid Document Path Variable (ID Poisoning)',
    collection: 'tasks',
    docId: 'invalid-id-with-forbidden-$ymbols!',
    action: 'get',
    auth: { uid: 'user-abc', email: 'user@example.com', emailVerified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    name: 'Unauthenticated Arbitrary Read of Collaborator PII',
    collection: 'collaborators',
    docId: 'collab-1',
    action: 'get',
    auth: null, // Anonymous / unauthenticated
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    name: 'Unauthenticated Task Deletion',
    collection: 'tasks',
    docId: 'task-101',
    action: 'delete',
    auth: null,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    name: 'Quick-Submit Privilege Escalation (Status Spoofing to Approved)',
    collection: 'tasks',
    docId: 'task-106',
    action: 'create',
    auth: null,
    payload: {
      id: 'task-106',
      title: 'Malicious Task',
      dueDate: '2026-09-20',
      category: 'work',
      priority: 'high',
      status: 'approved', // Must only be allowed as 'inbox' for unauthenticated submissions
      completed: false,
      createdAt: '2026-09-17T00:00:00.000Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    name: 'Quick-Submit Pre-Completion Exploit',
    collection: 'tasks',
    docId: 'task-107',
    action: 'create',
    auth: null,
    payload: {
      id: 'task-107',
      title: 'Auto-completed Task',
      dueDate: '2026-09-20',
      category: 'work',
      priority: 'high',
      status: 'inbox',
      completed: true, // Forbidden on initial external submission
      createdAt: '2026-09-17T00:00:00.000Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    name: 'Immortality Breach (Tampering with createdAt)',
    collection: 'tasks',
    docId: 'task-108',
    action: 'update',
    auth: { uid: 'user-abc', email: 'user@example.com', emailVerified: true },
    payload: {
      createdAt: '1970-01-01T00:00:00.000Z', // Modifying immutable field
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    name: 'Unbounded Array Flooding (Tags Array Overflow)',
    collection: 'tasks',
    docId: 'task-109',
    action: 'create',
    auth: { uid: 'user-abc', email: 'user@example.com', emailVerified: true },
    payload: {
      id: 'task-109',
      title: 'Array bomb',
      dueDate: '2026-09-20',
      category: 'work',
      priority: 'medium',
      completed: false,
      tags: Array(50).fill('excessive-tag'), // Exceeds 20 tags limit
      createdAt: '2026-09-17T00:00:00.000Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    name: 'Counter Exploitation (Shortlink Click Tampering)',
    collection: 'shortlinks',
    docId: 'link-110',
    action: 'update',
    auth: null,
    payload: {
      clicks: 0, // Resetting clicks or jumping arbitrarily
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    name: 'Arbitrary Collaborator Role Self-Elevation',
    collection: 'collaborators',
    docId: 'collab-111',
    action: 'update',
    auth: { uid: 'user-xyz', email: 'contributor@example.com', emailVerified: true },
    payload: {
      role: 'admin',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    name: 'Email Spoofing Attack (Unverified Email Admin Claim)',
    collection: 'collaborators',
    docId: 'collab-112',
    action: 'create',
    auth: { uid: 'attacker-id', email: 'KingGoddeth@gmail.com', emailVerified: false }, // Spoofed email with unverified token
    payload: {
      id: 'collab-112',
      name: 'Fake Admin',
      email: 'KingGoddeth@gmail.com',
      role: 'admin',
      status: 'active',
      addedAt: '2026-09-17T00:00:00.000Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-13',
    name: 'Unauthenticated Arbitrary Task Read (Privacy Leak Prevention)',
    collection: 'tasks',
    docId: 'task-113',
    action: 'get',
    auth: null,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-14',
    name: 'Unauthenticated Task List Enumeration (Privacy Leak Prevention)',
    collection: 'tasks',
    docId: '',
    action: 'list',
    auth: null,
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-15',
    name: 'Non-Admin Collaborator Deletion (Privilege Escalation Prevention)',
    collection: 'collaborators',
    docId: 'collab-owner',
    action: 'delete',
    auth: { uid: 'regular-user', email: 'collab@example.com', emailVerified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-16',
    name: 'Non-Admin Tampering with Administrator Profile Record',
    collection: 'collaborators',
    docId: 'collab-owner',
    action: 'update',
    auth: { uid: 'regular-user', email: 'collab@example.com', emailVerified: true },
    payload: {
      name: 'Hacked Admin Name',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  // Valid Operations Verification
  {
    id: 'VALID-01',
    name: 'External Quick-Submit Valid Creation into Review Inbox',
    collection: 'tasks',
    docId: 'task-quick-1',
    action: 'create',
    auth: null,
    payload: {
      id: 'task-quick-1',
      title: 'Valid Proposed Task from Partner',
      dueDate: '2026-09-25',
      category: 'work',
      priority: 'medium',
      status: 'inbox',
      completed: false,
      createdAt: '2026-09-21T10:00:00.000Z',
    },
    expectedOutcome: 'ALLOWED',
  },
  {
    id: 'VALID-02',
    name: 'Verified User Read of Task Document',
    collection: 'tasks',
    docId: 'task-valid-2',
    action: 'get',
    auth: { uid: 'verified-user', email: 'team@example.com', emailVerified: true },
    expectedOutcome: 'ALLOWED',
  },
  {
    id: 'VALID-03',
    name: 'Verified User Toggle Task Completion State',
    collection: 'tasks',
    docId: 'task-valid-3',
    action: 'update',
    auth: { uid: 'verified-user', email: 'team@example.com', emailVerified: true },
    payload: {
      completed: true,
      completedAt: '2026-09-21T10:30:00.000Z',
    },
    expectedOutcome: 'ALLOWED',
  },
  {
    id: 'VALID-04',
    name: 'Authorized Admin Collaborator Deletion',
    collection: 'collaborators',
    docId: 'collab-departed',
    action: 'delete',
    auth: { uid: 'admin-uid', email: 'KingGoddeth@gmail.com', emailVerified: true },
    expectedOutcome: 'ALLOWED',
  },
];

// --- Rule Evaluator Implementation ---
function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function isValidTask(data: any): boolean {
  const required = ['id', 'title', 'dueDate', 'category', 'priority', 'completed', 'createdAt'];
  for (const k of required) {
    if (!(k in data)) return false;
  }
  if (!isValidId(data.id)) return false;
  if (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 200) return false;
  if (typeof data.dueDate !== 'string' || data.dueDate.length > 30) return false;
  if (!['work', 'personal', 'health', 'errands', 'learning', 'other'].includes(data.category)) return false;
  if (!['low', 'medium', 'high', 'urgent'].includes(data.priority)) return false;
  if (typeof data.completed !== 'boolean') return false;
  if (typeof data.createdAt !== 'string' || data.createdAt.length > 50) return false;
  if ('description' in data && (typeof data.description !== 'string' || data.description.length > 4000)) return false;
  if ('tags' in data && (!Array.isArray(data.tags) || data.tags.length > 20)) return false;
  if ('status' in data && !['inbox', 'approved', 'rejected', 'scheduled'].includes(data.status)) return false;
  return true;
}

function isValidCollaborator(data: any): boolean {
  const required = ['id', 'name', 'email', 'role', 'status', 'addedAt'];
  for (const k of required) {
    if (!(k in data)) return false;
  }
  if (!isValidId(data.id)) return false;
  if (typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 100) return false;
  if (typeof data.email !== 'string' || data.email.length < 3 || data.email.length > 120) return false;
  if (!['admin', 'editor', 'contributor', 'viewer'].includes(data.role)) return false;
  if (!['active', 'invited'].includes(data.status)) return false;
  if (typeof data.addedAt !== 'string' || data.addedAt.length > 50) return false;
  return true;
}

function evaluateRule(tc: TestPayloadAssertion): 'ALLOWED' | 'PERMISSION_DENIED' {
  const isSignedIn = tc.auth !== null;
  const isVerifiedUser = isSignedIn && tc.auth?.emailVerified === true;
  const isAdmin = isVerifiedUser && tc.auth?.email === 'KingGoddeth@gmail.com';

  // Sample existing documents for update tests
  const existingDocs: Record<string, Record<string, any>> = {
    'tasks/task-101': {
      id: 'task-101',
      title: 'Existing Task Title',
      dueDate: '2026-09-20',
      category: 'work',
      priority: 'medium',
      completed: false,
      createdAt: '2026-09-17T00:00:00.000Z',
    },
    'tasks/task-108': {
      id: 'task-108',
      title: 'Immortality Task',
      dueDate: '2026-09-20',
      category: 'work',
      priority: 'medium',
      completed: false,
      createdAt: '2026-09-17T00:00:00.000Z',
    },
    'tasks/task-valid-3': {
      id: 'task-valid-3',
      title: 'Valid Task 3',
      dueDate: '2026-09-20',
      category: 'work',
      priority: 'medium',
      completed: false,
      createdAt: '2026-09-17T00:00:00.000Z',
    },
    'shortlinks/link-110': {
      id: 'link-110',
      originalUrl: 'https://example.com',
      shortSlug: 'link-110',
      shortUrl: 'tsk.sync/link-110',
      title: 'Link 110',
      clicks: 5,
      createdAt: '2026-09-17T00:00:00.000Z',
    },
    'collaborators/collab-111': {
      id: 'collab-111',
      name: 'Contributor Joe',
      email: 'contributor@example.com',
      role: 'contributor',
      status: 'active',
      addedAt: '2026-09-17T00:00:00.000Z',
    },
    'collaborators/collab-owner': {
      id: 'collab-owner',
      name: 'Lead Admin',
      email: 'KingGoddeth@gmail.com',
      role: 'admin',
      status: 'active',
      addedAt: '2026-09-17T00:00:00.000Z',
    },
  };

  const existing = existingDocs[`${tc.collection}/${tc.docId}`] || null;

  // TASKS COLLECTION
  if (tc.collection === 'tasks') {
    if (tc.action === 'get') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      return isVerifiedUser ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'list') {
      return isVerifiedUser ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'create') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      if (!tc.payload || !isValidTask(tc.payload)) return 'PERMISSION_DENIED';
      const allowed = isVerifiedUser || (!isSignedIn && tc.payload.status === 'inbox' && tc.payload.completed === false);
      return allowed ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'update') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      if (!isVerifiedUser) return 'PERMISSION_DENIED';
      const incoming = { ...existing, ...tc.payload };
      if (!isValidTask(incoming)) return 'PERMISSION_DENIED';
      if (isAdmin) return 'ALLOWED';

      // Check actions
      const changedKeys = Object.keys(tc.payload || {});
      // Action 1: completion toggle
      const action1Allowed = changedKeys.every(k => ['completed', 'completedAt', 'updatedAt'].includes(k)) &&
        incoming.id === existing?.id && incoming.createdAt === existing?.createdAt;
      // Action 2: field edits
      const action2Allowed = changedKeys.every(k => [
        'title', 'description', 'assignedDate', 'assignedTime', 'dueDate', 'dueTime',
        'estimatedDurationMinutes', 'priority', 'category', 'tags', 'reminderEnabled',
        'reminderMinutesBefore', 'reminderDismissedForDay', 'notes', 'updatedAt',
        'syncedToGoogleTasks', 'googleTaskId', 'googleTaskListId', 'googleTaskWebViewLink',
        'syncedToGoogleCalendar', 'googleCalendarEventId', 'googleCalendarHtmlLink', 'lastSyncedAt'
      ].includes(k)) && incoming.id === existing?.id && incoming.createdAt === existing?.createdAt;

      return (action1Allowed || action2Allowed) ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'delete') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      return isVerifiedUser ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
  }

  // COLLABORATORS COLLECTION
  if (tc.collection === 'collaborators') {
    if (tc.action === 'get' || tc.action === 'list') {
      return isVerifiedUser ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'create') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      if (!isVerifiedUser) return 'PERMISSION_DENIED';
      if (!tc.payload || !isValidCollaborator(tc.payload)) return 'PERMISSION_DENIED';
      const allowed = isAdmin || tc.payload.role !== 'admin';
      return allowed ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'update') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      if (!isVerifiedUser) return 'PERMISSION_DENIED';
      const incoming = { ...existing, ...tc.payload };
      if (!isValidCollaborator(incoming)) return 'PERMISSION_DENIED';
      if (incoming.id !== existing?.id || incoming.addedAt !== existing?.addedAt) return 'PERMISSION_DENIED';
      if (isAdmin) return 'ALLOWED';

      // Non-admin update constraints
      if (existing?.role === 'admin') return 'PERMISSION_DENIED';
      if (incoming.role === 'admin') return 'PERMISSION_DENIED';
      const changedKeys = Object.keys(tc.payload || {});
      const allowedKeys = ['name', 'department', 'avatarUrl', 'status'];
      const hasOnlyAllowed = changedKeys.every(k => allowedKeys.includes(k));
      return hasOnlyAllowed ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'delete') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      return isAdmin ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
  }

  // SHORTLINKS COLLECTION
  if (tc.collection === 'shortlinks') {
    if (tc.action === 'get') {
      return isValidId(tc.docId) ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'list') {
      return isVerifiedUser ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'update') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      const changedKeys = Object.keys(tc.payload || {});
      // Action 1: clicks increment
      if (changedKeys.length === 1 && changedKeys[0] === 'clicks') {
        const expectedClicks = (existing?.clicks || 0) + 1;
        if (tc.payload?.clicks === expectedClicks) return 'ALLOWED';
        return 'PERMISSION_DENIED';
      }
      return isVerifiedUser ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
    if (tc.action === 'delete') {
      if (!isValidId(tc.docId)) return 'PERMISSION_DENIED';
      return isVerifiedUser ? 'ALLOWED' : 'PERMISSION_DENIED';
    }
  }

  return 'PERMISSION_DENIED';
}

export function runSecuritySuite() {
  console.log('='.repeat(70));
  console.log('🛡️  FIRESTORE SECURITY & PRIVACY TDD AUDIT SUITE');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const tc of DIRTY_DOZEN_TEST_CASES) {
    const outcome = evaluateRule(tc);
    const isSuccess = outcome === tc.expectedOutcome;
    if (isSuccess) {
      passed++;
      console.log(`✅ [${tc.id}] ${tc.name}: PASSED (Result: ${outcome})`);
    } else {
      failed++;
      console.error(`❌ [${tc.id}] ${tc.name}: FAILED (Expected: ${tc.expectedOutcome}, Got: ${outcome})`);
    }
  }

  console.log('-'.repeat(70));
  console.log(`TOTAL AUDIT TESTS: ${DIRTY_DOZEN_TEST_CASES.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    throw new Error(`${failed} security test assertions failed!`);
  }
}

// Execute if run directly
runSecuritySuite();
