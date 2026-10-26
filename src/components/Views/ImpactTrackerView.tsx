import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Plus,
  Trash2,
  X,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import type {
  ImpactMetricTracker,
  InterventionItem,
  InterventionStatus,
  MeasurementRecord,
  ScoredOpportunity,
} from '../../types/needmap';

interface ImpactTrackerViewProps {
  opportunities: ScoredOpportunity[];
  interventions: InterventionItem[];
  trackers: ImpactMetricTracker[];
  focusedOpportunityId?: string | null;
  focusedInterventionId?: string | null;
  onAddTracker: (tracker: ImpactMetricTracker) => void;
  onUpdateTracker: (tracker: ImpactMetricTracker) => void;
  onDeleteTracker: (id: string) => void;
  onUpdateInterventionStatus: (interventionId: string, status: InterventionStatus) => void;
}

export const ImpactTrackerView: React.FC<ImpactTrackerViewProps> = ({
  opportunities,
  interventions,
  trackers,
  focusedOpportunityId,
  focusedInterventionId,
  onAddTracker,
  onUpdateTracker,
  onDeleteTracker,
  onUpdateInterventionStatus,
}) => {
  const { tr } = useI18n();

  const [isNewTrackerOpen, setIsNewTrackerOpen] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newUnit, setNewUnit] = useState('complaints/week');
  const [newDirection, setNewDirection] = useState<'decrease' | 'increase'>('decrease');
  const [newOppId, setNewOppId] = useState(
    focusedOpportunityId || opportunities[0]?.id || ''
  );
  const [newIntId, setNewIntId] = useState(focusedInterventionId || '');

  const [activeMeasurementModal, setActiveMeasurementModal] = useState<{
    trackerId: string;
    mode: 'baseline' | 'followup';
  } | null>(null);
  const [measureVal, setMeasureVal] = useState('');
  const [measureDate, setMeasureDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [measureNotes, setMeasureNotes] = useState('');
  const [measureError, setMeasureError] = useState<string | null>(null);

  React.useEffect(() => {
    if (focusedOpportunityId) {
      setNewOppId(focusedOpportunityId);
    }
    if (focusedInterventionId) {
      setNewIntId(focusedInterventionId);
    }
  }, [focusedOpportunityId, focusedInterventionId]);

  const oppMap = useMemo(() => {
    const m = new Map<string, ScoredOpportunity>();
    opportunities.forEach((o) => m.set(o.id, o));
    return m;
  }, [opportunities]);

  const intMap = useMemo(() => {
    const m = new Map<string, InterventionItem>();
    interventions.forEach((i) => m.set(i.id, i));
    return m;
  }, [interventions]);

  const handleCreateTracker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetricName.trim() || !newOppId) return;

    const created: ImpactMetricTracker = {
      id: `TRK-${Date.now().toString().slice(-5)}`,
      opportunityId: newOppId,
      interventionId: newIntId || undefined,
      metricName: newMetricName.trim(),
      unit: newUnit.trim() || 'units',
      desiredDirection: newDirection,
      baseline: null,
      followUps: [],
      isDemoIllustration: false,
      updatedAt: new Date().toISOString(),
    };
    onAddTracker(created);
    setNewMetricName('');
    setIsNewTrackerOpen(false);
  };

  const openMeasurementEntry = (tracker: ImpactMetricTracker, mode: 'baseline' | 'followup') => {
    setMeasureError(null);
    if (mode === 'baseline' && tracker.baseline) {
      setMeasureVal(String(tracker.baseline.value));
      setMeasureDate(tracker.baseline.date);
      setMeasureNotes(tracker.baseline.notes);
    } else {
      setMeasureVal('');
      setMeasureDate(new Date().toISOString().slice(0, 10));
      setMeasureNotes('');
    }
    setActiveMeasurementModal({ trackerId: tracker.id, mode });
  };

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeasurementModal) return;

    const numericVal = Number(measureVal);
    if (measureVal.trim() === '' || Number.isNaN(numericVal) || !Number.isFinite(numericVal)) {
      setMeasureError(
        tr('Enter a valid finite number for the measurement.', 'சரியான எண் மதிப்பை உள்ளிடவும்.')
      );
      return;
    }
    if (!measureDate) {
      setMeasureError(tr('Select a valid measurement date.', 'சரியான தேதியைத் தேர்ந்தெடுக்கவும்.'));
      return;
    }

    const target = trackers.find((t) => t.id === activeMeasurementModal.trackerId);
    if (!target) return;

    const record: MeasurementRecord = {
      id: `MSR-${Date.now().toString().slice(-5)}`,
      value: numericVal,
      date: measureDate,
      notes: measureNotes.trim(),
    };

    if (activeMeasurementModal.mode === 'baseline') {
      onUpdateTracker({
        ...target,
        baseline: record,
        isDemoIllustration: false,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const nextFollowUps = [...target.followUps, record].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      onUpdateTracker({
        ...target,
        followUps: nextFollowUps,
        isDemoIllustration: false,
        updatedAt: new Date().toISOString(),
      });
    }

    setActiveMeasurementModal(null);
  };

  const handleRemoveFollowUp = (tracker: ImpactMetricTracker, recordId: string) => {
    onUpdateTracker({
      ...tracker,
      followUps: tracker.followUps.filter((f) => f.id !== recordId),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tr('Impact Tracker', 'தாக்கக் கண்காணிப்பு')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            {tr(
              'Record real pre-intervention baselines and dated post-intervention measurements to evaluate actual outcomes - kept strictly separate from AI-generated expectations.',
              'AI மதிப்பீடுகளிலிருந்து தனித்தனியாக, நடவடிக்கைக்கு முந்தைய அடிப்படை அளவீடுகளையும் பிந்தைய உண்மையான அளவீடுகளையும் பதிவு செய்து உண்மையான விளைவுகளை மதிப்பிடுங்கள்.'
            )}
          </p>
        </div>

        {opportunities.length > 0 && (
          <button
            type="button"
            onClick={() => setIsNewTrackerOpen((prev) => !prev)}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-teal-600"
          >
            <Plus className="h-4 w-4 text-teal-400 dark:text-teal-200" />
            {isNewTrackerOpen
              ? tr('Close Form', 'படிவத்தை மூடு')
              : tr('New Impact Metric', 'புதிய தாக்க அளவுகோல்')}
          </button>
        )}
      </div>

      {/* Create Metric Tracker Panel */}
      {isNewTrackerOpen && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {tr('Configure New Impact Metric', 'புதிய தாக்க அளவுகோலை அமைக்கவும்')}
          </h2>
          <form
            onSubmit={handleCreateTracker}
            className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {tr('Opportunity Cluster', 'வாய்ப்புத் தொகுப்பு')}
              </label>
              <select
                value={newOppId}
                onChange={(e) => {
                  setNewOppId(e.target.value);
                  setNewIntId('');
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                required
              >
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id}: {o.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {tr('Linked Intervention (Optional)', 'இணைக்கப்பட்ட தீர்வுத் திட்டம் (விருப்பத்தேர்வு)')}
              </label>
              <select
                value={newIntId}
                onChange={(e) => setNewIntId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="">
                  {tr('None / General Opportunity Metric', 'ஏதுமில்லை / பொது அளவுகோல்')}
                </option>
                {interventions
                  .filter((i) => i.opportunityId === newOppId)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.id}: {i.title}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {tr('Metric Name', 'அளவுகோல் பெயர்')}
              </label>
              <input
                type="text"
                required
                value={newMetricName}
                onChange={(e) => setNewMetricName(e.target.value)}
                placeholder={tr('e.g., Peak Lunch Queue Wait Time', 'எ.கா., மதிய உணவு வரிசைக் காத்திருப்பு நேரம்')}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {tr('Measurement Unit', 'அளவீட்டு அலகு')}
              </label>
              <input
                type="text"
                required
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder={tr('e.g., minutes, % packet loss, tickets/wk', 'எ.கா., நிமிடங்கள், புகார்கள்/வாரம்')}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {tr('Target Direction', 'இலக்கு திசை')}
              </label>
              <select
                value={newDirection}
                onChange={(e) => setNewDirection(e.target.value as 'decrease' | 'increase')}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="decrease">
                  {tr('Lower is better (e.g., wait time, outages)', 'குறைவது நல்லது (எ.கா., காத்திருப்பு நேரம்)')}
                </option>
                <option value="increase">
                  {tr('Higher is better (e.g., uptime %, pass rate)', 'அதிகரிப்பது நல்லது (எ.கா., செயல்பாட்டு %)')}
                </option>
              </select>
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewTrackerOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {tr('Cancel', 'ரத்து செய்')}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
              >
                {tr('Create Tracker', 'கண்காணிப்பை உருவாக்கு')}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Trackers List */}
      {trackers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <Activity className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {tr('No Impact Trackers Configured Yet', 'தாக்கக் கண்காணிப்புகள் எதுவும் அமைக்கப்படவில்லை')}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {tr(
              'Create an impact metric for any opportunity to record a baseline measurement before rolling out an intervention, then log follow-up measurements to evaluate real change.',
              'தீர்வுத் திட்டத்தைச் செயல்படுத்தும் முன் அடிப்படை அளவீட்டைப் பதிவு செய்து, பின்னர் பின்தொடர் அளவீடுகள் மூலம் உண்மையான மாற்றத்தை மதிப்பிடுங்கள்.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {trackers.map((trk) => {
            const opp = oppMap.get(trk.opportunityId);
            const linkedInt = trk.interventionId ? intMap.get(trk.interventionId) : undefined;
            const latestFollowUp =
              trk.followUps.length > 0 ? trk.followUps[trk.followUps.length - 1] : null;

            const hasValidComparison = Boolean(trk.baseline && latestFollowUp);
            let rawDelta = 0;
            let pctChange: number | null = null;
            let improved = false;

            if (trk.baseline && latestFollowUp) {
              rawDelta = Number((latestFollowUp.value - trk.baseline.value).toFixed(2));
              if (trk.baseline.value !== 0) {
                pctChange = Number(
                  (
                    ((latestFollowUp.value - trk.baseline.value) /
                      Math.abs(trk.baseline.value)) *
                    100
                  ).toFixed(1)
                );
              }
              improved =
                trk.desiredDirection === 'decrease' ? rawDelta < 0 : rawDelta > 0;
            }

            const allPoints = trk.baseline
              ? [
                  {
                    label: `${tr('Base', 'அடிப்படை')} (${trk.baseline.date.slice(5)})`,
                    value: trk.baseline.value,
                    isBaseline: true,
                  },
                  ...trk.followUps.map((f, i) => ({
                    label: `F${i + 1} (${f.date.slice(5)})`,
                    value: f.value,
                    isBaseline: false,
                  })),
                ]
              : [];
            const maxPointVal = Math.max(...allPoints.map((p) => Math.abs(p.value)), 1);

            return (
              <section
                key={trk.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {trk.id}
                      </span>
                      {opp && (
                        <>
                          <span>·</span>
                          <span>
                            {opp.id}: {opp.title}
                          </span>
                        </>
                      )}
                      {trk.isDemoIllustration && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-indigo-700 dark:text-indigo-400">
                            {tr('Illustrative Demo Record', 'மாதிரி விளக்கப் பதிவு')}
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                      {trk.metricName}
                    </h2>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {tr('Unit:', 'அலகு:')}{' '}
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {trk.unit}
                      </span>{' '}
                      · {tr('Goal:', 'இலக்கு:')}{' '}
                      {trk.desiredDirection === 'decrease'
                        ? tr('Decrease metric', 'குறைத்தல்')
                        : tr('Increase metric', 'அதிகரித்தல்')}
                    </div>
                  </div>

                  {/* Linked Intervention Status & Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {linkedInt && (
                      <select
                        aria-label="Linked intervention status"
                        value={linkedInt.status}
                        onChange={(e) =>
                          onUpdateInterventionStatus(
                            linkedInt.id,
                            e.target.value as InterventionStatus
                          )
                        }
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        {(
                          [
                            'Proposed',
                            'Planned',
                            'In Progress',
                            'Completed',
                            'Rejected',
                          ] as const
                        ).map((st) => (
                          <option key={st} value={st}>
                            {tr('Intervention:', 'திட்டம்:')} {st}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => openMeasurementEntry(trk, 'baseline')}
                      className="whitespace-nowrap rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {trk.baseline
                        ? tr('Edit Baseline', 'அடிப்படையைத் திருத்து')
                        : tr('Record Baseline', 'அடிப்படையைப் பதிவு செய்')}
                    </button>

                    <button
                      type="button"
                      onClick={() => openMeasurementEntry(trk, 'followup')}
                      disabled={!trk.baseline}
                      title={
                        !trk.baseline
                          ? tr('Record a baseline measurement first', 'முதலில் அடிப்படை அளவீட்டைப் பதிவு செய்யவும்')
                          : tr('Add post-intervention follow-up measurement', 'பின்தொடர் அளவீட்டைச் சேர்')
                      }
                      className="whitespace-nowrap rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tr('+ Add Follow-Up', '+ பின்தொடர் அளவீடு')}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTracker(trk.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400"
                      aria-label={`Delete tracker ${trk.metricName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Evaluation Status */}
                {!trk.baseline ? (
                  <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 text-xs text-slate-700 dark:text-slate-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {tr(
                          'Awaiting Pre-Intervention Baseline Measurement',
                          'நடவடிக்கைக்கு முந்தைய அடிப்படை அளவீட்டிற்காகக் காத்திருக்கிறது'
                        )}
                      </div>
                      <p className="mt-0.5 leading-relaxed">
                        {tr(
                          'Impact cannot be evaluated yet. Record a dated numerical baseline before executing the intervention so future changes are grounded in real measurements rather than estimates.',
                          'இன்னும் தாக்கத்தை மதிப்பிட முடியாது. உண்மையான மாற்றங்களைக் கணக்கிட முதலில் தேதியிட்ட அடிப்படை அளவீட்டைப் பதிவு செய்யவும்.'
                        )}
                      </p>
                    </div>
                  </div>
                ) : !hasValidComparison ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-xs">
                      <div className="text-slate-500 dark:text-slate-400">
                        {tr('Recorded Baseline', 'பதிவு செய்யப்பட்ட அடிப்படை')} ({trk.baseline.date})
                      </div>
                      <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {trk.baseline.value}{' '}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          {trk.unit}
                        </span>
                      </div>
                      {trk.baseline.notes && (
                        <p className="mt-1.5 text-slate-600 dark:text-slate-400">
                          {trk.baseline.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 p-4 text-xs text-amber-950 dark:text-amber-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                      <div>
                        <div className="font-semibold">
                          {tr(
                            'Follow-Up Measurement Required to Evaluate Impact',
                            'தாக்கத்தை மதிப்பிட பின்தொடர் அளவீடு தேவை'
                          )}
                        </div>
                        <p className="mt-0.5 leading-relaxed">
                          {tr(
                            'Baseline is locked in, but zero post-intervention follow-up measurements have been recorded yet. NEEDMAP AI never fabricates improvement percentages.',
                            'அடிப்படை அளவீடு பதிவு செய்யப்பட்டுள்ளது, ஆனால் பிந்தைய அளவீடுகள் இன்னும் இல்லை. NEEDMAP AI ஒருபோதும் கற்பனை சதவீதங்களை உருவாக்காது.'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-1 items-center gap-6 border-t border-slate-100 dark:border-slate-800 pt-5 lg:grid-cols-12">
                    {/* Numeric Before / After Summary */}
                    <div className="grid grid-cols-3 gap-3 text-xs lg:col-span-5">
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-3.5">
                        <div className="text-slate-500 dark:text-slate-400">
                          {tr('Baseline', 'அடிப்படை')}
                        </div>
                        <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {trk.baseline.value}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                          {trk.baseline.date}
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-3.5">
                        <div className="text-slate-500 dark:text-slate-400">
                          {tr('Latest', 'சமீபத்திய')}
                        </div>
                        <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {latestFollowUp!.value}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                          {latestFollowUp!.date}
                        </div>
                      </div>

                      <div
                        className={`rounded-lg p-3.5 ${
                          rawDelta === 0
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            : improved
                            ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-950 dark:text-teal-200'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200'
                        }`}
                      >
                        <div className="opacity-75">
                          {tr('Observed Change', 'கண்டறியப்பட்ட மாற்றம்')}
                        </div>
                        <div className="mt-1 font-mono text-xl font-bold tabular-nums">
                          {rawDelta > 0 ? `+${rawDelta}` : rawDelta}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] tabular-nums">
                          {pctChange !== null
                            ? `${pctChange > 0 ? `+${pctChange}` : pctChange}%`
                            : trk.unit}{' '}
                          (
                          {rawDelta === 0
                            ? tr('Unchanged', 'மாற்றமில்லை')
                            : improved
                            ? tr('Target Dir.', 'முன்னேற்றம்')
                            : tr('Regressed', 'பின்னடைவு')}
                          )
                        </div>
                      </div>
                    </div>

                    {/* Before-and-After SVG Bar Comparison */}
                    <div className="lg:col-span-7">
                      <svg
                        viewBox="0 0 440 120"
                        className="h-28 w-full"
                        role="img"
                        aria-label={`Before and after comparison chart for ${trk.metricName}`}
                      >
                        <line
                          x1="24"
                          x2="424"
                          y1="92"
                          y2="92"
                          className="stroke-slate-300 dark:stroke-slate-700"
                        />
                        {allPoints.map((pt, idx) => {
                          const slot = 380 / allPoints.length;
                          const bw = Math.min(44, Math.max(18, slot * 0.5));
                          const x = 34 + idx * slot + (slot - bw) / 2;
                          const bh = Math.max(6, (Math.abs(pt.value) / maxPointVal) * 68);
                          const y = 92 - bh;
                          return (
                            <g key={`${pt.label}-${idx}`}>
                              <text
                                x={x + bw / 2}
                                y={y - 5}
                                textAnchor="middle"
                                className="fill-slate-800 dark:fill-slate-200 font-mono text-[10px] font-semibold"
                              >
                                {pt.value}
                              </text>
                              <rect
                                x={x}
                                y={y}
                                width={bw}
                                height={bh}
                                rx="3"
                                className={
                                  pt.isBaseline
                                    ? 'fill-slate-400 dark:fill-slate-600'
                                    : improved
                                    ? 'fill-teal-600 dark:fill-teal-500'
                                    : 'fill-indigo-600 dark:fill-indigo-500'
                                }
                              />
                              <text
                                x={x + bw / 2}
                                y="108"
                                textAnchor="middle"
                                className="fill-slate-500 dark:fill-slate-400 font-mono text-[9.5px]"
                              >
                                {pt.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                )}

                {/* Measurement Log History */}
                {(trk.baseline || trk.followUps.length > 0) && (
                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {tr('Recorded Measurement Log', 'பதிவு செய்யப்பட்ட அளவீட்டு வரலாறு')}
                    </div>
                    <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {trk.baseline && (
                        <div className="flex items-center justify-between py-1.5">
                          <div>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              [{tr('Baseline', 'அடிப்படை')} · {trk.baseline.date}]{' '}
                              {trk.baseline.value} {trk.unit}
                            </span>
                            {trk.baseline.notes && (
                              <span className="ml-2 text-slate-500 dark:text-slate-400">
                                : {trk.baseline.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {trk.followUps.map((f, idx) => (
                        <div key={f.id} className="flex items-center justify-between py-1.5">
                          <div>
                            <span className="font-mono font-semibold text-teal-800 dark:text-teal-300">
                              [{tr('Follow-up', 'பின்தொடர்')} #{idx + 1} · {f.date}] {f.value}{' '}
                              {trk.unit}
                            </span>
                            {f.notes && (
                              <span className="ml-2 text-slate-500 dark:text-slate-400">
                                : {f.notes}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFollowUp(trk, f.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            aria-label="Delete follow-up measurement"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Record Baseline / Follow-up Modal */}
      {activeMeasurementModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="msr-modal-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2
                id="msr-modal-title"
                className="font-display text-base font-bold text-slate-900 dark:text-slate-100"
              >
                {activeMeasurementModal.mode === 'baseline'
                  ? tr('Record Baseline Measurement', 'அடிப்படை அளவீட்டைப் பதிவு செய்')
                  : tr('Add Post-Intervention Follow-Up', 'பின்தொடர் அளவீட்டைச் சேர்')}
              </h2>
              <button
                type="button"
                onClick={() => setActiveMeasurementModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeasurement} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Numerical Value', 'எண் மதிப்பு')}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={measureVal}
                  onChange={(e) => setMeasureVal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Measurement Date', 'அளவீட்டுத் தேதி')}
                </label>
                <input
                  type="date"
                  required
                  value={measureDate}
                  onChange={(e) => setMeasureDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Observation Method & Notes', 'கவனிப்பு முறை மற்றும் குறிப்புகள்')}
                </label>
                <textarea
                  rows={3}
                  value={measureNotes}
                  onChange={(e) => setMeasureNotes(e.target.value)}
                  placeholder={tr(
                    'How and when was this measured? (e.g., Timed 20 lunch orders at 12:45 PM)',
                    'இது எப்படி, எப்போது அளவிடப்பட்டது? (எ.கா., மதியம் 12:45 மணிக்கு 20 ஆர்டர்கள் கணக்கிடப்பட்டன)'
                  )}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              {measureError && (
                <p className="text-xs font-medium text-rose-700 dark:text-rose-400" role="alert">
                  {measureError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMeasurementModal(null)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {tr('Cancel', 'ரத்து செய்')}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800"
                >
                  {tr('Save Measurement', 'அளவீட்டைச் சேமி')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
