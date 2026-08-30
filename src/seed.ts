import type { Exercise, Program } from "./types";

function exercise(
  id: string,
  name: string,
  icon: Exercise["icon"],
  opts: Partial<Omit<Exercise, "id" | "name" | "icon">> & {
    sets: number;
    reps?: number;
    rest: number;
    weight: number;
  },
): Exercise {
  return {
    id,
    name,
    icon,
    mode: opts.mode ?? "reps",
    targetSets: opts.sets,
    targetReps: opts.reps ?? 8,
    targetSeconds: opts.targetSeconds ?? 45,
    restSeconds: opts.rest,
    workingWeight: opts.weight,
    note: opts.note ?? "",
  };
}

export const SEED_PROGRAMS: Program[] = [
  {
    id: "push",
    name: "Push",
    accent: "#ff7a3d",
    exercises: [
      exercise("push-bench", "Bench press", "bench", { sets: 4, reps: 8, rest: 90, weight: 60 }),
      exercise("push-ohp", "Overhead press", "ohp", { sets: 3, reps: 8, rest: 90, weight: 40 }),
      exercise("push-incline", "Incline dumbbell press", "incline", {
        sets: 3,
        reps: 10,
        rest: 75,
        weight: 22.5,
      }),
      exercise("push-lateral", "Lateral raise", "lateral", { sets: 3, reps: 15, rest: 45, weight: 10 }),
      exercise("push-pushdown", "Tricep pushdown", "pushdown", {
        sets: 3,
        reps: 12,
        rest: 45,
        weight: 20,
      }),
      exercise("push-fly", "Chest fly", "fly", { sets: 2, reps: 12, rest: 45, weight: 15 }),
    ],
  },
  {
    id: "pull",
    name: "Pull",
    accent: "#5ad0ff",
    exercises: [
      exercise("pull-deadlift", "Deadlift", "deadlift", { sets: 3, reps: 5, rest: 180, weight: 100 }),
      exercise("pull-pullup", "Pull-up", "pullup", { sets: 3, reps: 8, rest: 90, weight: 0 }),
      exercise("pull-row", "Barbell row", "row", { sets: 4, reps: 8, rest: 90, weight: 60 }),
      exercise("pull-face", "Face pull", "facepull", { sets: 3, reps: 15, rest: 45, weight: 15 }),
      exercise("pull-curl", "Bicep curl", "curl", { sets: 3, reps: 10, rest: 60, weight: 15 }),
      exercise("pull-rear", "Rear delt fly", "fly", { sets: 2, reps: 15, rest: 45, weight: 8 }),
    ],
  },
  {
    id: "legs",
    name: "Legs",
    accent: "#d6ff3e",
    exercises: [
      exercise("legs-squat", "Squat", "squat", { sets: 4, reps: 6, rest: 180, weight: 80 }),
      exercise("legs-rdl", "Romanian deadlift", "rdls", { sets: 3, reps: 8, rest: 90, weight: 70 }),
      exercise("legs-press", "Leg press", "legpress", { sets: 3, reps: 10, rest: 90, weight: 120 }),
      exercise("legs-lunge", "Walking lunge", "lunge", { sets: 3, reps: 10, rest: 75, weight: 20 }),
      exercise("legs-curl", "Leg curl", "legcurl", { sets: 3, reps: 12, rest: 60, weight: 35 }),
      exercise("legs-calf", "Calf raise", "calf", { sets: 4, reps: 12, rest: 45, weight: 40 }),
    ],
  },
];

export function createSeedStore() {
  return {
    version: 1 as const,
    weightUnit: "kg" as const,
    programs: structuredClone(SEED_PROGRAMS),
    sessions: [],
    active: null,
  };
}
