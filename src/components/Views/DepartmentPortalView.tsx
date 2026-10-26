import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  UserCheck,
  Users,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import { isStaffRole, sanitizeComplaintForViewer } from '../../services/accessControl';
import type {
  ComplaintRecord,
  ComplaintStatus,
  Department,
  PriorityTier,
  UserAccount,
  WorkerProfile,
} from '../../types/needmap';
import { recommendWorkersForComplaint } from '../../utils/routingEngine';

interface DepartmentPortalViewProps {
  activeAccount: UserAccount;
  accounts: UserAccount[];
  onSwitchAccount: (accountId: string) => void;
  complaints: ComplaintRecord[];
  departments: Department[];
  workers: WorkerProfile[];
  onAssignWorker: (params: {
    complaintId: string;
    workerId: string;
    rationale: string;
  }) => { ok: boolean; error?: string };
  onReassignDepartment: (params: {
    complaintId: string;
    departmentId: string;
    rationale: string;
  }) => { ok: boolean; error?: string };
  onAdminStatusUpdate: (params: {
    complaintId: string;
    nextStatus: ComplaintStatus;
    note: string;
    expectedResolutionDate?: string;
  }) => { ok: boolean; error?: string };
  onOverrideComplaintPriority: (params: {
    complaintId: string;
    tier: PriorityTier;
    reason: string;
  }) => { ok: boolean; error?: string };
}

