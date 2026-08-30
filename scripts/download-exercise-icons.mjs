import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "exercise-icons");
const BASES = [
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises",
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises",
];

const MAP = {
  bench: "Barbell_Bench_Press_-_Medium_Grip",
  incline: "Barbell_Incline_Bench_Press_-_Medium_Grip",
  ohp: "Standing_Military_Press",
  squat: "Barbell_Full_Squat",
  deadlift: "Barbell_Deadlift",
  rdls: "Romanian_Deadlift",
  row: "Bent_Over_Barbell_Row",
  pulldown: "Wide-Grip_Lat_Pulldown",
  pullup: "Pullups",
  fly: "Dumbbell_Flyes",
  lateral: "Side_Lateral_Raise",
  facepull: "Face_Pull",
  curl: "Barbell_Curl",
  pushdown: "Triceps_Pushdown",
  skullcrusher: "Lying_Triceps_Press",
  dip: "Dips_-_Triceps_Version",
  lunge: "Barbell_Lunge",
  legpress: "Leg_Press",
  legext: "Leg_Extensions",
  legcurl: "Lying_Leg_Curls",
  calf: "Standing_Calf_Raises",
  hipthrust: "Barbell_Hip_Thrust",
  plank: "Plank",
  shrug: "Barbell_Shrug",
  cable: "Cable_Crossover",
  default: "Pushups",
};

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function save(id, slug) {
  let lastError;
  for (const base of BASES) {
    try {
      const buf = await download(`${base}/${slug}/0.jpg`);
      if (buf.length < 1000) throw new Error("too small");
      writeFileSync(join(OUT, `${id}.jpg`), buf);
      console.log(`saved ${id} (${buf.length} bytes)`);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`failed ${id}`);
}

mkdirSync(OUT, { recursive: true });
const jobs = Object.entries(MAP).map(([id, slug]) => save(id, slug));
await Promise.all(jobs);
