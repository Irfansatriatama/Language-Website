/**
 * Dry-run: expected ContentItem counts per (language, module) vs prisma/data JSON and ESL starter counts in seed.
 * Canonical counts match `prisma/seed.mjs` sources — compare README notes in repo root.
 *
 * Usage:
 *   node scripts/import-regression-dry-run.mjs           # print reference only
 *   node scripts/import-regression-dry-run.mjs --with-db # compare DATABASE_URL
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");

function jsonArrayLength(relFromAppRoot) {
  const full = path.join(appRoot, relFromAppRoot);
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  if (!Array.isArray(data)) {
    throw new Error(`${relFromAppRoot}: expected top-level array`);
  }
  return data.length;
}

const MODULE_SPECS = [
  {
    languageCode: "ja",
    slug: "hiragana",
    expected: jsonArrayLength("prisma/data/hiragana-all.json"),
    source: "prisma/data/hiragana-all.json",
  },
  {
    languageCode: "ko",
    slug: "hangul",
    expected: jsonArrayLength("prisma/data/hangul-all.json"),
    source: "prisma/data/hangul-all.json",
  },
  {
    languageCode: "zh",
    slug: "pinyin",
    expected: jsonArrayLength("prisma/data/pinyin-all.json"),
    source: "prisma/data/pinyin-all.json",
  },
  {
    languageCode: "es",
    slug: "starter-vocabulary",
    expected: 6,
    source: "prisma/seed.mjs (inline ESL)",
  },
  {
    languageCode: "de",
    slug: "starter-vocabulary",
    expected: 6,
    source: "prisma/seed.mjs (inline ESL)",
  },
  {
    languageCode: "en",
    slug: "starter-vocabulary",
    expected: 6,
    source: "prisma/seed.mjs (inline ESL)",
  },
];

async function compareDb() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  let mismatches = 0;

  try {
    for (const row of MODULE_SPECS) {
      const dbCount = await prisma.contentItem.count({
        where: {
          module: { slug: row.slug, language: { code: row.languageCode } },
        },
      });
      const ok = dbCount === row.expected;
      if (!ok) mismatches += 1;
      console.log(
        `${ok ? "[OK]" : "[FAIL]"} ${row.languageCode}/${row.slug}: db=${dbCount} reference=${row.expected} (${row.source})`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }

  return mismatches;
}

function printReferenceTable() {
  console.log("Import regression (dry-run) — item counts per module\n");
  for (const row of MODULE_SPECS) {
    console.log(`  ${row.languageCode}/${row.slug}: ${row.expected}  ← ${row.source}`);
  }
  console.log(
    "\nPass --with-db to compare live DATABASE_URL (run from apps/web with .env loaded).",
  );
}

async function main() {
  printReferenceTable();

  if (!process.argv.includes("--with-db")) {
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error("\n[FAIL] --with-db requires DATABASE_URL");
    process.exit(1);
  }

  console.log("\nComparing database…\n");
  const mismatches = await compareDb();
  if (mismatches > 0) {
    console.error(`\n${mismatches} module(s) differ from reference.`);
    process.exit(1);
  }
  console.log("\nAll modules match reference.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
