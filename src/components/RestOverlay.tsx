import { useEffect, useRef } from "react";
import { formatElapsed, formatRest } from "../logic/format";

export function RestOverlay({
  elapsedMs,
  targetSeconds,
  onStop,
}: {
  elapsedMs: number;
  targetSeconds: number;
  onStop: () => void;
}) {
  const overtime = elapsedMs > targetSeconds * 1000 && targetSeconds > 0;
  const buzzed = useRef(false);

  useEffect(() => {
    if (!overtime || buzzed.current) return;
    buzzed.current = true;
    navigator.vibrate?.([160, 70, 160]);
  }, [overtime]);

  return (
    <button type="button" className={overtime ? "rest-overlay over" : "rest-overlay"} onClick={onStop}>
      <p className="rest-kicker">Rest</p>
      <p className={overtime ? "rest-time over" : "rest-time"}>{formatElapsed(elapsedMs)}</p>
      <p className="rest-hint">Plan {formatRest(targetSeconds)} · tap when ready</p>
    </button>
  );
}
