import type { HiraganaItemPayload } from "@/lib/content/hiragana-payload";

export type HiraganaQuizRow = {
  id: string;
  char: string;
  romaji: string;
};

export type HiraganaMcQuestion = {
  contentItemId: string;
  char: string;
  answerRomaji: string;
  choicesRomaji: string[];
};

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
  return arr;
}

/**
 * Wrong options use distinct display values (BF-001 — avoid duplicate choices when pool is small).
 */
export function pickDistinctWrongRomaji(
  pool: HiraganaQuizRow[],
  correctRomaji: string,
  count: number,
): string[] {
  const candidates = shuffleInPlace([...pool]).filter((r) => r.romaji !== correctRomaji);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of candidates) {
    if (seen.has(row.romaji)) continue;
    seen.add(row.romaji);
    out.push(row.romaji);
    if (out.length >= count) break;
  }
  return out;
}

export function rowFromContentItem(row: {
  id: string;
  payload: unknown;
}): HiraganaQuizRow | null {
  const p = row.payload as HiraganaItemPayload;
  const char = typeof p.char === "string" ? p.char.trim() : "";
  const romaji = typeof p.romaji === "string" ? p.romaji.trim() : "";
  if (!char || !romaji) return null;
  return { id: row.id, char, romaji };
}

export function buildCharToRomajiQuestions(
  rows: HiraganaQuizRow[],
  questionCount: number,
  choicesCount = 4,
): HiraganaMcQuestion[] {
  const valid = rows.filter((r) => r.char && r.romaji);
  const shuffled = shuffleInPlace([...valid]);
  const n = Math.min(questionCount, shuffled.length);
  const picked = shuffled.slice(0, n);

  return picked.map((item) => {
    const needWrong = Math.min(choicesCount - 1, valid.length - 1);
    const wrongs = pickDistinctWrongRomaji(valid, item.romaji, needWrong);
    const choicesRomaji = shuffleInPlace([item.romaji, ...wrongs]);
    return {
      contentItemId: item.id,
      char: item.char,
      answerRomaji: item.romaji,
      choicesRomaji,
    };
  });
}
