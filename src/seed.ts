import type { Exercise, Program, Store } from "./types";

function exercise(
  id: string,
  name: string,
  catalogId: string,
  opts: {
    sets: number;
    reps?: number;
    rest: number;
    weight?: number;
    note?: string;
    mode?: Exercise["mode"];
    targetSeconds?: number;
  },
): Exercise {
  const reps = opts.reps ?? 8;
  return {
    id,
    name,
    catalogId,
    mode: opts.mode ?? "reps",
    targetSets: opts.sets,
    targetReps: reps,
    targetSeconds: opts.targetSeconds ?? 45,
    restSeconds: opts.rest,
    workingWeight: opts.weight ?? 0,
    note: opts.note ?? "",
  };
}

export const SEED_PROGRAMS: Program[] = [
  {
    id: "test",
    name: "Test",
    accent: "#d6ff3e",
    exercises: [
      exercise("test-squat", "Squat", "squat", { sets: 3, reps: 5, rest: 90 }),
      exercise("test-bench", "Bench Press", "bench-press", { sets: 3, reps: 5, rest: 90 }),
      exercise("test-pullup", "Pull-Up", "pull-up", { sets: 3, reps: 8, rest: 90 }),
      exercise("test-plank", "Plank", "plank", {
        sets: 3,
        rest: 45,
        mode: "timed",
        targetSeconds: 45,
      }),
    ],
  },
];

export function createSeedStore(): Store {
  return {
    version: 3,
    weightUnit: "kg",
    programs: structuredClone(SEED_PROGRAMS),
    sessions: [],
    active: null,
  };
}
