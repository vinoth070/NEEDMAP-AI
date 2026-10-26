import { useEffect } from 'react';
import type { WorkspaceViewId } from '../types/needmap';

interface UseKeyboardShortcutsOptions {
  onSelectView: (view: WorkspaceViewId) => void;
  onOpenShortcutsModal: () => void;
  onCloseAnyModal?: () => void;
  onQuickSave: () => void;
  onFocusSearch?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSelectView,
  onOpenShortcutsModal,
  onCloseAnyModal,
  onQuickSave,
  onFocusSearch,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      // Escape always works
      if (e.key === 'Escape') {
        onCloseAnyModal?.();
        return;
      }

      // Quick Save: Ctrl+S or Cmd+S (works even inside inputs)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onQuickSave();
        return;
      }

      // If typing in an input field, do not trigger single-key or navigation shortcuts
      if (isInput) return;

      // Global Search: Ctrl+K, Cmd+K, or slash "/"
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || e.key === '/') {
        e.preventDefault();
        if (onFocusSearch) {
          onFocusSearch();
        } else {
          const searchInput = document.querySelector<HTMLInputElement>('[data-global-search]');
          searchInput?.focus();
        }
        return;
      }

      // Help / Cheatsheet: "?" key (Shift + /)
      if (e.key === '?') {
        e.preventDefault();
        onOpenShortcutsModal();
        return;
      }

      // Number Navigation: Ctrl+1 through Ctrl+9 or Alt+1 through Alt+9
      const isModifier = e.ctrlKey || e.metaKey || e.altKey;
      if (isModifier) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            onSelectView('overview');
            break;
          case '2':
            e.preventDefault();
            onSelectView('report_problem');
            break;
          case '3':
            e.preventDefault();
            onSelectView('my_complaints');
            break;
          case '4':
            e.preventDefault();
            onSelectView('central_registry');
            break;
          case '5':
            e.preventDefault();
            onSelectView('opportunities');
            break;
          case '6':
            e.preventDefault();
            onSelectView('department_portal');
            break;
          case '7':
            e.preventDefault();
            onSelectView('worker_portal');
            break;
          case '8':
            e.preventDefault();
            onSelectView('jobs_portal');
            break;
          case '9':
            e.preventDefault();
            onSelectView('settings');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onSelectView, onOpenShortcutsModal, onCloseAnyModal, onQuickSave, onFocusSearch]);
}
