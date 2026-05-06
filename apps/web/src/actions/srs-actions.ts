"use server";

import { revalidatePath } from "next/cache";

import { finalizeActivityGamificationTx } from "@/lib/gamification/gamification-service";
import { prisma } from "@/lib/prisma";
import { requireSessionUserId } from "@/lib/require-session";
import { applySrsReviewTx } from "@/lib/srs/srs-service";

function revalidateHiragana() {
  revalidatePath("/dashboard");
  revalidatePath("/stats");
  revalidatePath("/learn/ja/hiragana");
}

async function assertJaHiraganaContentItem(contentItemId: string) {
  const exists = await prisma.contentItem.findFirst({
    where: {
      id: contentItemId,
      module: { slug: "hiragana", language: { code: "ja" } },
    },
    select: { id: true },
  });
  if (!exists) throw new Error("Invalid content item");
}

/**
 * Persist one SRS rating (SM-2). Ties into ActivityEvent and marks learned when rating ≥ 2.
 * @param rating 0 = Lupa … 3 = Hafal (see `lib/srs/sm2.ts`)
 */
export async function submitSrsReview(contentItemId: string, rating: number) {
  const userId = await requireSessionUserId();
  await assertJaHiraganaContentItem(contentItemId);
  await prisma.$transaction(async (tx) => {
    const meta = await applySrsReviewTx(tx, userId, contentItemId, rating);
    await finalizeActivityGamificationTx(tx, userId, {
      srs: {
        contentItemId,
        reviewDelta: 1,
        langCode: meta.langCode,
        moduleSlug: meta.moduleSlug,
      },
      ...(meta.becameLearned
        ? {
            learnNew: {
              contentItemId,
              langCode: meta.langCode,
              moduleSlug: meta.moduleSlug,
            },
          }
        : {}),
    });
  });
  revalidateHiragana();
}
