import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  HardHat,
  HelpCircle,
  MapPin,
  MessageSquare,
  Search,
  Shield,
  ShieldAlert,
  Sliders,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
  UserCheck,
  X,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import { isStaffRole, sanitizeComplaintForViewer } from '../../services/accessControl';
import type {
  ComplaintAttachment,
  ComplaintCategory,
  ComplaintRecord,
  ComplaintStatus,
  Department,
  PriorityTier,
  UserAccount,
  WorkerProfile,
} from '../../types/needmap';
import { PriorityMatrixLegend } from '../Common/PriorityMatrixLegend';

interface CentralComplaintsPortalViewProps {
  activeAccount: UserAccount;
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
  onOpenReportProblem: () => void;
  onOpenDemoLogin: () => void;
}

export const CentralComplaintsPortalView: React.FC<CentralComplaintsPortalViewProps> = ({
  activeAccount,
  complaints,
  departments,
  workers,
  onAssignWorker,
  onReassignDepartment,
  onAdminStatusUpdate,
  onOverrideComplaintPriority,
  onOpenReportProblem,
  onOpenDemoLogin,
}) => {
  const { t, tr, tCategory, tStatus, tPriority, tRole } = useI18n();
  const isAuthorized = isStaffRole(activeAccount.role);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplaintStatus>('ALL');
  const [deptFilter, setDeptFilter] = useState<'ALL' | string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | PriorityTier>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'priority_high'>('date_desc');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(
    complaints[0]?.id || null
  );
  const [showLegend, setShowLegend] = useState(false);

  // Inspector Action States
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form drafts
  const [statusDraft, setStatusDraft] = useState<ComplaintStatus>('under_review');
  const [statusNote, setStatusNote] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [targetWorkerId, setTargetWorkerId] = useState('');
  const [overrideTier, setOverrideTier] = useState<PriorityTier>('High');
  const [overrideReason, setOverrideReason] = useState('');

  const deptMap = useMemo(() => {
    const m = new Map<string, Department>();
    departments.forEach((d) => m.set(d.id, d));
    return m;
  }, [departments]);

  const workerMap = useMemo(() => {
    const m = new Map<string, WorkerProfile>();
    workers.forEach((w) => m.set(w.id, w));
    return m;
  }, [workers]);

  // Overall KPI counts across this single source of truth
  const stats = useMemo(() => {
    const total = complaints.length;
    const unassigned = complaints.filter(
      (c) =>
        !c.assignedWorkerId &&
        c.status !== 'closed' &&
        c.status !== 'rejected' &&
        c.status !== 'cancelled'
    ).length;
    const active = complaints.filter(
      (c) => c.status === 'assigned' || c.status === 'accepted' || c.status === 'in_progress'
    ).length;
    const awaitingConfirm = complaints.filter(
      (c) => c.status === 'resolved_awaiting_confirmation'
    ).length;
    const closed = complaints.filter((c) => c.status === 'closed').length;
    const reopened = complaints.filter(
      (c) => c.status === 'reopened' || c.status === 'escalated'
    ).length;

    return { total, unassigned, active, awaitingConfirm, closed, reopened };
  }, [complaints]);

  // Filter and sort complaints
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sanitized = complaints.map((c) => sanitizeComplaintForViewer(activeAccount, c));

    return sanitized
      .filter((c) => {
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        if (deptFilter !== 'ALL' && c.assignedDepartmentId !== deptFilter) return false;
        const currentTier = c.priorityOverride?.tier || (c.urgency === 'Critical' || c.urgency === 'High' ? 'High' : c.urgency === 'Medium' ? 'Medium' : 'Low');
        if (priorityFilter !== 'ALL' && currentTier !== priorityFilter) return false;

        if (q) {
          const matchId = c.id.toLowerCase().includes(q);
          const matchTitle = c.title.toLowerCase().includes(q);
          const matchDesc = c.description.toLowerCase().includes(q);
          const matchLoc = c.location.address.toLowerCase().includes(q);
          const workerName = c.assignedWorkerId ? workerMap.get(c.assignedWorkerId)?.name.toLowerCase() || '' : '';
          const matchWorker = workerName.includes(q);
          return matchId || matchTitle || matchDesc || matchLoc || matchWorker;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        // Priority high to low
        const scoreA = a.priorityOverride?.tier === 'High' || a.urgency === 'Critical' ? 3 : a.urgency === 'High' ? 2 : 1;
        const scoreB = b.priorityOverride?.tier === 'High' || b.urgency === 'Critical' ? 3 : b.urgency === 'High' ? 2 : 1;
        return scoreB - scoreA;
      });
  }, [complaints, activeAccount, search, statusFilter, deptFilter, priorityFilter, sortBy, workerMap]);

  const activeComplaint = useMemo(
    () => filteredList.find((c) => c.id === selectedComplaintId) || filteredList[0] || null,
    [filteredList, selectedComplaintId]
  );

  const getPriorityBadge = (c: ComplaintRecord) => {
    const tier = c.priorityOverride?.tier || (c.urgency === 'Critical' || c.urgency === 'High' ? 'High' : c.urgency === 'Medium' ? 'Medium' : 'Low');
    if (tier === 'High') {
      return (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
          {tPriority('High')}
          {c.priorityOverride && <span className="font-mono text-[9px]">({tr('OVERRIDE', 'மாற்றம்')})</span>}
        </span>
      );
    }
    if (tier === 'Medium') {
      return (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {tPriority('Medium')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        {tPriority('Low')}
      </span>
    );
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    let style = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (status === 'closed') {
      style = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    } else if (status === 'resolved_awaiting_confirmation') {
      style = 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
    } else if (status === 'in_progress' || status === 'assigned' || status === 'accepted') {
      style = 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
    } else if (status === 'reopened' || status === 'escalated') {
      style = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    } else if (status === 'rejected' || status === 'cancelled') {
      style = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    }
    return (
      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${style}`}>
        {tStatus(status)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white font-bold">
              <Shield className="h-4 w-4" />
            </span>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {t('registry.title')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {t('registry.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLegend((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <HelpCircle className="h-3.5 w-3.5 text-teal-600" />
            <span>{t('legend.title')}</span>
          </button>
          <button
            type="button"
            onClick={onOpenReportProblem}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
          >
            <span>{t('topbar.reportBtn')}</span>
          </button>
        </div>
      </div>

      {/* Access Guard Notice if not staff */}
      {!isAuthorized && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <span className="font-semibold">{tr('View-Only Mode: ', 'பார்வையாளர் பயன்முறை: ')}</span>
              {tr(
                'You are currently logged in with a Citizen or Worker profile. Central administrative actions (reassigning departments, overriding priorities) require Central Admin or Department Admin role.',
                'நீங்கள் குடிமகன் அல்லது களப்பணியாளர் கணக்கில் உள்ளீர்கள். துறை மாற்றங்கள் மற்றும் முன்னுரிமை மாற்றங்களைச் செய்ய நிர்வாகி கணக்கிற்கு மாறவும்.'
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDemoLogin}
            className="shrink-0 rounded-lg bg-indigo-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-800"
          >
            {tr('Switch to Admin Role', 'நிர்வாகியாக மாறுக')}
          </button>
        </div>
      )}

      {/* Priority Matrix Legend Drawer */}
      {showLegend && <PriorityMatrixLegend compact={false} />}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('registry.totalComplaints')}
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.total}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
            {t('registry.unassigned')}
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
            {stats.unassigned}
          </div>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="text-[11px] font-medium text-indigo-800 dark:text-indigo-300">
            {t('registry.inProgress')}
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
            {stats.active}
          </div>
        </div>

        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 dark:border-teal-900/40 dark:bg-teal-950/20">
          <div className="text-[11px] font-medium text-teal-800 dark:text-teal-300">
            {t('registry.awaitingConfirm')}
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-teal-700 dark:text-teal-400 tabular-nums">
            {stats.awaitingConfirm}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
            {t('registry.closed')}
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {stats.closed}
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="text-[11px] font-medium text-rose-800 dark:text-rose-300">
            {t('registry.reopened')}
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-rose-700 dark:text-rose-400 tabular-nums">
            {stats.reopened}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('registry.searchPlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Filter by department"
          >
            <option value="ALL">{t('registry.filterDepartment')}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ComplaintStatus)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Filter by status"
          >
            <option value="ALL">{t('registry.filterStatus')}</option>
            <option value="submitted">{tStatus('submitted')}</option>
            <option value="under_review">{tStatus('under_review')}</option>
            <option value="assigned">{tStatus('assigned')}</option>
            <option value="in_progress">{tStatus('in_progress')}</option>
            <option value="resolved_awaiting_confirmation">
              {tStatus('resolved_awaiting_confirmation')}
            </option>
            <option value="closed">{tStatus('closed')}</option>
            <option value="reopened">{tStatus('reopened')}</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | PriorityTier)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Filter by priority"
          >
            <option value="ALL">{t('registry.filterPriority')}</option>
            <option value="High">{tPriority('High')}</option>
            <option value="Medium">{tPriority('Medium')}</option>
            <option value="Low">{tPriority('Low')}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Sort by"
          >
            <option value="date_desc">{tr('Newest First', 'புதியவை முதலில்')}</option>
            <option value="date_asc">{tr('Oldest First', 'பழையவை முதலில்')}</option>
            <option value="priority_high">{tr('Highest Priority First', 'அதிக முன்னுரிமை முதலில்')}</option>
          </select>
        </div>
      </div>

      {/* Main Two-Column Layout: Table on Left + Inspector on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Complaint Table */}
        <div className="lg:col-span-7 xl:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between dark:border-slate-800 dark:bg-slate-800/40">
            <span className="font-display text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
              {tr('Complaints Master Registry', 'முழுப் புகார் பதிவேடு')} ({filteredList.length})
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {filteredList.length} / {complaints.length}
            </span>
          </div>

          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
              {tr('No complaints match your search or filter parameters.', 'பொருத்தமான புகார்கள் எதுவும் இல்லை.')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto dark:divide-slate-800">
              {filteredList.map((c) => {
                const isSelected = c.id === activeComplaint?.id;
                const dept = deptMap.get(c.assignedDepartmentId);
                const worker = c.assignedWorkerId ? workerMap.get(c.assignedWorkerId) : null;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedComplaintId(c.id);
                      setActionSuccess(null);
                      setActionError(null);
                    }}
                    className={`flex w-full items-start justify-between p-4 text-left transition-colors ${
                      isSelected
                        ? 'bg-teal-50/60 dark:bg-teal-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-800 dark:text-teal-400">
                          {c.id}
                        </span>
                        {getPriorityBadge(c)}
                        {getStatusBadge(c.status)}
                      </div>

                      <h3 className="font-display text-sm font-semibold text-slate-900 truncate dark:text-white">
                        {c.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[160px]">{dept?.name || tr('Unassigned Dept', 'துறை ஒதுக்கப்படவில்லை')}</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <HardHat className="h-3 w-3 text-slate-400" />
                          <span>{worker ? worker.name : tr('No Worker Assigned', 'பணியாளர் நியமிக்கப்படவில்லை')}</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{c.location.address}</span>
                        </span>
                      </div>

                      {c.satisfaction && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 pt-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{tr('Citizen Rated: ', 'குடிமக்கள் மதிப்பீடு: ')}</span>
                          <span className="font-bold">{c.satisfaction.rating}/5 ★</span>
                          <span className="text-slate-500 dark:text-slate-400 italic truncate max-w-[180px]">
                            : "{c.satisfaction.comment}"
                          </span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 mt-2" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Complaint Inspector & Admin Controls */}
        <div className="lg:col-span-5 xl:col-span-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          {activeComplaint ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-400">
                    {activeComplaint.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(activeComplaint)}
                    {getStatusBadge(activeComplaint.status)}
                  </div>
                </div>
                <h2 className="mt-2 font-display text-base font-bold text-slate-900 dark:text-white">
                  {activeComplaint.title}
                </h2>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {tCategory(activeComplaint.category)} · {new Date(activeComplaint.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Action feedback */}
              {actionSuccess && (
                <div className="rounded-lg bg-teal-50 p-2.5 text-xs text-teal-900 dark:bg-teal-950/40 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                  {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                  {actionError}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tr('Description & Context', 'விவரம்')}
                </label>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                  {activeComplaint.description}
                </p>
              </div>

              {/* Assignment & Location Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('common.assignedDept')}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                    {deptMap.get(activeComplaint.assignedDepartmentId)?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('common.assignedWorker')}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                    {activeComplaint.assignedWorkerId ? workerMap.get(activeComplaint.assignedWorkerId)?.name || 'Unassigned' : 'None dispatched'}
                  </span>
                </div>
              </div>

              {/* Attachments / Photos */}
              {activeComplaint.attachments && activeComplaint.attachments.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tr('Evidence Attachments', 'இணைக்கப்பட்ட ஆவணங்கள்')} ({activeComplaint.attachments.length})
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {activeComplaint.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <FileText className="h-3.5 w-3.5 text-teal-600" />
                        <span className="truncate max-w-[130px]">{att.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Citizen Satisfaction Feedback */}
              {activeComplaint.satisfaction && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-200">
                    <span>{t('registry.satisfactionRating')}</span>
                    <span className="text-amber-500 font-bold">{activeComplaint.satisfaction.rating}/5 ★</span>
                  </div>
                  <p className="mt-1 text-emerald-800 dark:text-emerald-300 italic">
                    "{activeComplaint.satisfaction.comment || tr('Citizen marked issue resolved.', 'பிரச்சினை தீர்க்கப்பட்டது என குடிமகன் உறுதிசெய்துள்ளார்.')}"
                  </p>
                  <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {new Date(activeComplaint.satisfaction.submittedAt).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('common.timeline')} ({activeComplaint.timeline.length})
                </label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-1">
                  {activeComplaint.timeline.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border-l-2 border-teal-600 bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{ev.actorName} ({tRole(ev.actorRole)})</span>
                        <span className="font-mono">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="mt-0.5 text-xs">{ev.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Administrative Oversight Controls (If Authorized) */}
              {isAuthorized ? (
                <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <h4 className="font-display text-xs font-bold text-slate-800 uppercase tracking-wide dark:text-slate-200">
                    {tr('Central Administrative Actions', 'மைய நிர்வாகக் கட்டுப்பாடுகள்')}
                  </h4>

                  {/* Reassign Department */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {t('registry.reassignDept')}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={targetDeptId}
                        onChange={(e) => setTargetDeptId(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">{tr('Select Department...', 'துறையைத் தேர்வு செய்க...')}</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!targetDeptId}
                        onClick={() => {
                          if (!targetDeptId) return;
                          const res = onReassignDepartment({
                            complaintId: activeComplaint.id,
                            departmentId: targetDeptId,
                            rationale: 'Reassigned from Central Complaints Registry.',
                          });
                          if (res.ok) {
                            setActionSuccess(tr('Department reassigned successfully.', 'துறை மாற்றப்பட்டது.'));
                            setTargetDeptId('');
                          } else {
                            setActionError(res.error || 'Failed to reassign department.');
                          }
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </div>

                  {/* Dispatch Demo Worker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {t('registry.dispatchWorker')}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={targetWorkerId}
                        onChange={(e) => setTargetWorkerId(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">{tr('Select Demo Worker...', 'பணியாளரைத் தேர்வு செய்க...')}</option>
                        {workers
                          .filter((w) => w.availability !== 'off_duty')
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.roleTitle})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!targetWorkerId}
                        onClick={() => {
                          if (!targetWorkerId) return;
                          const res = onAssignWorker({
                            complaintId: activeComplaint.id,
                            workerId: targetWorkerId,
                            rationale: 'Dispatched via Central Registry oversight.',
                          });
                          if (res.ok) {
                            setActionSuccess(tr('Worker dispatched successfully.', 'பணியாளர் நியமிக்கப்பட்டார்.'));
                            setTargetWorkerId('');
                          } else {
                            setActionError(res.error || 'Failed to assign worker.');
                          }
                        }}
                        className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-teal-800"
                      >
                        {tr('Dispatch', 'நியமிக்க')}
                      </button>
                    </div>
                  </div>

                  {/* Priority Override with Reason */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {t('registry.overridePriority')}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={overrideTier}
                        onChange={(e) => setOverrideTier(e.target.value as PriorityTier)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="High">{tPriority('High')}</option>
                        <option value="Medium">{tPriority('Medium')}</option>
                        <option value="Low">{tPriority('Low')}</option>
                      </select>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder={tr('Mandatory reason for audit...', 'காரணத்தைக் குறிப்பிடுக...')}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={!overrideReason.trim()}
                        onClick={() => {
                          if (!overrideReason.trim()) return;
                          const res = onOverrideComplaintPriority({
                            complaintId: activeComplaint.id,
                            tier: overrideTier,
                            reason: overrideReason,
                          });
                          if (res.ok) {
                            setActionSuccess(tr('Priority overridden and logged.', 'முன்னுரிமை மாற்றப்பட்டது.'));
                            setOverrideReason('');
                          } else {
                            setActionError(res.error || 'Failed to override priority.');
                          }
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                      >
                        {tr('Override', 'மாற்றுக')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              {tr('Select a complaint from the registry to inspect full details.', 'விவரங்களைப் பார்க்க புகாரைத் தேர்வு செய்யவும்.')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
