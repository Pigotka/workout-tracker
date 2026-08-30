import { describe, expect, it } from "vitest";
import { createSeedStore } from "../seed";
import { formatElapsed, formatWeight } from "./format";
import { parseHash, hashFor } from "./routes";
import { currentStreak, thisWeekCount } from "./stats";
import { loadStore, memoryStorage, saveStore } from "./storage";
import { reduce } from "./store";
import type { Store } from "../types";

const t0 = Date.parse("2026-08-30T10:00:00");

function store(): Store {
  return createSeedStore();
}

describe("reduce", () => {
  it("starts a workout on the first exercise", () => {
    const next = reduce(store(), {
      type: "start-workout",
      programId: "push",
      now: t0,
      sessionId: "s1",
    });
    expect(next.active?.programId).toBe("push");
    expect(next.active?.activeExerciseId).toBe("push-bench");
    expect(next.active?.pendingReps).toBe(8);
    expect(next.active?.logs["push-bench"]?.currentWeight).toBe(60);
  });

  it("logs a set and starts rest", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "push",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 40_000 });
    const log = s.active?.logs["push-bench"];
    expect(log?.sets).toHaveLength(1);
    expect(log?.sets[0]?.reps).toBe(8);
    expect(log?.sets[0]?.durationMs).toBe(40_000);
    expect(s.active?.restUntil).toBe(t0 + 40_000 + 90_000);
  });

  it("keeps next weight on the program immediately", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "push",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "set-next-weight", weight: 62.5 });
    const bench = s.programs[0]?.exercises[0];
    expect(bench?.workingWeight).toBe(62.5);
    expect(s.active?.logs["push-bench"]?.currentWeight).toBe(60);
  });

  it("persists notes onto the program exercise", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "push",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "set-note", exerciseId: "push-bench", note: "pause at bottom" });
    expect(s.programs[0]?.exercises[0]?.note).toBe("pause at bottom");
  });

  it("finishes a workout into history", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "push",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "finish-workout", now: t0 + 30 * 60 * 1000 });
    expect(s.active).toBeNull();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0]?.programName).toBe("Push");
    expect(s.sessions[0]?.exercises[0]?.sets).toHaveLength(1);
  });

  it("undoes the last set", () => {
    let s = reduce(store(), {
      type: "start-workout",
      programId: "push",
      now: t0,
      sessionId: "s1",
    });
    s = reduce(s, { type: "log-set", now: t0 + 1000 });
    s = reduce(s, { type: "undo-set", now: t0 + 2000 });
    expect(s.active?.logs["push-bench"]?.sets).toHaveLength(0);
    expect(s.active?.restUntil).toBeNull();
  });
});

describe("storage", () => {
  it("round-trips a store and survives reload", () => {
    const mem = memoryStorage();
    let s = reduce(store(), {
      type: "start-workout",
      programId: "legs",
      now: t0,
      sessionId: "s9",
    });
    s = reduce(s, { type: "log-set", now: t0 + 5000 });
    saveStore(mem, s);
    const loaded = loadStore(mem);
    expect(loaded.active?.id).toBe("s9");
    expect(loaded.active?.logs["legs-squat"]?.sets).toHaveLength(1);
  });

  it("falls back to seed when empty or corrupt", () => {
    expect(loadStore(memoryStorage()).programs).toHaveLength(3);
    expect(loadStore(memoryStorage("{not json")).programs).toHaveLength(3);
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
    expect(parseHash("#/workout/exercise/push-bench")).toEqual({
      name: "exercise",
      id: "push-bench",
    });
    expect(hashFor({ name: "programs" })).toBe("#/programs");
  });
});

describe("stats", () => {
  it("counts this week and streak", () => {
    const sessions = [
      {
        id: "a",
        programId: "push",
        programName: "Push",
        startedAt: Date.parse("2026-08-30T09:00:00"),
        completedAt: Date.parse("2026-08-30T10:00:00"),
        exercises: [],
      },
      {
        id: "b",
        programId: "pull",
        programName: "Pull",
        startedAt: Date.parse("2026-08-29T09:00:00"),
        completedAt: Date.parse("2026-08-29T10:00:00"),
        exercises: [],
      },
    ];
    expect(thisWeekCount(sessions, t0)).toBe(2);
    expect(currentStreak(sessions, t0)).toBe(2);
  });
});
