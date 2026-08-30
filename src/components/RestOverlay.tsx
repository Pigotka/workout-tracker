import { formatElapsed } from "../logic/format";

export function RestOverlay({
  remainingMs,
  onSkip,
}: {
  remainingMs: number;
  onSkip: () => void;
}) {
  const totalShown = Math.max(0, remainingMs);
  return (
    <button type="button" className="rest-overlay" onClick={onSkip}>
      <p className="rest-kicker">Rest</p>
      <p className="rest-time">{formatElapsed(totalShown)}</p>
      <p className="rest-hint">Tap to skip</p>
    </button>
  );
}
