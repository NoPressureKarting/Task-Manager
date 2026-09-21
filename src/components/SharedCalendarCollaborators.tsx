import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar as CalendarIcon,
  UserPlus,
  Shield,
  Mail,
  Building,
  CheckCircle2,
  Clock,
  Trash2,
  Share2,
  Filter,
  UserCheck,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { Collaborator, TaskItem, GoogleCalendarEvent } from '../types';
import { CalendarScheduleView } from './CalendarScheduleView';

interface SharedCalendarCollaboratorsProps {
  tasks: TaskItem[];
  calendarEvents: GoogleCalendarEvent[];
  collaborators: Collaborator[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onAddTaskForDate: (dateStr: string) => void;
  onEditTask?: (task: TaskItem) => void;
  onAddCollaborator: (collaborator: Omit<Collaborator, 'id' | 'addedAt'>) => Promise<void>;
  onUpdateCollaboratorRole: (id: string, role: Collaborator['role']) => Promise<void>;
  onRemoveCollaborator: (id: string) => Promise<void>;
  onOpenShareModal: () => void;
  currentUserEmail?: string | null;
}

export const SharedCalendarCollaborators: React.FC<SharedCalendarCollaboratorsProps> = ({
  tasks,
  calendarEvents,
  collaborators,
  selectedDate,
  onSelectDate,
  onAddTaskForDate,
  onEditTask,
  onAddCollaborator,
  onUpdateCollaboratorRole,
  onRemoveCollaborator,
  onOpenShareModal,
  currentUserEmail,
}) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'collaborators'>('calendar');
  const [selectedCollaboratorEmail, setSelectedCollaboratorEmail] = useState<string>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Invite Modal Form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Collaborator['role']>('editor');
  const [inviteDepartment, setInviteDepartment] = useState('Engineering');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter tasks for the calendar based on selected collaborator
  const filteredTasks = useMemo(() => {
    if (selectedCollaboratorEmail === 'all') return tasks;
    if (selectedCollaboratorEmail === 'unassigned') {
      return tasks.filter((t) => !t.assignedTo);
    }
    return tasks.filter((t) => t.assignedTo?.toLowerCase() === selectedCollaboratorEmail.toLowerCase());
  }, [tasks, selectedCollaboratorEmail]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddCollaborator({
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        department: inviteDepartment.trim() || 'Operations',
        status: 'active',
      });
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteDepartment('Engineering');
      setInviteRole('editor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: Collaborator['role']) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
            <Shield className="h-3 w-3" />
            ADMIN
          </span>
        );
      case 'editor':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
            EDITOR
          </span>
        );
      case 'contributor':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            CONTRIBUTOR
          </span>
        );
      case 'viewer':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            VIEWER
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
            <Users className="h-3.5 w-3.5" />
            Shared Calendar & Authorized Collaborators
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Team Schedule & Access Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Coordinate team deliverables, synchronize schedules with Google Calendar, and manage collaborator permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            id="share-calendar-link-btn"
            type="button"
            onClick={onOpenShareModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Share Calendar</span>
          </button>

          <button
            id="open-invite-collaborator-btn"
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Collaborator</span>
          </button>
        </div>
      </div>

      {/* Tabs & View Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab switcher */}
        <div className="flex items-center rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <button
            id="shared-cal-tab-calendar"
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5 text-indigo-500" />
            <span>Shared Team Calendar</span>
          </button>

          <button
            id="shared-cal-tab-collaborators"
            type="button"
            onClick={() => setActiveTab('collaborators')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'collaborators'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            <span>Authorized Collaborators</span>
            <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.2 text-[10px] font-bold">
              {collaborators.length}
            </span>
          </button>
        </div>

        {/* Collaborator Filter Chips when in Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Filter Assignee:
            </span>
            <select
              id="calendar-assignee-filter"
              value={selectedCollaboratorEmail}
              onChange={(e) => setSelectedCollaboratorEmail(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">👥 All Collaborators ({tasks.length} tasks)</option>
              {collaborators.map((c) => {
                const count = tasks.filter((t) => t.assignedTo?.toLowerCase() === c.email.toLowerCase()).length;
                return (
                  <option key={c.id} value={c.email}>
                    {c.name} ({count} tasks)
                  </option>
                );
              })}
              <option value="unassigned">Unassigned Tasks</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: Shared Calendar */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Active filter banner if filtered */}
          {selectedCollaboratorEmail !== 'all' && (
            <div className="flex items-center justify-between rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 px-4 py-2 text-xs">
              <span className="text-indigo-800 dark:text-indigo-200">
                Showing schedule specifically for: <strong>{selectedCollaboratorEmail}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCollaboratorEmail('all')}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Render Calendar View */}
          <CalendarScheduleView
            tasks={filteredTasks}
            calendarEvents={calendarEvents}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            onAddTaskForDate={onAddTaskForDate}
            onEditTask={onEditTask}
          />
        </div>
      )}

      {/* VIEW 2: Authorized Collaborators List */}
      {activeTab === 'collaborators' && (
        <div className="space-y-6">
          {/* Collaborators Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Collaborators
              </span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {collaborators.length}
              </p>
              <p className="text-[11px] text-slate-400">Authorized team members & reviewers</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Permissions
              </span>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {collaborators.filter((c) => c.status === 'active').length}
              </p>
              <p className="text-[11px] text-slate-400">Confirmed accounts with cloud access</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending Invitations
              </span>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {collaborators.filter((c) => c.status === 'invited').length}
              </p>
              <p className="text-[11px] text-slate-400">Awaiting workspace sign-in</p>
            </div>
          </div>

          {/* Collaborators Table */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Authorized Collaborator Directory
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Members who can create, review, and synchronize schedule tasks with Google Workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Invite New</span>
              </button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {collaborators.map((collab) => {
                const initials = collab.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                const isCurrentUser = currentUserEmail && collab.email.toLowerCase() === currentUserEmail.toLowerCase();
                const assignedTaskCount = tasks.filter((t) => t.assignedTo?.toLowerCase() === collab.email.toLowerCase()).length;

                return (
                  <div
                    key={collab.id}
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-black text-white shadow-xs">
                        {initials}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {collab.name}
                          </h4>
                          {isCurrentUser && (
                            <span className="rounded-full bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              You
                            </span>
                          )}
                          {getRoleBadge(collab.role)}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {collab.email}
                          </span>
                          {collab.department && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Building className="h-3 w-3 text-slate-400" />
                              {collab.department}
                            </span>
                          )}
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            {assignedTaskCount} active tasks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Role Select */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <select
                        value={collab.role}
                        onChange={(e) => onUpdateCollaboratorRole(collab.id, e.target.value as any)}
                        disabled={collab.role === 'admin' && collab.email === 'KingGoddeth@gmail.com'}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="contributor">Contributor</option>
                        <option value="viewer">Viewer</option>
                      </select>

                      {collab.email !== 'KingGoddeth@gmail.com' && (
                        <button
                          type="button"
                          onClick={() => onRemoveCollaborator(collab.id)}
                          className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Remove collaborator"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Invite Collaborator Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                  Team Access
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Authorize New Collaborator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Miller"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="jordan@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role & Permissions
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="contributor">Contributor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="Engineering / Ops"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 text-[11px] text-slate-500 dark:text-slate-400">
                Collaborator details are stored securely in Firestore and synchronized across team sessions.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-invite-collaborator-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{isSubmitting ? 'Adding...' : 'Add Collaborator'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
