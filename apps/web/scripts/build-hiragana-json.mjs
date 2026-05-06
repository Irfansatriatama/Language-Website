/**
 * Reads local reference hiragana.js (no network) and writes prisma/data/hiragana-all.json
 * for idempotent seeding. Re-run when the reference data file changes.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..", "..");
const refPath = path.join(
  repoRoot,
  "_reference/lingora/assets/js/data/hiragana.js",
);
const outDir = path.join(__dirname, "../prisma/data");
const outFile = path.join(outDir, "hiragana-all.json");

let code = fs.readFileSync(refPath, "utf8");
code = code.replace(/window\.HiraganaData\s*=\s*HiraganaData;?\s*$/m, "");

const data = vm.runInNewContext(`${code}\nHiraganaData`, {}, { filename: "hiragana.js" });
if (!data?.all || !Array.isArray(data.all)) {
  throw new Error("build-hiragana-json: expected HiraganaData.all array");
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(data.all, null, 2), "utf8");
console.log(`Wrote ${data.all.length} items to ${path.relative(repoRoot, outFile)}`);
