/**
 * Core gamification (Fase G).
 *
 * Calendar / "hari ini": sama dengan `todayDateForUser` + pemformatan YYYY-MM-DD
 * (`lib/srs/due-window.ts`): jika `User.timezone` kosong, gunakan tanggal kalender UTC.
 * Jika diisi (IANA), gunakan tanggal lokal di zona itu. Streak, challenge `dateKey`,
 * dan SRS memakai definisi hari yang sama.
 */

import type { Prisma } from "@prisma/client";

import {
  applyChallengeActivities,
  generateStoredChallengesForDate,
  type ChallengeActivity,
  type StoredChallenge,
} from "@/lib/gamification/daily-challenge";
import { XP_VALUES, levelNumberFromTotalXp } from "@/lib/gamification/xp-level";
import { prisma } from "@/lib/prisma";
import { todayDateForUser } from "@/lib/srs/due-window";

export type LedgerInput = {
  amount: number;
  source: string;
  refType?: string | null;
  refId?: string | null;
};

export type Tx = Prisma.TransactionClient;

function dateUtcToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function calendarPrevDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
}

export async function userLocalCalendarYmd(
  tx: Tx,
  userId: string,
  now?: Date,
): Promise<{ ymd: string; midnightUtc: Date }> {
  const midnightUtc = await todayDateForUser(tx, userId, now);
  return { ymd: dateUtcToYmd(midnightUtc), midnightUtc };
}

export async function ensureGamificationProfileTx(tx: Tx, userId: string) {
  const existing = await tx.userGamificationProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { totalXp: true },
  });

  const totalXp = user?.totalXp ?? 0;
  const level = levelNumberFromTotalXp(totalXp);

  return tx.userGamificationProfile.create({
    data: {
      userId,
      totalXp,
      level,
      streakCurrent: 0,
      streakBest: 0,
      lastActiveDate: null,
    },
  });
}

async function applyLedgerBatch(tx: Tx, userId: string, entries: LedgerInput[]) {
  if (entries.length === 0) return;

  await ensureGamificationProfileTx(tx, userId);

  for (const e of entries) {
    await tx.xpLedger.create({
      data: {
        userId,
        amount: e.amount,
        source: e.source,
        refType: e.refType ?? null,
        refId: e.refId ?? null,
      },
    });
  }

  const delta = entries.reduce((s, e) => s + e.amount, 0);
  const profile = await tx.userGamificationProfile.findUnique({
    where: { userId },
    select: { totalXp: true },
  });

  const nextTotal = (profile?.totalXp ?? 0) + delta;
  const nextLevel = levelNumberFromTotalXp(nextTotal);

  await tx.userGamificationProfile.update({
    where: { userId },
    data: { totalXp: nextTotal, level: nextLevel },
  });

  await tx.user.update({
    where: { id: userId },
    data: { totalXp: nextTotal },
  });
}

async function bumpStreakOnQualifyingActivity(
  tx: Tx,
  userId: string,
  todayYmd: string,
  todayMidnightUtc: Date,
): Promise<{ firstActivityToday: boolean; streakDayXp: number }> {
  const profile = await ensureGamificationProfileTx(tx, userId);
  const last = profile.lastActiveDate ? dateUtcToYmd(profile.lastActiveDate) : null;

  if (last === todayYmd) {
    return { firstActivityToday: false, streakDayXp: 0 };
  }

  let nextStreak = 1;
  if (last !== null && last === calendarPrevDayYmd(todayYmd)) {
    nextStreak = Math.max(1, profile.streakCurrent) + 1;
  }

  const best = Math.max(profile.streakBest, nextStreak);

  await tx.userGamificationProfile.update({
    where: { userId },
    data: {
      streakCurrent: nextStreak,
      streakBest: best,
      lastActiveDate: todayMidnightUtc,
    },
  });

  const streakDayXp = nextStreak >= 2 ? XP_VALUES.STREAK_DAY : 0;
  return { firstActivityToday: true, streakDayXp };
}

function parseStoredChallenges(json: unknown): StoredChallenge[] {
  if (!Array.isArray(json)) return [];
  return json as StoredChallenge[];
}

async function loadOrSeedDailyChallengesTx(
  tx: Tx,
  userId: string,
  dateKey: string,
): Promise<{ rowId: string; list: StoredChallenge[] }> {
  const existing = await tx.userDailyChallengeDay.findUnique({
    where: {
      userId_dateKey: { userId, dateKey },
    },
  });

  if (existing) {
    const list = parseStoredChallenges(existing.challenges);
    return { rowId: existing.id, list };
  }

  const list = JSON.parse(JSON.stringify(generateStoredChallengesForDate(dateKey))) as StoredChallenge[];

  const created = await tx.userDailyChallengeDay.create({
    data: {
      userId,
      dateKey,
      challenges: list as unknown as Prisma.InputJsonValue,
    },
  });

  return { rowId: created.id, list };
}

async function persistChallenges(tx: Tx, rowId: string, list: StoredChallenge[]) {
  await tx.userDailyChallengeDay.update({
    where: { id: rowId },
    data: {
      challenges: list as unknown as Prisma.InputJsonValue,
    },
  });
}

export type ActivityGamificationInput = {
  learnNew?: { contentItemId: string; langCode: string; moduleSlug: string };
  quiz?: {
    quizAttemptId: string;
    score: number;
    total: number;
    langCode: string;
    moduleSlug: string;
  };
  srs?: { contentItemId: string; reviewDelta: number; langCode: string; moduleSlug: string };
};

