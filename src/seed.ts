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
  },
): Exercise {
  const reps = opts.reps ?? 8;
  return {
    id,
    name,
    catalogId,
    targetSets: opts.sets,
    targetReps: reps,
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
      exercise("test-plank", "Plank", "plank", { sets: 3, reps: 8, rest: 45 }),
    ],
  },
];

export function createSeedStore(): Store {
  return {
    version: 1,
    weightUnit: "kg",
    restScreen: true,
    programs: structuredClone(SEED_PROGRAMS),
    sessions: [],
    active: null,
  };
}
