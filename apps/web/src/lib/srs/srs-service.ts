import type { ContentItem, Prisma } from "@prisma/client";
import { ItemProgressState } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { calculateNext, defaultSrsCardState } from "./sm2";
import { todayDateForUser } from "./due-window";

export type HiraganaSrsStats = {
  due: number;
  learning: number;
  mastered: number;
};

export async function findJaHiraganaModuleWithItems(): Promise<{
  moduleId: string;
  items: ContentItem[];
} | null> {
  const mod = await prisma.module.findFirst({
    where: { slug: "hiragana", language: { code: "ja" } },
    include: { contentItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!mod) return null;
  return { moduleId: mod.id, items: mod.contentItems };
}

export async function getJaHiraganaSrsStats(userId: string, contentItemIds: string[]): Promise<HiraganaSrsStats> {
  if (contentItemIds.length === 0) return { due: 0, learning: 0, mastered: 0 };

  const today = await todayDateForUser(prisma, userId);

  const cards = await prisma.srsCard.findMany({
    where: { userId, contentItemId: { in: contentItemIds } },
  });

  let due = 0;
  let learning = 0;
  let mastered = 0;

  for (const c of cards) {
    if (c.repetitions >= 5 && c.easeFactor >= 2) {
      mastered += 1;
      continue;
    }
    const dueDate = c.nextReviewAt;
    if (dueDate <= today) due += 1;
    else learning += 1;
  }

  return { due, learning, mastered };
}

export async function listDueJaHiraganaContentIds(userId: string, contentItemIds: string[]): Promise<string[]> {
  if (contentItemIds.length === 0) return [];
  const today = await todayDateForUser(prisma, userId);
  const rows = await prisma.srsCard.findMany({
    where: {
      userId,
      contentItemId: { in: contentItemIds },
      nextReviewAt: { lte: today },
    },
    select: { contentItemId: true },
  });
  return rows.map((r) => r.contentItemId);
}

export async function listUnreviewedJaHiraganaIds(userId: string, contentItemIds: string[]): Promise<string[]> {
  if (contentItemIds.length === 0) return [];
  const have = await prisma.srsCard.findMany({
    where: { userId, contentItemId: { in: contentItemIds } },
    select: { contentItemId: true },
  });
  const haveSet = new Set(have.map((h) => h.contentItemId));
  return contentItemIds.filter((id) => !haveSet.has(id));
}

const ACTIVITY_SRS_REVIEW = "srs_review";

export type ApplySrsReviewMeta = {
  becameLearned: boolean;
  langCode: string;
  moduleSlug: string;
};

export async function applySrsReviewTx(
  tx: Prisma.TransactionClient,
  userId: string,
  contentItemId: string,
  rating: number,
): Promise<ApplySrsReviewMeta> {
  if (!Number.isInteger(rating) || rating < 0 || rating > 3) {
    throw new Error("Invalid rating");
  }

  const itemScope = await tx.contentItem.findFirst({
    where: {
      id: contentItemId,
      module: { slug: "hiragana", language: { code: "ja" } },
    },
    select: {
      id: true,
      module: { select: { slug: true, language: { select: { code: true } } } },
    },
  });
  if (!itemScope?.module.language.code) throw new Error("Invalid content item");

  const langCode = itemScope.module.language.code;
  const moduleSlug = itemScope.module.slug;

  const priorProg = await tx.userItemProgress.findUnique({
    where: { userId_contentItemId: { userId, contentItemId } },
    select: { state: true },
  });
  const wasLearned = priorProg?.state === ItemProgressState.LEARNED;

  const existing = await tx.srsCard.findUnique({
    where: { userId_contentItemId: { userId, contentItemId } },
  });

  const base = existing
    ? {
        intervalDays: existing.intervalDays,
        repetitions: existing.repetitions,
        easeFactor: existing.easeFactor,
      }
    : defaultSrsCardState();

  const next = calculateNext(base, rating);

  await tx.srsCard.upsert({
    where: { userId_contentItemId: { userId, contentItemId } },
    create: {
      userId,
      contentItemId,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      easeFactor: next.easeFactor,
      nextReviewAt: next.nextReviewAt,
      lastReviewAt: next.lastReviewAt,
    },
    update: {
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      easeFactor: next.easeFactor,
      nextReviewAt: next.nextReviewAt,
      lastReviewAt: next.lastReviewAt,
    },
  });

  if (rating >= 2) {
    await tx.userItemProgress.upsert({
      where: { userId_contentItemId: { userId, contentItemId } },
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
  }

  await tx.activityEvent.create({
    data: {
      userId,
      type: ACTIVITY_SRS_REVIEW,
      meta: { contentItemId, rating },
    },
  });

  const becameLearned = rating >= 2 && !wasLearned;
  return { becameLearned, langCode, moduleSlug };
}
