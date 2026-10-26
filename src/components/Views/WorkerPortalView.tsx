import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  HardHat,
  MapPin,
  Play,
  ShieldAlert,
  Upload,
  UserCheck,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import { isStaffRole, sanitizeComplaintForViewer } from '../../services/accessControl';
import type {
  ComplaintAttachment,
  ComplaintRecord,
  UserAccount,
  WorkerProfile,
} from '../../types/needmap';
import { validateAndProcessUpload } from '../../utils/fileUpload';

interface WorkerPortalViewProps {
  activeAccount: UserAccount;
  accounts: UserAccount[];
  onSwitchAccount: (accountId: string) => void;
  workers: WorkerProfile[];
  complaints: ComplaintRecord[];
  onUpdateWorkerAvailability: (
    workerId: string,
    availability: 'available' | 'busy' | 'off_duty'
  ) => void;
  onWorkerTaskUpdate: (params: {
    complaintId: string;
    nextStatus: 'accepted' | 'in_progress' | 'more_info_required' | 'resolved_awaiting_confirmation';
    note: string;
    attachments: ComplaintAttachment[];
  }) => { ok: boolean; error?: string };
}

export const WorkerPortalView: React.FC<WorkerPortalViewProps> = ({
  activeAccount,
  accounts,
  onSwitchAccount,
  workers,
  complaints,
  onUpdateWorkerAvailability,
  onWorkerTaskUpdate,
}) => {
  const { tr, tCategory, tStatus, tPriority } = useI18n();

  const isWorkerOrStaff =
    activeAccount.role === 'worker' || isStaffRole(activeAccount.role);

  const activeWorkerProfile = useMemo(() => {
    if (activeAccount.workerProfileId) {
      return workers.find((w) => w.id === activeAccount.workerProfileId) || workers[0];
    }
    return workers[0];
  }, [activeAccount, workers]);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    activeWorkerProfile?.id || 'WRK-01'
  );

  // Sync when account switches
  React.useEffect(() => {
    if (activeAccount.workerProfileId) {
      setSelectedWorkerId(activeAccount.workerProfileId);
    }
  }, [activeAccount.workerProfileId]);

  const effectiveWorker = useMemo(
    () => workers.find((w) => w.id === selectedWorkerId) || workers[0],
    [workers, selectedWorkerId]
  );

  const assignedTasks = useMemo(
    () =>
      complaints
        .filter((c) => c.assignedWorkerId === effectiveWorker?.id)
        .map((c) => sanitizeComplaintForViewer(activeAccount, c)),
    [complaints, effectiveWorker, activeAccount]
  );

  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(
    assignedTasks[0]?.id || null
  );
  const [progressNote, setProgressNote] = useState('');
  const [proofFiles, setProofFiles] = useState<ComplaintAttachment[]>([]);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const activeTask = useMemo(
    () => assignedTasks.find((t) => t.id === focusedTaskId) || assignedTasks[0] || null,
    [assignedTasks, focusedTaskId]
  );

  if (!isWorkerOrStaff) {
    const demoWorker = accounts.find((a) => a.role === 'worker');
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center dark:border-amber-900/60 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
          {tr('Field Worker Portal Access Required', 'களப்பணியாளர் அனுமதி தேவை')}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {tr(
            'Citizen accounts cannot view private worker dispatch queues or mark service tasks resolved. Switch to a Demo Field Worker account to test accepting tasks and uploading completion proof.',
            'குடிமக்கள் கணக்கில் களப்பணியாளர் பணிகளை மாற்ற முடியாது. களப்பணியாளர் கணக்கிற்கு மாறிச் சோதிக்கவும்.'
          )}
        </p>
        {demoWorker && (
          <button
            type="button"
            onClick={() => onSwitchAccount(demoWorker.id)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            <UserCheck className="h-4 w-4" />
            {tr(
              `Switch to Demo Worker (${demoWorker.name})`,
              `மாதிரி களப்பணியாளர் கணக்கிற்கு மாறுக (${demoWorker.name})`
            )}
          </button>
        )}
      </div>
    );
  }

  const canMutateThisWorker =
    activeAccount.role === 'worker'
      ? activeAccount.workerProfileId === effectiveWorker?.id
      : isStaffRole(activeAccount.role);

  const handleUploadProof = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBanner(null);
    const next = [...proofFiles];
    for (let i = 0; i < files.length; i++) {
      const res = await validateAndProcessUpload({
        file: files[i],
        actorRole: activeAccount.role,
        actorName: activeAccount.name,
        stage: 'resolution',
        visibility: 'public_summary',
      });
      if (!res.ok || !res.attachment) {
        setBanner({ type: 'error', text: res.error || 'Upload failed.' });
        return;
      }
      next.push(res.attachment);
    }
    setProofFiles(next);
  };

  const triggerTaskStatus = (
    nextStatus:
      | 'accepted'
      | 'in_progress'
      | 'more_info_required'
      | 'resolved_awaiting_confirmation'
  ) => {
    if (!activeTask) return;
    const defaultNote =
      nextStatus === 'accepted'
        ? `Task accepted by ${effectiveWorker.name}.`
        : nextStatus === 'in_progress'
        ? `On-site repair started by ${effectiveWorker.name}.`
        : progressNote.trim();

    const res = onWorkerTaskUpdate({
      complaintId: activeTask.id,
      nextStatus,
      note: progressNote.trim() || defaultNote,
      attachments: proofFiles,
    });

    if (!res.ok) {
      setBanner({ type: 'error', text: res.error || 'Action denied.' });
      return;
    }

    setProgressNote('');
    setProofFiles([]);
    setBanner({
      type: 'success',
      text:
        nextStatus === 'resolved_awaiting_confirmation'
          ? tr(
              'Marked "Resolved : Awaiting User Confirmation". The citizen will now verify satisfaction before closure.',
              '"தீர்க்கப்பட்டது : பயனர் உறுதிப்படுத்தல் நிலுவை" என மாற்றப்பட்டது.'
            )
          : tr('Task status updated.', 'பணி நிலை புதுப்பிக்கப்பட்டது.'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Worker Availability Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
            <HardHat className="h-4 w-4" />
            <span>{tr('Field Technician Task Portal', 'களப்பணியாளர் பணித் தளம்')}</span>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
            {effectiveWorker.name} : {effectiveWorker.roleTitle}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {tr('Zones:', 'பகுதிகள்:')} {effectiveWorker.serviceZones.join(', ')} ·{' '}
            {tr('Skills:', 'திறன்கள்:')} {effectiveWorker.skillTags.join(', ')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isStaffRole(activeAccount.role) && (
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              aria-label="Inspect worker"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.availability})
                </option>
              ))}
            </select>
          )}

          <select
            value={effectiveWorker.availability}
            disabled={!canMutateThisWorker}
            onChange={(e) =>
              onUpdateWorkerAvailability(
                effectiveWorker.id,
                e.target.value as 'available' | 'busy' | 'off_duty'
              )
            }
            aria-label={tr('Availability status', 'பணி இருப்பு நிலை')}
            className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
          >
            <option value="available">{tr('Status: Available', 'நிலை: பணியில் உள்ளார்')}</option>
            <option value="busy">{tr('Status: Busy on Site', 'நிலை: களப்பணியில்')}</option>
            <option value="off_duty">{tr('Status: Off Duty', 'நிலை: விடுப்பில்')}</option>
          </select>
        </div>
      </div>

      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            banner.type === 'success'
              ? 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
              : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
          }`}
        >
          {banner.text}
        </div>
      )}

      {assignedTasks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            {tr('No tasks currently assigned to this worker', 'தற்போது ஒதுக்கப்பட்ட பணிகள் எதுவும் இல்லை')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Assigned Task List */}
          <div className="space-y-3 lg:col-span-5">
            {assignedTasks.map((task) => {
              const isSelected = activeTask?.id === task.id;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    setFocusedTaskId(task.id);
                    setBanner(null);
                  }}
                  className={`block w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-slate-900 bg-white dark:border-teal-500 dark:bg-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {task.id}
                    </span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      {tPriority(task.priorityTier)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-sm font-bold text-slate-900 dark:text-white">
                    {task.title}
                  </h3>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {tCategory(task.category)} · {tStatus(task.status)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Field Execution Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            {activeTask && (
              <>
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="font-mono text-xs text-slate-500">
                    {activeTask.id} · {tStatus(activeTask.status)}
                  </div>
                  <h2 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                    {activeTask.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {activeTask.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>{activeTask.location.address}</span>
                  </div>
                </div>

                {/* Quick Field Progress Actions */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {tr(
                      'Field Progress / Resolution Notes (Required to mark Resolved)',
                      'களப்பணி / தீர்வுக் குறிப்பு (தீர்க்கப்பட்டது எனக் குறிக்க கட்டாயம்)'
                    )}
                  </label>
                  <textarea
                    rows={3}
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder={tr(
                      'Describe parts replaced, safety checks completed, or information needed from the reporter...',
                      'மாற்றப்பட்ட பாகங்கள், செய்யப்பட்ட சோதனைகள் அல்லது மேற்கொண்ட பணியை விவரிக்கவும்...'
                    )}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      id="worker-proof-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => void handleUploadProof(e.target.files)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="worker-proof-upload"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Upload className="h-3.5 w-3.5 text-teal-600" />
                      {tr('Upload Completion Photo / PDF', 'தீர்வு புகைப்படம் / PDF இணைக்க')}
                      {proofFiles.length > 0 && ` (${proofFiles.length})`}
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {activeTask.status === 'assigned' && (
                      <button
                        type="button"
                        onClick={() => triggerTaskStatus('accepted')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        {tr('Accept Task', 'பணியை ஏற்றுக்கொள்')}
                      </button>
                    )}

                    {(activeTask.status === 'assigned' ||
                      activeTask.status === 'accepted' ||
                      activeTask.status === 'reopened') && (
                      <button
                        type="button"
                        onClick={() => triggerTaskStatus('in_progress')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {tr('Mark Work In Progress', 'பணி தொடங்கப்பட்டது')}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => triggerTaskStatus('more_info_required')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      {tr('Request More Info', 'கூடுதல் தகவல் கேள்')}
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerTaskStatus('resolved_awaiting_confirmation')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {tr(
                        'Submit Resolved (Await Citizen Confirmation)',
                        'தீர்க்கப்பட்டது எனச் சமர்ப்பி'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
