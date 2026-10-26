/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileSearch,
  HardHat,
  HelpCircle,
  Inbox,
  MapPin,
  Megaphone,
  Sliders,
  Sparkles,
  User,
  Wrench,
  X,
} from '../Common/Icons';
import { useI18n } from '../../i18n/I18nContext';
import type {
  AnalysisOrigin,
  AnalysisRunLog,
  ComplaintRecord,
  FeedbackItem,
  InterventionItem,
  ScoredOpportunity,
  UserAccount,
  WorkspaceViewId,
} from '../../types/needmap';

interface OverviewViewProps {
  currentUser: UserAccount;
  feedback: FeedbackItem[];
  opportunities: ScoredOpportunity[];
  interventions: InterventionItem[];
  complaints: ComplaintRecord[];
  analysisLogs: AnalysisRunLog[];
  analysisOrigin: AnalysisOrigin | null;
  isAnalyzing: boolean;
  onboardingDismissed: boolean;
  onToggleOnboarding: (dismissed: boolean) => void;
  onRunAnalysis: () => void;
  onOpenInboxMode: (mode: 'paste' | 'csv' | 'demo') => void;
  onNavigateToOpportunity: (opportunityId: string) => void;
  onNavigateToComplaint: (complaintId: string) => void;
  onSelectView: (view: WorkspaceViewId) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  currentUser,
  feedback,
  opportunities,
  interventions,
  complaints,
  analysisLogs,
  analysisOrigin,
  isAnalyzing,
  onboardingDismissed,
  onToggleOnboarding,
  onRunAnalysis,
  onOpenInboxMode,
  onNavigateToOpportunity,
  onNavigateToComplaint,
  onSelectView,
}) => {
  const { t, tr, tStatus, tPriority, tCategory, tRole } = useI18n();

  // Role-specific filtered data
  const myComplaints = useMemo(
    () => complaints.filter((c) => c.reporterAccountId === currentUser.id),
    [complaints, currentUser.id]
  );

  const workerTasks = useMemo(
    () =>
      complaints.filter(
        (c) =>
          c.assignedWorkerId === (currentUser.workerProfileId || currentUser.id) &&
          c.status !== 'closed' &&
          c.status !== 'cancelled'
      ),
    [complaints, currentUser.workerProfileId, currentUser.id]
  );

  const deptQueue = useMemo(
    () =>
      complaints.filter(
        (c) =>
          (!currentUser.departmentId || c.assignedDepartmentId === currentUser.departmentId) &&
          c.status !== 'closed' &&
          c.status !== 'cancelled'
      ),
    [complaints, currentUser.departmentId]
  );

  const awaitingConfirmation = useMemo(
    () => myComplaints.filter((c) => c.status === 'resolved_awaiting_confirmation'),
    [myComplaints]
  );

  // High-level summary metrics
  const stats = useMemo(() => {
    const totalActive = complaints.filter(
      (c) => c.status !== 'closed' && c.status !== 'cancelled' && c.status !== 'rejected'
    ).length;
    const resolvedTotal = complaints.filter(
      (c) => c.status === 'closed' || c.status === 'resolved_awaiting_confirmation'
    ).length;
    const highPriorityOpps = opportunities.filter((o) => o.priority.tier === 'High').length;

    return {
      totalActive,
      resolvedTotal,
      highPriorityOpps,
      myCount: myComplaints.length,
      workerCount: workerTasks.length,
      deptCount: deptQueue.length,
    };
  }, [complaints, opportunities, myComplaints.length, workerTasks.length, deptQueue.length]);

  return (
    <div className="space-y-6">
      {/* Primary Action Header */}
      <div className="p-6 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
              {tRole(currentUser.role)} Portal
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {currentUser.name}
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('overview.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
            {t('overview.subtitle')}
          </p>
        </div>

        {/* Clear Primary Action: Report a Problem */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onSelectView('report_problem')}
            className="px-5 py-3 bg-teal-800 hover:bg-teal-900 text-teal-50 text-xs sm:text-sm font-bold border border-teal-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Megaphone className="w-4 h-4" />
            <span>{t('topbar.reportBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('my_complaints')}
            className="px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ClipboardList className="w-4 h-4 text-teal-800 dark:text-teal-400" />
            <span>{t('topbar.myComplaints')}</span>
          </button>
        </div>
      </div>

      {/* Citizen Satisfaction Callout Banner if any resolved complaint needs confirmation */}
      {awaitingConfirmation.length > 0 && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
                Action Required: {awaitingConfirmation.length} Resolution Ready for Your Confirmation
              </h2>
              <p className="text-xs text-emerald-900 dark:text-emerald-300 mt-0.5">
                The maintenance department has marked repairs complete. Please verify the work and submit your satisfaction rating.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectView('my_complaints')}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-emerald-50 text-xs font-semibold border border-emerald-700 transition-colors cursor-pointer shrink-0"
          >
            Review and Rate
          </button>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {currentUser.role === 'worker' ? 'My Active Tasks' : currentUser.role === 'dept_admin' ? 'Dept Queue' : 'My Complaints'}
          </span>
          <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 block mt-1">
            {currentUser.role === 'worker' ? stats.workerCount : currentUser.role === 'dept_admin' ? stats.deptCount : stats.myCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {currentUser.role === 'worker' ? 'Assigned work orders' : 'Submitted by your account'}
          </span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Community Open Issues
          </span>
          <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 block mt-1">
            {stats.totalActive}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            In progress across all zones
          </span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Verified Resolutions
          </span>
          <span className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 block mt-1">
            {stats.resolvedTotal}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Completed repairs
          </span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            High Priority Needs
          </span>
          <span className="font-mono text-2xl font-bold text-amber-700 dark:text-amber-400 block mt-1">
            {stats.highPriorityOpps}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Ranked by urgency and impact
          </span>
        </div>
      </div>

      {/* Role-Specific Content Area */}
      {currentUser.role === 'worker' && (
        <section className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Assigned Work Orders for Your Attention
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onSelectView('worker_portal')}
              className="text-xs font-semibold text-teal-800 dark:text-teal-400 hover:underline cursor-pointer"
            >
              Open Full Worker Portal →
            </button>
          </div>

          {workerTasks.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No pending work orders assigned to you at this time.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {workerTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{task.id}</span>
                      <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-semibold text-[10px]">
                        {tStatus(task.status)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">{task.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>{task.location?.address || 'Site inspection'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToComplaint(task.id);
                      onSelectView('worker_portal');
                    }}
                    className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-teal-50 text-xs font-semibold cursor-pointer"
                  >
                    Update Work
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {currentUser.role === 'dept_admin' && (
        <section className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Department Queue and Routing
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onSelectView('department_portal')}
              className="text-xs font-semibold text-teal-800 dark:text-teal-400 hover:underline cursor-pointer"
            >
              Open Department Portal →
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {deptQueue.slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{ticket.id}</span>
                    <span className="text-slate-500">•</span>
                    <span>{tCategory(ticket.category)}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">{ticket.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Assigned: {ticket.assignedWorkerId || 'Pending Worker Assignment'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToComplaint(ticket.id);
                    onSelectView('department_portal');
                  }}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Manage Ticket
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Split: Recent Activity & Top Prioritized Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Service Complaints (Left) */}
        <section className="lg:col-span-6 p-5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Issue Reports
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current resolution status and timeline
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectView('my_complaints')}
              className="text-xs font-semibold text-teal-800 dark:text-teal-400 hover:underline cursor-pointer"
            >
              View My History →
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {complaints.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onNavigateToComplaint(c.id)}
                className="w-full text-left py-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 px-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{c.id}</span>
                  <span className="font-semibold text-teal-800 dark:text-teal-400">{tStatus(c.status)}</span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">{c.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {tCategory(c.category)} • {c.location?.address}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Priority Needs & Opportunities (Right) */}
        <section className="lg:col-span-6 p-5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Prioritized Community Needs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Transparently calculated from verified feedback
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectView('opportunities')}
              className="text-xs font-semibold text-teal-800 dark:text-teal-400 hover:underline cursor-pointer"
            >
              Open Opportunity Map →
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {opportunities.slice(0, 4).map((opp, idx) => (
              <div key={opp.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{idx + 1}</span>
                    <span>{tCategory(opp.category)}</span>
                    <span>•</span>
                    <span>{opp.priority.validSupportCount} reports</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToOpportunity(opp.id)}
                    className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-teal-800 dark:hover:text-teal-400 mt-1 block text-left"
                  >
                    {opp.title}
                  </button>
                  <p className="text-[11px] text-teal-800 dark:text-teal-300 mt-0.5">
                    {opp.priority.recommendedNextAction}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    {opp.priority.totalScore}/100
                  </div>
                  <div className="text-[10px] font-semibold text-teal-800 dark:text-teal-400">
                    {tPriority(opp.priority.tier)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Direct Navigation to Advanced Specialized Tools */}
      <section className="p-5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Advanced Tools & Portals
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectView('opportunities')}
            className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-left cursor-pointer transition-colors"
          >
            <Compass className="w-4 h-4 text-teal-800 dark:text-teal-400 mb-1.5" />
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Opportunity Map</div>
            <div className="text-[11px] text-slate-500">Geographic clustering</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('evidence')}
            className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-left cursor-pointer transition-colors"
          >
            <FileSearch className="w-4 h-4 text-indigo-700 dark:text-indigo-400 mb-1.5" />
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Evidence Explorer</div>
            <div className="text-[11px] text-slate-500">Verbatim audit trails</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('interventions')}
            className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-left cursor-pointer transition-colors"
          >
            <Wrench className="w-4 h-4 text-amber-700 dark:text-amber-400 mb-1.5" />
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Interventions</div>
            <div className="text-[11px] text-slate-500">Budget and milestones</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('jobs_portal')}
            className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-left cursor-pointer transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mb-1.5" />
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Jobs & Fellowships</div>
            <div className="text-[11px] text-slate-500">Campus opportunities</div>
          </button>
        </div>
      </section>
    </div>
  );
};
