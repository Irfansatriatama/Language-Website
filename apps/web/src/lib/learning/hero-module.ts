import type { StudyLanguageCode } from "@/lib/study-languages";

/** Primary “hero” module per study language (slug scoped by `languageId` in DB). */
export const HERO_MODULE_BY_LANG: Record<
  StudyLanguageCode,
  { slug: string; title: string; dashboardChar: string; gridKind: "char-grid" }
> = {
  ja: { slug: "hiragana", title: "Hiragana", dashboardChar: "あ", gridKind: "char-grid" },
  ko: { slug: "hangul", title: "Hangul", dashboardChar: "한", gridKind: "char-grid" },
  zh: { slug: "pinyin", title: "Pinyin", dashboardChar: "拼", gridKind: "char-grid" },
  /** Aksara Latin: kosakata + catatan tense (template Fase I). */
  es: {
    slug: "starter-vocabulary",
    title: "Kosakata & tense",
    dashboardChar: "Ñ",
    gridKind: "char-grid",
  },
  de: {
    slug: "starter-vocabulary",
    title: "Kosakata & tense",
    dashboardChar: "ß",
    gridKind: "char-grid",
  },
  en: {
    slug: "starter-vocabulary",
    title: "Kosakata & tense",
    dashboardChar: "A",
    gridKind: "char-grid",
  },
};

/** Modules that use the shared kartu grid + mark learned / favorit (Fase F). */
export const GRID_LEARN_MODULE_SLUGS: ReadonlySet<string> = new Set(
  Object.values(HERO_MODULE_BY_LANG).map((h) => h.slug),
);

export function heroModuleForCode(code: StudyLanguageCode) {
  return HERO_MODULE_BY_LANG[code];
}
