import { SUPPORTED_LANGUAGES } from './languages';
import { UI_TRANSLATIONS } from './translations';

export function runTranslationAudit() {
  const enKeys = Object.keys(UI_TRANSLATIONS.en);
  const totalKeys = enKeys.length;
  console.log(`[i18n Audit] Starting completeness audit across ${SUPPORTED_LANGUAGES.length} languages.`);
  console.log(`[i18n Audit] Total baseline keys in English: ${totalKeys}`);

  let hasErrors = false;
  const results: Record<string, { total: number; missing: string[]; coveragePct: number }> = {};

  for (const langMeta of SUPPORTED_LANGUAGES) {
    const code = langMeta.code;
    const dict = UI_TRANSLATIONS[code] || {};
    const missing: string[] = [];

    for (const key of enKeys) {
      if (!dict[key] || dict[key].trim() === '') {
        missing.push(key);
      }
    }

    const present = totalKeys - missing.length;
    const coveragePct = Math.round((present / totalKeys) * 100);
    results[code] = { total: totalKeys, missing, coveragePct };

    if (missing.length > 0) {
      hasErrors = true;
      console.error(
        `❌ [i18n Audit] Language "${langMeta.name}" (${code}) missing ${missing.length} keys (${coveragePct}% coverage):`,
        missing.slice(0, 10)
      );
    } else {
      console.log(`✅ [i18n Audit] Language "${langMeta.name}" (${code}): 100% complete (${totalKeys}/${totalKeys} keys) [${langMeta.dir.toUpperCase()}]`);
    }
  }

  if (hasErrors) {
    console.error(`\n❌ [i18n Audit] Translation audit FAILED. One or more languages have missing keys.`);
    return false;
  }

  console.log(`\n🎉 [i18n Audit] All ${SUPPORTED_LANGUAGES.length} languages PASSED with 100% translation key completeness!`);
  return true;
}

// When executed directly via tsx
const isDirectRun = process.argv[1]?.includes('audit');
if (isDirectRun) {
  const passed = runTranslationAudit();
  if (!passed) {
    process.exit(1);
  }
}
