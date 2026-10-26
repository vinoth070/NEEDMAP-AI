import React from 'react';
import {
  ClipboardList,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Printer,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import type {
  AnalysisOrigin,
  AnalysisRunLog,
  ComplaintRecord,
  Department,
  FeedbackItem,
  ImpactMetricTracker,
  InterventionItem,
  PriorityWeights,
  ScoredOpportunity,
  UserAccount,
} from '../../types/needmap';
import {
  exportAnalysisToJson,
  exportComplaintsToCsv,
  exportFeedbackToCsv,
  exportPrintableHtmlReport,
} from '../../utils/exporters';
import { normalizeWeights } from '../../utils/priorityEngine';

interface ReportsExportViewProps {
  workspaceName: string;
  workspaceContext: string;
  analysisOrigin: AnalysisOrigin | null;
  lastAnalyzedAt: string | null;
  weights: PriorityWeights;
  feedback: FeedbackItem[];
  analyzedFeedbackIds: string[];
  opportunities: ScoredOpportunity[];
  interventions: InterventionItem[];
  impactTrackers: ImpactMetricTracker[];
  analysisLogs: AnalysisRunLog[];
  complaints: ComplaintRecord[];
  departments: Department[];
  activeAccount: UserAccount;
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({
  workspaceName,
  workspaceContext,
  analysisOrigin,
  lastAnalyzedAt,
  weights,
  feedback,
  analyzedFeedbackIds,
  opportunities,
  interventions,
  impactTrackers,
  analysisLogs,
  complaints,
  departments,
  activeAccount,
}) => {
  const { tr, tCategory, tPriority } = useI18n();
  const analyzedSet = new Set(analyzedFeedbackIds);
  const effWeights = normalizeWeights(weights);
  const hasAnyData =
    feedback.length > 0 || opportunities.length > 0 || complaints.length > 0;

  const latestNarrative =
    analysisLogs[0]?.summaryNarrative ||
    (opportunities.length > 0
      ? tr(
          `Synthesized ${opportunities.length} opportunity clusters from ${feedback.length} feedback items.`,
          `${feedback.length} பின்னூட்டங்களிலிருந்து ${opportunities.length} வாய்ப்புத் தொகுப்புகள் உருவாக்கப்பட்டுள்ளன.`
        )
      : tr(
          'No AI analysis summary has been generated yet.',
          'இன்னும் AI பகுப்பாய்வு சுருக்கம் உருவாக்கப்படவில்லை.'
        ));

  return (
    <div className="space-y-6">
      {/* Screen Header & Functional Export Buttons */}
      <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tr('Reports & Export', 'அறிக்கைகள் மற்றும் ஏற்றுமதி')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            {tr(
              'Generate stakeholder-ready summaries and export privacy-safe complaints CSV, feedback CSV, prioritized opportunity JSON, or a printable PDF-ready HTML report.',
              'புகார்கள் CSV, பின்னூட்டங்கள் CSV, முன்னுரிமை JSON அல்லது அச்சிடக்கூடிய PDF/HTML அறிக்கைகளை உருவாக்கிப் பதிவிறக்கவும்.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={complaints.length === 0}
            onClick={() =>
              exportComplaintsToCsv({
                complaints,
                departments,
                viewer: activeAccount,
                workspaceName,
              })
            }
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ClipboardList className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            {tr('Complaints CSV', 'புகார்கள் CSV')}
          </button>

          <button
            type="button"
            disabled={feedback.length === 0}
            onClick={() =>
              exportFeedbackToCsv(feedback, analyzedSet, opportunities, workspaceName)
            }
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            {tr('Feedback CSV', 'பின்னூட்டம் CSV')}
          </button>

          <button
            type="button"
            disabled={opportunities.length === 0}
            onClick={() =>
              exportAnalysisToJson({
                workspaceName,
                workspaceContext,
                analysisOrigin,
                lastAnalyzedAt,
                weights,
                feedbackCount: feedback.length,
                opportunities,
                interventions,
                impactTrackers,
                complaintsCount: complaints.length,
              })
            }
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileCode2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {tr('Analysis JSON', 'பகுப்பாய்வு JSON')}
          </button>

          <button
            type="button"
            disabled={!hasAnyData}
            onClick={() =>
              exportPrintableHtmlReport({
                workspaceName,
                workspaceContext,
                analysisOrigin,
                lastAnalyzedAt,
                weights,
                feedback,
                opportunities,
                interventions,
                impactTrackers,
                complaints,
              })
            }
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            {tr('Printable HTML', 'அச்சு HTML')}
          </button>

          <button
            type="button"
            disabled={!hasAnyData}
            onClick={() => window.print()}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 dark:bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4 text-teal-400 dark:text-teal-200" />
            {tr('Print / Save PDF', 'அச்சிடு / PDF சேமி')}
          </button>
        </div>
      </div>

      {!hasAnyData ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <FileText className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {tr('No Data Available to Export', 'ஏற்றுமதி செய்ய தரவு எதுவும் இல்லை')}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {tr(
              'Your workspace currently has zero complaints, feedback items, and analyzed opportunities. Submit a report or load the sample dataset first.',
              'தற்போது புகார்கள் அல்லது பின்னூட்டங்கள் எதுவும் இல்லை. முதலில் சிக்கலைப் பதிவு செய்யவும் அல்லது மாதிரித் தரவை ஏற்றவும்.'
            )}
          </p>
        </div>
      ) : (
        /* Printable Executive Report Document */
        <div className="space-y-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
          {/* Report Masthead */}
          <header className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
              <span>
                {tr(
                  'NEEDMAP AI · EXECUTIVE SERVICE & OPPORTUNITY REPORT',
                  'NEEDMAP AI · நிர்வாக சேவை மற்றும் வாய்ப்பு அறிக்கை'
                )}
              </span>
              <span>
                {tr('Generated', 'உருவாக்கப்பட்டது')} {new Date().toLocaleDateString()}
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              {workspaceName}
            </h2>
            {workspaceContext && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{workspaceContext}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>
                <strong>{tr('Analysis Source:', 'பகுப்பாய்வு மூலம்:')}</strong>{' '}
                {analysisOrigin === 'live_ai'
                  ? tr('Live Gemini AI Analysis (Evidence-Verified)', 'நேரடி Gemini AI பகுப்பாய்வு')
                  : analysisOrigin === 'sample_demo'
                  ? tr('Illustrative Sample Demo Analysis', 'மாதிரி விளக்கப் பகுப்பாய்வு')
                  : tr('Unanalyzed Inbox', 'பகுப்பாய்வு செய்யப்படாத இன்பாக்ஸ்')}
              </span>
              {lastAnalyzedAt && (
                <>
                  <span>·</span>
                  <span className="font-mono tabular-nums">
                    {tr('Last Run:', 'கடைசி இயக்கம்:')} {new Date(lastAnalyzedAt).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </header>

          {/* 1. Analysis Overview & Volume Summary */}
          <section className="print-break-inside-avoid space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              {tr(
                '1. Service Requests, Feedback Volume & Overview',
                '1. சேவைப் புகார்கள், பின்னூட்ட அளவு மற்றும் சுருக்கம்'
              )}
            </h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {latestNarrative}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-1 sm:grid-cols-5">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tr('Complaints Logged', 'மொத்த புகார்கள்')}
                </div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {complaints.length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tr('Feedback Volume', 'பின்னூட்ட எண்ணிக்கை')}
                </div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {feedback.length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tr('Recurring Clusters (≥2)', 'மீண்டும் வரும் சிக்கல்கள்')}
                </div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {opportunities.filter((o) => o.priority.validSupportCount >= 2).length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tr('High Priority (≥70)', 'அதிக முன்னுரிமை (≥70)')}
                </div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {opportunities.filter((o) => o.priority.tier === 'High').length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {tr('Planned / Active Actions', 'திட்டமிட்ட / செயலில் உள்ளவை')}
                </div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {
                    interventions.filter(
                      (i) =>
                        i.status === 'Planned' ||
                        i.status === 'In Progress' ||
                        i.status === 'Completed'
                    ).length
                  }
                </div>
              </div>
            </div>
          </section>

          {/* 2. Priority Ranking Table */}
          <section className="print-break-inside-avoid space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                {tr('2. Transparent Priority Ranking', '2. வெளிப்படையான முன்னுரிமைப் பட்டியல்')}
              </h3>
              <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {tr('Weights:', 'எடைகள்:')} Freq {Math.round(effWeights.frequency * 100)}% · Impact{' '}
                {Math.round(effWeights.impact * 100)}% · Urgency{' '}
                {Math.round(effWeights.urgency * 100)}% · Conf{' '}
                {Math.round(effWeights.confidence * 100)}%
              </span>
            </div>

            {opportunities.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(
                  'No opportunities ranked yet. Run AI analysis first.',
                  'இன்னும் வாய்ப்புகள் வரிசைப்படுத்தப்படவில்லை. முதலில் AI பகுப்பாய்வை இயக்கவும்.'
                )}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                      <th className="px-3 py-2.5">{tr('Rank', 'தரம்')}</th>
                      <th className="px-3 py-2.5">{tr('Opportunity', 'வாய்ப்புத் தொகுப்பு')}</th>
                      <th className="px-3 py-2.5">{tr('Category', 'வகை')}</th>
                      <th className="px-3 py-2.5 text-right">{tr('Reports', 'பதிவுகள்')}</th>
                      <th className="px-3 py-2.5 text-right">Freq / Imp / Urg / Conf</th>
                      <th className="px-3 py-2.5 text-right">{tr('Score', 'மதிப்பெண்')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {opportunities.map((opp, idx) => (
                      <tr key={opp.id}>
                        <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                          #{idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {opp.title}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                          {tCategory(opp.category)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {opp.priority.validSupportCount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {opp.priority.frequencyScore} / {opp.priority.impactScore} /{' '}
                          {opp.priority.urgencyScore} / {opp.priority.confidenceScore}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {opp.priority.totalScore}/100 ({tPriority(opp.priority.tier)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 3. Detailed Recurring Issues, Evidence, Interventions & Gaps */}
          {opportunities.length > 0 && (
            <section className="space-y-5">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                {tr(
                  '3. Detailed Opportunity Evidence, Interventions & Impact Status',
                  '3. விரிவான ஆதாரங்கள், தீர்வுத் திட்டங்கள் மற்றும் தாக்க நிலை'
                )}
              </h3>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {opportunities.map((opp, idx) => {
                  const oppInts = interventions.filter((i) => i.opportunityId === opp.id);
                  const oppTrackers = impactTrackers.filter((t) => t.opportunityId === opp.id);

                  return (
                    <article
                      key={opp.id}
                      className="print-break-inside-avoid space-y-3 py-6 first:pt-2 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {tr('Rank', 'தரம்')} #{idx + 1} · {opp.id} · {tCategory(opp.category)} ·{' '}
                            {opp.priority.validSupportCount}{' '}
                            {tr('verified entries', 'சரிபார்க்கப்பட்ட பதிவுகள்')}
                          </div>
                          <h4 className="mt-1 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                            {opp.title}
                          </h4>
                        </div>
                        <div className="shrink-0 font-mono text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {opp.priority.totalScore}/100
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        {opp.problemDescription}
                      </p>

                      {/* Evidence Excerpts */}
                      <div className="text-xs">
                        <strong className="text-slate-900 dark:text-slate-100">
                          {tr('Verified Evidence Excerpts:', 'சரிபார்க்கப்பட்ட ஆதார மேற்கோள்கள்:')}
                        </strong>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
                          {opp.evidenceExcerpts.slice(0, 3).map((ex, i) => (
                            <li key={i}>
                              <span className="font-mono text-slate-800 dark:text-slate-200">
                                [{ex.feedbackId}]
                              </span>{' '}
                              &ldquo;{ex.excerpt}&rdquo;
                              {ex.isContradictory && (
                                <span className="text-amber-800 dark:text-amber-400">
                                  {' '}
                                  ({tr('Scope/Contradictory', 'வரம்பு/முரண்பாடு')})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Evidence Gaps */}
                      {opp.informationGaps.length > 0 && (
                        <div className="text-xs">
                          <strong className="text-slate-900 dark:text-slate-100">
                            {tr('Evidence Gaps:', 'ஆதார இடைவெளிகள்:')}
                          </strong>{' '}
                          <span className="text-slate-600 dark:text-slate-400">
                            {opp.informationGaps.join(' · ')}
                          </span>
                        </div>
                      )}

                      {/* Recommended Interventions */}
                      <div className="text-xs">
                        <strong className="text-slate-900 dark:text-slate-100">
                          {tr('Recommended Interventions:', 'பரிந்துரைக்கப்பட்ட தீர்வுகள்:')}
                        </strong>
                        {oppInts.length === 0 ? (
                          <span className="ml-1 text-slate-500 dark:text-slate-400">
                            {tr('None recorded.', 'ஏதுமில்லை.')}
                          </span>
                        ) : (
                          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
                            {oppInts.map((intItem) => (
                              <li key={intItem.id}>
                                <strong>{intItem.title}</strong> : {tr('Status:', 'நிலை:')}{' '}
                                {intItem.status} · {tr('Effort:', 'முயற்சி:')} {intItem.effort} ·{' '}
                                {tr('Owner:', 'பொறுப்பு:')} {intItem.responsibleRole}
                                {intItem.userNotes ? ` · ${intItem.userNotes}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Impact Tracking Status */}
                      <div className="text-xs">
                        <strong className="text-slate-900 dark:text-slate-100">
                          {tr('Impact-Tracking Status:', 'தாக்கக் கண்காணிப்பு நிலை:')}
                        </strong>{' '}
                        {oppTrackers.length === 0 ? (
                          <span className="text-slate-500 dark:text-slate-400">
                            {tr(
                              'No baseline measurements recorded yet.',
                              'இன்னும் அடிப்படை அளவீடுகள் பதிவு செய்யப்படவில்லை.'
                            )}
                          </span>
                        ) : (
                          oppTrackers.map((trk) => {
                            const latest =
                              trk.followUps.length > 0
                                ? trk.followUps[trk.followUps.length - 1]
                                : null;
                            return (
                              <span
                                key={trk.id}
                                className="mt-0.5 block font-mono text-slate-700 dark:text-slate-300"
                              >
                                {trk.metricName}:{' '}
                                {trk.baseline
                                  ? `Baseline ${trk.baseline.value} ${trk.unit} (${trk.baseline.date})`
                                  : 'Baseline pending'}
                                {' → '}
                                {latest
                                  ? `Latest ${latest.value} ${trk.unit} (${latest.date})`
                                  : 'Awaiting post-intervention measurement'}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
