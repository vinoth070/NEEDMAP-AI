import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ComplaintCategory,
  ComplaintStatus,
  LanguageCode,
  PriorityTier,
  UserRole,
} from '../types/needmap';
import type { SentimentLabel } from '../utils/sentiment';
import { SUPPORTED_LANGUAGES, getLanguageMeta } from './languages';
import {
  translateCategory,
  translateKey,
  translatePhrase,
  translatePriority,
  translateRole,
  translateSentiment,
  translateStatus,
} from './translations';

const LANG_STORAGE_KEY = 'needmap_ai_lang_v1';

const VALID_LANG_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

interface I18nContextValue {
  lang: LanguageCode;
  setLang: (next: LanguageCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tr: (enText: string, taText?: string, other?: Partial<Record<LanguageCode, string>>) => string;
  tCategory: (cat: ComplaintCategory | string) => string;
  tStatus: (status: ComplaintStatus) => string;
  tRole: (role: UserRole) => string;
  tPriority: (tier: PriorityTier) => string;
  tSentiment: (label: SentimentLabel) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): LanguageCode {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY) as LanguageCode;
      if (saved && VALID_LANG_CODES.has(saved)) {
        return saved;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LanguageCode>(getInitialLanguage);

  useEffect(() => {
    const meta = getLanguageMeta(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = meta.dir;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LANG_STORAGE_KEY, lang);
      }
    } catch {
      // Ignore storage write errors
    }
  }, [lang]);

  const setLang = useCallback((next: LanguageCode) => {
    if (VALID_LANG_CODES.has(next)) {
      setLangState(next);
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const meta = getLanguageMeta(lang);
    return {
      lang,
      setLang,
      t: (key, vars) => translateKey(lang, key, vars),
      tr: (enText, taText, other) => translatePhrase(lang, enText, taText, other),
      tCategory: (cat) => translateCategory(lang, cat),
      tStatus: (status) => translateStatus(lang, status),
      tRole: (role) => translateRole(lang, role),
      tPriority: (tier) => translatePriority(lang, tier),
      tSentiment: (label) => translateSentiment(lang, label),
      isRtl: meta.dir === 'rtl',
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
