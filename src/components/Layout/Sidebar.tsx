import React from 'react';
import {
  Activity,
  Briefcase,
  Building2,
  ClipboardList,
  Compass,
  FileSearch,
  FileSpreadsheet,
  HardHat,
  Inbox,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Shield,
  Sliders,
  UserCheck,
  Wrench,
  X,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import type { UserRole, WorkspaceViewId } from '../../types/needmap';

interface SidebarProps {
  activeView: WorkspaceViewId;
  onSelectView: (view: WorkspaceViewId) => void;
  activeRole: UserRole;
  myComplaintsCount: number;
  totalComplaintsCount: number;
  deptQueueCount: number;
  workerTaskCount: number;
  openVacanciesCount: number;
  feedbackCount: number;
  opportunityCount: number;
  activeInterventionCount: number;
  trackerCount: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenDemoLogin: () => void;
  onOpenShortcuts?: () => void;
  onSignOut?: () => void;
}

interface NavItemConfig {
  id: WorkspaceViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  highlightPrimary?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  activeRole,
  myComplaintsCount,
  totalComplaintsCount,
  deptQueueCount,
  workerTaskCount,
  openVacanciesCount,
  feedbackCount,
  opportunityCount,
  activeInterventionCount,
  trackerCount,
  isMobileOpen,
  onCloseMobile,
  onOpenDemoLogin,
  onOpenShortcuts,
  onSignOut,
}) => {
  const { t, tr, tRole } = useI18n();

  const citizenItems: NavItemConfig[] = [
    {
      id: 'overview',
      label: t('nav.overview'),
      icon: LayoutDashboard,
    },
    {
      id: 'report_problem',
      label: t('nav.report_problem'),
      icon: Megaphone,
      highlightPrimary: true,
    },
    {
      id: 'my_complaints',
      label: t('nav.my_complaints'),
      icon: ClipboardList,
      count: myComplaintsCount > 0 ? myComplaintsCount : undefined,
    },
    {
      id: 'opportunities',
      label: t('nav.opportunities'),
      icon: Compass,
      count: opportunityCount > 0 ? opportunityCount : undefined,
    },
  ];

  const operationsItems: NavItemConfig[] = [
    {
      id: 'central_registry',
      label: t('nav.central_registry'),
      icon: Shield,
      count: totalComplaintsCount > 0 ? totalComplaintsCount : undefined,
    },
    {
      id: 'department_portal',
      label: t('nav.department_portal'),
      icon: Building2,
      count: deptQueueCount > 0 ? deptQueueCount : undefined,
    },
    {
      id: 'worker_portal',
      label: t('nav.worker_portal'),
      icon: HardHat,
      count: workerTaskCount > 0 ? workerTaskCount : undefined,
    },
    {
      id: 'jobs_portal',
      label: t('nav.jobs_portal'),
      icon: Briefcase,
      count: openVacanciesCount > 0 ? openVacanciesCount : undefined,
    },
  ];

  const analyticsItems: NavItemConfig[] = [
    {
      id: 'inbox',
      label: t('nav.inbox'),
      icon: Inbox,
      count: feedbackCount,
    },
    {
      id: 'evidence',
      label: t('nav.evidence'),
      icon: FileSearch,
    },
    {
      id: 'interventions',
      label: t('nav.interventions'),
      icon: Wrench,
      count: activeInterventionCount > 0 ? activeInterventionCount : undefined,
    },
    {
      id: 'impact',
      label: t('nav.impact'),
      icon: Activity,
      count: trackerCount > 0 ? trackerCount : undefined,
    },
    {
      id: 'reports',
      label: t('nav.reports'),
      icon: FileSpreadsheet,
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: Sliders,
    },
  ];

  const handleSelect = (id: WorkspaceViewId) => {
    onSelectView(id);
    onCloseMobile();
  };

  const renderSection = (title: string, items: NavItemConfig[]) => (
    <div className="space-y-1">
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              isActive
                ? 'bg-slate-900 text-white dark:bg-teal-600 dark:text-white'
                : item.highlightPrimary
                ? 'bg-teal-50/80 text-teal-900 hover:bg-teal-100/80 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/70'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive
                    ? 'text-teal-300 dark:text-white'
                    : item.highlightPrimary
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </span>

            {item.count !== undefined && (
              <span
                className={`ml-2 shrink-0 font-mono text-xs tabular-nums ${
                  isActive
                    ? 'text-slate-200'
                    : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Brand Header */}
      <div className="flex min-h-16 items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => handleSelect('overview')}
          className="flex items-center gap-2.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-teal-400 dark:bg-teal-600 dark:text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4.5 w-4.5"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="6" cy="18" r="2.5" />
              <circle cx="18" cy="12" r="3" />
              <path d="M8.5 7.2 15.2 10.6" />
              <path d="M8.5 16.8 15.2 13.4" />
            </svg>
          </div>
          <div>
            <span className="block font-display text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              {t('app.name')}
            </span>
            <span className="block text-[11px] font-medium text-teal-700 dark:text-teal-400">
              {tRole(activeRole)}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Grouped Navigation Links */}
      <nav
        className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
        aria-label="Workspace navigation"
      >
        {renderSection(t('nav.group.citizen'), citizenItems)}
        {renderSection(t('nav.group.operations'), operationsItems)}
        {renderSection(t('nav.group.analytics'), analyticsItems)}
      </nav>

      {/* Footer Tagline & Demo Portal Switcher */}
      <div className="border-t border-slate-200 p-3.5 space-y-2 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            onCloseMobile();
            onOpenDemoLogin();
          }}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>{t('topbar.switchRole')}</span>
          </span>
          <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
            {activeRole}
          </span>
        </button>

        <div className="flex items-center gap-1.5 pt-0.5">
          {onOpenShortcuts && (
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onOpenShortcuts();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title={`${t('shortcuts.title')} (?)`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>{tr('Shortcuts', 'சுருக்குவழிகள்')}</span>
            </button>
          )}

          {onSignOut && (
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onSignOut();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-[11px] font-medium text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
              title={tr('Sign Out', 'வெளியேறு')}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{tr('Sign Out', 'வெளியேறு')}</span>
            </button>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 px-1">
          {t('app.tagline')}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Flex Sidebar : zero fixed-position overlap */}
      <aside className="no-print hidden lg:sticky lg:top-0 lg:z-20 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile & Tablet Slide-over Drawer */}
      {isMobileOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex w-72 max-w-[85vw] flex-1 flex-col bg-white dark:bg-slate-900">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
