/** XP per aktivitas — mirror `_reference/lingora/assets/js/modules/xp.js` XP_VALUES. */
export const XP_VALUES = {
  LEARN_ITEM: 5,
  QUIZ_COMPLETE: 10,
  QUIZ_PERFECT: 25,
  STREAK_DAY: 15,
  SRS_SESSION: 8,
} as const;

/** Level thresholds aligned with `_reference/lingora/assets/js/modules/xp.js` LEVELS. */

export type LevelInfo = {
  level: number;
  nameJa: string;
  nameId: string;
  xpRequired: number;
};

export const XP_LEVELS: LevelInfo[] = [
  { level: 1, nameJa: "入門", nameId: "Pemula", xpRequired: 0 },
  { level: 2, nameJa: "初級", nameId: "Dasar", xpRequired: 100 },
  { level: 3, nameJa: "中級", nameId: "Menengah", xpRequired: 300 },
  { level: 4, nameJa: "上級", nameId: "Lanjutan", xpRequired: 700 },
  { level: 5, nameJa: "達人", nameId: "Mahir", xpRequired: 1500 },
  { level: 6, nameJa: "師範", nameId: "Ahli", xpRequired: 3000 },
  { level: 7, nameJa: "名人", nameId: "Master", xpRequired: 6000 },
];

export function levelNumberFromTotalXp(totalXp: number): number {
  return levelProgressFromTotalXp(totalXp).level.level;
}

/** XP granted after a quiz session: base + bonus sempurna (same totals as xp.js separate calls combined). */
export function xpAwardForQuiz(score: number, total: number): number {
  let xp = XP_VALUES.QUIZ_COMPLETE;
  if (total >= 5 && score === total) xp += XP_VALUES.QUIZ_PERFECT;
  return xp;
}

export function levelProgressFromTotalXp(totalXp: number): {
  level: LevelInfo;
  nextLevel: LevelInfo | null;
  progress01: number;
} {
  let idx = 0;
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= XP_LEVELS[i].xpRequired) {
      idx = i;
      break;
    }
  }
  const level = XP_LEVELS[idx]!;
  const nextLevel = XP_LEVELS[idx + 1] ?? null;
  if (!nextLevel) {
    return { level, nextLevel: null, progress01: 1 };
  }
  const span = nextLevel.xpRequired - level.xpRequired;
  const progress01 =
    span <= 0 ? 1 : Math.min(1, Math.max(0, (totalXp - level.xpRequired) / span));
  return { level, nextLevel, progress01 };
}
