import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  FlaskConical,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import { isStaffRole } from '../../services/accessControl';
import type {
  ComplaintAttachment,
  ComplaintCategory,
  ComplaintRecord,
  Department,
  JobApplication,
  JobVacancy,
  ScoredOpportunity,
  UserAccount,
} from '../../types/needmap';
import { validateAndProcessUpload } from '../../utils/fileUpload';
import { computeInferredWorkforceDemand } from '../../utils/routingEngine';

interface JobsPortalViewProps {
  activeAccount: UserAccount;
  departments: Department[];
  vacancies: JobVacancy[];
  applications: JobApplication[];
  opportunities: ScoredOpportunity[];
  complaints: ComplaintRecord[];
  onSubmitJobApplication: (
    app: Omit<JobApplication, 'id' | 'submittedAt' | 'updatedAt' | 'status'>
  ) => { ok: boolean; error?: string };
  onCreateVacancy: (
    vacancy: Omit<JobVacancy, 'id' | 'createdAt' | 'origin'>
  ) => { ok: boolean; error?: string };
  onUpdateApplicationStatus: (
    appId: string,
    status: JobApplication['status'],
    reviewerNote?: string
  ) => { ok: boolean; error?: string };
}

export const JobsPortalView: React.FC<JobsPortalViewProps> = ({
  activeAccount,
  departments,
  vacancies,
  applications,
  opportunities,
  complaints,
  onSubmitJobApplication,
  onCreateVacancy,
  onUpdateApplicationStatus,
}) => {
  const { tr, tCategory } = useI18n();
  const canManageVacancies = isStaffRole(activeAccount.role);

  const [tab, setTab] = useState<'openings' | 'applications' | 'demand'>('openings');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Application Modal State
  const [applyingVacancy, setApplyingVacancy] = useState<JobVacancy | null>(null);
  const [appName, setAppName] = useState(activeAccount.name);
  const [appEmail, setAppEmail] = useState(activeAccount.email);
  const [appPhone, setAppPhone] = useState(activeAccount.phone || '');
  const [appSkills, setAppSkills] = useState('');
  const [appExp, setAppExp] = useState('');
  const [appAvail, setAppAvail] = useState('Immediate');
  const [appResume, setAppResume] = useState<ComplaintAttachment | undefined>(undefined);

  // Admin Create Vacancy Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || 'DEPT-FAC');
  const [newCategory, setNewCategory] = useState<ComplaintCategory>('electricity');
  const [newLocation, setNewLocation] = useState('Main Campus Service Desk');
  const [newType, setNewType] = useState<JobVacancy['employmentType']>('contract');
  const [newPositions, setNewPositions] = useState(1);
  const [newComp, setNewComp] = useState('₹25,000 / month (Admin-Managed)');
  const [newSkills, setNewSkills] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newClosing, setNewClosing] = useState('2026-12-01');

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const deptMap = useMemo(() => {
    const m = new Map<string, Department>();
    departments.forEach((d) => m.set(d.id, d));
    return m;
  }, [departments]);

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (deptFilter !== 'ALL' && v.departmentId !== deptFilter) return false;
      if (typeFilter !== 'ALL' && v.employmentType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hit =
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.requiredSkills.some((s) => s.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [vacancies, deptFilter, typeFilter, searchQuery]);

  const visibleApplications = useMemo(() => {
    if (canManageVacancies) return applications;
    return applications.filter((a) => a.applicantAccountId === activeAccount.id);
  }, [applications, canManageVacancies, activeAccount.id]);

  const inferredDemand = useMemo(
    () => computeInferredWorkforceDemand(opportunities, complaints),
    [opportunities, complaints]
  );

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingVacancy) return;
    if (appExp.trim().length < 10) {
      setNotice({
        type: 'error',
        text: tr(
          'Please enter a brief experience summary (at least 10 characters).',
          'குறைந்தது 10 எழுத்துகளில் அனுபவச் சுருக்கத்தை உள்ளிடவும்.'
        ),
      });
      return;
    }

    const res = onSubmitJobApplication({
      vacancyId: applyingVacancy.id,
      applicantAccountId: activeAccount.id,
      applicantName: appName.trim() || activeAccount.name,
      applicantEmail: appEmail.trim() || activeAccount.email,
      applicantPhone: appPhone.trim(),
      relevantSkills: appSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      experienceSummary: appExp.trim(),
      availabilityNote: appAvail.trim(),
      attachment: appResume,
    });

    if (!res.ok) {
      setNotice({ type: 'error', text: res.error || 'Could not submit application.' });
      return;
    }

    setApplyingVacancy(null);
    setAppExp('');
    setAppResume(undefined);
    setTab('applications');
    setNotice({
      type: 'success',
      text: tr(
        'Application submitted! Track review status below.',
        'விண்ணப்பம் சமர்ப்பிக்கப்பட்டது! கீழே நிலையைக் கண்காணிக்கலாம்.'
      ),
    });
  };

  const handleCreateVacancySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    const res = onCreateVacancy({
      title: newTitle.trim(),
      departmentId: newDeptId,
      category: newCategory,
      locationText: newLocation.trim(),
      employmentType: newType,
      positionsCount: Math.max(1, Number(newPositions) || 1),
      compensationRange: newComp.trim(),
      requiredSkills: newSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: newDesc.trim(),
      closingDate: newClosing,
      status: 'open',
    });

    if (res.ok) {
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNotice({
        type: 'success',
        text: tr(
          'Published Admin-Managed Job Opening.',
          'நிர்வாக வேலைவாய்ப்பு அறிவிப்பு வெளியிடப்பட்டது.'
        ),
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Failed to create vacancy.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
            <Briefcase className="h-4 w-4" />
            <span>{tr('Workforce, Fellowships & Field Roles', 'பணியிடங்கள் & மாணவர் பணிவாய்ப்புகள்')}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            {tr('Jobs, Vacancies & Workforce Demand', 'வேலைவாய்ப்புகள் மற்றும் பணியாளர் தேவை')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            {tr(
              'Explore clearly labeled Sample Demo or Admin-Managed service openings, submit applications, and inspect AI-inferred staffing needs driven by recurring community clusters.',
              'தெளிவாகக் குறிக்கப்பட்ட மாதிரி மற்றும் நிர்வாகப் பணியிடங்களுக்கு விண்ணப்பிக்கவும், தொடர் புகார்களின் அடிப்படையிலான பணியாளர் தேவைப் பரிந்துரைகளைக் காணவும்.'
            )}
          </p>
        </div>

        {canManageVacancies && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            {tr('Post Admin Vacancy', 'புதிய பணியிடம் சேர்')}
          </button>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setTab('openings')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === 'openings'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tr('Open Vacancies', 'திறந்த பணியிடங்கள்')} ({vacancies.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('applications')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === 'applications'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {canManageVacancies
              ? `${tr('All Applications', 'அனைத்து விண்ணப்பங்கள்')} (${visibleApplications.length})`
              : `${tr('My Applications', 'எனது விண்ணப்பங்கள்')} (${visibleApplications.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab('demand')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === 'demand'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tr('Inferred Workforce Demand', 'பரிந்துரைக்கப்பட்ட பணியாளர் தேவை')} (
            {inferredDemand.length})
          </button>
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <FlaskConical className="h-3.5 w-3.5 text-indigo-600" />
          {tr(
            'Honest Data Labeling: Sample Demo vs Admin-Managed roles are explicitly marked.',
            'மாதிரி தரவு மற்றும் நிர்வாகப் பணியிடங்கள் வெளிப்படையாகக் குறிக்கப்பட்டுள்ளன.'
          )}
        </span>
      </div>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            notice.type === 'success'
              ? 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
              : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* TAB 1: Vacancies */}
      {tab === 'openings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr('Search role or skill...', 'பணி அல்லது திறன் தேடுக...')}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="Filter department"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">{tr('All Departments', 'அனைத்து துறைகளும்')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter employment type"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">{tr('All Role Types', 'அனைத்து பணி வகைகள்')}</option>
              <option value="full_time">{tr('Full-Time', 'முழு நேரம்')}</option>
              <option value="contract">{tr('Contract', 'ஒப்பந்தப் பணி')}</option>
              <option value="part_time">{tr('Part-Time', 'பகுதி நேரம்')}</option>
              <option value="student_fellowship">{tr('Student Fellowship', 'மாணவர் உதவித்தொகைப் பணி')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredVacancies.map((job) => {
              const dept = deptMap.get(job.departmentId);
              const alreadyApplied = applications.some(
                (a) => a.vacancyId === job.id && a.applicantAccountId === activeAccount.id
              );

              return (
                <div
                  key={job.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-slate-500">{job.id}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                          job.origin === 'admin_managed'
                            ? 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                            : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}
                      >
                        {job.origin === 'admin_managed'
                          ? tr('Admin-Managed Workspace Role', 'நிர்வாகம் வெளியிட்ட பணி')
                          : tr('Sample Demo Opening', 'மாதிரி பணிவாய்ப்பு (Demo)')}
                      </span>
                    </div>

                    <h2 className="mt-2 font-display text-base font-bold text-slate-900 dark:text-white">
                      {job.title}
                    </h2>
                    <div className="mt-1 text-xs font-medium text-teal-700 dark:text-teal-400">
                      {dept?.name || job.departmentId} · {job.positionsCount}{' '}
                      {tr('position(s)', 'இடங்கள்')}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {job.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-teal-600" />
                        <span>{job.locationText}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px]">{job.compensationRange}</div>
                    </div>

                    <button
                      type="button"
                      disabled={alreadyApplied}
                      onClick={() => {
                        setApplyingVacancy(job);
                        setAppSkills(job.requiredSkills.join(', '));
                      }}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-700"
                    >
                      {alreadyApplied
                        ? tr('Applied', 'விண்ணப்பிக்கப்பட்டது')
                        : tr('Apply Now', 'விண்ணப்பிக்க')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Applications Tracker */}
      {tab === 'applications' && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:divide-slate-800">
          {visibleApplications.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              {tr('No job applications submitted yet.', 'இதுவரை விண்ணப்பங்கள் எதுவும் இல்லை.')}
            </div>
          ) : (
            visibleApplications.map((app) => {
              const job = vacancies.find((v) => v.id === app.vacancyId);
              return (
                <div
                  key={app.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-mono text-xs text-slate-500">
                      {app.id} · {job?.title || app.vacancyId}
                    </div>
                    <div className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white">
                      {app.applicantName} ({app.applicantEmail})
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {app.experienceSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManageVacancies ? (
                      <select
                        value={app.status}
                        onChange={(e) =>
                          onUpdateApplicationStatus(
                            app.id,
                            e.target.value as JobApplication['status']
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="selected">Selected</option>
                        <option value="not_selected">Not Selected</option>
                      </select>
                    ) : (
                      <span className="rounded-md bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                        {app.status.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: Inferred Workforce Demand (Clearly Labeled Analytical Recommendations) */}
      {tab === 'demand' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              {tr(
                'Analytical Staffing Recommendations (Not Official HR Openings)',
                'தரவு அடிப்படையிலான பணியாளர் தேவைப் பரிந்துரைகள் (அதிகாரப்பூர்வ பணியிடங்கள் அல்ல)'
              )}
            </div>
            <p className="mt-1">
              {tr(
                'Computed deterministically from recurring high-priority feedback clusters and open department service queues.',
                'தொடர் கருத்துத் தொகுப்புகள் மற்றும் நிலுவையிலுள்ள புகார்களின் அடிப்படையில் கணக்கிடப்பட்ட பரிந்துரைகள்.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {inferredDemand.map((dem) => (
              <div
                key={dem.id}
                className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                    {tr('Inferred Workforce Demand', 'பரிந்துரைக்கப்பட்ட பணி')}
                  </span>
                  <span className="font-mono text-slate-500 tabular-nums">
                    Cluster {dem.opportunityId} ({dem.priorityScore}/100)
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {dem.suggestedRoleTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{dem.rationale}</p>
                {canManageVacancies && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewTitle(dem.suggestedRoleTitle);
                      setNewDeptId(dem.departmentId || departments[0].id);
                      setNewDesc(
                        `Created from recurring cluster ${dem.opportunityId} (${dem.opportunityTitle}).`
                      );
                      setIsCreateOpen(true);
                    }}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {tr('Convert to Admin Vacancy Draft', 'பணியிட அறிவிப்பாக மாற்று')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {applyingVacancy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {tr('Apply for Role:', 'பணிக்கு விண்ணப்பிக்க:')} {applyingVacancy.title}
              </h2>
              <button
                type="button"
                onClick={() => setApplyingVacancy(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Full Name *', 'முழுப் பெயர் *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Email *', 'மின்னஞ்சல் *')}
                  </label>
                  <input
                    type="email"
                    required
                    value={appEmail}
                    onChange={(e) => setAppEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Phone', 'தொலைபேசி')}
                  </label>
                  <input
                    type="tel"
                    value={appPhone}
                    onChange={(e) => setAppPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Availability', 'பணிக்கு வரக்கூடிய நேரம்')}
                  </label>
                  <input
                    type="text"
                    value={appAvail}
                    onChange={(e) => setAppAvail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Relevant Skills (comma-separated)', 'தொடர்புடைய திறன்கள்')}
                </label>
                <input
                  type="text"
                  value={appSkills}
                  onChange={(e) => setAppSkills(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Experience Summary *', 'அனுபவச் சுருக்கம் *')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={appExp}
                  onChange={(e) => setAppExp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <input
                  id="resume-upload-input"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const res = await validateAndProcessUpload({
                      file,
                      actorRole: activeAccount.role,
                      actorName: appName || activeAccount.name,
                      stage: 'submission',
                      visibility: 'reporter_and_staff',
                    });
                    if (res.ok && res.attachment) {
                      setAppResume(res.attachment);
                    }
                  }}
                  className="sr-only"
                />
                <label
                  htmlFor="resume-upload-input"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {appResume
                    ? `${tr('Attached:', 'இணைக்கப்பட்டது:')} ${appResume.name}`
                    : tr('Attach Resume / Certificate (PDF/Image)', 'சுயவிவரம் / சான்றிதழ் இணைக்க')}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyingVacancy(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  {tr('Cancel', 'ரத்து')}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {tr('Submit Application', 'விண்ணப்பத்தைச் சமர்ப்பி')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Create Vacancy Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {tr('Post Admin-Managed Job Opening', 'புதிய பணியிட அறிவிப்பை உருவாக்கு')}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVacancySubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Role Title *', 'பணியின் பெயர் *')}
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Department', 'துறை')}
                  </label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.shortCode} : {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Specialty Category', 'பிரிவு')}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ComplaintCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="electricity">{tCategory('electricity')}</option>
                    <option value="water_supply">{tCategory('water_supply')}</option>
                    <option value="accessibility">{tCategory('accessibility')}</option>
                    <option value="wifi_it">{tCategory('wifi_it')}</option>
                    <option value="waste_collection">{tCategory('waste_collection')}</option>
                    <option value="roads">{tCategory('roads')}</option>
                    <option value="education">{tCategory('education')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Type', 'வகை')}
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as JobVacancy['employmentType'])}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="full_time">Full-Time</option>
                    <option value="contract">Contract</option>
                    <option value="part_time">Part-Time</option>
                    <option value="student_fellowship">Fellowship</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Openings', 'இடங்கள்')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newPositions}
                    onChange={(e) => setNewPositions(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Closing Date', 'கடைசி தேதி')}
                  </label>
                  <input
                    type="date"
                    value={newClosing}
                    onChange={(e) => setNewClosing(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Location & Compensation', 'இடம் & ஊதியம்')}
                </label>
                <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Location"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="text"
                    value={newComp}
                    onChange={(e) => setNewComp(e.target.value)}
                    placeholder="Compensation"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Required Skills (comma-separated)', 'தேவையான திறன்கள்')}
                </label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="e.g., Electrical Safety, Tamil & English"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Role Description *', 'பணி விவரம் *')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  {tr('Cancel', 'ரத்து')}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
                >
                  {tr('Publish Opening', 'வெளியிடுக')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
