"use server";

import { revalidatePath } from "next/cache";

import { finalizeActivityGamificationTx } from "@/lib/gamification/gamification-service";
import { prisma } from "@/lib/prisma";
import { requireSessionUserId } from "@/lib/require-session";
import { ItemProgressState } from "@prisma/client";
import { isStudyLanguageCode, STUDY_LANGUAGES } from "@/lib/study-languages";
import { GRID_LEARN_MODULE_SLUGS, heroModuleForCode } from "@/lib/learning/hero-module";

function revalidateLearningPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/stats");
  for (const row of STUDY_LANGUAGES) {
    const { slug } = heroModuleForCode(row.code);
    revalidatePath(`/learn/${row.code}/${slug}`);
  }
}

async function assertGridModuleContentItem(contentItemId: string) {
  const exists = await prisma.contentItem.findFirst({
    where: {
      id: contentItemId,
      module: { slug: { in: Array.from(GRID_LEARN_MODULE_SLUGS) } },
    },
    select: { id: true },
  });
  if (!exists) throw new Error("Invalid content item");
}

export async function markLearned(contentItemId: string) {
  const userId = await requireSessionUserId();
  await assertGridModuleContentItem(contentItemId);

  const prior = await prisma.userItemProgress.findUnique({
    where: {
      userId_contentItemId: { userId, contentItemId },
    },
    select: { state: true },
  });
  const wasLearned = prior?.state === ItemProgressState.LEARNED;

  await prisma.$transaction(async (tx) => {
    await tx.userItemProgress.upsert({
      where: {
        userId_contentItemId: { userId, contentItemId },
      },
      create: {
        userId,
        contentItemId,
        state: ItemProgressState.LEARNED,
        learnedAt: new Date(),
      },
      update: {
        state: ItemProgressState.LEARNED,
        learnedAt: new Date(),
      },
    });

    if (!wasLearned) {
      const item = await tx.contentItem.findFirst({
        where: {
          id: contentItemId,
          module: { slug: { in: Array.from(GRID_LEARN_MODULE_SLUGS) } },
        },
        select: {
          module: {
            select: { slug: true, language: { select: { code: true } } },
          },
        },
      });
      if (!item) throw new Error("Invalid content item");

      await finalizeActivityGamificationTx(tx, userId, {
        learnNew: {
          contentItemId,
          langCode: item.module.language.code,
          moduleSlug: item.module.slug,
        },
      });
    }
  });

  revalidateLearningPaths();
}

export async function unmarkLearned(contentItemId: string) {
  const userId = await requireSessionUserId();
  await assertGridModuleContentItem(contentItemId);

  await prisma.userItemProgress.upsert({
    where: {
      userId_contentItemId: { userId, contentItemId },
    },
    create: {
      userId,
      contentItemId,
      state: ItemProgressState.NEW,
      learnedAt: null,
    },
    update: {
      state: ItemProgressState.NEW,
      learnedAt: null,
    },
  });

  revalidateLearningPaths();
}

export async function toggleFavorite(contentItemId: string) {
  const userId = await requireSessionUserId();
  await assertGridModuleContentItem(contentItemId);

  const existing = await prisma.userItemProgress.findUnique({
    where: {
      userId_contentItemId: { userId, contentItemId },
    },
    select: { favorite: true },
  });

  const nextFavorite = !existing?.favorite;

  await prisma.userItemProgress.upsert({
    where: {
      userId_contentItemId: { userId, contentItemId },
    },
    create: {
      userId,
      contentItemId,
      state: ItemProgressState.NEW,
      favorite: nextFavorite,
    },
    update: {
      favorite: nextFavorite,
    },
  });

  revalidateLearningPaths();
}

export type LanguageSettingsPatch = {
  isStudying?: boolean;
  includeInTotalProgress?: boolean;
  dailyGoalMinutes?: number | null;
};

export async function updateUserLanguageSettings(languageCode: string, patch: LanguageSettingsPatch) {
  const userId = await requireSessionUserId();

  if (!isStudyLanguageCode(languageCode)) {
    throw new Error("Invalid language code");
  }

  const language = await prisma.language.findUnique({
    where: { code: languageCode },
    select: { id: true },
  });

  if (!language) {
    throw new Error("Language not found");
  }

  if (patch.includeInTotalProgress === false) {
    const studyLangIds = await prisma.language.findMany({
      where: { code: { in: STUDY_LANGUAGES.map((l) => l.code) } },
      select: { id: true },
    });
    const idSet = studyLangIds.map((l) => l.id);

    const rows = await prisma.userLanguageSettings.findMany({
      where: { userId, languageId: { in: idSet } },
      select: { languageId: true, includeInTotalProgress: true },
    });

    const includeByLang = new Map(rows.map((r) => [r.languageId, r.includeInTotalProgress]));

    const someOtherIncluded = idSet
      .filter((lid) => lid !== language.id)
      .some((lid) => includeByLang.get(lid) ?? true);

    if (!someOtherIncluded) {
      throw new Error(
        "Minimal satu bahasa harus tetap masuk progress total gabungan (JA, KO, atau ZH).",
      );
    }
  }

  await prisma.userLanguageSettings.upsert({
    where: {
      userId_languageId: { userId, languageId: language.id },
    },
    create: {
      userId,
      languageId: language.id,
      isStudying: patch.isStudying ?? true,
      includeInTotalProgress: patch.includeInTotalProgress ?? true,
      dailyGoalMinutes: patch.dailyGoalMinutes ?? null,
    },
    update: {
      ...(patch.isStudying !== undefined ? { isStudying: patch.isStudying } : {}),
      ...(patch.includeInTotalProgress !== undefined
        ? { includeInTotalProgress: patch.includeInTotalProgress }
        : {}),
      ...(patch.dailyGoalMinutes !== undefined ? { dailyGoalMinutes: patch.dailyGoalMinutes } : {}),
    },
  });

  revalidateLearningPaths();
}
