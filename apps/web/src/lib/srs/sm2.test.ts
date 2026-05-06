import { describe, expect, it } from "vitest";

import {
  calculateNext,
  defaultSrsCardState,
  intervalLabel,
  ratingEmoji,
  ratingWord,
} from "./sm2";

const reviewedAt = new Date(Date.UTC(2026, 4, 6, 15, 0, 0));

describe("defaultSrsCardState", () => {
  it("matches Lingora-style defaults", () => {
    expect(defaultSrsCardState()).toEqual({
      intervalDays: 1,
      repetitions: 0,
      easeFactor: 2.5,
    });
  });
});

describe("calculateNext", () => {
  it("rating 0 (Lupa) resets interval and repetitions", () => {
    const next = calculateNext({ intervalDays: 14, repetitions: 4, easeFactor: 2.2 }, 0, reviewedAt);
    expect(next.intervalDays).toBe(1);
    expect(next.repetitions).toBe(0);
    expect(next.easeFactor).toBe(2.2);
    expect(next.lastReviewAt.toISOString()).toBe("2026-05-06T00:00:00.000Z");
    expect(next.nextReviewAt.toISOString()).toBe("2026-05-07T00:00:00.000Z");
  });

  it("first successful review uses interval 1", () => {
    const next = calculateNext({ repetitions: 0, easeFactor: 2.5 }, 2, reviewedAt);
    expect(next.intervalDays).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.easeFactor).toBe(2.5);
  });

  it("second successful review uses interval 3", () => {
    const next = calculateNext({ intervalDays: 1, repetitions: 1, easeFactor: 2.5 }, 2, reviewedAt);
    expect(next.intervalDays).toBe(3);
    expect(next.repetitions).toBe(2);
  });

  it("third successful review multiplies interval by rounded easeFactor", () => {
    const next = calculateNext({ intervalDays: 3, repetitions: 2, easeFactor: 2.5 }, 2, reviewedAt);
    expect(next.intervalDays).toBe(Math.round(3 * 2.5));
    expect(next.repetitions).toBe(3);
  });

  it("caps interval at 365 days", () => {
    const next = calculateNext({ intervalDays: 400, repetitions: 10, easeFactor: 3 }, 3, reviewedAt);
    expect(next.intervalDays).toBe(365);
  });

  it("easeFactor never drops below 1.3", () => {
    const next = calculateNext(
      { intervalDays: 1, repetitions: 1, easeFactor: 1.31 },
      1,
      reviewedAt,
    );
    expect(next.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("fills defaults when card is undefined", () => {
    const next = calculateNext(undefined, 2, reviewedAt);
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.easeFactor).toBe(2.5);
  });
});

describe("intervalLabel", () => {
  it("formats Lingora-style Indonesian labels", () => {
    expect(intervalLabel(1)).toBe("Besok");
    expect(intervalLabel(3)).toBe("3 hari lagi");
    expect(intervalLabel(14)).toBe("2 minggu lagi");
    expect(intervalLabel(60)).toBe("2 bulan lagi");
  });
});

describe("rating helpers", () => {
  it("maps rating indices to emoji and words", () => {
    expect(ratingWord(0)).toBe("Lupa");
    expect(ratingEmoji(3)).toBe("🔥");
    expect(ratingWord(99)).toBe("");
  });
});
