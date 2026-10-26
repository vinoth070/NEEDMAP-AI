import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  MapPin,
  Megaphone,
  MessageSquarePlus,
  RotateCcw,
  Search,
  Star,
  ThumbsDown,
  ThumbsUp,
  Upload,
  XCircle,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import { sanitizeComplaintForViewer } from '../../services/accessControl';
import type {
  ComplaintAttachment,
  ComplaintRecord,
  ComplaintStatus,
  Department,
  UserAccount,
  WorkerProfile,
} from '../../types/needmap';
import { formatBytes, validateAndProcessUpload } from '../../utils/fileUpload';
import { ConfirmDialog } from '../Common/ConfirmDialog';

interface MyComplaintsViewProps {
  activeAccount: UserAccount;
  complaints: ComplaintRecord[];
  departments: Department[];
  workers: WorkerProfile[];
  focusedComplaintId: string | null;
  onSelectComplaint: (id: string | null) => void;
  onAddFollowUp: (params: {
    complaintId: string;
    note: string;
    attachments: ComplaintAttachment[];
  }) => { ok: boolean; error?: string };
  onCitizenStatusAction: (params: {
    complaintId: string;
    nextStatus: 'cancelled' | 'closed' | 'reopened';
    note: string;
    rating?: 1 | 2 | 3 | 4 | 5;
  }) => { ok: boolean; error?: string };
  onOpenReportProblem: () => void;
}

