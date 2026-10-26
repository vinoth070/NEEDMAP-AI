import React, { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  Edit3,
  Plus,
  Sparkles,
  X,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import type {
  EffortLevel,
  InterventionItem,
  InterventionStatus,
  ScoredOpportunity,
} from '../../types/needmap';

interface InterventionPlannerViewProps {
  opportunities: ScoredOpportunity[];
  interventions: InterventionItem[];
  selectedOpportunityId: string | null;
  onSelectOpportunity: (id: string | null) => void;
  onUpdateIntervention: (updated: InterventionItem) => void;
  onAddIntervention: (created: InterventionItem) => void;
  onOpenImpactTracker: (opportunityId: string, interventionId: string) => void;
}

const ALL_STATUSES: InterventionStatus[] = [
  'Proposed',
  'Planned',
  'In Progress',
  'Completed',
  'Rejected',
];

export const InterventionPlannerView: React.FC<InterventionPlannerViewProps> = ({
  opportunities,
  interventions,
  selectedOpportunityId,
  onSelectOpportunity,
  onUpdateIntervention,
  onAddIntervention,
  onOpenImpactTracker,
}) => {
  const { tr } = useI18n();

  const translateIntStatus = (st: InterventionStatus) => {
    switch (st) {
      case 'Proposed':
        return tr('Proposed', 'பரிந்துரைக்கப்பட்டது');
      case 'Planned':
        return tr('Planned', 'திட்டமிடப்பட்டது');
      case 'In Progress':
        return tr('In Progress', 'நடைபெறுகிறது');
      case 'Completed':
        return tr('Completed', 'முடிக்கப்பட்டது');
      case 'Rejected':
        return tr('Rejected', 'நிராகரிக்கப்பட்டது');
    }
  };

  const translateEffort = (ef: EffortLevel) => {
    switch (ef) {
      case 'Low':
        return tr('Low', 'குறைவு');
      case 'Medium':
        return tr('Medium', 'நடுத்தரம்');
      case 'High':
        return tr('High', 'அதிகம்');
    }
  };

  const [oppFilter, setOppFilter] = useState<string>(selectedOpportunityId || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InterventionStatus>('ALL');
  const [onlySelected, setOnlySelected] = useState(false);

  React.useEffect(() => {
    if (selectedOpportunityId) {
      setOppFilter(selectedOpportunityId);
    }
  }, [selectedOpportunityId]);

  const [editingItem, setEditingItem] = useState<InterventionItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [formState, setFormState] = useState<{
    opportunityId: string;
    title: string;
    problemAddressed: string;
    effort: EffortLevel;
    potentialImpact: EffortLevel;
    responsibleRole: string;
    dependenciesText: string;
    stepsText: string;
    expectedOutcome: string;
    successMetric: string;
    infoRequiredText: string;
    status: InterventionStatus;
    userNotes: string;
  }>({
    opportunityId: opportunities[0]?.id || '',
    title: '',
    problemAddressed: '',
    effort: 'Medium',
    potentialImpact: 'High',
    responsibleRole: '',
    dependenciesText: '',
    stepsText: '',
    expectedOutcome: '',
    successMetric: '',
    infoRequiredText: '',
    status: 'Planned',
    userNotes: '',
  });

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savedNoteBadgeId, setSavedNoteBadgeId] = useState<string | null>(null);

  const oppMap = useMemo(() => {
    const map = new Map<string, ScoredOpportunity>();
    opportunities.forEach((o) => map.set(o.id, o));
    return map;
  }, [opportunities]);

  const filteredInterventions = useMemo(() => {
    return interventions
      .filter((item) => {
        if (oppFilter !== 'ALL' && item.opportunityId !== oppFilter) return false;
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (onlySelected && !item.isSelected) return false;
        return true;
      })
      .sort((a, b) => {
        const oppScoreA = oppMap.get(a.opportunityId)?.priority.totalScore ?? 0;
        const oppScoreB = oppMap.get(b.opportunityId)?.priority.totalScore ?? 0;
        return oppScoreB - oppScoreA;
      });
  }, [interventions, oppFilter, statusFilter, onlySelected, oppMap]);

  const statusCounts = useMemo(() => {
    const counts: Record<InterventionStatus, number> = {
      Proposed: 0,
      Planned: 0,
      'In Progress': 0,
      Completed: 0,
      Rejected: 0,
    };
    interventions.forEach((i) => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return counts;
  }, [interventions]);

  const openCreateModal = () => {
    const defaultOpp = oppFilter !== 'ALL' ? oppFilter : opportunities[0]?.id || '';
    const oppObj = oppMap.get(defaultOpp);
    setEditingItem(null);
    setIsCreatingNew(true);
    setFormState({
      opportunityId: defaultOpp,
      title: '',
      problemAddressed: oppObj?.title || '',
      effort: 'Medium',
      potentialImpact: 'High',
      responsibleRole: '',
      dependenciesText: '',
      stepsText: '',
      expectedOutcome: '',
      successMetric: oppObj?.suggestedSuccessMetrics[0] || '',
      infoRequiredText: '',
      status: 'Planned',
      userNotes: '',
    });
  };

  const openEditModal = (item: InterventionItem) => {
    setIsCreatingNew(false);
    setEditingItem(item);
    setFormState({
      opportunityId: item.opportunityId,
      title: item.title,
      problemAddressed: item.problemAddressed,
      effort: item.effort,
      potentialImpact: item.potentialImpact,
      responsibleRole: item.responsibleRole,
      dependenciesText: item.dependencies.join('\n'),
      stepsText: item.implementationSteps.join('\n'),
      expectedOutcome: item.expectedOutcome,
      successMetric: item.successMetric,
      infoRequiredText: item.infoRequiredBeforeImpl.join('\n'),
      status: item.status,
      userNotes: item.userNotes,
    });
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim() || !formState.opportunityId) return;

    const nowIso = new Date().toISOString();
    const dependencies = formState.dependenciesText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const implementationSteps = formState.stepsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const infoRequiredBeforeImpl = formState.infoRequiredText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (isCreatingNew) {
      const created: InterventionItem = {
        id: `INT-USR-${Date.now().toString().slice(-5)}`,
        opportunityId: formState.opportunityId,
        title: formState.title.trim(),
        problemAddressed: formState.problemAddressed.trim() || 'Team-authored action plan',
        effort: formState.effort,
        potentialImpact: formState.potentialImpact,
        dependencies,
        responsibleRole: formState.responsibleRole.trim() || 'Operations Team',
        implementationSteps,
        expectedOutcome: formState.expectedOutcome.trim(),
        successMetric: formState.successMetric.trim() || 'Post-intervention complaint rate',
        infoRequiredBeforeImpl,
        status: formState.status,
        isSelected: formState.status !== 'Rejected',
        userNotes: formState.userNotes.trim(),
        isAiGenerated: false,
        analysisOrigin: 'user_created',
        updatedAt: nowIso,
      };
      onAddIntervention(created);
    } else if (editingItem) {
      onUpdateIntervention({
        ...editingItem,
        opportunityId: formState.opportunityId,
        title: formState.title.trim(),
        problemAddressed: formState.problemAddressed.trim(),
        effort: formState.effort,
        potentialImpact: formState.potentialImpact,
        dependencies,
        responsibleRole: formState.responsibleRole.trim(),
        implementationSteps,
        expectedOutcome: formState.expectedOutcome.trim(),
        successMetric: formState.successMetric.trim(),
        infoRequiredBeforeImpl,
        status: formState.status,
        userNotes: formState.userNotes.trim(),
        updatedAt: nowIso,
      });
    }

    setEditingItem(null);
    setIsCreatingNew(false);
  };

  const handleSaveInlineNote = (item: InterventionItem) => {
    const nextNote =
      noteDrafts[item.id] !== undefined ? noteDrafts[item.id] : item.userNotes;
    onUpdateIntervention({
      ...item,
      userNotes: nextNote,
      updatedAt: new Date().toISOString(),
    });
    setSavedNoteBadgeId(item.id);
    setTimeout(() => {
      setSavedNoteBadgeId((curr) => (curr === item.id ? null : curr));
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tr('Intervention Planner', 'தீர்வுத் திட்டமிடல்')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            {tr(
              'Evaluate candidate interventions, distinguish AI-generated effort/impact estimates from team commitments, customize proposals, and track execution status locally.',
              'பரிந்துரைக்கப்பட்ட தீர்வுத் திட்டங்களை மதிப்பிடுங்கள், AI மதிப்பீடுகளை குழுவின் உறுதிமொழிகளிலிருந்து வேறுபடுத்தி, செயல்படுத்தல் நிலையைக் கண்காணியுங்கள்.'
            )}
          </p>
        </div>

        {opportunities.length > 0 && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-teal-600"
          >
            <Plus className="h-4 w-4 text-teal-400 dark:text-teal-200" />
            {tr('New Custom Intervention', 'புதிய தனிப்பயன் தீர்வுத் திட்டம்')}
          </button>
        )}
      </div>

      {/* Status Summary & Filters */}
      <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tr('All', 'அனைத்தும்')} ({interventions.length})
            </button>
            {ALL_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {translateIntStatus(st)} ({statusCounts[st]})
              </button>
            ))}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(e) => setOnlySelected(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-teal-700 focus:ring-teal-600"
            />
            {tr('Selected interventions only', 'தேர்ந்தெடுக்கப்பட்ட திட்டங்கள் மட்டும்')}
          </label>
        </div>

        {/* Opportunity Filter Dropdown */}
        <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label
              htmlFor="int-opp-filter"
              className="shrink-0 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              {tr('Opportunity:', 'வாய்ப்புத் தொகுப்பு:')}
            </label>
            <select
              id="int-opp-filter"
              value={oppFilter}
              onChange={(e) => {
                const v = e.target.value;
                setOppFilter(v);
                onSelectOpportunity(v === 'ALL' ? null : v);
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-teal-600 focus:outline-none sm:w-96"
            >
              <option value="ALL">
                {tr('All Opportunities', 'அனைத்து வாய்ப்புத் தொகுப்புகள்')} ({opportunities.length})
              </option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.id}: {opp.title} ({tr('Score', 'மதிப்பெண்')} {opp.priority.totalScore})
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            {tr(
              'Note: Effort, potential impact, and expected outcomes are AI estimates until validated by your team.',
              'குறிப்பு: முயற்சி, தாக்கம் மற்றும் எதிர்பார்க்கப்படும் விளைவுகள் குழுவால் உறுதிப்படுத்தப்படும் வரை AI மதிப்பீடுகளாகும்.'
            )}
          </div>
        </div>
      </div>

      {/* Interventions List */}
      {filteredInterventions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center">
          <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            {tr('No Interventions Match Current Filters', 'வடிகட்டல்களுக்குப் பொருந்தும் திட்டங்கள் இல்லை')}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(
              'Reset status/opportunity filters or run AI analysis to generate candidate proposals.',
              'நிலை / வாய்ப்பு வடிகட்டிகளை மீட்டமைக்கவும் அல்லது AI பகுப்பாய்வை இயக்கவும்.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInterventions.map((item) => {
            const parentOpp = oppMap.get(item.opportunityId);
            const currentNote =
              noteDrafts[item.id] !== undefined ? noteDrafts[item.id] : item.userNotes;

            return (
              <article
                key={item.id}
                className={`rounded-xl border bg-white dark:bg-slate-900 p-6 transition-colors ${
                  item.isSelected
                    ? 'border-teal-600/70 dark:border-teal-500/70'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Top Meta & Status Controls */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {item.id}
                      </span>
                      {parentOpp && (
                        <>
                          <span>·</span>
                          <span>
                            {tr('Addresses', 'இலக்கு')} {parentOpp.id} ({tr('Priority', 'முன்னுரிமை')}{' '}
                            {parentOpp.priority.totalScore}/100)
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400">
                        {item.isAiGenerated ? (
                          <>
                            <Sparkles className="h-3 w-3" />
                            {tr('AI-Suggested Proposal (Estimates)', 'AI பரிந்துரைத்த திட்டம் (மதிப்பீடு)')}
                          </>
                        ) : (
                          tr('Team-Authored Plan', 'குழு உருவாக்கிய திட்டம்')
                        )}
                      </span>
                    </div>

                    <h2 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">
                        {tr('Target Problem:', 'தீர்க்கப்படும் சிக்கல்:')}
                      </strong>{' '}
                      {item.problemAddressed}
                    </p>
                  </div>

                  {/* Interactive Controls */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateIntervention({
                          ...item,
                          isSelected: !item.isSelected,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        item.isSelected
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {item.isSelected
                        ? tr('Selected', 'தேர்ந்தெடுக்கப்பட்டது')
                        : tr('Select Action', 'நடவடிக்கையைத் தேர்ந்தெடு')}
                    </button>

                    <select
                      aria-label={`Status for ${item.title}`}
                      value={item.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as InterventionStatus;
                        onUpdateIntervention({
                          ...item,
                          status: nextStatus,
                          isSelected:
                            nextStatus === 'Planned' ||
                            nextStatus === 'In Progress' ||
                            nextStatus === 'Completed'
                              ? true
                              : item.isSelected,
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {tr('Status:', 'நிலை:')} {translateIntStatus(st)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {tr('Edit', 'திருத்து')}
                    </button>
                  </div>
                </div>

                {/* Structured Attributes Grid */}
                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="text-slate-400 dark:text-slate-500">
                      {tr('Estimated Effort', 'மதிப்பிடப்பட்ட முயற்சி')}
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                      {translateEffort(item.effort)}{' '}
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        ({tr('Estimate', 'மதிப்பீடு')})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 dark:text-slate-500">
                      {tr('Potential Impact', 'சாத்தியமான தாக்கம்')}
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                      {translateEffort(item.potentialImpact)}{' '}
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        ({tr('Estimate', 'மதிப்பீடு')})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 dark:text-slate-500">
                      {tr('Suggested Responsible Role', 'பரிந்துரைக்கப்பட்ட பொறுப்புக் குழு')}
                    </div>
                    <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                      {item.responsibleRole}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 dark:text-slate-500">
                      {tr('Suggested Success Metric', 'வெற்றி அளவுகோல்')}
                    </div>
                    <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                      {item.successMetric}
                    </div>
                  </div>
                </div>

                {/* Implementation Steps, Dependencies, Required Pre-Checks */}
                <div className="mt-4 grid grid-cols-1 gap-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs lg:grid-cols-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {tr('Implementation Steps', 'செயல்படுத்தும் படிகள்')}
                    </div>
                    {item.implementationSteps.length === 0 ? (
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        {tr('No steps listed.', 'படிகள் எதுவும் இல்லை.')}
                      </p>
                    ) : (
                      <ol className="mt-1.5 list-decimal space-y-1 pl-4 leading-relaxed text-slate-700 dark:text-slate-300">
                        {item.implementationSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    )}

                    <div className="mt-3">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {tr('Expected Outcome (AI Projection): ', 'எதிர்பார்க்கப்படும் விளைவு: ')}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {item.expectedOutcome}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {tr(
                          'Information Required Before Implementation',
                          'செயல்படுத்தும் முன் தேவையான தகவல்கள்'
                        )}
                      </div>
                      {item.infoRequiredBeforeImpl.length === 0 ? (
                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                          {tr('None specified.', 'எதுவும் குறிப்பிடப்படவில்லை.')}
                        </p>
                      ) : (
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                          {item.infoRequiredBeforeImpl.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {item.dependencies.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {tr('Dependencies: ', 'சார்புகள்: ')}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {item.dependencies.join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Local Team Notes & Impact Tracker Link */}
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex-1">
                    <label
                      htmlFor={`note-${item.id}`}
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {tr('Team Execution Notes (Saved Locally)', 'குழு செயல்பாட்டுக் குறிப்புகள் (உள்ளூரில் சேமிக்கப்படும்)')}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        id={`note-${item.id}`}
                        type="text"
                        value={currentNote}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder={tr(
                          'Record owner sign-off, budget notes, or blocker details...',
                          'பொறுப்பாளர் ஒப்புதல், பட்ஜெட் குறிப்புகள் அல்லது தடைகளைப் பதிவு செய்யவும்...'
                        )}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveInlineNote(item)}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        {savedNoteBadgeId === item.id
                          ? tr('Saved', 'சேமிக்கப்பட்டது')
                          : tr('Save Note', 'குறிப்பைச் சேமி')}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenImpactTracker(item.opportunityId, item.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-teal-50 dark:bg-teal-950/60 px-3.5 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/70"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    {tr('Record Baseline / Impact', 'அடிப்படை / தாக்கத்தைப் பதிவு செய்')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Intervention Modal */}
      {(isCreatingNew || editingItem) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="int-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2
                id="int-modal-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                {isCreatingNew
                  ? tr('Create Custom Intervention', 'புதிய தனிப்பயன் தீர்வுத் திட்டம்')
                  : tr('Edit Intervention Proposal', 'தீர்வுத் திட்டத்தைத் திருத்து')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false);
                  setEditingItem(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Linked Opportunity', 'இணைக்கப்பட்ட வாய்ப்புத் தொகுப்பு')}
                  </label>
                  <select
                    value={formState.opportunityId}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, opportunityId: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    required
                  >
                    {opportunities.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.id}: {opp.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Proposed Action Title', 'பரிந்துரைக்கப்பட்ட நடவடிக்கையின் தலைப்பு')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.title}
                    onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Problem Addressed', 'தீர்க்கப்படும் சிக்கல்')}
                  </label>
                  <input
                    type="text"
                    value={formState.problemAddressed}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, problemAddressed: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Estimated Effort', 'மதிப்பிடப்பட்ட முயற்சி')}
                  </label>
                  <select
                    value={formState.effort}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, effort: e.target.value as EffortLevel }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="Low">{translateEffort('Low')}</option>
                    <option value="Medium">{translateEffort('Medium')}</option>
                    <option value="High">{translateEffort('High')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Potential Impact', 'சாத்தியமான தாக்கம்')}
                  </label>
                  <select
                    value={formState.potentialImpact}
                    onChange={(e) =>
                      setFormState((p) => ({
                        ...p,
                        potentialImpact: e.target.value as EffortLevel,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="Low">{translateEffort('Low')}</option>
                    <option value="Medium">{translateEffort('Medium')}</option>
                    <option value="High">{translateEffort('High')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Responsible Role / Team', 'பொறுப்பான குழு / பணி')}
                  </label>
                  <input
                    type="text"
                    value={formState.responsibleRole}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, responsibleRole: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Execution Status', 'செயல்படுத்தல் நிலை')}
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState((p) => ({
                        ...p,
                        status: e.target.value as InterventionStatus,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {translateIntStatus(st)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Implementation Steps (One per line)', 'செயல்படுத்தும் படிகள் (ஒரு வரிக்கு ஒன்று)')}
                  </label>
                  <textarea
                    rows={3}
                    value={formState.stepsText}
                    onChange={(e) => setFormState((p) => ({ ...p, stepsText: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Dependencies (One per line)', 'சார்புகள் (ஒரு வரிக்கு ஒன்று)')}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.dependenciesText}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, dependenciesText: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Required Info Before Implementation', 'செயல்படுத்தும் முன் தேவையான தகவல்கள்')}
                  </label>
                  <textarea
                    rows={2}
                    value={formState.infoRequiredText}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, infoRequiredText: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Expected Outcome', 'எதிர்பார்க்கப்படும் விளைவு')}
                  </label>
                  <input
                    type="text"
                    value={formState.expectedOutcome}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, expectedOutcome: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    {tr('Success Metric', 'வெற்றி அளவுகோல்')}
                  </label>
                  <input
                    type="text"
                    value={formState.successMetric}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, successMetric: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingItem(null);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {tr('Cancel', 'ரத்து செய்')}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
                >
                  {tr('Save Intervention', 'தீர்வுத் திட்டத்தைச் சேமி')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
