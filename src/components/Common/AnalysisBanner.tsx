import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "./Icons";
import { useI18n } from '../../i18n/I18nContext';
import type { AnalysisOrigin, AnalysisProgress } from '../../types/needmap';

interface AnalysisBannerProps {
  progress: AnalysisProgress;
  analysisError: string | null;
  onDismissError: () => void;
  onRetryAnalysis: () => void;
  onRunDemoAnalysis?: () => void;
  onLoadSampleResults: () => void;
  analysisOrigin: AnalysisOrigin | null;
  totalFeedbackCount: number;
  unanalyzedCount: number;
  successMessage: string | null;
  onDismissSuccess: () => void;
}

/**
 * Contained status alert card rendered inside the workspace container (never as a glued
 * horizontal line colliding with the top navigation bar).
 */
export const AnalysisBanner: React.FC<AnalysisBannerProps> = ({
  progress,
  analysisError,
  onDismissError,
  onRetryAnalysis,
  onRunDemoAnalysis,
  onLoadSampleResults,
  totalFeedbackCount,
  unanalyzedCount,
  successMessage,
  onDismissSuccess,
}) => {
  const { tr } = useI18n();

  if (progress.isAnalyzing) {
    const pct =
      progress.totalBatches > 0
        ? Math.min(95, Math.round((progress.currentBatch / progress.totalBatches) * 85) + 10)
        : 35;

    return (
      <div
        className="no-print mb-6 rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-3.5 dark:border-indigo-900/70 dark:bg-indigo-950/40"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-sm font-medium text-indigo-950 dark:text-indigo-200">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-700 dark:text-indigo-400" />
            <span>{progress.stageMessage}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-indigo-800 dark:text-indigo-300 tabular-nums whitespace-nowrap">
              {tr('Batch', 'தொகுதி')} {progress.currentBatch}/{progress.totalBatches}
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-900">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-400 transition-transform duration-200 origin-left"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (analysisError) {
    return (
      <div
        className="no-print mb-6 rounded-xl border border-rose-200 bg-rose-50/95 px-4 py-3.5 dark:border-rose-900/70 dark:bg-rose-950/40"
        role="alert"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700 dark:text-rose-400" />
            <div className="text-sm text-rose-950 dark:text-rose-200">
              <span className="font-semibold">
                {tr('Live AI Analysis Unavailable: ', 'நேரடி AI பகுப்பாய்வு கிடைக்கவில்லை: ')}
              </span>
              <span>{analysisError}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {totalFeedbackCount > 0 && (
              <button
                type="button"
                onClick={onRetryAnalysis}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {tr('Retry Live Analysis', 'மீண்டும் AI பகுப்பாய்வு செய்')}
              </button>
            )}
            {onRunDemoAnalysis && totalFeedbackCount > 0 && (
              <button
                type="button"
                onClick={onRunDemoAnalysis}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {tr('Run Demo Analysis (Offline Engine)', 'மாதிரி பகுப்பாய்வு (Offline)')}
              </button>
            )}
            <button
              type="button"
              onClick={onLoadSampleResults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-900 transition-colors hover:bg-rose-100/50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 whitespace-nowrap shrink-0"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              {tr('Explore Sample Demo Results', 'மாதிரி முடிவுகளைக் காண்க')}
            </button>
            <button
              type="button"
              onClick={onDismissError}
              className="rounded-lg p-1 text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
              aria-label={tr('Dismiss error message', 'பிழைச் செய்தியை மூடு')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div
        className="no-print mb-6 rounded-xl border border-teal-200 bg-teal-50/90 px-4 py-3 dark:border-teal-900/70 dark:bg-teal-950/40"
        role="status"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-teal-950 dark:text-teal-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={onDismissSuccess}
            className="rounded-lg p-1 text-teal-700 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            aria-label={tr('Dismiss message', 'செய்தியை மூடு')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (unanalyzedCount > 0 && totalFeedbackCount > 0) {
    return (
      <div className="no-print mb-6 rounded-xl border border-amber-200 bg-amber-50/85 px-4 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/35">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950 dark:text-amber-200">
          <span>
            <strong className="font-mono font-semibold tabular-nums">
              {unanalyzedCount}
            </strong>{' '}
            {tr(
              `new or edited feedback ${unanalyzedCount === 1 ? 'item is' : 'items are'} ready for AI clustering.`,
              `புதிய அல்லது திருத்தப்பட்ட கருத்துப் பதிவுகள் AI பகுப்பாய்வுக்குத் தயாராக உள்ளன.`
            )}
          </span>
          <button
            type="button"
            onClick={onRetryAnalysis}
            className="inline-flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300 underline-offset-4 hover:underline whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {tr('Analyze Updated Inbox', 'புதிய பதிவுகளைப் பகுப்பாய்வு செய்')}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