/**
 * Ledger + streak + challenges in one DB transaction fragment.
 */
export async function finalizeActivityGamificationTx(
  tx: Tx,
  userId: string,
  patch: ActivityGamificationInput,
) {
  await ensureGamificationProfileTx(tx, userId);

  const { ymd: todayYmd, midnightUtc } = await userLocalCalendarYmd(tx, userId);

  const streakOutcome = await bumpStreakOnQualifyingActivity(
    tx,
    userId,
    todayYmd,
    midnightUtc,
  );

  const entries: LedgerInput[] = [];

  if (patch.learnNew) {
    entries.push({
      amount: XP_VALUES.LEARN_ITEM,
      source: "learn_item",
      refType: "ContentItem",
      refId: patch.learnNew.contentItemId,
    });
  }

  if (patch.srs && patch.srs.reviewDelta > 0) {
    entries.push({
      amount: XP_VALUES.SRS_SESSION * patch.srs.reviewDelta,
      source: "srs_session",
      refType: "ContentItem",
      refId: patch.srs.contentItemId,
    });
  }

  if (patch.quiz) {
    entries.push({
      amount: XP_VALUES.QUIZ_COMPLETE,
      source: "quiz_complete",
      refType: "QuizAttempt",
      refId: patch.quiz.quizAttemptId,
    });

    const perfect = patch.quiz.total >= 5 && patch.quiz.score === patch.quiz.total;
    if (perfect) {
      entries.push({
        amount: XP_VALUES.QUIZ_PERFECT,
        source: "quiz_perfect",
        refType: "QuizAttempt",
        refId: patch.quiz.quizAttemptId,
      });
    }
  }

  if (streakOutcome.firstActivityToday && streakOutcome.streakDayXp > 0) {
    entries.push({
      amount: streakOutcome.streakDayXp,
      source: "streak_day",
      refType: "calendar",
      refId: todayYmd,
    });
  }

  await applyLedgerBatch(tx, userId, entries);

  const { rowId, list } = await loadOrSeedDailyChallengesTx(tx, userId, todayYmd);

  const activities: ChallengeActivity[] = [];

  if (patch.learnNew) {
    const mk = `${patch.learnNew.langCode}:${patch.learnNew.moduleSlug}`;
    activities.push({
      kind: "learn_item",
      moduleSlug: patch.learnNew.moduleSlug,
      moduleKey: mk,
    });
    activities.push({ kind: "multi_module", moduleKey: mk });
  }

  if (patch.quiz) {
    const mk = `${patch.quiz.langCode}:${patch.quiz.moduleSlug}`;
    const acc =
      patch.quiz.total <= 0 ? 0 : Math.round((100 * patch.quiz.score) / patch.quiz.total);

    activities.push({ kind: "quiz_complete", accuracyPct: acc });
    activities.push({ kind: "multi_module", moduleKey: mk });
  }

  if (patch.srs && patch.srs.reviewDelta > 0) {
    const mk = `${patch.srs.langCode}:${patch.srs.moduleSlug}`;
    activities.push({ kind: "srs_review", delta: patch.srs.reviewDelta });
    activities.push({ kind: "multi_module", moduleKey: mk });
  }

  if (streakOutcome.firstActivityToday) {
    activities.push({ kind: "streak_touch" });
  }

  const challengeXp = applyChallengeActivities(list, activities);

  await persistChallenges(tx, rowId, list);

  const bonus: LedgerInput[] = challengeXp.map((c) => ({
    amount: c.xp,
    source: "challenge_complete",
    refType: "DailyChallenge",
    refId: c.challengeId,
  }));

  await applyLedgerBatch(tx, userId, bonus);
}

export async function ensureDailyChallengeBootstrap(userId: string) {
  await prisma.$transaction(async (tx) => {
    await ensureDailyChallengeRow(tx, userId);
  });
}

export async function ensureDailyChallengeRow(tx: Tx, userId: string): Promise<void> {
  const { ymd } = await userLocalCalendarYmd(tx, userId);
  await loadOrSeedDailyChallengesTx(tx, userId, ymd);
}

export async function getGamificationOverview(userId: string) {
  await ensureGamificationBootstrapProfile(userId);

  const rawProfile = await prisma.userGamificationProfile.findUnique({
    where: { userId },
    select: { totalXp: true, streakCurrent: true, streakBest: true },
  });

  let totalXp = rawProfile?.totalXp ?? null;
  if (totalXp === null) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXp: true },
    });
    totalXp = u?.totalXp ?? 0;
  }

  const { ymd } = await userLocalCalendarYmd(prisma, userId);

  await ensureDailyChallengeBootstrap(userId);

  const dayRow = await prisma.userDailyChallengeDay.findUnique({
    where: { userId_dateKey: { userId, dateKey: ymd } },
  });

  const challenges = parseStoredChallenges(dayRow?.challenges);

  return {
    totalXp,
    streakCurrent: rawProfile?.streakCurrent ?? 0,
    streakBest: rawProfile?.streakBest ?? 0,
    todayChallenges: challenges,
    calendarYmd: ymd,
  };
}

export async function ensureGamificationBootstrapProfile(userId: string) {
  const has = await prisma.userGamificationProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });
  if (has) return;
  await prisma.$transaction(async (tx) => {
    await ensureGamificationProfileTx(tx, userId);
  });
}

export async function getRecentXpLedger(userId: string, take = 20) {
  return prisma.xpLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, amount: true, source: true, refType: true, refId: true, createdAt: true },
  });
}
