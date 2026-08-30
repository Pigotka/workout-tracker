import { Glyph } from "../components/Glyph";
import { Heatmap } from "../components/Heatmap";
import { formatElapsed, formatWeight, relativeDay } from "../logic/format";
import { currentStreak, thisWeekCount } from "../logic/stats";
import { useStore } from "../store-context";
import type { CompletedSession } from "../types";
import { useState } from "react";

export function HistoryScreen() {
  const { store } = useStore();
  const now = Date.now();
  const [openId, setOpenId] = useState<string | null>(null);
  const week = thisWeekCount(store.sessions, now);
  const streak = currentStreak(store.sessions, now);

  return (
    <div className="screen">
      <header className="page-head">
        <p className="eyebrow">Log</p>
        <h1>How often you train</h1>
        <Heatmap sessions={store.sessions} now={now} />
        <div className="stat-row">
          <div className="stat">
            <strong>{week}</strong>
            <span>this week</span>
          </div>
          <div className="stat">
            <strong>{streak}</strong>
            <span>day streak</span>
          </div>
          <div className="stat">
            <strong>{store.sessions.length}</strong>
            <span>sessions</span>
          </div>
        </div>
      </header>

      {store.sessions.length === 0 ? (
        <p className="empty">Finish a workout and it will land here.</p>
      ) : (
        <ul className="session-list">
          {store.sessions.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                className="session-row"
                onClick={() => setOpenId(openId === session.id ? null : session.id)}
              >
                <div>
                  <p className="exercise-name">{session.programName}</p>
                  <p className="muted">
                    {relativeDay(session.startedAt, now)} · {formatElapsed(session.completedAt - session.startedAt)}
                  </p>
                </div>
                <span className="muted">{session.exercises.length} lifts</span>
              </button>
              {openId === session.id ? <SessionDetail session={session} unit={store.weightUnit} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionDetail({ session, unit }: { session: CompletedSession; unit: "kg" | "lb" }) {
  return (
    <div className="session-detail">
      {session.exercises.map((exercise) => (
        <div key={exercise.exerciseId} className="detail-ex">
          <Glyph id={exercise.icon} size="sm" />
          <div>
            <p>{exercise.name}</p>
            <p className="muted">
              {exercise.sets
                .map((set) =>
                  set.reps > 0
                    ? `${set.reps}×${formatWeight(set.weight, unit)}`
                    : formatElapsed(set.durationMs),
                )
                .join(" · ")}
            </p>
            {exercise.note ? <p className="cue">{exercise.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
