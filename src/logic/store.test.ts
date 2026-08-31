import { describe, expect, it } from "vitest";
import { createSeedStore } from "../seed";
import type { Exercise, ExerciseLog, Program, Store } from "../types";
import { formatElapsed, formatWeight } from "./format";
import {
  buildScheme,
  needsSetup,
  pairWithNext,
  parsePyramid,
  pendingForExercise,
  restAfterLogging,
} from "./prescription";
import { hashFor, parseHash } from "./routes";
import { currentStreak, thisWeekCount } from "./stats";
import { liftPointsFor, liftWeightSeries } from "./progress";
import { loadStore, memoryStorage, saveStore } from "./storage";
import { reduce } from "./store";

const t0 = Date.parse("2026-08-30T10:00:00");

function store(): Store {
  return createSeedStore();
}

function lift(id: string, extra: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name: id,
    catalogId: "squat",
    targetSets: 3,
    targetReps: 5,
    restSeconds: 90,
    workingWeight: 0,
    note: "",
    ...extra,
  };
}

function programOf(exercises: Exercise[]): Program {
  return { id: "p", name: "P", accent: "#d6ff3e", exercises };
}

describe("reduce", () => {
  it("starts Test on squat using that lift's own reps", () => {
    const next = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    expect(next.active?.programId).toBe("test");
    expect(next.active?.activeExerciseId).toBe("test-squat");
    expect(next.active?.schemes["test-squat"]).toBe("default");
    expect(next.active?.pendingReps).toBe(5);
  });

  it("logs a set and starts rest that counts up", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 40_000 });
    const log = s.active?.logs["test-squat"];
    expect(log?.sets).toHaveLength(1);
    expect(log?.sets[0]?.reps).toBe(5);
    expect(s.active?.restStartedAt).toBe(t0 + 40_000);
    expect(s.active?.restTargetSeconds).toBe(90);
  });

  it("stays on the lift after the last planned set so extra sets can be logged", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    for (let i = 0; i < 3; i += 1) {
      s = reduce(s, { type: "log-set", now: t0 + (i + 1) * 1000 });
      if (s.active?.restStartedAt) {
        s = reduce(s, { type: "end-rest", now: t0 + (i + 1) * 1000 + 500 });
      }
    }
    expect(s.active?.logs["test-squat"]?.sets).toHaveLength(3);
    expect(s.active?.activeExerciseId).toBe("test-squat");
    s = reduce(s, { type: "log-set", now: t0 + 8000 });
    expect(s.active?.logs["test-squat"]?.sets).toHaveLength(4);
  });

  it("keeps last logged reps for the next set", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "set-pending-reps", reps: 4 });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    expect(s.active?.logs["test-squat"]?.sets[0]?.reps).toBe(4);
    expect(s.active?.pendingReps).toBe(4);
    s = reduce(s, { type: "end-rest", now: t0 + 20_000 });
    s = reduce(s, { type: "select-exercise", exerciseId: "test-squat", now: t0 + 21_000 });
    expect(s.active?.pendingReps).toBe(4);
  });

  it("adjusts weight and writes logged weight onto the plan for next time", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "adjust-weight", delta: 2.5 });
    expect(s.active?.logs["test-squat"]?.currentWeight).toBe(2.5);
    s = reduce(s, { type: "set-weight", weight: 80 });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    expect(s.active?.logs["test-squat"]?.currentWeight).toBe(80);
    expect(s.programs[0]?.exercises[0]?.workingWeight).toBe(80);
    s = reduce(s, { type: "finish-workout", now: t0 + 30 * 60 * 1000 });
    s = reduce(s, {
      type: "start-workout",
      programId: "test",
      now: t0 + 2 * 86_400_000,
      sessionId: "s2",
    });
    expect(s.active?.logs["test-squat"]?.currentWeight).toBe(80);
  });

  it("records rest duration when rest is stopped", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "end-rest", now: t0 + 91_000 });
    expect(s.active?.restStartedAt).toBeNull();
    expect(s.active?.logs["test-squat"]?.sets[0]?.restAfterMs).toBe(90_000);
  });

  it("discards an in-progress workout", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "discard-workout" });
    expect(s.active).toBeNull();
    expect(s.sessions).toHaveLength(0);
  });

  it("pairs neighboring exercises as a superset or alternate", () => {
    let s = reduce(store(), {
      type: "pair-with-next",
      programId: "test",
      exerciseId: "test-squat",
      kind: "alternate",
      groupId: "g-alt",
    });
    const squat = s.programs[0]?.exercises.find((item) => item.id === "test-squat");
    const bench = s.programs[0]?.exercises.find((item) => item.id === "test-bench");
    expect(squat?.alternateGroup).toBe("g-alt");
    expect(bench?.alternateGroup).toBe("g-alt");
    s = reduce(s, { type: "unpair", programId: "test", exerciseId: "test-squat" });
    expect(s.programs[0]?.exercises.find((item) => item.id === "test-squat")?.alternateGroup).toBeUndefined();
    s = reduce(s, {
      type: "pair-with-next",
      programId: "test",
      exerciseId: "test-squat",
      kind: "superset",
      groupId: "g-ss",
    });
    expect(s.programs[0]?.exercises.find((item) => item.id === "test-squat")?.supersetGroup).toBe("g-ss");
    expect(s.programs[0]?.exercises.find((item) => item.id === "test-bench")?.supersetGroup).toBe("g-ss");
  });

  it("persists notes onto the program exercise", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "set-note", exerciseId: "test-squat", note: "hlouběji" });
    expect(s.programs[0]?.exercises[0]?.note).toBe("hlouběji");
  });

  it("finishes a workout into history", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "finish-workout", now: t0 + 30 * 60 * 1000 });
    expect(s.active).toBeNull();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0]?.programName).toBe("Test");
    expect(s.sessions[0]?.exercises[0]?.sets).toHaveLength(1);
    expect(s.sessions[0]?.exercises[0]?.catalogId).toBe("squat");
  });

  it("undoes the last set", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "undo-set", now: t0 + 2000 });
    expect(s.active?.logs["test-squat"]?.sets).toHaveLength(0);
    expect(s.active?.restStartedAt).toBeNull();
  });
});

