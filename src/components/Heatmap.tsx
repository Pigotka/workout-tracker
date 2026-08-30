import { completedDays, heatmapWeeks } from "../logic/stats";
import type { CompletedSession } from "../types";

export function Heatmap({ sessions, now, weeks = 16 }: { sessions: CompletedSession[]; now: number; weeks?: number }) {
  const days = completedDays(sessions);
  const grid = heatmapWeeks(now, weeks);
  return (
    <div className="heatmap" role="img" aria-label="Workout frequency">
      {grid.map((week) => (
        <div key={week[0]} className="heatmap-week">
          {week.map((day) => (
            <span
              key={day}
              className={days.has(day) ? "heat-cell on" : "heat-cell"}
              title={day}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
