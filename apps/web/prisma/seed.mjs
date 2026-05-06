import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const hiraganaAll = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/hiragana-all.json"), "utf8"),
);
const hangulAll = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/hangul-all.json"), "utf8"),
);
const pinyinAll = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/pinyin-all.json"), "utf8"),
);

/** Public Cloudinary demo MP3 (docs account) — proves delivery URL in UI (Fase H). */
const CLOUDINARY_DEMO_SAMPLE_MP3 =
  "https://res.cloudinary.com/demo/video/upload/docs/fireflywav.mp3";

async function seedModuleWithItems(languageId, def, items) {
  const mod = await prisma.module.upsert({
    where: { languageId_slug: { languageId, slug: def.slug } },
    create: {
      languageId,
      slug: def.slug,
      title: def.title,
      description: def.description,
      type: def.type,
      order: def.order,
    },
    update: {
      title: def.title,
      description: def.description,
      type: def.type,
      order: def.order,
    },
  });

  await prisma.contentItem.deleteMany({ where: { moduleId: mod.id } });

  await prisma.contentItem.createMany({
    data: items.map((row, i) => ({
      moduleId: mod.id,
      externalId: row.externalId,
      payload: row.payload,
      sortOrder: row.sortOrder ?? i,
    })),
  });

  return { mod, count: items.length };
}

