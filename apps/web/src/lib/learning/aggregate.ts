import { ItemProgressState } from "@prisma/client";

import { overallPercentFromCounts } from "@/lib/learning/aggregate-progress";
import { prisma } from "@/lib/prisma";
import { STUDY_LANGUAGES, type StudyLanguageCode } from "@/lib/study-languages";
import { heroModuleForCode } from "@/lib/learning/hero-module";

export type AggregateSnapshot = {
  masteredItems: number;
  totalPublishableItems: number;
  /** null when there is nothing publishable (avoid dividing by zero). */
  overallPercent: number | null;
};

export type LanguageModuleSnapshot = {
  languageId: string;
  languageCode: string;
  languageName: string;
  nativeName: string;
  flagLabel: string;
  sectionTitle: string;
  isStudying: boolean;
  includeInTotalProgress: boolean;
  heroModuleSlug: string;
  heroModuleTitle: string;
  /** Kartu grid utama per bahasa (hiragana / hangul / pinyin). */
  heroMastered: number;
  heroTotal: number;
};

export type ProgressSnapshots = {
  aggregate: AggregateSnapshot;
  byLanguage: LanguageModuleSnapshot[];
};

const studyCodes = STUDY_LANGUAGES.map((l) => l.code);

function metaForLanguageCode(code: string) {
  return STUDY_LANGUAGES.find((l) => l.code === code)!;
}

/**
 * Single entry point for dashboard aggregate + per-language hero module breakdown.
 * Total gabungan: items whose language has `includeInTotalProgress`; mastered = LEARNED rows for those items.
 */
export async function getProgressSnapshots(userId: string): Promise<ProgressSnapshots> {
  const langs = await prisma.language.findMany({
    where: { code: { in: [...studyCodes] } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      nativeName: true,
      userSettings: {
        where: { userId },
        take: 1,
        select: {
          isStudying: true,
          includeInTotalProgress: true,
        },
      },
    },
  });

  const includedLanguageIds = langs
    .filter((l) => l.userSettings[0]?.includeInTotalProgress === true)
    .map((l) => l.id);

  let totalPublishableItems = 0;
  let masteredItems = 0;

  if (includedLanguageIds.length > 0) {
    totalPublishableItems = await prisma.contentItem.count({
      where: { module: { languageId: { in: includedLanguageIds } } },
    });

    masteredItems = await prisma.userItemProgress.count({
      where: {
        userId,
        state: ItemProgressState.LEARNED,
        contentItem: { module: { languageId: { in: includedLanguageIds } } },
      },
    });
  }

  const overallPercent = overallPercentFromCounts(masteredItems, totalPublishableItems);

  const heroItemIdsByLanguage = new Map<string, string[]>();

  for (const lang of langs) {
    const hero = heroModuleForCode(lang.code as StudyLanguageCode);
    const mod = await prisma.module.findFirst({
      where: { languageId: lang.id, slug: hero.slug },
      select: { contentItems: { select: { id: true } } },
    });
    heroItemIdsByLanguage.set(lang.id, mod?.contentItems.map((c) => c.id) ?? []);
  }

  const allHeroIds = Array.from(heroItemIdsByLanguage.values()).flat();
  const learnedHeroIds =
    allHeroIds.length === 0
    ? new Set<string>()
    : new Set(
          (
            await prisma.userItemProgress.findMany({
              where: {
                userId,
                state: ItemProgressState.LEARNED,
                contentItemId: { in: allHeroIds },
              },
              select: { contentItemId: true },
            })
          ).map((r) => r.contentItemId),
        );

  const byLanguage: LanguageModuleSnapshot[] = langs.map((lang) => {
    const meta = metaForLanguageCode(lang.code);
    const settings = lang.userSettings[0];
    const hero = heroModuleForCode(lang.code as StudyLanguageCode);
    const ids = heroItemIdsByLanguage.get(lang.id) ?? [];
    const heroTotal = ids.length;
    const heroMastered = ids.filter((id) => learnedHeroIds.has(id)).length;

    return {
      languageId: lang.id,
      languageCode: lang.code,
      languageName: lang.name,
      nativeName: lang.nativeName,
      flagLabel: `${meta.flag} ${meta.label}`,
      sectionTitle: meta.sectionTitle,
      isStudying: settings?.isStudying ?? false,
      includeInTotalProgress: settings?.includeInTotalProgress ?? false,
      heroModuleSlug: hero.slug,
      heroModuleTitle: hero.title,
      heroMastered,
      heroTotal,
    };
  });

  return {
    aggregate: { masteredItems, totalPublishableItems, overallPercent },
    byLanguage,
  };
}

export type HiraganaItemProgress = { state: ItemProgressState; favorite: boolean };

export async function getModuleProgressMap(
  userId: string,
  languageCode: StudyLanguageCode,
  moduleSlug: string,
): Promise<Map<string, HiraganaItemProgress>> {
  const mod = await prisma.module.findFirst({
    where: { slug: moduleSlug, language: { code: languageCode } },
    select: {
      contentItems: { select: { id: true } },
    },
  });

  const ids = mod?.contentItems.map((c) => c.id) ?? [];
  if (ids.length === 0) return new Map();

  const rows = await prisma.userItemProgress.findMany({
    where: { userId, contentItemId: { in: ids } },
    select: { contentItemId: true, state: true, favorite: true },
  });

  const map = new Map<
    string,
    { state: ItemProgressState; favorite: boolean }
  >();
  for (const row of rows) {
    map.set(row.contentItemId, { state: row.state, favorite: row.favorite });
  }
  return map;
}

export async function getJaHiraganaProgressMap(userId: string): Promise<Map<string, HiraganaItemProgress>> {
  return getModuleProgressMap(userId, "ja", "hiragana");
}

/** Semua item konten per bahasa (untuk halaman stats / filter per bahasa). */
export async function getLanguageAllItemsProgress(
  userId: string,
  languageCode: StudyLanguageCode,
): Promise<{ learned: number; total: number; percent: number | null }> {
  const lang = await prisma.language.findUnique({
    where: { code: languageCode },
    select: { id: true },
  });
  if (!lang) return { learned: 0, total: 0, percent: null };

  const total = await prisma.contentItem.count({
    where: { module: { languageId: lang.id } },
  });

  const learned = await prisma.userItemProgress.count({
    where: {
      userId,
      state: ItemProgressState.LEARNED,
      contentItem: { module: { languageId: lang.id } },
    },
  });

  const percent = overallPercentFromCounts(learned, total);
  return { learned, total, percent };
}
