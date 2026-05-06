export const STUDY_LANGUAGES = [
  { code: "ja", flag: "🇯🇵", label: "日本語", sectionTitle: "Bahasa Jepang" },
  { code: "zh", flag: "🇨🇳", label: "中文", sectionTitle: "Bahasa Mandarin" },
  { code: "ko", flag: "🇰🇷", label: "한국어", sectionTitle: "Bahasa Korea" },
  { code: "es", flag: "🇪🇸", label: "Español", sectionTitle: "Bahasa Spanyol" },
  { code: "de", flag: "🇩🇪", label: "Deutsch", sectionTitle: "Bahasa Jerman" },
  { code: "en", flag: "🇬🇧", label: "English", sectionTitle: "Bahasa Inggris" },
] as const;

export type StudyLanguageCode = (typeof STUDY_LANGUAGES)[number]["code"];

export function isStudyLanguageCode(value: string): value is StudyLanguageCode {
  return STUDY_LANGUAGES.some((row) => row.code === value);
}

export function defaultStudyLangCode(): StudyLanguageCode {
  return "ja";
}

/** BCP-47 untuk Web Speech / contoh audio (modul kartu). */
export const STUDY_LANGUAGE_SPEECH_BCP47: Record<StudyLanguageCode, string> = {
  ja: "ja-JP",
  zh: "zh-CN",
  ko: "ko-KR",
  es: "es-ES",
  de: "de-DE",
  en: "en-US",
};
