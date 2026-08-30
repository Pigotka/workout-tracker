import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "exercise-icons");

const MAP = {
  squat: "mingcute:squats-fill",
  bench: "mdi:dumbbell",
  incline: "mdi:slope-uphill",
  ohp: "mdi:human-handsup",
  deadlift: "mdi:weight-lifter",
  rdls: "mdi:weight",
  row: "mdi:rowing",
  pulldown: "mdi:arrow-collapse-down",
  pullup: "mdi:human-male-height",
  fly: "mdi:arm-flex-outline",
  lateral: "mdi:arrow-expand-horizontal",
  facepull: "mdi:face-man",
  curl: "mdi:arm-flex",
  pushdown: "mdi:arrow-down-bold-circle",
  skullcrusher: "mdi:head",
  dip: "mdi:human-male",
  lunge: "mdi:walk",
  legpress: "mdi:car-seat",
  legext: "mdi:seat-legroom-extra",
  legcurl: "mdi:seat-recline-normal",
  calf: "mdi:foot-print",
  hipthrust: "mdi:bed",
  plank: "mdi:human",
  shrug: "mdi:account-arrow-up",
  cable: "mdi:cable-data",
  default: "mdi:dumbbell",
};

async function save(id, icon) {
  const url = `https://api.iconify.design/${icon}.svg?height=64&color=%2314180c`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const text = await res.text();
  if (!text.includes("<svg")) throw new Error(`not svg: ${id}`);
  writeFileSync(join(OUT, `${id}.svg`), text);
  console.log(`saved ${id} from ${icon}`);
}

mkdirSync(OUT, { recursive: true });
await Promise.all(Object.entries(MAP).map(([id, icon]) => save(id, icon)));
