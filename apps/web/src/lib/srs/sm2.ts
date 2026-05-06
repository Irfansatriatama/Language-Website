/**
 * SM-2 (SuperMemo 2) — ported from `_reference/lingora/assets/js/modules/srs.js`.
 *
 * Rating mapping (0–3), same labels as Lingora srs-ui:
 *   0 = Lupa   — interval reset to 1 day, repetitions reset to 0
 *   1 = Sulit  — interval advances with easeFactor penalized
 *   2 = Mudah  — normal interval growth
 *   3 = Hafal  — strongest interval growth / ease bonus
 *
 * When rating >= 2, Lingora also marks the item learned (handled in the service layer).
 */

export type SrsCardState = {
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
};

export type NextSrsState = SrsCardState & {
  /** Calendar due date (UTC) for persistence */
  nextReviewAt: Date;
  /** Last review calendar date (UTC) */
  lastReviewAt: Date;
};

const DEFAULT_STATE: SrsCardState = {
  intervalDays: 1,
  repetitions: 0,
  easeFactor: 2.5,
};

export function defaultSrsCardState(): SrsCardState {
  return { ...DEFAULT_STATE };
}

/**
 * @param rating 0..3
 */
export function calculateNext(
  card: Partial<SrsCardState> | undefined,
  rating: number,
  reviewedAt: Date = new Date(),
): NextSrsState {
  let { intervalDays: interval = 1, repetitions = 0, easeFactor = 2.5 } = card ?? {};

  if (rating < 1) {
    interval = 1;
    repetitions = 0;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;

    easeFactor = Math.max(1.3, easeFactor + 0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
  }

  interval = Math.min(interval, 365);

  const nextReviewAt = addUtcCalendarDays(startOfUtcDay(reviewedAt), interval);
  const lastReviewAt = startOfUtcDay(reviewedAt);

  return {
    intervalDays: interval,
    repetitions,
    easeFactor,
    nextReviewAt,
    lastReviewAt,
  };
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcCalendarDays(start: Date, days: number): Date {
  const next = new Date(start.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function ratingEmoji(rating: number): string {
  return ["❌", "😐", "✅", "🔥"][rating] ?? "";
}

export function ratingWord(rating: number): string {
  return ["Lupa", "Sulit", "Mudah", "Hafal"][rating] ?? "";
}

/** Preview label for interval after a rating (matches Lingora `intervalLabel`). */
export function intervalLabel(days: number): string {
  if (days <= 1) return "Besok";
  if (days < 7) return `${days} hari lagi`;
  if (days < 30) return `${Math.round(days / 7)} minggu lagi`;
  return `${Math.round(days / 30)} bulan lagi`;
}