function getStatusBadgeStyle(status: ComplaintStatus): string {
  switch (status) {
    case 'closed':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    case 'resolved_awaiting_confirmation':
      return 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
    case 'in_progress':
    case 'accepted':
    case 'assigned':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
    case 'reopened':
    case 'escalated':
    case 'more_info_required':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
    case 'rejected':
    case 'cancelled':
      return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

export const MyComplaintsView: React.FC<MyComplaintsViewProps> = ({
  activeAccount,
  complaints,
  departments,
  workers,
  focusedComplaintId,
  onSelectComplaint,
  onAddFollowUp,
  onCitizenStatusAction,
  onOpenReportProblem,
}) => {
  const { tr, tCategory, tStatus, tPriority } = useI18n();

  const [scopeTab, setScopeTab] = useState<'mine' | 'community'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplaintStatus>('ALL');

  // Follow-up state
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpAttachments, setFollowUpAttachments] = useState<ComplaintAttachment[]>([]);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Satisfaction / Reopen state
  const [satisfactionMode, setSatisfactionMode] = useState<'satisfied' | 'reopen' | null>(null);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

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

  // Sanitize all records through trusted access control before rendering
  const visibleComplaints = useMemo(() => {
    const sanitized = complaints.map((c) => sanitizeComplaintForViewer(activeAccount, c));
    return sanitized.filter((c) => {
      if (scopeTab === 'mine' && c.reporterAccountId !== activeAccount.id) {
        return false;
      }
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hit =
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.location.address.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [complaints, activeAccount, scopeTab, statusFilter, searchQuery]);

  const selectedComplaint = useMemo(() => {
    if (focusedComplaintId) {
      const exact = complaints.find((c) => c.id === focusedComplaintId);
      if (exact) return sanitizeComplaintForViewer(activeAccount, exact);
    }
    return visibleComplaints[0] || null;
  }, [focusedComplaintId, complaints, activeAccount, visibleComplaints]);

  const isSelectedOwner =
    Boolean(selectedComplaint) && selectedComplaint?.reporterAccountId === activeAccount.id;

  const canCancelSelected =
    isSelectedOwner &&
    selectedComplaint &&
    (selectedComplaint.status === 'submitted' ||
      selectedComplaint.status === 'under_review' ||
      selectedComplaint.status === 'more_info_required');

  const handleUploadFollowUpFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setActionMessage(null);
    const next = [...followUpAttachments];
    for (let i = 0; i < files.length; i++) {
      const res = await validateAndProcessUpload({
        file: files[i],
        actorRole: activeAccount.role,
        actorName: selectedComplaint?.isAnonymous ? 'Anonymous Citizen' : activeAccount.name,
        stage: 'followup',
        visibility: 'reporter_and_staff',
      });
      if (!res.ok || !res.attachment) {
        setActionMessage({ type: 'error', text: res.error || 'Upload failed.' });
        return;
      }
      next.push(res.attachment);
    }
    setFollowUpAttachments(next);
  };

  const handleSubmitFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (followUpNote.trim().length < 4 && followUpAttachments.length === 0) {
      setActionMessage({
        type: 'error',
        text: tr(
          'Enter an update note or attach a supporting photo/PDF.',
          'கூடுதல் குறிப்பை உள்ளிடவும் அல்லது புகைப்படம்/PDF இணைக்கவும்.'
        ),
      });
      return;
    }

    const res = onAddFollowUp({
      complaintId: selectedComplaint.id,
      note: followUpNote.trim() || 'Added supporting attachment.',
      attachments: followUpAttachments,
    });

    if (!res.ok) {
      setActionMessage({ type: 'error', text: res.error || 'Could not add update.' });
      return;
    }

    setFollowUpNote('');
    setFollowUpAttachments([]);
    setActionMessage({
      type: 'success',
      text: tr(
        'Follow-up information added to the complaint timeline.',
        'கூடுதல் விவரம் புகார் காலவரிசையில் சேர்க்கப்பட்டது.'
      ),
    });
  };

  const handleSatisfactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !satisfactionMode) return;

    const nextStatus = satisfactionMode === 'satisfied' ? 'closed' : 'reopened';
    const res = onCitizenStatusAction({
      complaintId: selectedComplaint.id,
      nextStatus,
      note:
        feedbackComment.trim() ||
        (satisfactionMode === 'satisfied'
          ? 'Citizen confirmed resolution is satisfactory.'
          : ''),
      rating: satisfactionMode === 'satisfied' ? rating : 1,
    });

    if (!res.ok) {
      setActionMessage({ type: 'error', text: res.error || 'Action not permitted.' });
      return;
    }

    setSatisfactionMode(null);
    setFeedbackComment('');
    setActionMessage({
      type: 'success',
      text:
        nextStatus === 'closed'
          ? tr(
              'Thank you! Complaint confirmed resolved and marked Closed.',
              'நன்றி! தீர்வு உறுதிசெய்யப்பட்டு புகார் மூடப்பட்டது.'
            )
          : tr(
              'Complaint Reopened and sent back to the Department Desk for priority review.',
              'புகார் மீண்டும் திறக்கப்பட்டு துறை பரிசீலனைக்கு அனுப்பப்பட்டது.'
            ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {tr('My Complaints & Service Tracking', 'எனது புகார்கள் & நிலை கண்காணிப்பு')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {tr(
              'Track chronological status updates, see assigned departments, add follow-up evidence, and confirm whether fixes meet your satisfaction.',
              'புகாரின் நிலை, ஒதுக்கப்பட்ட துறை, காலவரிசை ஆகியவற்றைக் கண்காணித்து தீர்வுக்குப் பின் உங்கள் திருப்தியைப் பதிவு செய்யுங்கள்.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenReportProblem}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
        >
          <Megaphone className="h-4 w-4" />
          {tr('Report New Problem', 'புதிய புகார் அளிக்க')}
        </button>
      </div>

      {/* Scope Tabs + Search + Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setScopeTab('mine')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                scopeTab === 'mine'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tr('My Submitted Complaints', 'நான் அளித்த புகார்கள்')} (
              {complaints.filter((c) => c.reporterAccountId === activeAccount.id).length})
            </button>
            <button
              type="button"
              onClick={() => setScopeTab('community')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                scopeTab === 'community'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tr('All Public Community Reports', 'அனைத்து பொதுப் புகார்கள்')} ({complaints.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr('Search ID, title, address...', 'எண், தலைப்பு, முகவரி தேடுக...')}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ComplaintStatus)}
              aria-label={tr('Filter by status', 'நிலை வாரியாக வடிகட்டு')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">{tr('All Statuses', 'அனைத்து நிலைகளும்')}</option>
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
          </div>
        </div>
      </div>

      {visibleComplaints.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
            {tr('No complaints found in this view', 'இந்தப் பிரிவில் புகார்கள் எதுவும் இல்லை')}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(
              'Submit a new problem report or switch to "All Public Community Reports" to inspect active campus issues.',
              'புதிய புகாரைப் பதிவு செய்யவும் அல்லது "அனைத்து பொதுப் புகார்கள்" பகுதியைத் தேர்ந்தெடுக்கவும்.'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Rail: Complaint Cards */}
          <div className="space-y-3 lg:col-span-5">
            {visibleComplaints.map((item) => {
              const isSelected = selectedComplaint?.id === item.id;
              const dept = deptMap.get(item.assignedDepartmentId);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectComplaint(item.id);
                    setActionMessage(null);
                    setSatisfactionMode(null);
                  }}
                  className={`block w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-slate-900 bg-white shadow-xs dark:border-teal-500 dark:bg-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                      {item.id}
                      {item.isDemo ? ` · [${tr('Sample Demo', 'மாதிரி')}]` : ''}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeStyle(
                        item.status
                      )}`}
                    >
                      {tStatus(item.status)}
                    </span>
                  </div>

                  <h3 className="mt-2 font-display text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{tCategory(item.category)}</span>
                    <span>·</span>
                    <span>{dept?.shortCode || item.assignedDepartmentId}</span>
                    {item.expectedResolutionDate && (
                      <>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {tr('Target:', 'இலக்கு:')} {item.expectedResolutionDate}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Detail & Timeline Inspector */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            {selectedComplaint && (
              <>
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {selectedComplaint.id} · {tCategory(selectedComplaint.category)} ·{' '}
                      {tPriority(selectedComplaint.priorityTier)}
                    </div>
                    <span
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeStyle(
                        selectedComplaint.status
                      )}`}
                    >
                      {tStatus(selectedComplaint.status)}
                    </span>
                  </div>

                  <h2 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
                    {selectedComplaint.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {selectedComplaint.description}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-lg bg-slate-50 p-3.5 text-xs dark:bg-slate-800/60">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {tr('Assigned Department', 'ஒதுக்கப்பட்ட துறை')}
                      </div>
                      <div className="mt-0.5 text-slate-700 dark:text-slate-300">
                        {deptMap.get(selectedComplaint.assignedDepartmentId)?.name ||
                          selectedComplaint.assignedDepartmentId}
                      </div>
                      {selectedComplaint.assignedWorkerId && (
                        <div className="mt-1 text-teal-700 dark:text-teal-400 font-medium">
                          {tr('Field Specialist: ', 'களப்பணியாளர்: ')}
                          {workerMap.get(selectedComplaint.assignedWorkerId)?.name ||
                            selectedComplaint.assignedWorkerId}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        <MapPin className="h-3.5 w-3.5 text-teal-600" />
                        {tr('Location', 'இருப்பிடம்')}
                      </div>
                      <div className="mt-0.5 text-slate-700 dark:text-slate-300">
                        {selectedComplaint.location.address}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {selectedComplaint.location.hasCoordinates
                          ? `${selectedComplaint.location.lat}, ${selectedComplaint.location.lng}`
                          : tr('Address-only record', 'முகவரி மட்டும்')}
                      </div>
                    </div>
                  </div>

                  {/* Private Contact Box (Visible ONLY when authorized by sanitizeComplaintForViewer) */}
                  {selectedComplaint.privateContactEmail && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Lock className="h-3.5 w-3.5 text-indigo-600" />
                      <span>
                        {tr('Private Reporter Contact:', 'தனிப்பட்ட தொடர்பு:')} {selectedComplaint.privateContactName} (
                        {selectedComplaint.privateContactEmail})
                      </span>
                    </div>
                  )}
                </div>

                {actionMessage && (
                  <div
                    className={`rounded-lg border p-3 text-xs font-medium ${
                      actionMessage.type === 'success'
                        ? 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
                        : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                    }`}
                  >
                    {actionMessage.text}
                  </div>
                )}

                {/* CITIZEN SATISFACTION & REOPEN WORKFLOW */}
                {isSelectedOwner &&
                  selectedComplaint.status === 'resolved_awaiting_confirmation' && (
                    <section className="rounded-xl border-2 border-teal-500/70 bg-teal-50/70 p-5 space-y-4 dark:border-teal-500/60 dark:bg-teal-950/30">
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                          {tr(
                            'Resolution Verification : Are You Satisfied?',
                            'தீர்வு சரிபார்ப்பு : இந்தத் தீர்வு உங்களுக்குத் திருப்தி அளிக்கிறதா?'
                          )}
                        </h3>
                        {selectedComplaint.resolutionNotes && (
                          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">
                              {tr('Worker Resolution Note: ', 'பணியாளர் குறிப்பு: ')}
                            </span>
                            {selectedComplaint.resolutionNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setSatisfactionMode('satisfied')}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                            satisfactionMode === 'satisfied'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 dark:border-emerald-700'
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          {tr('Yes, Problem Is Fixed (Close)', 'ஆம், சரியாகிவிட்டது (மூடுக)')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSatisfactionMode('reopen')}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                            satisfactionMode === 'reopen'
                              ? 'bg-amber-600 text-white'
                              : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-50 dark:bg-slate-900 dark:text-amber-300 dark:border-amber-700'
                          }`}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          {tr('No, Still Unresolved (Reopen)', 'இல்லை, இன்னும் தீரவில்லை (மீண்டும் திற)')}
                        </button>
                      </div>

                      {satisfactionMode && (
                        <form onSubmit={handleSatisfactionSubmit} className="space-y-3 pt-2">
                          {satisfactionMode === 'satisfied' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {tr('Service Rating:', 'மதிப்பீடு:')}
                              </span>
                              {([1, 2, 3, 4, 5] as const).map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRating(star)}
                                  className="p-0.5"
                                  aria-label={`${star} stars`}
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      star <= rating
                                        ? 'fill-amber-400 text-amber-500'
                                        : 'text-slate-300 dark:text-slate-600'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          )}

                          <textarea
                            rows={2}
                            required={satisfactionMode === 'reopen'}
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder={
                              satisfactionMode === 'satisfied'
                                ? tr(
                                    'Optional feedback note for the field team...',
                                    'களக் குழுவிற்கான விருப்பக் குறிப்பு...'
                                  )
                                : tr(
                                    'Explain what is still broken or incomplete so the department can fix it (required)...',
                                    'இன்னும் என்ன சரிசெய்யப்பட வேண்டும் என்பதைக் குறிப்பிடவும் (கட்டாயம்)...'
                                  )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />

                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {satisfactionMode === 'satisfied'
                              ? tr('Confirm & Close Complaint', 'உறுதிசெய்து புகாரை மூடுக')
                              : tr('Submit & Reopen Complaint', 'மீண்டும் திறந்து துறைக்கு அனுப்பு')}
                          </button>
                        </form>
                      )}
                    </section>
                  )}

                {/* Attachments Gallery */}
                {selectedComplaint.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {tr('Uploaded Photos & Documents', 'இணைக்கப்பட்ட ஆவணங்கள்')} (
                      {selectedComplaint.attachments.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {selectedComplaint.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.dataUrl}
                          download={att.name}
                          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                        >
                          {att.mimeType.startsWith('image/') ? (
                            <img
                              src={att.dataUrl}
                              alt={att.name}
                              className="h-12 w-12 rounded object-cover shrink-0"
                            />
                          ) : (
                            <FileText className="h-8 w-8 text-indigo-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900 dark:text-white">
                              {att.name}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {formatBytes(att.sizeBytes)} · {att.stage}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronological Status Timeline */}
                <div>
                  <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-slate-900 dark:text-white">
                    <Clock className="h-4 w-4 text-teal-600" />
                    {tr('Chronological Status Timeline', 'காலவரிசை நிலை வரலாறு')}
                  </h3>
                  <ol className="mt-3 relative border-l-2 border-slate-200 ml-2 space-y-4 pl-5 dark:border-slate-700">
                    {selectedComplaint.timeline.map((ev) => (
                      <li key={ev.id} className="relative">
                        <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-white bg-teal-600 dark:border-slate-900" />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {tStatus(ev.status)} : {ev.actorName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {ev.note}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Owner Follow-Up Form & Cancel Option */}
                {isSelectedOwner &&
                  selectedComplaint.status !== 'closed' &&
                  selectedComplaint.status !== 'cancelled' && (
                    <form
                      onSubmit={handleSubmitFollowUp}
                      className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {tr(
                            'Add Follow-Up Information or Extra Photo',
                            'கூடுதல் தகவல் அல்லது புகைப்படம் சேர்க்க'
                          )}
                        </label>
                        {canCancelSelected && (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(selectedComplaint.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {tr('Cancel Request', 'புகாரை ரத்து செய்')}
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        placeholder={tr(
                          'Share updated room details, landmark directions, or status updates...',
                          'கூடுதல் அறை எண், வழித்தடம் அல்லது நிலைத் தகவலைப் பகிரவும்...'
                        )}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <input
                            id="followup-upload-input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => void handleUploadFollowUpFile(e.target.files)}
                            className="sr-only"
                          />
                          <label
                            htmlFor="followup-upload-input"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {tr('Attach Evidence', 'ஆதாரம் இணைக்க')}
                            {followUpAttachments.length > 0 && ` (${followUpAttachments.length})`}
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                          {tr('Post Follow-Up', 'குறிப்பைச் சேர்')}
                        </button>
                      </div>
                    </form>
                  )}

                {/* Reopen Closed Complaint Option for Owner */}
                {isSelectedOwner && selectedComplaint.status === 'closed' && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                    <span className="text-slate-600 dark:text-slate-300">
                      {tr(
                        'Did this issue recur after closure? You can reopen it with a note.',
                        'மூடப்பட்ட பின் மீண்டும் இதே பிரச்சினை ஏற்பட்டதா? குறிப்புடன் மீண்டும் திறக்கலாம்.'
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSatisfactionMode('reopen')}
                      className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline dark:text-amber-400"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {tr('Reopen Issue', 'மீண்டும் திற')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmCancelId)}
        title={tr('Cancel Service Request?', 'புகாரை ரத்து செய்யவா?')}
        description={tr(
          'This complaint has not entered active field repair yet. Cancelling marks it Cancelled in your timeline.',
          'இப்புகார் இன்னும் களப்பணிக்குச் செல்லவில்லை. ரத்து செய்தால் இது காலவரிசையில் ரத்து செய்யப்பட்டதாகக் குறிக்கப்படும்.'
        )}
        confirmLabel={tr('Yes, Cancel Request', 'ஆம், ரத்து செய்')}
        onCancel={() => setConfirmCancelId(null)}
        onConfirm={() => {
          if (!confirmCancelId) return;
          const res = onCitizenStatusAction({
            complaintId: confirmCancelId,
            nextStatus: 'cancelled',
            note: 'Cancelled by the reporting citizen prior to dispatch.',
          });
          setConfirmCancelId(null);
          if (!res.ok) {
            setActionMessage({ type: 'error', text: res.error || 'Could not cancel.' });
          } else {
            setActionMessage({
              type: 'success',
              text: tr('Complaint cancelled.', 'புகார் ரத்து செய்யப்பட்டது.'),
            });
          }
        }}
      />
    </div>
  );
};
