import type { WeightPoint } from "../logic/progress";

const W = 280;
const H = 64;
const PAD = 6;

export function WeightChart({ points, color }: { points: WeightPoint[]; color: string }) {
  if (points.length === 0) return null;
  const weights = points.map((point) => point.weight);
  const lo = Math.min(...weights);
  const hi = Math.max(...weights);
  const span = hi - lo || 1;
  const xs = points.map((_, i) =>
    points.length === 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - PAD * 2),
  );
  const ys = weights.map((weight) => PAD + (1 - (weight - lo) / span) * (H - PAD * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${ys[i]?.toFixed(1)}`).join(" ");
  return (
    <svg className="weight-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {xs.map((x, i) => (
        <circle key={points[i]?.at ?? i} cx={x} cy={ys[i] ?? PAD} r="3.5" fill={color} />
      ))}
    </svg>
  );
}