async function main() {
  const ja = await prisma.language.upsert({
    where: { code: "ja" },
    create: {
      code: "ja",
      name: "Japanese",
      nativeName: "日本語",
      sortOrder: 0,
    },
    update: { name: "Japanese", nativeName: "日本語", enabled: true },
  });

  const ko = await prisma.language.upsert({
    where: { code: "ko" },
    create: {
      code: "ko",
      name: "Korean",
      nativeName: "한국어",
      sortOrder: 1,
    },
    update: { name: "Korean", nativeName: "한국어", enabled: true },
  });

  const zh = await prisma.language.upsert({
    where: { code: "zh" },
    create: {
      code: "zh",
      name: "Chinese (Mandarin)",
      nativeName: "中文",
      sortOrder: 2,
    },
    update: { name: "Chinese (Mandarin)", nativeName: "中文", enabled: true },
  });

  const es = await prisma.language.upsert({
    where: { code: "es" },
    create: {
      code: "es",
      name: "Spanish",
      nativeName: "Español",
      sortOrder: 3,
    },
    update: { name: "Spanish", nativeName: "Español", enabled: true },
  });

  const de = await prisma.language.upsert({
    where: { code: "de" },
    create: {
      code: "de",
      name: "German",
      nativeName: "Deutsch",
      sortOrder: 4,
    },
    update: { name: "German", nativeName: "Deutsch", enabled: true },
  });

  const en = await prisma.language.upsert({
    where: { code: "en" },
    create: {
      code: "en",
      name: "English",
      nativeName: "English",
      sortOrder: 5,
    },
    update: { name: "English", nativeName: "English", enabled: true },
  });


  const eslModuleDef = {
    slug: "starter-vocabulary",
    title: "Kosakata & tense",
    description:
      "Proof Fase I (Latin): beberapa kosakata + label pola tense untuk template grid yang sama dengan modul utama.",
    type: "esl_starter",
    order: 0,
  };

  const esStarter = await seedModuleWithItems(es.id, eslModuleDef, [
    {
      externalId: "es-hola",
      payload: {
        char: "hola",
        romaji: "halo · sapaan informal",
        group: "Sapaan",
        type: "frasa",
        example: { word: "Hola,", reading: "", meaning: "Halo." },
      },
    },
    {
      externalId: "es-gracias",
      payload: {
        char: "gracias",
        romaji: "terima kasih",
        group: "Sapaan",
        type: "kata",
      },
    },
    {
      externalId: "es-como-estas",
      payload: {
        char: "¿cómo estás?",
        romaji: "apa kabar (informal)",
        group: "Sapaan",
        type: "tanya",
      },
    },
    {
      externalId: "es-comer",
      payload: {
        char: "comer",
        romaji: "makan · infinitif",
        group: "Kata kerja",
        type: "infinitivo",
      },
    },
    {
      externalId: "es-presente-estoy",
      payload: {
        char: "estoy cansado/a",
        romaji: "saya lagi lelah · estar + adj",
        group: "Tenses",
        type: "presente continuo (idea)",
      },
    },
    {
      externalId: "es-presente-ser",
      payload: {
        char: "soy estudiante",
        romaji: "saya seorang pelajar · ser + kata benda",
        group: "Tenses",
        type: "presente ser",
      },
    },
  ]);

  const deStarter = await seedModuleWithItems(de.id, eslModuleDef, [
    {
      externalId: "de-hallo",
      payload: {
        char: "Hallo",
        romaji: "halo",
        group: "Begrüßung",
        type: "frasa",
        example: { word: "Hallo.", reading: "", meaning: "" },
      },
    },
    {
      externalId: "de-danke",
      payload: {
        char: "Danke schön",
        romaji: "terima kasih banyak",
        group: "Höflichkeit",
        type: "frasa",
      },
    },
    {
      externalId: "de-guten-morgen",
      payload: {
        char: "Guten Morgen",
        romaji: "selamat pagi",
        group: "Begrüßung",
        type: "frasa",
      },
    },
    {
      externalId: "de-essen",
      payload: {
        char: "essen",
        romaji: "makan · Infinitiv",
        group: "Verben",
        type: "Infinitiv",
      },
    },
    {
      externalId: "de-praesens-bin",
      payload: {
        char: "ich bin müde",
        romaji: "saya lelah · Präsens von sein",
        group: "Tenses",
        type: "Präsens Aktiv",
      },
    },
    {
      externalId: "de-praesens-esse",
      payload: {
        char: "ich esse",
        romaji: "saya sedang/saya makan · Präsens",
        group: "Tenses",
        type: "Präsens Aktiv",
      },
    },
  ]);

  const enStarter = await seedModuleWithItems(en.id, eslModuleDef, [
    {
      externalId: "en-hello",
      payload: {
        char: "hello",
        romaji: "halo",
        group: "Greetings",
        type: "phrase",
        sampleAudioUrl: CLOUDINARY_DEMO_SAMPLE_MP3,
      },
    },
    {
      externalId: "en-thanks",
      payload: {
        char: "thank you",
        romaji: "terima kasih",
        group: "Greetings",
        type: "phrase",
      },
    },
    {
      externalId: "en-how",
      payload: {
        char: "How are you?",
        romaji: "apa kabar",
        group: "Greetings",
        type: "question",
      },
    },
    {
      externalId: "en-infinitive",
      payload: {
        char: "to eat",
        romaji: "makan · infinitive",
        group: "Verbs",
        type: "base form",
      },
    },
    {
      externalId: "en-present-progressive",
      payload: {
        char: "I am eating",
        romaji: "saya sedang makan · be + V-ing",
        group: "Tenses",
        type: "present continuous",
      },
    },
    {
      externalId: "en-present-simple",
      payload: {
        char: "She works",
        romaji: "Dia bekerja · bentuk kini orang ketiga tunggal",
        group: "Tenses",
        type: "present simple",
      },
    },
  ]);

  const jaHira = await seedModuleWithItems(
    ja.id,
    {
      slug: "hiragana",
      title: "Hiragana",
      description: "104 karakter hiragana: dasar, dakuten, dan yōon.",
      type: "kana",
      order: 0,
    },
    hiraganaAll.map((item, i) => ({
      externalId: item.char,
      payload:
        item.char === "あ"
          ? { ...item, sampleAudioUrl: CLOUDINARY_DEMO_SAMPLE_MP3 }
          : item,
      sortOrder: i,
    })),
  );

  const koHangul = await seedModuleWithItems(ko.id, {
    slug: "hangul",
    title: "Hangul",
    description: "Jamo konsonan/vokal + suku kata dasar (data referensi Lingora).",
    type: "hangul",
    order: 0,
  }, hangulAll);

  const zhPinyin = await seedModuleWithItems(zh.id, {
    slug: "pinyin",
    title: "Pinyin",
    description: "Inisial, final, dan kombinasi suku kata penting (data referensi Lingora).",
    type: "pinyin",
    order: 0,
  }, pinyinAll);

  console.log(
    `Seed OK: hiragana ${jaHira.count}, hangul ${koHangul.count}, pinyin ${zhPinyin.count}; ` +
      `Latin starter ES ${esStarter.count}, DE ${deStarter.count}, EN ${enStarter.count}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
