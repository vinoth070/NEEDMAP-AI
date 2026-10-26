import React, { useEffect } from 'react';
import { Command, Keyboard, X } from "./Icons";
import { useI18n } from '../../i18n/I18nContext';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, tr } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const portalShortcuts = [
    { key: `${modKey} + 1`, label: t('nav.overview'), target: 'Overview Dashboard' },
    { key: `${modKey} + 2`, label: t('nav.report_problem'), target: 'Geo-tagged Submission' },
    { key: `${modKey} + 3`, label: t('nav.my_complaints'), target: 'Reporter Tracking' },
    { key: `${modKey} + 4`, label: t('nav.central_registry'), target: 'Single Source of Truth' },
    { key: `${modKey} + 5`, label: t('nav.opportunities'), target: 'Cluster & Opportunity Map' },
    { key: `${modKey} + 6`, label: t('nav.department_portal'), target: 'Dispatcher Queue' },
    { key: `${modKey} + 7`, label: t('nav.worker_portal'), target: 'Field Task Orders' },
    { key: `${modKey} + 8`, label: t('nav.jobs_portal'), target: 'Workforce Marketplace' },
    { key: `${modKey} + 9`, label: t('nav.settings'), target: 'Preferences & Storage' },
  ];

  const actionShortcuts = [
    {
      key: `${modKey} + S`,
      title: t('common.save'),
      description: tr('Instantly saves current workspace to browser localStorage.', 'பணியிடத்தை உடனடியாக சேமிக்கும்.'),
    },
    {
      key: `${modKey} + K  /  /`,
      title: t('common.search'),
      description: tr('Focuses the global search bar across complaints, feedback & issues.', 'தேடல் பட்டியை செயல்படுத்துகிறது.'),
    },
    {
      key: '?',
      title: t('shortcuts.title'),
      description: tr('Toggles this keyboard shortcuts cheatsheet modal.', 'இந்த குறுக்குவழிகள் சாளரத்தைத் திறக்கும்.'),
    },
    {
      key: 'Esc',
      title: t('common.close'),
      description: tr('Closes active drawers, modals, or notification panels.', 'திறந்திருக்கும் சாளரங்களை மூடும்.'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('shortcuts.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('shortcuts.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Portal Navigation */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3">
              <Command className="h-3.5 w-3.5" />
              <span>{t('shortcuts.navigation')} (1–9)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {portalShortcuts.map((sc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {sc.label}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {sc.target}
                    </p>
                  </div>
                  <kbd className="shrink-0 px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Common Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-3">
              <Keyboard className="h-3.5 w-3.5" />
              <span>{t('shortcuts.actions')}</span>
            </div>
            <div className="space-y-2">
              {actionShortcuts.map((act, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {act.description}
                    </p>
                  </div>
                  <kbd className="shrink-0 px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs">
                    {act.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
          <span>{t('shortcuts.closeHint')}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-teal-800 dark:bg-teal-700 px-4 py-1.5 font-medium text-white hover:bg-teal-900 dark:hover:bg-teal-600 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
