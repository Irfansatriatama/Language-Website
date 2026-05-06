/**
 * Daily challenges — ported from `_reference/lingora/assets/js/modules/challenge.js` (subset templates + seed RNG).
 */

export type ChallengeTemplate = {
  type: string;
  module?: string;
  target?: number;
  count?: number;
  minPct?: number;
  icon: string;
  title: string;
  desc: string;
  xp: number;
};

export type StoredChallenge = ChallengeTemplate & {
  id: string;
  progress: number;
  completed: boolean;
  claimedXp: boolean;
  _modulesUsed?: string[];
};

const MAX_DAILY = 3;

/** Minimal template set (Fase G); expand later as needed. */
export const DAILY_CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    type: "learn_items",
    module: "any",
    target: 5,
    icon: "📖",
    title: "Pelajar Aktif",
    desc: "Hafal 5 item baru hari ini (modul apa saja)",
    xp: 40,
  },
  {
    type: "quiz_complete",
    count: 1,
    icon: "🎯",
    title: "Quiz Pertama",
    desc: "Selesaikan 1 sesi quiz apa pun",
    xp: 30,
  },
  {
    type: "srs_review",
    count: 5,
    icon: "🔁",
    title: "Review SRS",
    desc: "Review 5 kartu SRS (hiragana)",
    xp: 35,
  },
  {
    type: "streak_active",
    icon: "🔥",
    title: "Jaga Api Streak",
    desc: "Belajar hari ini untuk menjaga streak",
    xp: 25,
  },
  {
    type: "multi_module",
    count: 2,
    icon: "🌐",
    title: "Penjelajah",
    desc: "Belajar di 2 modul berbeda hari ini",
    xp: 40,
  },
];

function seededRand(seed: number, n: number): number[] {
  let s = seed >>> 0;
  const results: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (1664525 * s + 1013904223) >>> 0;
    results.push(Math.abs(s));
  }
  return results;
}

function templateDedupKey(t: ChallengeTemplate): string {
  return `${t.type}-${t.module ?? ""}-${t.target ?? ""}-${t.count ?? ""}-${t.minPct ?? ""}`;
}

export function ymdToNumericSeed(ymd: string): number {
  return Number(ymd.replace(/-/g, ""));
}

/** Deterministic picks for calendar day (`ymd` as YYYY-MM-DD). */
export function generateStoredChallengesForDate(ymd: string): StoredChallenge[] {
  const seedNum = ymdToNumericSeed(ymd);
  const seed = seededRand(seedNum, MAX_DAILY * 12);
  const picked: StoredChallenge[] = [];
  const usedKeys = new Set<string>();

  for (let i = 0; i < seed.length && picked.length < MAX_DAILY; i++) {
    const idx = seed[i]! % DAILY_CHALLENGE_TEMPLATES.length;
    const tpl = DAILY_CHALLENGE_TEMPLATES[idx]!;
    const key = templateDedupKey(tpl);
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      picked.push({
        ...tpl,
        id: `ch_${seedNum}_${picked.length}`,
        progress: 0,
        completed: false,
        claimedXp: false,
      });
    }
  }

  let fallbackIdx = 0;
  while (picked.length < MAX_DAILY) {
    const tpl = DAILY_CHALLENGE_TEMPLATES[fallbackIdx % DAILY_CHALLENGE_TEMPLATES.length]!;
    fallbackIdx++;
    picked.push({
      ...tpl,
      id: `ch_${seedNum}_${picked.length}_${fallbackIdx}`,
      progress: 0,
      completed: false,
      claimedXp: false,
    });
  }

  return picked;
}

export type ChallengeActivity =
  | { kind: "learn_item"; moduleSlug: string; moduleKey: string }
  | { kind: "quiz_complete"; accuracyPct: number }
  | { kind: "srs_review"; delta: number }
  | { kind: "multi_module"; moduleKey: string }
  | { kind: "streak_touch" };

/**
 * Applies challenge activities sequentially (matches reference order).
 * Auto-claims XP for challenges that become completed during this invocation.
 */
export function applyChallengeActivities(
  list: StoredChallenge[],
  activities: ChallengeActivity[],
): Array<{ xp: number; challengeId: string; title: string }> {
  const lines: Array<{ xp: number; challengeId: string; title: string }> = [];
  const completedBefore = new Map(list.map((ch) => [ch.id, ch.completed]));

  for (const payload of activities) {
    list.forEach((ch) => {
      if (ch.completed) return;
      const progBefore = ch.progress ?? 0;

      if (
        payload.kind === "learn_item" &&
        ch.type === "learn_items" &&
        (ch.module === "any" || ch.module === payload.moduleSlug)
      ) {
        const tgt = ch.target ?? 0;
        ch.progress = Math.min(tgt, progBefore + 1);
      } else if (payload.kind === "quiz_complete" && ch.type === "quiz_complete") {
        const tgt = ch.count ?? 1;
        ch.progress = Math.min(tgt, progBefore + 1);
      } else if (payload.kind === "quiz_complete" && ch.type === "quiz_accuracy") {
        const minPct = ch.minPct ?? 0;
        if (payload.accuracyPct >= minPct) ch.progress = 1;
      } else if (payload.kind === "srs_review" && ch.type === "srs_review") {
        const tgt = ch.count ?? 1;
        ch.progress = Math.min(tgt, progBefore + payload.delta);
      } else if (payload.kind === "multi_module" && ch.type === "multi_module") {
        if (!ch._modulesUsed) ch._modulesUsed = [];
        if (!ch._modulesUsed.includes(payload.moduleKey)) ch._modulesUsed.push(payload.moduleKey);
        const tgt = ch.count ?? 1;
        ch.progress = Math.min(tgt, ch._modulesUsed.length);
      } else if (payload.kind === "streak_touch" && ch.type === "streak_active") {
        ch.progress = 1;
      }

      const maxProg = ch.target ?? ch.count ?? (ch.minPct !== undefined ? 1 : 1);
      const targetMet = maxProg > 0 && (ch.progress ?? 0) >= maxProg;

      if (!ch.completed && targetMet) {
        ch.completed = true;
      }
    });
  }

  for (const ch of list) {
    if (ch.completed && !completedBefore.get(ch.id) && !ch.claimedXp) {
      ch.claimedXp = true;
      lines.push({ xp: ch.xp, challengeId: ch.id, title: ch.title });
    }
  }

  return lines;
}
