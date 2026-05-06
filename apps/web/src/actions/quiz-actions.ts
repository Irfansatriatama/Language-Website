"use server";

import { revalidatePath } from "next/cache";
import type { ContentItem } from "@prisma/client";

import { hiraganaPayloadFromRow } from "@/components/hiragana-grid";
import { finalizeActivityGamificationTx } from "@/lib/gamification/gamification-service";
import { prisma } from "@/lib/prisma";
import { HIRAGANA_MC_CHAR_TO_ROMAJI } from "@/lib/quiz/quiz-modes";
import { requireSessionUserId } from "@/lib/require-session";

const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 15;
const MAX_DURATION_MS = 60 * 60 * 1000;

function normAnswer(s: string): string {
  return s.normalize("NFKC").trim().toLowerCase();
}

function revalidateQuizPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/stats");
  revalidatePath("/learn/ja/quiz");
  revalidatePath("/learn/ja/hiragana/quiz");
  revalidatePath("/learn/ja/hiragana");
}

export type SubmitHiraganaMcQuizInput = {
  mode: string;
  durationMs: number;
  answers: { contentItemId: string; selectedRomaji: string }[];
};

export type SubmitHiraganaMcQuizResult =
  | {
      ok: true;
      score: number;
      total: number;
      xpGained: number;
      newTotalXp: number;
    }
  | { ok: false; error: string };

export async function submitHiraganaMcQuizAttempt(
  input: SubmitHiraganaMcQuizInput,
): Promise<SubmitHiraganaMcQuizResult> {
  const userId = await requireSessionUserId();

  if (input.mode !== HIRAGANA_MC_CHAR_TO_ROMAJI) {
    return { ok: false, error: "Mode tidak didukung." };
  }

  const answers = input.answers;
  if (answers.length < MIN_QUESTIONS || answers.length > MAX_QUESTIONS) {
    return { ok: false, error: `Jumlah soal harus antara ${MIN_QUESTIONS} dan ${MAX_QUESTIONS}.` };
  }

  const ids = answers.map((a) => a.contentItemId);
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "Daftar soal tidak valid (duplikat)." };
  }

  let durationMs = Math.max(0, Math.floor(Number(input.durationMs)));
  if (!Number.isFinite(durationMs) || durationMs > MAX_DURATION_MS) {
    durationMs = MAX_DURATION_MS;
  }

  const mod = await prisma.module.findFirst({
    where: { slug: "hiragana", language: { code: "ja" } },
    select: { id: true },
  });

  if (!mod) {
    return { ok: false, error: "Modul hiragana tidak ditemukan." };
  }

  const items = await prisma.contentItem.findMany({
    where: { moduleId: mod.id, id: { in: ids } },
    select: { id: true, payload: true },
  });

  if (items.length !== ids.length) {
    return { ok: false, error: "Beberapa item tidak termasuk modul hiragana." };
  }

  const payloadById = new Map(
    items.map((row) => [row.id, hiraganaPayloadFromRow(row as ContentItem)]),
  );

  let score = 0;
  for (const a of answers) {
    const payload = payloadById.get(a.contentItemId);
    if (!payload) continue;
    if (normAnswer(a.selectedRomaji) === normAnswer(payload.romaji)) score++;
  }

  const total = answers.length;

  const beforeXpRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalXp: true },
  });
  const beforeXp = beforeXpRow?.totalXp ?? 0;

  await prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.create({
      data: {
        userId,
        moduleId: mod.id,
        mode: input.mode,
        score,
        total,
        durationMs,
        meta: { questionIds: ids },
      },
    });

    const moduleRow = await tx.module.findUnique({
      where: { id: mod.id },
      select: { slug: true, language: { select: { code: true } } },
    });
    if (!moduleRow) throw new Error("Modul tidak ditemukan.");

    await finalizeActivityGamificationTx(tx, userId, {
      quiz: {
        quizAttemptId: attempt.id,
        score,
        total,
        langCode: moduleRow.language.code,
        moduleSlug: moduleRow.slug,
      },
    });
  });

  const afterXpRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalXp: true },
  });
  const newTotalXp = afterXpRow?.totalXp ?? 0;
  const xpGained = Math.max(0, newTotalXp - beforeXp);

  revalidateQuizPaths();

  return {
    ok: true,
    score,
    total,
    xpGained,
    newTotalXp,
  };
}
