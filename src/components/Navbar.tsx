import React from 'react';
import {
  LogOut,
  Calendar,
  CheckCircle2,
  User as UserIcon,
  Sun,
  Moon,
  Inbox,
  Send,
  Users,
  Share2,
} from 'lucide-react';
import { User } from 'firebase/auth';

export type AppView = 'dashboard' | 'tasks' | 'calendar' | 'inbox' | 'quick-submit' | 'collaborators';

interface NavbarProps {
  user: User | null;
  token: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoggingIn: boolean;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  pendingCount: number;
  inboxCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenShareModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  token,
  onSignIn,
  onSignOut,
  isLoggingIn,
  activeView,
  onViewChange,
  pendingCount,
  inboxCount,
  theme,
  onToggleTheme,
  onOpenShareModal,
}) => {
  const navTabs = [
    {
      id: 'dashboard' as AppView,
      label: "Today's Brief",
      mobileLabel: "Today",
      icon: Calendar,
    },
    {
      id: 'tasks' as AppView,
      label: 'Running List',
      mobileLabel: 'Running',
      icon: CheckCircle2,
      badge: pendingCount,
      badgeType: 'pending' as const,
    },
    {
      id: 'inbox' as AppView,
      label: 'Task Inbox',
      mobileLabel: 'Inbox',
      icon: Inbox,
      badge: inboxCount,
      badgeType: 'inbox' as const,
    },
    {
      id: 'quick-submit' as AppView,
      label: 'Quick-Submit',
      mobileLabel: 'Quick Submit',
      icon: Send,
    },
    {
      id: 'collaborators' as AppView,
      label: 'Shared Schedule & Team',
      mobileLabel: 'Team & Cal',
      icon: Users,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md transition-colors">
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        {/* Top Header Row */}
        <div className="flex items-center justify-between py-2 sm:py-2.5 gap-2">
          {/* App Logo & Title */}
          <div
            onClick={() => onViewChange('dashboard')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group shrink-0"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xs ring-1 ring-indigo-400/30 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white block leading-tight">
                  TaskSync Daily
                </span>
                <span className="hidden lg:inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.2">
                  Realtime Cloud
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Google Tasks, Calendar & Team Sync
              </span>
            </div>
          </div>

          {/* Desktop View Switcher Tabs (Visible on md and larger) */}
          <nav className="hidden md:flex items-center rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 shadow-2xs">
            {navTabs.map((tab) => {
              const isActive =
                tab.id === 'collaborators'
                  ? activeView === 'collaborators' || activeView === 'calendar'
                  : activeView === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  type="button"
                  onClick={() => onViewChange(tab.id)}
                  className={`rounded-xl px-2.5 lg:px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.id === 'inbox' && <Inbox className="h-3.5 w-3.5 text-amber-500" />}
                  {tab.id === 'quick-submit' && <Send className="h-3 w-3 text-indigo-500" />}
                  {tab.id === 'collaborators' && <Users className="h-3.5 w-3.5 text-emerald-500" />}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    tab.badgeType === 'inbox' ? (
                      <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-extrabold animate-pulse">
                        {tab.badge}
                      </span>
                    ) : (
                      <span className="rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 text-[10px] font-bold">
                        {tab.badge}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </nav>

          {/* Controls: Share Modal, Dark Mode Toggle & Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Share Link & Shortener Modal Trigger */}
            <button
              id="nav-open-share-modal-btn"
              onClick={onOpenShareModal}
              type="button"
              title="Share links & URL shortener"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Dark / Light Mode Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              type="button"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-600" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 sm:px-2.5 py-1 shadow-2xs">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="h-6 w-6 rounded-full ring-1 ring-slate-300 dark:ring-slate-700 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold ring-1 ring-indigo-300 dark:ring-indigo-700">
                      {user.email ? user.email[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="hidden xl:block text-left">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                  </div>
                </div>

                <button
                  id="signout-btn"
                  onClick={onSignOut}
                  title="Sign out"
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                id="google-signin-btn"
                onClick={onSignIn}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-xs hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span className="hidden sm:inline">{isLoggingIn ? 'Connecting...' : 'Google Sign-In'}</span>
                <span className="sm:hidden">{isLoggingIn ? '...' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Mobile Navigation Row: full-width on its own line below the top row */}
        <div className="md:hidden pb-2 pt-0.5 w-full">
          <nav className="flex items-center rounded-2xl bg-slate-100/95 dark:bg-slate-900/95 p-1 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto gap-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full">
            {navTabs.map((tab) => {
              const isActive =
                tab.id === 'collaborators'
                  ? activeView === 'collaborators' || activeView === 'calendar'
                  : activeView === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  id={`nav-tab-mobile-${tab.id}`}
                  type="button"
                  onClick={() => onViewChange(tab.id)}
                  className={`flex-1 min-w-[62px] shrink-0 sm:shrink flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer touch-manipulation active:scale-[0.98] ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : tab.id === 'inbox'
                        ? 'text-amber-500'
                        : tab.id === 'collaborators'
                        ? 'text-emerald-500'
                        : tab.id === 'quick-submit'
                        ? 'text-indigo-500'
                        : ''
                    }`}
                  />
                  <span className="text-[11px] sm:text-xs tracking-tight">{tab.mobileLabel}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    tab.badgeType === 'inbox' ? (
                      <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-extrabold leading-none animate-pulse">
                        {tab.badge}
                      </span>
                    ) : (
                      <span className="rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 text-[10px] font-bold leading-none">
                        {tab.badge}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