describe("prescription", () => {
  it("parses pyramid reps and builds a scheme from them", () => {
    expect(parsePyramid("10, 10, 10, 8, 8, 8, 6, 4")).toEqual([10, 10, 10, 8, 8, 8, 6, 4]);
    expect(parsePyramid("10 8 6 4")).toEqual([10, 8, 6, 4]);
    const scheme = buildScheme({
      kind: "pyramid",
      sets: 3,
      reps: 8,
      repsMin: 8,
      repsMax: 8,
      pyramid: [10, 8, 6, 4],
    });
    expect(scheme.pyramid).toEqual([10, 8, 6, 4]);
    expect(scheme.sets).toBe(4);
  });

  it("uses the planned pyramid number when last logged would otherwise stick", () => {
    const exercise = lift("pyr", {
      schemes: [
        {
          id: "default",
          label: "10 8 6 4",
          sets: 4,
          repsMin: 10,
          repsMax: 10,
          pyramid: [10, 8, 6, 4],
        },
      ],
    });
    expect(pendingForExercise(exercise, {}, 1, 10)).toBe(8);
    expect(pendingForExercise(exercise, {}, 0)).toBe(10);
  });

  it("only needs a Today screen when the plan has alternates", () => {
    const withAlt = programOf([
      lift("a", { alternateGroup: "g" }),
      lift("b", { alternateGroup: "g" }),
    ]);
    expect(needsSetup(withAlt)).toBe(true);
    expect(needsSetup(programOf([lift("a")]))).toBe(false);
  });

  it("rests only after both superset lifts", () => {
    const a = lift("a", { supersetGroup: "ss", restSeconds: 45 });
    const b = lift("b", { supersetGroup: "ss", restSeconds: 45 });
    const program = programOf([a, b]);
    const empty: ExerciseLog = { exerciseId: "a", currentWeight: 0, sets: [] };
    const afterFirst = restAfterLogging(program, a, {
      a: {
        ...empty,
        sets: [{ reps: 5, weight: 0, durationMs: 1, completedAt: t0 }],
      },
      b: { exerciseId: "b", currentWeight: 0, sets: [] },
    });
    expect(afterFirst.nextExerciseId).toBe("b");
    expect(afterFirst.restSeconds).toBe(0);
    const afterPair = restAfterLogging(program, b, {
      a: {
        ...empty,
        sets: [{ reps: 5, weight: 0, durationMs: 1, completedAt: t0 }],
      },
      b: {
        exerciseId: "b",
        currentWeight: 0,
        sets: [{ reps: 5, weight: 0, durationMs: 1, completedAt: t0 }],
      },
    });
    expect(afterPair.restSeconds).toBe(45);
    expect(afterPair.nextExerciseId).toBe("a");
  });

  it("pairs the next lift as a superset", () => {
    const next = pairWithNext([lift("a"), lift("b")], 0, "superset", "g1");
    expect(next[0]?.supersetGroup).toBe("g1");
    expect(next[1]?.supersetGroup).toBe("g1");
  });
});

