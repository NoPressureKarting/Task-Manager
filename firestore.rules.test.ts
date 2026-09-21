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
];
