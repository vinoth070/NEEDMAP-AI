import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileWarning,
  HelpCircle,
  Sparkles,
  Wrench,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import type { FeedbackItem, ScoredOpportunity } from '../../types/needmap';

interface EvidenceExplorerViewProps {
  opportunities: ScoredOpportunity[];
  feedback: FeedbackItem[];
  selectedOpportunityId: string | null;
  onSelectOpportunity: (id: string) => void;
  onNavigateToFeedback: (feedbackId: string) => void;
  onOpenInterventionsForOpportunity: (opportunityId: string) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}

export const EvidenceExplorerView: React.FC<EvidenceExplorerViewProps> = ({
  opportunities,
  feedback,
  selectedOpportunityId,
  onSelectOpportunity,
  onNavigateToFeedback,
  onOpenInterventionsForOpportunity,
  onRunAnalysis,
  isAnalyzing,
}) => {
  const { tr, tCategory } = useI18n();

  const feedbackMap = useMemo(() => {
    const map = new Map<string, FeedbackItem>();
    feedback.forEach((f) => map.set(f.id, f));
    return map;
  }, [feedback]);

  const activeOpp = useMemo(
    () =>
      opportunities.find((o) => o.id === selectedOpportunityId) ||
      opportunities[0] ||
      null,
    [opportunities, selectedOpportunityId]
  );

  const supportingEntries = useMemo(() => {
    if (!activeOpp) return [];
    return activeOpp.relatedFeedbackIds
      .map((id) => feedbackMap.get(id))
      .filter((f): f is FeedbackItem => Boolean(f));
  }, [activeOpp, feedbackMap]);

  const contradictoryEntries = useMemo(() => {
    if (!activeOpp) return [];
    return activeOpp.contradictoryFeedbackIds
      .map((id) => feedbackMap.get(id))
      .filter((f): f is FeedbackItem => Boolean(f));
  }, [activeOpp, feedbackMap]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tr('Evidence Explorer', 'ஆதார ஆய்வாளர்')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            {tr(
              'Audit the ground-truth link between AI-generated opportunity clusters and verbatim source feedback, including confidence gaps and contradictory reports.',
              'AI உருவாக்கிய வாய்ப்புத் தொகுப்புகளுக்கும் அசல் பின்னூட்டங்களுக்கும் இடையிலான உண்மையான ஆதார இணைப்புகள், நம்பகத்தன்மை இடைவெளிகள் மற்றும் முரண்பாடான பதிவுகளை ஆய்வு செய்யுங்கள்.'
            )}
          </p>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <p className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {tr('No Evidence Clusters Available', 'ஆதாரத் தொகுப்புகள் எதுவும் இல்லை')}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(
              'Run AI analysis on your Feedback Inbox to inspect verified quotes and source links.',
              'சரிபார்க்கப்பட்ட மேற்கோள்கள் மற்றும் ஆதார இணைப்புகளைப் பார்க்க உங்கள் பின்னூட்ட இன்பாக்ஸில் AI பகுப்பாய்வை இயக்கவும்.'
            )}
          </p>
          <button
            type="button"
            onClick={onRunAnalysis}
            disabled={isAnalyzing || feedback.length === 0}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {tr('Analyze Feedback', 'பின்னூட்டத்தை பகுப்பாய்வு செய்')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Opportunity Selector Rail */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:col-span-4">
            <div className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {tr('Select Opportunity Cluster', 'வாய்ப்புத் தொகுப்பைத் தேர்ந்தெடுக்கவும்')} (
              {opportunities.length})
            </div>
            <div className="max-h-[640px] divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
              {opportunities.map((opp) => {
                const isSelected = activeOpp?.id === opp.id;
                const isUnverified = opp.priority.validSupportCount === 0;
                return (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => onSelectOpportunity(opp.id)}
                    className={`w-full px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-teal-900/60 dark:text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between font-mono text-[11px] tabular-nums ${
                        isSelected
                          ? 'text-slate-300 dark:text-teal-200'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>
                        {opp.id} · {opp.priority.validSupportCount}{' '}
                        {tr('entries', 'பதிவுகள்')}
                      </span>
                      <span>
                        {tr('Conf', 'நம்பிக்கை')} {opp.priority.confidenceScore}/100
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-xs font-semibold leading-snug ${
                        isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {opp.title}
                    </div>
                    {isUnverified && (
                      <div className="mt-1 text-[11px] font-medium text-rose-500 dark:text-rose-400">
                        {tr('Unverified : 0 matched records', 'சரிபார்க்கப்படாதது : 0 பொருத்தங்கள்')}
                      </div>
                    )}
                    {!isUnverified && opp.priority.contradictoryCount > 0 && (
                      <div
                        className={`mt-1 text-[11px] ${
                          isSelected
                            ? 'text-amber-300'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {tr(
                          `Includes ${opp.priority.contradictoryCount} scope/contradictory report`,
                          `${opp.priority.contradictoryCount} வரம்பு / முரண்பாடான பதிவு உள்ளது`
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evidence Audit Canvas */}
          {activeOpp && (
            <div className="space-y-6 lg:col-span-8">
              {/* Top Summary Header */}
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      <span>{activeOpp.id}</span>
                      <span>·</span>
                      <span className="font-sans">{tCategory(activeOpp.category)}</span>
                      <span>·</span>
                      <span>
                        {supportingEntries.length}{' '}
                        {tr('Verified Supporting Entries', 'சரிபார்க்கப்பட்ட ஆதரவுப் பதிவுகள்')}
                      </span>
                      <span>·</span>
                      <span>
                        {tr('Confidence', 'நம்பகத்தன்மை')} {activeOpp.priority.confidenceScore}/100
                      </span>
                    </div>
                    <h2 className="mt-1.5 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                      {activeOpp.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenInterventionsForOpportunity(activeOpp.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-teal-600"
                  >
                    <Wrench className="h-3.5 w-3.5 text-teal-400 dark:text-teal-200" />
                    {tr('View Interventions', 'தீர்வுத் திட்டங்களைக் காண்க')}
                  </button>
                </div>

                {/* Unverified Warning State if 0 Supporting Entries */}
                {supportingEntries.length === 0 && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-950 dark:text-rose-200">
                    <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-400" />
                    <div>
                      <div className="font-semibold">
                        {tr(
                          'Unverified Opportunity : No Supporting Feedback Confirmed',
                          'சரிபார்க்கப்படாத வாய்ப்பு : ஆதரவுப் பின்னூட்டம் உறுதிப்படுத்தப்படவில்லை'
                        )}
                      </div>
                      <p className="mt-0.5 leading-relaxed">
                        {tr(
                          'None of the feedback IDs associated with this cluster currently exist in the workspace inbox. NEEDMAP AI never fabricates supporting quotes; re-run analysis or verify source records.',
                          'இந்தத் தொகுப்புடன் தொடர்புடைய பின்னூட்ட எண்கள் தற்போது இன்பாக்ஸில் இல்லை. NEEDMAP AI ஒருபோதும் போலி மேற்கோள்களை உருவாக்காது; பகுப்பாய்வை மீண்டும் இயக்கவும்.'
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Clear Distinction Grid: Observed Evidence vs AI Interpretation */}
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Box 1: Observed Ground-Truth Metrics */}
                  <div className="rounded-lg border border-teal-200/70 dark:border-teal-800/70 bg-teal-50/50 dark:bg-teal-950/30 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-950 dark:text-teal-200">
                      <CheckCircle2 className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                      <span>
                        {tr(
                          'Observed Evidence (Ground-Truth Data)',
                          'உற்றுநோக்கப்பட்ட ஆதாரம் (உண்மைத் தரவு)'
                        )}
                      </span>
                    </div>
                    <ul className="mt-2.5 space-y-1.5 font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      <li>
                        {tr('Corroborating Inbox Entries:', 'ஆதரவு இன்பாக்ஸ் பதிவுகள்:')}{' '}
                        <strong>{supportingEntries.length}</strong>
                      </li>
                      <li>
                        {tr('Distinct Submission Sources:', 'தனித்துவமான ஆதார மூலங்கள்:')}{' '}
                        <strong>{activeOpp.priority.uniqueSourceCount}</strong>
                      </li>
                      <li>
                        {tr('Verified Quote Excerpts:', 'சரிபார்க்கப்பட்ட மேற்கோள்கள்:')}{' '}
                        <strong>{activeOpp.priority.verifiedExcerptCount}</strong>
                      </li>
                      <li>
                        {tr('Contradictory / Scope Reports:', 'முரண்பாடான / வரம்புப் பதிவுகள்:')}{' '}
                        <strong>{contradictoryEntries.length}</strong>
                      </li>
                    </ul>
                  </div>

                  {/* Box 2: AI-Generated Synthesis & Interpretation */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>
                        {tr('AI-Generated Interpretation', 'AI உருவாக்கிய விளக்கம்')} (
                        {activeOpp.analysisOrigin === 'live_ai'
                          ? tr('Live Gemini', 'நேரடி Gemini')
                          : tr('Sample Synthesis', 'மாதிரி தொகுப்பு')}
                        )
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                      {activeOpp.problemDescription}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <strong>{tr('Confidence Assessment:', 'நம்பகத்தன்மை மதிப்பீடு:')}</strong>{' '}
                      {activeOpp.aiConfidenceNote}
                    </p>
                  </div>
                </div>
              </section>

              {/* Highlighted Excerpts with Exact Verification Status */}
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {tr('Extracted Evidence Excerpts', 'பிரித்தெடுக்கப்பட்ட ஆதார மேற்கோள்கள்')}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {tr(
                    'Every excerpt is checked deterministically against original feedback text in your inbox.',
                    'ஒவ்வொரு மேற்கோளும் இன்பாக்ஸில் உள்ள அசல் பின்னூட்ட உரையுடன் நேரடியாகச் சரிபார்க்கப்படுகிறது.'
                  )}
                </p>

                {activeOpp.evidenceExcerpts.length === 0 ? (
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    {tr('No excerpts recorded for this cluster.', 'இந்தத் தொகுப்பிற்கு மேற்கோள்கள் இல்லை.')}
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {activeOpp.evidenceExcerpts.map((ex, idx) => {
                      const sourceItem = feedbackMap.get(ex.feedbackId);
                      return (
                        <div key={`${ex.feedbackId}-${idx}`} className="py-3.5 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5 font-mono text-slate-500 dark:text-slate-400">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                [{ex.feedbackId}]
                              </span>
                              {sourceItem && (
                                <>
                                  <span>·</span>
                                  <span className="font-sans">{sourceItem.source}</span>
                                  {sourceItem.date && (
                                    <>
                                      <span>·</span>
                                      <span>{sourceItem.date}</span>
                                    </>
                                  )}
                                  {sourceItem.isDemo && (
                                    <>
                                      <span>·</span>
                                      <span className="font-sans text-slate-400 dark:text-slate-500">
                                        {tr('Sample Demo', 'மாதிரி தரவு')}
                                      </span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`text-xs font-medium ${
                                  ex.verificationStatus === 'verified_exact'
                                    ? 'text-teal-700 dark:text-teal-400'
                                    : ex.verificationStatus === 'verified_matched'
                                    ? 'text-indigo-700 dark:text-indigo-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {ex.verificationStatus === 'verified_exact'
                                  ? tr('Verified Exact Quote', 'சரிபார்க்கப்பட்ட துல்லிய மேற்கோள்')
                                  : ex.verificationStatus === 'verified_matched'
                                  ? tr('Verified Token Match', 'சரிபார்க்கப்பட்ட சொல் பொருத்தம்')
                                  : tr('Unverified Excerpt', 'சரிபார்க்கப்படாத மேற்கோள்')}
                              </span>

                              {sourceItem && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToFeedback(ex.feedbackId)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 underline-offset-4 hover:text-teal-700 dark:hover:text-teal-400 hover:underline"
                                >
                                  {tr('Open Source', 'மூலத்தைத் திற')}
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <blockquote className="mt-2 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                            &ldquo;{ex.excerpt}&rdquo;
                          </blockquote>

                          {ex.isContradictory && (
                            <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-400">
                              {tr(
                                'Flagged as scope-refining or contradictory observation.',
                                'வரம்பை வரையறுக்கும் அல்லது முரண்பாடான கருத்தாகக் குறிக்கப்பட்டுள்ளது.'
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Potential Contradictory / Scope-Limiting Reports */}
              {contradictoryEntries.length > 0 && (
                <section className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <h3>
                      {tr(
                        'Contradictory or Scope-Refining Feedback',
                        'முரண்பாடான அல்லது வரம்பு-குறிக்கும் பின்னூட்டம்'
                      )}{' '}
                      ({contradictoryEntries.length})
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-300/80">
                    {tr(
                      'These entries report partial resolutions, opposing experiences, or narrower location boundaries so interventions are not misdirected.',
                      'நடவடிக்கைகள் தவறான இடத்திற்குச் செல்லாமல் இருக்க, பகுதித் தீர்வுகள் அல்லது குறுகிய இட எல்லைகளை இந்தப் பதிவுகள் காட்டுகின்றன.'
                    )}
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {contradictoryEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-amber-200 dark:border-amber-800/70 bg-white dark:bg-slate-900 p-3.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-slate-500 dark:text-slate-400">
                          <span>
                            {entry.id} · {entry.source} · {entry.date || tr('Undated', 'தேதியில்லாதது')}
                          </span>
                          <button
                            type="button"
                            onClick={() => onNavigateToFeedback(entry.id)}
                            className="font-sans font-medium text-teal-700 dark:text-teal-400 hover:underline"
                          >
                            {tr('Inspect in Inbox →', 'இன்பாக்ஸில் காண்க →')}
                          </button>
                        </div>
                        <p className="mt-1.5 leading-relaxed text-slate-800 dark:text-slate-200">
                          {entry.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Evidence Gaps & Uncertainties */}
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h3>
                    {tr(
                      'Evidence Gaps & Missing Information',
                      'ஆதார இடைவெளிகள் மற்றும் விடுபட்ட தகவல்கள்'
                    )}
                  </h3>
                </div>
                {activeOpp.informationGaps.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {tr(
                      'No major information gaps flagged for this opportunity.',
                      'இந்த வாய்ப்பிற்கு முக்கிய தகவல் இடைவெளிகள் எதுவும் குறிக்கப்படவில்லை.'
                    )}
                  </p>
                ) : (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {activeOpp.informationGaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                )}
              </section>

              {/* All Original Supporting Feedback Records */}
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {tr('All Supporting Feedback Records', 'அனைத்து ஆதரவுப் பின்னூட்டப் பதிவுகள்')} (
                  {supportingEntries.length})
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {tr(
                    'Complete, unedited user submissions linked to this opportunity cluster.',
                    'இந்த வாய்ப்புத் தொகுப்புடன் இணைக்கப்பட்ட முழுமையான, திருத்தப்படாத பயனர் பதிவுகள்.'
                  )}
                </p>

                {supportingEntries.length === 0 ? (
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    {tr(
                      'Zero verified inbox entries currently support this cluster.',
                      'தற்போது இந்தத் தொகுப்பிற்கு சரிபார்க்கப்பட்ட பதிவுகள் எதுவும் இல்லை.'
                    )}
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {supportingEntries.map((fb) => (
                      <div key={fb.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex flex-wrap items-center gap-1.5 font-mono tabular-nums">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {fb.id}
                            </span>
                            <span>·</span>
                            <span className="font-sans">{fb.source}</span>
                            <span>·</span>
                            <span>{fb.date || tr('Undated', 'தேதியில்லாதது')}</span>
                            <span>·</span>
                            <span className="font-sans">
                              {tr('Submitter Impact:', 'பயனர் தாக்கம்:')} {fb.reportedImpact}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigateToFeedback(fb.id)}
                            className="inline-flex items-center gap-1 font-medium text-teal-700 dark:text-teal-400 hover:underline"
                          >
                            {tr('View / Edit in Inbox', 'இன்பாக்ஸில் பார் / திருத்து')}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                          {fb.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
