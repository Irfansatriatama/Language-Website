/**
 * One-off: baca data referensi Lingora (JS IIFE) → JSON untuk seed.
 * Jalankan dari apps/web: node prisma/build-lang-data.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ref = path.resolve(root, "../../_reference/lingora/assets/js/data");

function loadHangulData() {
  const src = fs.readFileSync(path.join(ref, "hangul.js"), "utf8");
  return new Function(`${src}\nreturn HangulData;`)();
}

function loadPinyinData() {
  let src = fs.readFileSync(path.join(ref, "pinyin.js"), "utf8");
  src = src.replace(/\nwindow\.PinyinData\s*=\s*PinyinData\s*;?\s*$/, "\n");
  return new Function(`${src}\nreturn PinyinData;`)();
}

function buildHangulItems() {
  const HangulData = loadHangulData();
  const items = [];
  let sortOrder = 0;

  for (const c of HangulData.getConsonants()) {
    items.push({
      externalId: `jamo-c-${c.jamo}`,
      sortOrder: sortOrder++,
      payload: {
        char: c.jamo,
        romaji: c.romanization,
        group: "Konsonan",
        type: "jamo",
        name: c.name,
        example: c.example
          ? {
              word: c.example.word,
              reading: c.example.syllable,
              meaning: c.example.meaning,
            }
          : undefined,
      },
    });
  }

  for (const v of HangulData.getVowels()) {
    items.push({
      externalId: `jamo-v-${v.jamo}`,
      sortOrder: sortOrder++,
      payload: {
        char: v.jamo,
        romaji: v.romanization,
        group: "Vokal",
        type: "jamo",
        name: v.name,
        example: v.example
          ? {
              word: v.example.word,
              reading: v.example.syllable,
              meaning: v.example.meaning,
            }
          : undefined,
      },
    });
  }

  for (const s of HangulData.getSyllables()) {
    items.push({
      externalId: `syl-${s.block}`,
      sortOrder: sortOrder++,
      payload: {
        char: s.block,
        romaji: s.romanization,
        group: s.batchim ? "Suku kata + batchim" : "Suku kata",
        type: s.batchim ? "silaba-batchim" : "silaba",
        consonant: s.consonant,
        vowel: s.vowel,
        batchim: s.batchim,
      },
    });
  }

  return items;
}

function buildPinyinItems() {
  const PinyinData = loadPinyinData();
  const items = [];
  let sortOrder = 0;

  for (const row of PinyinData.initials) {
    items.push({
      externalId: `py-i-${row.symbol}`,
      sortOrder: sortOrder++,
      payload: {
        char: row.symbol,
        romaji: row.ipa ?? row.symbol,
        group: "Inisial",
        type: "initial",
        desc: row.desc,
        example: row.example
          ? {
              word: row.example.word,
              reading: row.example.word,
              meaning: row.example.meaning,
              hanzi: row.example.hanzi,
            }
          : undefined,
      },
    });
  }

  for (const row of PinyinData.finals) {
    items.push({
      externalId: `py-f-${row.symbol}`,
      sortOrder: sortOrder++,
      payload: {
        char: row.symbol,
        romaji: row.symbol,
        group: "Final",
        type: "final",
        desc: row.desc,
        example: row.example
          ? {
              word: row.example.word,
              reading: row.example.word,
              meaning: row.example.meaning,
              hanzi: row.example.hanzi,
            }
          : undefined,
      },
    });
  }

  for (const row of PinyinData.combinations) {
    items.push({
      externalId: `py-c-${row.pinyin}`,
      sortOrder: sortOrder++,
      payload: {
        char: row.example?.hanzi ?? row.pinyin,
        romaji: row.pinyin,
        group: `${row.initial}+${row.final}`,
        type: "kombinasi",
        tone: row.tone,
        example: row.example
          ? {
              word: row.example.word,
              reading: row.example.word,
              meaning: row.example.meaning,
              hanzi: row.example.hanzi,
            }
          : undefined,
      },
    });
  }

  return items;
}

const hangul = buildHangulItems();
const pinyin = buildPinyinItems();

const outDir = path.join(__dirname, "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "hangul-all.json"), JSON.stringify(hangul, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "pinyin-all.json"), JSON.stringify(pinyin, null, 2), "utf8");

console.log(`Wrote ${hangul.length} hangul items, ${pinyin.length} pinyin items → prisma/data/`);