describe("storage", () => {
  it("round-trips a store and survives reload", () => {
    const mem = memoryStorage();
    let s = reduce(store(), {
      type: "start-workout",
      programId: "test",
      now: t0,
      sessionId: "s9",
    });
    s = reduce(s, { type: "log-set", now: t0 + 5000 });
    saveStore(mem, s);
    const loaded = loadStore(mem);
    expect(loaded.active?.id).toBe("s9");
    expect(loaded.active?.logs["test-squat"]?.sets).toHaveLength(1);
  });

  it("falls back to seed when empty or corrupt", () => {
    expect(loadStore(memoryStorage()).programs).toHaveLength(1);
    expect(loadStore(memoryStorage()).programs[0]?.id).toBe("test");
    expect(loadStore(memoryStorage("{not json")).programs[0]?.id).toBe("test");
  });
});

describe("format", () => {
  it("formats timers and bodyweight", () => {
    expect(formatElapsed(65_000)).toBe("1:05");
    expect(formatWeight(0, "kg")).toBe("BW");
    expect(formatWeight(62.5, "kg")).toBe("62.5 kg");
  });
});

describe("routes", () => {
  it("parses and serializes hashes", () => {
    expect(parseHash("#/workout/exercise/test-squat")).toEqual({
      name: "exercise",
      id: "test-squat",
    });
    expect(parseHash("#/setup/test")).toEqual({ name: "setup", id: "test" });
    expect(hashFor({ name: "setup", id: "test" })).toBe("#/setup/test");
    expect(hashFor({ name: "programs" })).toBe("#/programs");
  });
});

describe("stats", () => {
  it("counts this week and streak", () => {
    const sessions = [
      {
        id: "a",
        programId: "test",
        programName: "Test",
        startedAt: Date.parse("2026-08-30T09:00:00"),
        completedAt: Date.parse("2026-08-30T10:00:00"),
        exercises: [
          {
            exerciseId: "test-squat",
            name: "Squat",
            catalogId: "squat",
            note: "",
            sets: [],
          },
        ],
      },
      {
        id: "b",
        programId: "test",
        programName: "Test",
        startedAt: Date.parse("2026-08-29T09:00:00"),
        completedAt: Date.parse("2026-08-29T10:00:00"),
        exercises: [
          {
            exerciseId: "test-bench",
            name: "Bench Press",
            catalogId: "bench-press",
            note: "",
            sets: [],
          },
        ],
      },
    ];
    expect(thisWeekCount(sessions, t0)).toBe(2);
    expect(currentStreak(sessions, t0)).toBe(2);
  });
});

describe("progress", () => {
  it("keeps each session's max loaded weight per catalog lift", () => {
    const series = liftWeightSeries([
      {
        id: "a",
        programId: "test",
        programName: "Test",
        startedAt: t0,
        completedAt: t0 + 3_600_000,
        exercises: [
          {
            exerciseId: "test-squat",
            name: "Squat",
            catalogId: "squat",
            note: "",
            sets: [
              { reps: 5, weight: 60, durationMs: 1, completedAt: t0 },
              { reps: 5, weight: 62.5, durationMs: 1, completedAt: t0 + 1 },
              { reps: 5, weight: 0, durationMs: 1, completedAt: t0 + 2 },
            ],
          },
        ],
      },
      {
        id: "b",
        programId: "test",
        programName: "Test",
        startedAt: t0 + 86_400_000,
        completedAt: t0 + 86_400_000 + 3_600_000,
        exercises: [
          {
            exerciseId: "test-squat",
            name: "Dřep",
            catalogId: "squat",
            note: "",
            sets: [{ reps: 5, weight: 65, durationMs: 1, completedAt: t0 + 86_400_000 }],
          },
        ],
      },
    ]);
    expect(series).toHaveLength(1);
    expect(series[0]?.catalogId).toBe("squat");
    expect(series[0]?.name).toBe("Dřep");
    expect(series[0]?.points.map((point) => point.weight)).toEqual([62.5, 65]);
  });

  it("appends today's max for the open lift", () => {
    const sessions = [
      {
        id: "a",
        programId: "test",
        programName: "Test",
        startedAt: t0,
        completedAt: t0 + 1,
        exercises: [
          {
            exerciseId: "test-squat",
            name: "Squat",
            catalogId: "squat",
            note: "",
            sets: [{ reps: 5, weight: 60, durationMs: 1, completedAt: t0 }],
          },
        ],
      },
    ];
    const points = liftPointsFor(sessions, "squat", {
      at: t0 + 86_400_000,
      sets: [{ weight: 62.5 }, { weight: 40 }],
    });
    expect(points.map((point) => point.weight)).toEqual([60, 62.5]);
  });
});