import type { CompletedSession } from "../types";

export type WeightPoint = {
  at: number;
  weight: number;
};

export type LiftSeries = {
  catalogId: string;
  name: string;
  points: WeightPoint[];
};

export function sessionMaxWeight(sets: { weight: number }[]): number {
  let max = 0;
  for (const set of sets) {
    if (set.weight > max) max = set.weight;
  }
  return max;
}

export function liftWeightSeries(sessions: CompletedSession[]): LiftSeries[] {
  const byId = new Map<string, { name: string; points: WeightPoint[] }>();
  const ordered = [...sessions].sort((a, b) => a.completedAt - b.completedAt);
  for (const session of ordered) {
    const maxByLift = new Map<string, { name: string; weight: number }>();
    for (const exercise of session.exercises) {
      const max = sessionMaxWeight(exercise.sets);
      if (max <= 0) continue;
      const prev = maxByLift.get(exercise.catalogId);
      if (!prev || max > prev.weight) {
        maxByLift.set(exercise.catalogId, { name: exercise.name, weight: max });
      }
    }
    for (const [catalogId, row] of maxByLift) {
      const series = byId.get(catalogId) ?? { name: row.name, points: [] };
      series.name = row.name;
      series.points.push({ at: session.completedAt, weight: row.weight });
      byId.set(catalogId, series);
    }
  }
  return [...byId.entries()]
    .map(([catalogId, row]) => ({ catalogId, name: row.name, points: row.points }))
    .filter((series) => series.points.length >= 1)
    .sort((a, b) => (b.points.at(-1)?.at ?? 0) - (a.points.at(-1)?.at ?? 0));
}

export function liftPointsFor(
  sessions: CompletedSession[],
  catalogId: string,
  live?: { at: number; sets: { weight: number }[] },
): WeightPoint[] {
  const found = liftWeightSeries(sessions).find((series) => series.catalogId === catalogId);
  const points = found ? [...found.points] : [];
  if (live) {
    const max = sessionMaxWeight(live.sets);
    if (max > 0) points.push({ at: live.at, weight: max });
  }
  return points;
}
