import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  FolderKanban,
  Globe,
  Keyboard,
  Loader2,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Search,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  X,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import { SUPPORTED_LANGUAGES, getLanguageMeta } from '../../i18n/languages';
import { useTheme } from '../../theme/ThemeContext';
import type {
  AppNotification,
  ComplaintRecord,
  FeedbackItem,
  LanguageCode,
  ScoredOpportunity,
  UserAccount,
  WorkspaceViewId,
} from '../../types/needmap';
import { ConfirmDialog } from '../Common/ConfirmDialog';

interface TopBarProps {
  workspaceName: string;
  workspaceContext: string;
  onUpdateWorkspaceMeta: (name: string, context: string) => void;
  onResetToDemoWorkspace: () => void;
  onOpenMobileMenu: () => void;
  globalSearch: string;
  onChangeGlobalSearch: (q: string) => void;
  feedback: FeedbackItem[];
  opportunities: ScoredOpportunity[];
  complaints: ComplaintRecord[];
  onNavigateToOpportunity: (opportunityId: string) => void;
  onNavigateToFeedback: (feedbackId: string) => void;
  onNavigateToComplaint: (complaintId: string) => void;
  onSelectView: (view: WorkspaceViewId) => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (notificationId: string) => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  accounts: UserAccount[];
  activeAccount: UserAccount;
  onOpenDemoPortalModal: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onSignOut?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  workspaceName,
  workspaceContext,
  onUpdateWorkspaceMeta,
  onResetToDemoWorkspace,
  onOpenMobileMenu,
  globalSearch,
  onChangeGlobalSearch,
  feedback,
  opportunities,
  complaints,
  onNavigateToOpportunity,
  onNavigateToFeedback,
  onNavigateToComplaint,
  onSelectView,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
  onRunAnalysis,
  isAnalyzing,
  accounts,
  activeAccount,
  onOpenDemoPortalModal,
  onOpenKeyboardShortcuts,
  onSignOut,
}) => {
  const { lang, setLang, t, tr, tRole, tStatus } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const [draftName, setDraftName] = useState(workspaceName);
  const [draftContext, setDraftContext] = useState(workspaceContext);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftName(workspaceName);
    setDraftContext(workspaceContext);
  }, [workspaceName, workspaceContext]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === '/' && !isEditable) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchDropdownOpen(true);
      } else if (e.key === 'Escape') {
        setIsWorkspaceMenuOpen(false);
        setIsNotifOpen(false);
        setIsLangMenuOpen(false);
        setIsSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (workspaceRef.current && !workspaceRef.current.contains(target)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (langRef.current && !langRef.current.contains(target)) {
        setIsLangMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, notifFilter]);

  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return { matchedComplaints: [], matchedOpps: [], matchedFeedback: [] };

    const matchedComplaints = complaints
      .filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.location.address.toLowerCase().includes(q)
      )
      .slice(0, 3);

    const matchedOpps = opportunities
      .filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
      )
      .slice(0, 3);

    const matchedFeedback = feedback
      .filter(
        (f) =>
          f.text.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q)
      )
      .slice(0, 4);

    return { matchedComplaints, matchedOpps, matchedFeedback };
  }, [globalSearch, complaints, opportunities, feedback]);

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) return;
    onUpdateWorkspaceMeta(trimmed, draftContext.trim());
    setIsWorkspaceMenuOpen(false);
  };

  const currentLangMeta = getLanguageMeta(lang);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-xs sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
        {/* Left Zone: Mobile Menu + Brand + Workspace Selector */}
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <span className="font-display text-sm font-bold tracking-tight text-slate-900 lg:hidden dark:text-white whitespace-nowrap shrink-0">
            NEEDMAP AI
          </span>

          {/* Workspace Selector */}
          <div className="relative min-w-0" ref={workspaceRef}>
            <button
              type="button"
              onClick={() => setIsWorkspaceMenuOpen((prev) => !prev)}
              className="flex max-w-[170px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 sm:max-w-[240px] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="dialog"
              title={workspaceName}
            >
              <FolderKanban className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />
              <span className="truncate">{workspaceName}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>

            {isWorkspaceMenuOpen && (
              <div className="absolute left-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50 dark:border-slate-700 dark:bg-slate-900">
                <form onSubmit={handleSaveWorkspace} className="space-y-3">
                  <div>
                    <label
                      htmlFor="topbar-ws-name"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      {t('topbar.workspaceName')}
                    </label>
                    <input
                      id="topbar-ws-name"
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="topbar-ws-context"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      {t('topbar.workspaceScope')}
                    </label>
                    <input
                      id="topbar-ws-context"
                      type="text"
                      value={draftContext}
                      onChange={(e) => setDraftContext(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWorkspaceMenuOpen(false);
                        onSelectView('settings');
                      }}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 underline-offset-4 hover:underline"
                    >
                      {t('topbar.moreSettings')}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('topbar.saveWorkspace')}
                    </button>
                  </div>
                </form>

                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      onResetToDemoWorkspace();
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {t('topbar.reloadDemo')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Input (Desktop) */}
          <div className="relative hidden xl:block w-56" ref={searchContainerRef}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="search"
              data-global-search="true"
              value={globalSearch}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                onChangeGlobalSearch(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              placeholder={t('topbar.searchPlaceholder')}
              aria-label={t('topbar.searchPlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:bg-slate-900"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => onChangeGlobalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {isSearchDropdownOpen && globalSearch.trim().length > 0 && (
              <div className="absolute left-0 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 dark:border-slate-700 dark:bg-slate-900">
                {searchResults.matchedComplaints.length === 0 &&
                searchResults.matchedOpps.length === 0 &&
                searchResults.matchedFeedback.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    {tr('No matching items found.', 'பொருத்தமான முடிவுகள் எதுவும் இல்லை.')}
                  </p>
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto">
                    {searchResults.matchedComplaints.length > 0 && (
                      <div>
                        <div className="px-2 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {tr('Complaints', 'புகார்கள்')} ({searchResults.matchedComplaints.length})
                        </div>
                        {searchResults.matchedComplaints.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setIsSearchDropdownOpen(false);
                              onNavigateToComplaint(c.id);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                              {c.id}: {c.title}
                            </span>
                            <span className="shrink-0 text-[11px] text-teal-700 dark:text-teal-400">
                              {tStatus(c.status)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.matchedOpps.length > 0 && (
                      <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                        <div className="px-2 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {tr('Issue Clusters', 'தேவைத் தொகுப்புகள்')} ({searchResults.matchedOpps.length})
                        </div>
                        {searchResults.matchedOpps.map((opp) => (
                          <button
                            key={opp.id}
                            type="button"
                            onClick={() => {
                              setIsSearchDropdownOpen(false);
                              onNavigateToOpportunity(opp.id);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                              {opp.title}
                            </span>
                            <span className="shrink-0 font-mono text-slate-500 tabular-nums">
                              {opp.priority.totalScore}/100
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Zone: Report CTA + AI Button + Role Portal Switcher + 19 Languages Dropdown + Notifications */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Citizen Action */}
          <button
            type="button"
            onClick={() => onSelectView('report_problem')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 whitespace-nowrap shrink-0"
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span>{t('topbar.reportBtn')}</span>
          </button>

          {/* AI Clustering Button */}
          <button
            type="button"
            onClick={onRunAnalysis}
            disabled={isAnalyzing || feedback.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 whitespace-nowrap shrink-0"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                <span>{t('topbar.analyzingBtn')}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">{t('topbar.analyzeBtn')}</span>
                <span className="sm:hidden">AI</span>
              </>
            )}
          </button>

          {/* Demo Portal / Active Role Button (opens DemoPortalLoginModal) */}
          <button
            type="button"
            onClick={onOpenDemoPortalModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title={t('topbar.switchRole')}
          >
            <UserCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline max-w-[125px] truncate font-semibold">
              {activeAccount.portalTitle || tRole(activeAccount.role)}
            </span>
            <span className="md:hidden font-mono text-[10px] uppercase font-bold">
              {activeAccount.role.slice(0, 4)}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {/* MULTILINGUAL LANGUAGE SELECTOR (19 LANGUAGES) */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setIsLangMenuOpen((prev) => !prev)}
              aria-label={t('topbar.language')}
              aria-expanded={isLangMenuOpen}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span className="text-sm">{currentLangMeta.flag}</span>
              <span className="hidden sm:inline font-sans">{currentLangMeta.nativeName}</span>
              <span className="sm:hidden font-mono uppercase">{currentLangMeta.code}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl z-50 dark:border-slate-700 dark:bg-slate-900">
                <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  {t('topbar.language')} ({SUPPORTED_LANGUAGES.length})
                </div>
                <div className="mt-1 space-y-0.5">
                  {SUPPORTED_LANGUAGES.map((l) => {
                    const isSelected = l.code === lang;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setLang(l.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-teal-50 text-teal-900 font-bold dark:bg-teal-950/60 dark:text-teal-200'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{l.flag}</span>
                          <span className="font-sans">{l.nativeName}</span>
                          <span className="text-[11px] text-slate-400">({l.name})</span>
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Cheatsheet Trigger */}
          {onOpenKeyboardShortcuts && (
            <button
              type="button"
              onClick={onOpenKeyboardShortcuts}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-label={t('shortcuts.title')}
              title={`${t('shortcuts.title')} (?)`}
            >
              <Keyboard className="h-4 w-4" />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label={resolvedTheme === 'dark' ? t('topbar.theme.light') : t('topbar.theme.dark')}
            title={resolvedTheme === 'dark' ? t('topbar.theme.light') : t('topbar.theme.dark')}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Sign Out Button */}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label={tr('Sign Out', 'வெளியேறு')}
              title={tr('Sign Out', 'வெளியேறு')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}

          {/* FIXED NOTIFICATION CENTER */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-label={t('topbar.notifications')}
              aria-expanded={isNotifOpen}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-bold text-white tabular-nums animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[94vw] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl z-50 dark:border-slate-700 dark:bg-slate-900">
                {/* Header with Controls */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t('topbar.notifications')}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                        {unreadCount} {tr('new', 'புதியவை')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-400"
                        title={t('topbar.markAllRead')}
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span className="hidden sm:inline">{t('topbar.markAllRead')}</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsClearConfirmOpen(true)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        title={t('topbar.clearNotifications')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs: All vs Unread */}
                {notifications.length > 0 && (
                  <div className="mt-2 flex gap-2 border-b border-slate-100 pb-2 text-[11px] font-medium text-slate-500 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setNotifFilter('all')}
                      className={`px-2 py-0.5 rounded ${
                        notifFilter === 'all'
                          ? 'bg-slate-100 font-bold text-slate-900 dark:bg-slate-800 dark:text-white'
                          : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tr('All', 'அனைத்தும்')} ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter('unread')}
                      className={`px-2 py-0.5 rounded ${
                        notifFilter === 'unread'
                          ? 'bg-slate-100 font-bold text-slate-900 dark:bg-slate-800 dark:text-white'
                          : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tr('Unread', 'படிக்காதவை')} ({unreadCount})
                    </button>
                  </div>
                )}

                {/* Notification List */}
                {filteredNotifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    <Bell className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
                    {notifFilter === 'unread'
                      ? tr('No unread notifications.', 'படிக்காத அறிவிப்புகள் எதுவும் இல்லை.')
                      : t('topbar.noNotifications')}
                  </div>
                ) : (
                  <div className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800 pr-1">
                    {filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        className={`group relative p-2.5 rounded-lg text-xs transition-colors ${
                          !n.read
                            ? 'bg-teal-50/50 dark:bg-teal-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                            {!n.read && (
                              <span className="h-2 w-2 rounded-full bg-teal-600 shrink-0" />
                            )}
                            <span>{n.title}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            {new Date(n.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="mt-2 flex items-center justify-between pt-1">
                          {n.targetView && (
                            <button
                              type="button"
                              onClick={() => {
                                onMarkNotificationRead(n.id);
                                setIsNotifOpen(false);
                                if (n.targetComplaintId) {
                                  onNavigateToComplaint(n.targetComplaintId);
                                } else {
                                  onSelectView(n.targetView!);
                                }
                              }}
                              className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                            >
                              {t('topbar.openView')} →
                            </button>
                          )}

                          {!n.read && (
                            <button
                              type="button"
                              onClick={() => onMarkNotificationRead(n.id)}
                              className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-auto"
                              title={t('topbar.markRead')}
                            >
                              {t('topbar.markRead')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Notifications Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title={t('topbar.clearNotifications')}
        description={tr(
          'Are you sure you want to clear all notifications? This action cannot be undone.',
          'அனைத்து அறிவிப்புகளையும் அழிக்க விரும்புகிறீர்களா?'
        )}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => {
          onClearNotifications();
          setIsClearConfirmOpen(false);
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </header>
  );
};