export const DepartmentPortalView: React.FC<DepartmentPortalViewProps> = ({
  activeAccount,
  accounts,
  onSwitchAccount,
  complaints,
  departments,
  workers,
  onAssignWorker,
  onReassignDepartment,
  onAdminStatusUpdate,
  onOverrideComplaintPriority,
}) => {
  const { tr, tCategory, tStatus, tPriority } = useI18n();

  const hasStaffAccess = isStaffRole(activeAccount.role);

  const [deptFilter, setDeptFilter] = useState<string>(
    activeAccount.departmentId || 'ALL'
  );
  const [queueFilter, setQueueFilter] = useState<
    'ALL' | 'UNASSIGNED' | 'ACTIVE' | 'AWAITING_CONFIRM' | 'REOPENED'
  >('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(complaints[0]?.id || null);

  // Action form states
  const [statusDraft, setStatusDraft] = useState<ComplaintStatus>('under_review');
  const [statusNote, setStatusNote] = useState('');
  const [slaDateDraft, setSlaDateDraft] = useState('');
  const [overrideTier, setOverrideTier] = useState<PriorityTier>('High');
  const [overrideReason, setOverrideReason] = useState('');
  const [transferDeptId, setTransferDeptId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const deptMap = useMemo(() => {
    const m = new Map<string, Department>();
    departments.forEach((d) => m.set(d.id, d));
    return m;
  }, [departments]);

  const filteredComplaints = useMemo(() => {
    return complaints
      .map((c) => sanitizeComplaintForViewer(activeAccount, c))
      .filter((c) => {
        if (deptFilter !== 'ALL' && c.assignedDepartmentId !== deptFilter) return false;
        if (queueFilter === 'UNASSIGNED') {
          return (
            !c.assignedWorkerId &&
            c.status !== 'closed' &&
            c.status !== 'rejected' &&
            c.status !== 'cancelled'
          );
        }
        if (queueFilter === 'ACTIVE') {
          return (
            c.status === 'assigned' || c.status === 'accepted' || c.status === 'in_progress'
          );
        }
        if (queueFilter === 'AWAITING_CONFIRM') {
          return c.status === 'resolved_awaiting_confirmation';
        }
        if (queueFilter === 'REOPENED') {
          return c.status === 'reopened' || c.status === 'escalated';
        }
        return true;
      });
  }, [complaints, activeAccount, deptFilter, queueFilter]);

  const activeComplaint = useMemo(
    () =>
      filteredComplaints.find((c) => c.id === selectedId) ||
      filteredComplaints[0] ||
      null,
    [filteredComplaints, selectedId]
  );

  const workerMatchResult = useMemo(() => {
    if (!activeComplaint) return null;
    return recommendWorkersForComplaint({
      complaint: activeComplaint,
      workers,
      allComplaints: complaints,
    });
  }, [activeComplaint, workers, complaints]);

  const metrics = useMemo(() => {
    const scoped =
      deptFilter === 'ALL'
        ? complaints
        : complaints.filter((c) => c.assignedDepartmentId === deptFilter);
    return {
      unassigned: scoped.filter(
        (c) =>
          !c.assignedWorkerId &&
          c.status !== 'closed' &&
          c.status !== 'rejected' &&
          c.status !== 'cancelled'
      ).length,
      inProgress: scoped.filter(
        (c) => c.status === 'assigned' || c.status === 'accepted' || c.status === 'in_progress'
      ).length,
      awaitingConfirm: scoped.filter((c) => c.status === 'resolved_awaiting_confirmation')
        .length,
      reopenedOrEscalated: scoped.filter(
        (c) => c.status === 'reopened' || c.status === 'escalated'
      ).length,
    };
  }, [complaints, deptFilter]);

  if (!hasStaffAccess) {
    const demoAdmin = accounts.find((a) => a.role === 'dept_admin' || a.role === 'platform_admin');
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center dark:border-amber-900/60 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
          {tr(
            'Department Administration Access Required',
            'துறை நிர்வாக அனுமதி தேவை'
          )}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {tr(
            'You are currently viewing NEEDMAP AI as a Citizen or Field Worker. Only Department Admins and Platform Admins can route complaints, dispatch workers, or override official priorities.',
            'நீங்கள் தற்போது குடிமகன் அல்லது களப்பணியாளர் கணக்கில் உள்ளீர்கள். துறை நிர்வாகிகள் மட்டுமே பணியாளர்களை நியமிக்கவும் முன்னுரிமையை மாற்றவும் முடியும்.'
          )}
        </p>
        {demoAdmin && (
          <button
            type="button"
            onClick={() => onSwitchAccount(demoAdmin.id)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            <UserCheck className="h-4 w-4" />
            {tr(
              `Switch to Demo Dept. Admin (${demoAdmin.name})`,
              `மாதிரி துறை நிர்வாகி கணக்கிற்கு மாறுக (${demoAdmin.name})`
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <Building2 className="h-4 w-4" />
            <span>{tr('Department Triage & Dispatch Desk', 'துறை மேலாண்மை & பணி ஒதுக்கீடு')}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            {tr('Department Resolution Portal', 'துறை தீர்வு மற்றும் கண்காணிப்பு தளம்')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {tr(
              'Review incoming complaints, match qualified field workers by skill and workload, record priority overrides with audit reasons, and monitor resolution SLAs.',
              'உள்வரும் புகார்களைப் பரிசீலித்து, திறன் மற்றும் பணிச்சுமை அடிப்படையில் களப்பணியாளர்களை நியமித்து தீர்வுகளைக் கண்காணிக்கவும்.'
            )}
          </p>
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          aria-label={tr('Select department queue', 'துறையைத் தேர்ந்தெடுக்கவும்')}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="ALL">{tr('All Departments (Cross-View)', 'அனைத்து துறைகளும்')}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.shortCode} : {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            id: 'UNASSIGNED' as const,
            label: tr('Unassigned Queue', 'பணியாளர் ஒதுக்கப்படாதவை'),
            val: metrics.unassigned,
            tone: 'text-amber-700 dark:text-amber-400',
          },
          {
            id: 'ACTIVE' as const,
            label: tr('Active Field Work', 'நடப்பில் உள்ள களப்பணிகள்'),
            val: metrics.inProgress,
            tone: 'text-indigo-700 dark:text-indigo-400',
          },
          {
            id: 'AWAITING_CONFIRM' as const,
            label: tr('Awaiting Citizen Confirm', 'பயனர் உறுதிப்படுத்தல் நிலுவை'),
            val: metrics.awaitingConfirm,
            tone: 'text-teal-700 dark:text-teal-400',
          },
          {
            id: 'REOPENED' as const,
            label: tr('Reopened / Escalated', 'மீண்டும் திறக்கப்பட்டவை'),
            val: metrics.reopenedOrEscalated,
            tone: 'text-rose-700 dark:text-rose-400',
          },
        ].map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            onClick={() => setQueueFilter((prev) => (prev === kpi.id ? 'ALL' : kpi.id))}
            className={`rounded-xl border p-4 text-left transition-colors ${
              queueFilter === kpi.id
                ? 'border-slate-900 bg-white dark:border-teal-500 dark:bg-slate-900'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {kpi.label}
            </div>
            <div className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${kpi.tone}`}>
              {kpi.val}
            </div>
          </button>
        ))}
      </div>

      {feedbackBanner && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            feedbackBanner.type === 'success'
              ? 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
              : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
          }`}
        >
          {feedbackBanner.text}
        </div>
      )}

      {/* Master-Detail Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Queue List */}
        <div className="space-y-3 lg:col-span-5">
          {filteredComplaints.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              {tr('No complaints in this filtered queue.', 'இந்தப் பட்டியலில் புகார்கள் எதுவும் இல்லை.')}
            </div>
          ) : (
            filteredComplaints.map((c) => {
              const isSelected = activeComplaint?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.id);
                    setStatusDraft(c.status);
                    setSlaDateDraft(c.expectedResolutionDate || '');
                    setTransferDeptId(c.assignedDepartmentId);
                    setFeedbackBanner(null);
                  }}
                  className={`block w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-slate-900 bg-white dark:border-teal-500 dark:bg-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {c.id}
                    </span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      {tPriority(c.priorityTier)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-sm font-bold text-slate-900 dark:text-white">
                    {c.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{tCategory(c.category)}</span>
                    <span>·</span>
                    <span>{tStatus(c.status)}</span>
                    {!c.assignedWorkerId && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {tr('Unassigned', 'பணியாளர் இல்லை')}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Dispatch & Management Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          {!activeComplaint ? (
            <p className="py-10 text-center text-xs text-slate-500">
              {tr('Select a complaint to manage routing and worker assignment.', 'ஒரு புகாரைத் தேர்ந்தெடுக்கவும்.')}
            </p>
          ) : (
            <>
              <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-mono">
                  <span>
                    {activeComplaint.id} ·{' '}
                    {deptMap.get(activeComplaint.assignedDepartmentId)?.name}
                  </span>
                  <span>{tStatus(activeComplaint.status)}</span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-white">
                  {activeComplaint.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {activeComplaint.description}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <strong>{tr('Location:', 'இடம்:')}</strong> {activeComplaint.location.address}{' '}
                  | <strong>{tr('Routing rationale:', 'ஒதுக்கீட்டுக் காரணம்:')}</strong>{' '}
                  {activeComplaint.routingExplanation}
                </p>
              </div>

              {/* Section 1: Smart Worker Recommender & Assignment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-slate-900 dark:text-white">
                    <Users className="h-4 w-4 text-teal-600" />
                    {tr(
                      'Field Worker Matching (Skill, Zone & Workload)',
                      'களப்பணியாளர் பரிந்துரை (திறன், பகுதி & பணிச்சுமை)'
                    )}
                  </h3>
                </div>

                {workerMatchResult?.noMatchExplanation && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{workerMatchResult.noMatchExplanation}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {workerMatchResult?.recommendations.map((rec) => {
                    const isAssigned = activeComplaint.assignedWorkerId === rec.worker.id;
                    return (
                      <div
                        key={rec.worker.id}
                        className={`rounded-lg border p-3 text-xs ${
                          isAssigned
                            ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30'
                            : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {rec.worker.name}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                            {rec.matchScore}% match
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {rec.worker.roleTitle} · {rec.activeTaskCount}/
                          {rec.worker.maxConcurrentTasks} tasks ({rec.worker.availability})
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          {rec.reasons.join(' · ')}
                        </div>
                        <button
                          type="button"
                          disabled={isAssigned || rec.worker.availability === 'off_duty'}
                          onClick={() => {
                            const res = onAssignWorker({
                              complaintId: activeComplaint.id,
                              workerId: rec.worker.id,
                              rationale: rec.reasons.join('; '),
                            });
                            setFeedbackBanner({
                              type: res.ok ? 'success' : 'error',
                              text: res.ok
                                ? tr(
                                    `Assigned ${rec.worker.name} to ${activeComplaint.id}.`,
                                    `${rec.worker.name} இப்புகாருக்கு நியமிக்கப்பட்டார்.`
                                  )
                                : res.error || 'Assignment failed.',
                            });
                          }}
                          className="mt-2.5 w-full rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-45 dark:bg-teal-600 dark:hover:bg-teal-700"
                        >
                          {isAssigned
                            ? tr('Currently Assigned', 'நியமிக்கப்பட்டுள்ளார்')
                            : tr('Assign Worker', 'இப்பணியாளரை நியமி')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Status & SLA Update */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = onAdminStatusUpdate({
                    complaintId: activeComplaint.id,
                    nextStatus: statusDraft,
                    note: statusNote.trim() || `Status updated to ${statusDraft} by Department Desk.`,
                    expectedResolutionDate: slaDateDraft || undefined,
                  });
                  setFeedbackBanner({
                    type: res.ok ? 'success' : 'error',
                    text: res.ok
                      ? tr('Complaint status updated.', 'புகாரின் நிலை புதுப்பிக்கப்பட்டது.')
                      : res.error || 'Update failed.',
                  });
                  if (res.ok) setStatusNote('');
                }}
                className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  {tr('Update Official Status & Target SLA', 'நிலை மற்றும் இலக்கு தேதியைப் புதுப்பிக்க')}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as ComplaintStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="under_review">{tStatus('under_review')}</option>
                    <option value="assigned">{tStatus('assigned')}</option>
                    <option value="in_progress">{tStatus('in_progress')}</option>
                    <option value="more_info_required">{tStatus('more_info_required')}</option>
                    <option value="escalated">{tStatus('escalated')}</option>
                    <option value="resolved_awaiting_confirmation">
                      {tStatus('resolved_awaiting_confirmation')}
                    </option>
                    <option value="closed">{tStatus('closed')}</option>
                    <option value="rejected">{tStatus('rejected')}</option>
                  </select>

                  <input
                    type="date"
                    value={slaDateDraft}
                    onChange={(e) => setSlaDateDraft(e.target.value)}
                    aria-label={tr('Expected resolution date', 'எதிர்பார்க்கப்படும் தீர்வு தேதி')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder={tr(
                    'Enter official timeline note (mandatory when rejecting)...',
                    'காலவரிசைக் குறிப்பை உள்ளிடவும் (நிராகரிக்கும்போது காரணம் கட்டாயம்)...'
                  )}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {tr('Save Status Update', 'நிலையைச் சேமி')}
                </button>
              </form>

              {/* Section 3: Priority Override & Department Transfer */}
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = onOverrideComplaintPriority({
                      complaintId: activeComplaint.id,
                      tier: overrideTier,
                      reason: overrideReason,
                    });
                    setFeedbackBanner({
                      type: res.ok ? 'success' : 'error',
                      text: res.ok
                        ? tr('Official priority overridden with audit reason.', 'முன்னுரிமை காரணத்துடன் மாற்றப்பட்டது.')
                        : res.error || 'Override failed.',
                    });
                    if (res.ok) setOverrideReason('');
                  }}
                  className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                    {tr('Override Priority (Recorded)', 'முன்னுரிமை மாற்றம் (காரணம் அவசியம்)')}
                  </div>
                  <select
                    value={overrideTier}
                    onChange={(e) => setOverrideTier(e.target.value as PriorityTier)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="High">{tPriority('High')}</option>
                    <option value="Medium">{tPriority('Medium')}</option>
                    <option value="Low">{tPriority('Low')}</option>
                  </select>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder={tr('Audit reason (min 8 chars)...', 'மாற்றத்திற்கான காரணம்...')}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    {tr('Apply Priority Override', 'முன்னுரிமையை மாற்று')}
                  </button>
                </form>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!transferDeptId) return;
                    const res = onReassignDepartment({
                      complaintId: activeComplaint.id,
                      departmentId: transferDeptId,
                      rationale:
                        transferReason.trim() || 'Re-routed by Department Desk after scope review.',
                    });
                    setFeedbackBanner({
                      type: res.ok ? 'success' : 'error',
                      text: res.ok
                        ? tr('Complaint re-routed to selected department.', 'புகார் புதிய துறைக்கு மாற்றப்பட்டது.')
                        : res.error || 'Transfer failed.',
                    });
                    if (res.ok) setTransferReason('');
                  }}
                  className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {tr('Re-Route to Another Department', 'வேறு துறைக்கு மாற்றுக')}
                  </div>
                  <select
                    value={transferDeptId || activeComplaint.assignedDepartmentId}
                    onChange={(e) => setTransferDeptId(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.shortCode} : {d.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder={tr('Reason for transfer...', 'மாற்றத்திற்கான காரணம்...')}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {tr('Transfer Department', 'துறையை மாற்று')}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
