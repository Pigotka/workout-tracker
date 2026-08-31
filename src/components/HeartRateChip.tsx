import { useHeartRate } from "../hooks";
import { toggleHeartRate } from "../logic/heart-rate";

export function HeartRateChip() {
  const hr = useHeartRate();
  if (!hr.supported) return null;
  const label =
    hr.status === "connecting"
      ? "HR…"
      : hr.status === "on" && hr.bpm != null
        ? String(hr.bpm)
        : hr.status === "on"
          ? "HR…"
          : hr.status === "error"
            ? "HR?"
            : "HR";
  return (
    <button
      type="button"
      className={hr.status === "on" ? "hr-chip on" : "hr-chip"}
      onClick={() => toggleHeartRate()}
      aria-label={hr.status === "on" ? "Disconnect heart rate strap" : "Connect heart rate strap"}
    >
      {label}
    </button>
  );
}
