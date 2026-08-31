import { useEffect, useRef } from "react";
import { Glyph } from "./Glyph";
import { liftTint } from "../logic/catalog";
import { formatElapsed, formatRest } from "../logic/format";

export function RestOverlay({
  elapsedMs,
  targetSeconds,
  nextName,
  nextCatalogId,
  nextColor,
  thenName,
  setDone,
  setTotal,
  onStop,
}: {
  elapsedMs: number;
  targetSeconds: number;
  nextName: string;
  nextCatalogId: string;
  nextColor?: string;
  thenName?: string;
  setDone: number;
  setTotal: number;
  onStop: () => void;
}) {
  const overtime = elapsedMs > targetSeconds * 1000 && targetSeconds > 0;
  const buzzed = useRef(false);

  useEffect(() => {
    if (!overtime || buzzed.current) return;
    buzzed.current = true;
    navigator.vibrate?.([160, 70, 160]);
  }, [overtime]);

  const series =
    setTotal > 0 && setDone >= setTotal ? `Extra ${setDone}` : `${setDone}/${setTotal}`;

  return (
    <button type="button" className={overtime ? "rest-overlay over" : "rest-overlay"} onClick={onStop}>
      <p className="rest-kicker">Rest</p>
      <p className={overtime ? "rest-time over" : "rest-time"}>{formatElapsed(elapsedMs)}</p>
      <div className="rest-next">
        <Glyph catalogId={nextCatalogId} size="lg" color={liftTint(nextCatalogId, nextColor)} />
        <p className="rest-next-name">{nextName}</p>
        <p className="rest-reps">{series}</p>
      </div>
      {thenName ? <p className="rest-then">Then {thenName}</p> : null}
      <p className="rest-hint">Plan {formatRest(targetSeconds)} · tap when ready</p>
    </button>
  );
}
