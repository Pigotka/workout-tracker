import type { IconId } from "../types";

export const ICON_COLORS: Record<IconId, string> = {
  bench: "#ff7a3d",
  incline: "#ff9466",
  ohp: "#ffb020",
  squat: "#d6ff3e",
  deadlift: "#b8e000",
  rdls: "#9ad40a",
  row: "#5ad0ff",
  pulldown: "#3db7ff",
  pullup: "#7ae0c8",
  fly: "#ff8fab",
  lateral: "#e8d36a",
  facepull: "#c9a6ff",
  curl: "#ff6b8a",
  pushdown: "#ff9a4d",
  skullcrusher: "#ffb38a",
  dip: "#ffa06c",
  lunge: "#c6f24a",
  legpress: "#8ee000",
  legext: "#c8ff6a",
  legcurl: "#6fd67a",
  calf: "#b6ff73",
  hipthrust: "#d0ff6a",
  plank: "#7ad7ff",
  shrug: "#a0b4c8",
  cable: "#6ad0e8",
  default: "#d6ff3e",
};

export const ICON_LABELS: Record<IconId, string> = {
  bench: "Bench",
  incline: "Incline",
  ohp: "OH press",
  squat: "Squat",
  deadlift: "Deadlift",
  rdls: "RDL",
  row: "Row",
  pulldown: "Pulldown",
  pullup: "Pull-up",
  fly: "Fly",
  lateral: "Raise",
  facepull: "Face pull",
  curl: "Curl",
  pushdown: "Pushdown",
  skullcrusher: "Overhead ext",
  dip: "Dip",
  lunge: "Lunge",
  legpress: "Leg press",
  legext: "Leg ext",
  legcurl: "Leg curl",
  calf: "Calf",
  hipthrust: "Hip thrust",
  plank: "Abs",
  shrug: "Shrug",
  cable: "Cable",
  default: "Other",
};

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "glyph glyph-sm",
  md: "glyph glyph-md",
  lg: "glyph glyph-lg",
};

export function iconColor(id: IconId, override?: string): string {
  if (override && /^#[0-9a-fA-F]{6}$/.test(override)) return override;
  return ICON_COLORS[id];
}

export function Glyph({
  id,
  size = "md",
  color,
}: {
  id: IconId;
  size?: Size;
  color?: string;
}) {
  const bg = iconColor(id, color);
  return (
    <span className={SIZES[size]} style={{ background: bg, color: "#14180c" }} title={ICON_LABELS[id]}>
      <img
        className="glyph-img vector"
        src={`/exercise-icons/${id}.svg`}
        alt=""
        width={48}
        height={48}
        aria-hidden="true"
      />
    </span>
  );
}
