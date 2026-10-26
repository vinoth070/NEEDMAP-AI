import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  HelpCircle,
  Info,
  Layers,
  Sliders,
  Sparkles,
} from "./Icons";
import { useI18n } from '../../i18n/I18nContext';

interface PriorityMatrixLegendProps {
  compact?: boolean;
}

export const PriorityMatrixLegend: React.FC<PriorityMatrixLegendProps> = ({ compact = false }) => {
  const { t, tr } = useI18n();
  const [isOpen, setIsOpen] = useState(!compact);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <h4 className="font-display text-xs font-bold tracking-tight text-slate-900 uppercase dark:text-slate-100">
            {t('legend.title')}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded px-1.5 py-0.5"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>{t('legend.whatColorsMean')}</span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 space-y-3.5 text-xs">
          {/* Color Breakdown with Text Labels, Patterns & Icons */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {/* Red / High */}
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 dark:border-rose-900/60 dark:bg-rose-950/30">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold">
                !
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-rose-950 dark:text-rose-200">
                  {tr('Red : High Priority', 'சிவப்பு : அதிக முன்னுரிமை')}
                </div>
                <div className="text-[11px] text-rose-800/90 dark:text-rose-300">
                  {tr('Score 70–100 · Urgent review & fast-track dispatch', 'புள்ளிகள் 70–100 · உடனடி கவனம் & பணி ஒதுக்கீடு')}
                </div>
              </div>
            </div>

            {/* Amber / Medium */}
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold">
                ▲
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-amber-950 dark:text-amber-200">
                  {tr('Amber : Medium Priority', 'மஞ்சள் : நடுத்தர முன்னுரிமை')}
                </div>
                <div className="text-[11px] text-amber-800/90 dark:text-amber-300">
                  {tr('Score 45–69 · Scheduled cycle fix & monitoring', 'புள்ளிகள் 45–69 · திட்டமிட்ட பராமரிப்பு')}
                </div>
              </div>
            </div>

            {/* Green / Low */}
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold">
                ●
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-emerald-950 dark:text-emerald-200">
                  {tr('Green : Lower Priority', 'பச்சை : குறைந்த முன்னுரிமை')}
                </div>
                <div className="text-[11px] text-emerald-800/90 dark:text-emerald-300">
                  {tr('Score 0–44 · Log & address as routine maintenance', 'புள்ளிகள் 0–44 · வழக்கமான கண்காணிப்பு')}
                </div>
              </div>
            </div>

            {/* Grey / Unverified */}
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white font-mono text-[10px] font-bold">
                ?
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {tr('Grey : Unverified / Missing', 'சாம்பல் : உறுதிப்படுத்தப்படாதவை')}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  {tr('Needs site check or additional reports', 'நேரடி களச் சரிபார்ப்பு தேவை')}
                </div>
              </div>
            </div>
          </div>

          {/* Formula & Matrix Axes Guide */}
          <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span>{t('legend.formula')}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(
                  'Deterministic mathematical score calculated from 0 to 100 based on verified feedback volume, severity level, urgency, and quote overlap.',
                  'உறுதிசெய்யப்பட்ட கருத்துகளின் எண்ணிக்கை, தாக்கம், அவசரம் ஆகியவற்றின் அடிப்படையில் 0 முதல் 100 வரை கணக்கிடப்படுகிறது.'
                )}
              </div>
            </div>
            <div className="shrink-0 space-y-0.5 border-t border-slate-200 pt-2 font-mono text-[11px] sm:border-t-0 sm:pt-0 dark:border-slate-700">
              <div>{t('legend.axisUrgency')}</div>
              <div>{t('legend.axisImpact')}</div>
              <div className="text-teal-700 dark:text-teal-400">{t('legend.bubbleSize')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
