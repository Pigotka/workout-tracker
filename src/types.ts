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
  "legext",
  "legcurl",
  "calf",
  "hipthrust",
  "plank",
  "shrug",
  "cable",
  "default",
] as const;

export type IconId = (typeof ICON_IDS)[number];

export type IconStyle = "photo" | "effort" | "symbol";

export const ICON_STYLES: { id: IconStyle; name: string; hint: string }[] = [
  { id: "photo", name: "Photos", hint: "Start of the lift — easiest to recognize" },
  { id: "effort", name: "Effort", hint: "The hard part of the rep" },
  { id: "symbol", name: "Symbols", hint: "Simple line icons" },
];

export type ExerciseMode = "reps" | "timed";

export type RepScheme = {
  id: string;
  label: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  isMax?: boolean;
  pyramid?: number[];
};

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
  color?: string;
  alternateGroup?: string;
  supersetGroup?: string;
  schemeGroup?: string;
  schemes?: RepScheme[];
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
  restAfterMs?: number;
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
  restStartedAt: number | null;
  restTargetSeconds: number;
  setStartedAt: number;
  workStartedAt: number | null;
  pendingReps: number;
  logs: Record<string, ExerciseLog>;
  choices: Record<string, string>;
  schemes: Record<string, string>;
};

export type CompletedExercise = {
  exerciseId: string;
  name: string;
  icon: IconId;
  note: string;
  schemeId?: string;
  sets: SetLog[];
};

export type CompletedSession = {
  id: string;
  programId: string;
  programName: string;
  startedAt: number;
  completedAt: number;
  choices?: Record<string, string>;
  schemes?: Record<string, string>;
  exercises: CompletedExercise[];
};

export type Store = {
  version: 1 | 2;
  weightUnit: "kg" | "lb";
  iconStyle: IconStyle;
  programs: Program[];
  sessions: CompletedSession[];
  active: ActiveSession | null;
};

export type Route =
  | { name: "home" }
  | { name: "history" }
  | { name: "programs" }
  | { name: "program-edit"; id: string }
  | { name: "setup"; id: string }
  | { name: "workout" }
  | { name: "exercise"; id: string };

export type Action =
  | {
      type: "start-workout";
      programId: string;
      now: number;
      sessionId: string;
      choices?: Record<string, string>;
      schemes?: Record<string, string>;
    }
  | { type: "select-exercise"; exerciseId: string; now: number }
  | { type: "swap-alternate"; group: string; now: number }
  | { type: "flip-scheme"; group: string; now: number }
  | { type: "adjust-pending-reps"; delta: number }
  | { type: "set-pending-reps"; reps: number }
  | { type: "log-set"; now: number }
  | { type: "undo-set"; now: number }
  | { type: "end-rest"; now: number }
  | { type: "adjust-weight"; delta: number }
  | { type: "set-weight"; weight: number }
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
  | { type: "pair-with-next"; programId: string; exerciseId: string; kind: "superset" | "alternate"; groupId: string }
  | { type: "unpair"; programId: string; exerciseId: string }
  | { type: "set-unit"; unit: "kg" | "lb" }
  | { type: "set-icon-style"; style: IconStyle }
  | { type: "replace-store"; store: Store };
