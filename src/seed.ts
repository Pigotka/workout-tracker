import type { Exercise, Program, RepScheme } from "./types";

function scheme(partial: RepScheme): RepScheme {
  return partial;
}

function exercise(
  id: string,
  name: string,
  icon: Exercise["icon"],
  opts: {
    sets: number;
    reps?: number;
    rest: number;
    weight?: number;
    note?: string;
    mode?: Exercise["mode"];
    targetSeconds?: number;
    alternateGroup?: string;
    supersetGroup?: string;
    schemes?: RepScheme[];
  },
): Exercise {
  const reps = opts.reps ?? 8;
  return {
    id,
    name,
    icon,
    mode: opts.mode ?? "reps",
    targetSets: opts.sets,
    targetReps: reps,
    targetSeconds: opts.targetSeconds ?? 45,
    restSeconds: opts.rest,
    workingWeight: opts.weight ?? 0,
    note: opts.note ?? "",
    alternateGroup: opts.alternateGroup,
    supersetGroup: opts.supersetGroup,
    schemes: opts.schemes,
  };
}

export const SEED_PROGRAMS: Program[] = [
  {
    id: "t1",
    name: "Trénink 1",
    accent: "#d6ff3e",
    exercises: [
      exercise("t1-drep", "Dřep", "squat", {
        sets: 6,
        reps: 6,
        rest: 180,
        alternateGroup: "t1-quads",
        schemes: [scheme({ id: "default", label: "6 × 4–6", sets: 6, repsMin: 4, repsMax: 6 })],
        note: "Střídat s legpressem ob trénink.",
      }),
      exercise("t1-legpress", "Legpress", "legpress", {
        sets: 6,
        reps: 12,
        rest: 180,
        alternateGroup: "t1-quads",
        schemes: [scheme({ id: "default", label: "6 × 8–12", sets: 6, repsMin: 8, repsMax: 12 })],
        note: "Střídat s dřepem ob trénink.",
      }),
      exercise("t1-predkop", "Předkopávání", "legext", {
        sets: 4,
        reps: 10,
        rest: 0,
        supersetGroup: "t1-legiso",
        note: "Supersérie se zakopáváním. 1 s kontrakce v horní poloze.",
      }),
      exercise("t1-zakop", "Zakopávání", "legcurl", {
        sets: 4,
        reps: 10,
        rest: 45,
        supersetGroup: "t1-legiso",
        note: "Supersérie s předkopáváním.",
      }),
      exercise("t1-shyby", "Shyby", "pullup", {
        sets: 6,
        reps: 8,
        rest: 90,
        weight: 0,
        alternateGroup: "t1-pull",
        schemes: [scheme({ id: "default", label: "6 × MAX", sets: 6, repsMin: 0, repsMax: 0, isMax: true })],
        note: "Odlehčení spodních zad po dřepu. Střídat s přítahy s oporou.",
      }),
      exercise("t1-pritahy", "Přítahy činky s oporou", "row", {
        sets: 8,
        reps: 10,
        rest: 90,
        alternateGroup: "t1-pull",
        schemes: [
          scheme({
            id: "default",
            label: "10 10 10 8 8 8 6 4",
            sets: 8,
            repsMin: 10,
            repsMax: 10,
            pyramid: [10, 10, 10, 8, 8, 8, 6, 4],
          }),
        ],
        note: "Odlehčení spodních zad po dřepu. Střídat se shyby.",
      }),
      exercise("t1-incline", "Tlaky hlavou nahoru", "incline", {
        sets: 3,
        reps: 15,
        rest: 30,
        note: "Krátká pauza mezi sériemi. V horní poloze kontrakce 1 s.",
      }),
      exercise("t1-military", "Military press", "ohp", {
        sets: 5,
        reps: 10,
        rest: 90,
      }),
      exercise("t1-extenze", "Extenze činky za hlavou", "skullcrusher", {
        sets: 5,
        reps: 10,
        rest: 0,
        supersetGroup: "t1-arms",
        note: "Lze jet v supersérii s bicepsem.",
      }),
      exercise("t1-biceps", "Bicepsový zdvih tyče", "curl", {
        sets: 5,
        reps: 10,
        rest: 60,
        supersetGroup: "t1-arms",
        note: "Lze jet v supersérii s extenzí.",
      }),
      exercise("t1-bricho", "Břicho", "plank", {
        sets: 3,
        reps: 15,
        rest: 30,
        note: "Série v rozpisu nebyly — 3×15 jako výchozí, uprav podle dne.",
      }),
    ],
  },
];

export function createSeedStore() {
  return {
    version: 2 as const,
    weightUnit: "kg" as const,
    programs: structuredClone(SEED_PROGRAMS),
    sessions: [],
    active: null,
  };
}
