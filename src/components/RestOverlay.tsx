import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Glyph } from "./Glyph";
import { useHeartRate } from "../hooks";
import { liftTint } from "../logic/catalog";
import { formatElapsed, formatRest } from "../logic/format";
import { restPreview, type RestLift } from "../logic/prescription";
import { go } from "../logic/routes";
import type { Action } from "../types";

export function continueAfterRest(
  dispatch: Dispatch<Action>,
  stay: boolean,
  nextId: string | undefined,
): void {
  const now = Date.now();
  dispatch({ type: "end-rest", now });
  if (stay) return;
  if (nextId) {
    dispatch({ type: "select-exercise", exerciseId: nextId, now });
    go({ name: "exercise", id: nextId });
    return;
  }
  go({ name: "workout" });
}

export function RestOverlay({
  elapsedMs,
  targetSeconds,
  current,
  next,
  afterNextName,
  onStop,
}: {
  elapsedMs: number;
  targetSeconds: number;
  current: RestLift;
  next?: RestLift;
  afterNextName?: string;
  onStop: (stay: boolean) => void;
}) {
  const overtime = elapsedMs > targetSeconds * 1000 && targetSeconds > 0;
  const buzzed = useRef(false);
  const hr = useHeartRate();
  const [extra, setExtra] = useState(false);
  const preview = restPreview({ current, next, afterNextName, extra });

  useEffect(() => {
    if (!overtime || buzzed.current) return;
    buzzed.current = true;
    navigator.vibrate?.([160, 70, 160]);
  }, [overtime]);

  return (
    <div
      className={overtime ? "rest-overlay over" : "rest-overlay"}
      onClick={() => onStop(preview.stay)}
    >
      <button
        type="button"
        className="rest-tap"
        onClick={(event) => {
          event.stopPropagation();
          onStop(preview.stay);
        }}
      >
        <p className="rest-kicker">Rest</p>
        {hr.bpm != null ? <p className="rest-hr">{hr.bpm}</p> : null}
        <p className={overtime ? "rest-time over" : "rest-time"}>{formatElapsed(elapsedMs)}</p>
        <div className="rest-next">
          {preview.catalogId ? (
            <Glyph catalogId={preview.catalogId} size="lg" color={liftTint(preview.catalogId, preview.color)} />
          ) : null}
          <p className="rest-next-name">{preview.name}</p>
          {preview.series ? <p className="rest-reps">{preview.series}</p> : null}
        </div>
        {preview.thenName ? <p className="rest-then">Then {preview.thenName}</p> : null}
        <p className="rest-hint">Plan {formatRest(targetSeconds)} · tap when ready</p>
      </button>
      {preview.offerExtra ? (
        <button
          type="button"
          className={extra ? "btn-ghost rest-extra on" : "btn-ghost rest-extra"}
          aria-pressed={extra}
          onClick={(event) => {
            event.stopPropagation();
            setExtra((on) => !on);
          }}
        >
          Extra
        </button>
      ) : null}
    </div>
  );
}
