import type {
  ComplaintCategory,
  ComplaintStatus,
  LanguageCode,
  PriorityTier,
  UserRole,
} from '../types/needmap';
import type { SentimentLabel } from '../utils/sentiment';
import { ar } from './locales/ar';
import { bn } from './locales/bn';
import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { gu } from './locales/gu';
import { hi } from './locales/hi';
import { ja } from './locales/ja';
import { kn } from './locales/kn';
import { ml } from './locales/ml';
import { mr } from './locales/mr';
import { or } from './locales/or';
import { pa } from './locales/pa';
import { pt } from './locales/pt';
import { ta } from './locales/ta';
import { te } from './locales/te';
import { ur } from './locales/ur';
import { zh } from './locales/zh';

export const UI_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en,
  ta,
  hi,
  te,
  kn,
  ml,
  bn,
  mr,
  gu,
  pa,
  ur,
  or,
  es,
  fr,
  de,
  ar,
  pt,
  ja,
  zh,
};

/**
 * Translates a key for a given language code, substituting template vars {varName}.
 * If the key is not found in the target language, falls back to English, then the key itself.
 */
export function translateKey(
  lang: LanguageCode,
  key: string,
  vars?: Record<string, string | number>
): string {
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.en;
  let template = dict[key] ?? UI_TRANSLATIONS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replaceAll(`{${k}}`, String(v));
    }
  }
  return template;
}

/**
 * Universal phrase translation map to prevent English scattering when components use tr('phrase', 'tamil')
 */
const PHRASE_LOOKUP_MAP: Record<string, Record<LanguageCode, string>> = {};

// Build reverse lookup from English string values in en locale
(function buildPhraseLookup() {
  for (const [key, enVal] of Object.entries(en)) {
    if (!PHRASE_LOOKUP_MAP[enVal]) {
      const entry = {} as Record<LanguageCode, string>;
      for (const langCode of Object.keys(UI_TRANSLATIONS) as LanguageCode[]) {
        entry[langCode] = UI_TRANSLATIONS[langCode]?.[key] || enVal;
      }
      PHRASE_LOOKUP_MAP[enVal] = entry;
    }
  }
})();

export function translatePhrase(
  lang: LanguageCode,
  enText: string,
  taText?: string,
  other?: Partial<Record<LanguageCode, string>>
): string {
  if (lang === 'en') return enText;
  if (other && other[lang]) return other[lang]!;
  if (lang === 'ta' && taText) return taText;

  // Check automated phrase lookup from dictionary
  if (PHRASE_LOOKUP_MAP[enText]?.[lang]) {
    return PHRASE_LOOKUP_MAP[enText][lang];
  }

  // Check trimmed/case-normalized fallback
  const trimmed = enText.trim();
  if (PHRASE_LOOKUP_MAP[trimmed]?.[lang]) {
    return PHRASE_LOOKUP_MAP[trimmed][lang];
  }

  // Graceful fallback to Tamil if language is ta, else English
  return lang === 'ta' && taText ? taText : enText;
}

export function translateCategory(lang: LanguageCode, cat: ComplaintCategory | string): string {
  const directKey = `cat.${cat}`;
  if (UI_TRANSLATIONS[lang]?.[directKey]) {
    return UI_TRANSLATIONS[lang][directKey];
  }
  if (UI_TRANSLATIONS.en[directKey]) {
    return translateKey(lang, directKey);
  }

  const normalized = cat.toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (normalized.includes('wi_fi') || normalized.includes('wifi')) {
    return translateKey(lang, 'cat.wifi_it');
  }
  if (normalized.includes('dining') || normalized.includes('canteen')) {
    return translateKey(lang, 'cat.dining_canteen');
  }
  if (normalized.includes('classroom') || normalized.includes('facilit') || normalized.includes('building')) {
    return translateKey(lang, 'cat.public_facilities');
  }
  if (normalized.includes('access')) {
    return translateKey(lang, 'cat.accessibility');
  }
  if (normalized.includes('student') || normalized.includes('educat')) {
    return translateKey(lang, 'cat.education');
  }
  if (normalized.includes('waste') || normalized.includes('sanit')) {
    return translateKey(lang, 'cat.waste_collection');
  }
  if (normalized.includes('transport') || normalized.includes('safety')) {
    return translateKey(lang, 'cat.transport');
  }
  if (normalized.includes('water')) {
    return translateKey(lang, 'cat.water_supply');
  }
  if (normalized.includes('elect')) {
    return translateKey(lang, 'cat.electricity');
  }
  if (normalized.includes('road')) {
    return translateKey(lang, 'cat.roads');
  }
  return cat;
}

export function translateStatus(lang: LanguageCode, status: ComplaintStatus): string {
  return translateKey(lang, `status.${status}`);
}

export function translateRole(lang: LanguageCode, role: UserRole): string {
  return translateKey(lang, `role.${role}`);
}

export function translatePriority(lang: LanguageCode, tier: PriorityTier): string {
  return translateKey(lang, `priority.${tier}`);
}

export function translateSentiment(lang: LanguageCode, sentiment: SentimentLabel): string {
  return translateKey(lang, `sentiment.${sentiment}`);
}
