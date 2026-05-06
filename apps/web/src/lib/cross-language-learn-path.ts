import { heroModuleForCode } from "@/lib/learning/hero-module";
import { isStudyLanguageCode, type StudyLanguageCode } from "@/lib/study-languages";

const starter = "starter-vocabulary" as const;

/**
 * Maps the first path segment after /learn/{lang}/ when switching study language.
 * Same logical module → correct slug for the target language; unknown → target hero module.
 */
function equivalentModuleSegment(_from: StudyLanguageCode, segment: string, to: StudyLanguageCode): string {
  const table: Record<string, Partial<Record<StudyLanguageCode, string>>> = {
    hiragana: {
      ko: "hangul",
      zh: "pinyin",
      es: starter,
      de: starter,
      en: starter,
    },
    hangul: {
      ja: "hiragana",
      zh: "pinyin",
      es: starter,
      de: starter,
      en: starter,
    },
    pinyin: {
      ja: "hiragana",
      ko: "hangul",
      es: starter,
      de: starter,
      en: starter,
    },
    [starter]: { ja: "hiragana", ko: "hangul", zh: "pinyin" },
    katakana: { ko: "hangul", zh: "pinyin", es: starter, de: starter, en: starter },
    kanji: { zh: "hanzi", ko: "hangul", es: starter, de: starter, en: starter },
    hanzi: { ja: "kanji", ko: "vocabulary", es: starter, de: starter, en: starter },
    tones: { ja: "hiragana", ko: "hangul", zh: "tones", es: starter, de: starter, en: starter },
    vocabulary: {
      ja: "vocabulary",
      ko: "vocabulary",
      zh: "vocabulary",
      es: "vocabulary",
      de: "vocabulary",
      en: "vocabulary",
    },
    grammar: {
      ja: "grammar",
      ko: "grammar",
      zh: "dialog",
      es: "grammar",
      de: "grammar",
      en: "grammar",
    },
    dialog: {
      ja: "dialog",
      ko: "dialog",
      zh: "dialog",
      es: "dialog",
      de: "dialog",
      en: "dialog",
    },
    quiz: { ja: "quiz", ko: "quiz", zh: "quiz", es: starter, de: starter, en: starter },
  };

  return table[segment]?.[to] ?? heroModuleForCode(to).slug;
}

/**
 * @param segments from `useSelectedLayoutSegments()` (e.g. `['learn','ja','hiragana','quiz']`)
 */
export function urlAfterStudyLanguageChange(
  segments: string[],
  nextLang: StudyLanguageCode,
): string {
  const hero = heroModuleForCode(nextLang);

  if (segments[0] !== "learn") {
    return `/learn/${nextLang}`;
  }

  const currentLang = segments[1];
  if (!isStudyLanguageCode(currentLang)) {
    return `/learn/${nextLang}`;
  }

  const fromLang = currentLang;
  const tail = segments.slice(2);

  if (tail.length === 0) {
    return `/learn/${nextLang}`;
  }

  // /learn/ja/quiz (tanpa modul)
  if (tail.length === 1 && tail[0] === "quiz") {
    return nextLang === "ja" ? "/learn/ja/quiz" : `/learn/${nextLang}/${hero.slug}`;
  }

  const head = tail[0]!;
  const mappedHead = equivalentModuleSegment(fromLang, head, nextLang);
  const rest = tail.slice(1);

  if (rest[0] === "quiz") {
    if (nextLang === "ja" && mappedHead === "hiragana") {
      return "/learn/ja/hiragana/quiz";
    }
    return `/learn/${nextLang}/${mappedHead}`;
  }

  return `/learn/${nextLang}/${[mappedHead, ...rest].join("/")}`;
}
