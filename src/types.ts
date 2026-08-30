export const ICON_IDS = [
  "bench",
  "incline",
  "ohp",
  "squat",
  "deadlift",
  "rdls",
  "row",
  "pulldown",
  "pullup",
  "fly",
  "lateral",
  "facepull",
  "curl",
  "pushdown",
  "skullcrusher",
  "dip",
  "lunge",
  "legpress",
  "legcurl",
  "calf",
  "hipthrust",
  "plank",
  "shrug",
  "cable",
  "default",
] as const;

export type IconId = (typeof ICON_IDS)[number];

export type ExerciseMode = "reps" | "timed";

export type Exercise = {
  id: string;
  name: string;
  icon: IconId;
  mode: ExerciseMode;
  targetSets: number;
  targetReps: number;
  targetSeconds: number;
  restSeconds: number;
  workingWeight: number;
  note: string;
};

export type Program = {
  id: string;
  name: string;
  accent: string;
  exercises: Exercise[];
};

export type SetLog = {
  reps: number;
  weight: number;
  durationMs: number;
  completedAt: number;
};

export type ExerciseLog = {
  exerciseId: string;
  currentWeight: number;
  sets: SetLog[];
};

export type ActiveSession = {
  id: string;
  programId: string;
  startedAt: number;
  activeExerciseId: string;
  restUntil: number | null;
  setStartedAt: number;
  workStartedAt: number | null;
  pendingReps: number;
  logs: Record<string, ExerciseLog>;
};

export type CompletedExercise = {
  exerciseId: string;
  name: string;
  icon: IconId;
  note: string;
  sets: SetLog[];
};

export type CompletedSession = {
  id: string;
  programId: string;
  programName: string;
  startedAt: number;
  completedAt: number;
  exercises: CompletedExercise[];
};

export type Store = {
  version: 1;
  weightUnit: "kg" | "lb";
  programs: Program[];
  sessions: CompletedSession[];
  active: ActiveSession | null;
};

export type Route =
  | { name: "home" }
  | { name: "history" }
  | { name: "programs" }
  | { name: "program-edit"; id: string }
  | { name: "workout" }
  | { name: "exercise"; id: string };

export type Action =
  | { type: "start-workout"; programId: string; now: number; sessionId: string }
  | { type: "select-exercise"; exerciseId: string; now: number }
  | { type: "adjust-pending-reps"; delta: number }
  | { type: "set-pending-reps"; reps: number }
  | { type: "log-set"; now: number }
  | { type: "undo-set"; now: number }
  | { type: "skip-rest"; now: number }
  | { type: "adjust-weight"; delta: number }
  | { type: "set-weight"; weight: number }
  | { type: "set-next-weight"; weight: number }
  | { type: "set-note"; exerciseId: string; note: string }
  | { type: "start-work"; now: number }
  | { type: "stop-work" }
  | { type: "finish-workout"; now: number }
  | { type: "discard-workout" }
  | { type: "upsert-program"; program: Program }
  | { type: "delete-program"; programId: string }
  | { type: "add-exercise"; programId: string; exercise: Exercise }
  | { type: "update-exercise"; programId: string; exercise: Exercise }
  | { type: "delete-exercise"; programId: string; exerciseId: string }
  | { type: "move-exercise"; programId: string; exerciseId: string; direction: "up" | "down" }
  | { type: "set-unit"; unit: "kg" | "lb" }
  | { type: "replace-store"; store: Store };
