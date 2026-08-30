import type { CompletedSession } from "../types";
import { addDays, dayKey, startOfWeekMonday } from "./format";

export function completedDays(sessions: CompletedSession[]): Set<string> {
  const days = new Set<string>();
  for (const session of sessions) {
    days.add(dayKey(session.startedAt));
  }
  return days;
}

export function countInRange(
  sessions: CompletedSession[],
  startMs: number,
  endMs: number,
): number {
  return sessions.filter((s) => s.startedAt >= startMs && s.startedAt < endMs).length;
}

export function currentStreak(sessions: CompletedSession[], now: number): number {
  const days = completedDays(sessions);
  let cursor = dayKey(now);
  if (!days.has(cursor)) {
    cursor = dayKey(addDays(now, -1));
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  let t = days.has(dayKey(now)) ? now : addDays(now, -1);
  while (days.has(dayKey(t))) {
    streak += 1;
    t = addDays(t, -1);
  }
  return streak;
}

export function thisWeekCount(sessions: CompletedSession[], now: number): number {
  const start = startOfWeekMonday(now);
  return countInRange(sessions, start, addDays(start, 7));
}

export function heatmapWeeks(now: number, weekCount: number): string[][] {
  const thisMonday = startOfWeekMonday(now);
  const firstMonday = addDays(thisMonday, -7 * (weekCount - 1));
  const weeks: string[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(dayKey(addDays(firstMonday, w * 7 + d)));
    }
    weeks.push(week);
  }
  return weeks;
}
