import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "catalog");
const DATA_URL =
  "https://raw.githubusercontent.com/RepDB/exercise-dataset/main/exercises.json";
const ASSET_BASE =
  "https://raw.githubusercontent.com/RepDB/exercise-dataset/main/";

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function mapPool(items, limit, fn) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

mkdirSync(OUT, { recursive: true });

const { exercises } = await (await fetch(DATA_URL)).json();
const catalog = await mapPool(exercises, 10, async (ex) => {
  const src = ex.images?.flat?.peak ?? ex.images?.flat?.main;
  if (!src) throw new Error(`no image for ${ex.id}`);

  const dest = join(OUT, `${ex.id}.webp`);
  if (!existsSync(dest)) {
    const buf = await download(`${ASSET_BASE}${src}`);
    writeFileSync(dest, buf);
  }

  return {
    id: ex.id,
    name: ex.name_en,
    equipment: ex.equipment ?? "",
    bodyPart: typeof ex.body_part === "string" ? ex.body_part : "",
  };
});

const json = JSON.stringify(catalog);
writeFileSync(join(ROOT, "src", "logic", "catalog-data.json"), json);
console.log(`catalog: ${catalog.length} exercises, webps in public/catalog`);
