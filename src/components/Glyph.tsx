import type { ReactNode } from "react";
import type { IconId } from "../types";

const COLORS: Record<IconId, string> = {
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

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="glyph-svg">
      {children}
    </svg>
  );
}

const ink = "currentColor";

function Head({ x, y, r = 3.6 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={ink} />;
}

function Bar({ y, left = 6, right = 42 }: { y: number; left?: number; right?: number }) {
  return (
    <g>
      <rect x={left + 4} y={y - 1.2} width={right - left - 8} height="2.4" rx="1" fill={ink} />
      <rect x={left} y={y - 4} width="4" height="8" rx="1" fill={ink} />
      <rect x={right - 4} y={y - 4} width="4" height="8" rx="1" fill={ink} />
    </g>
  );
}

const SHAPES: Record<IconId, ReactNode> = {
  bench: (
    <Svg>
      <rect x="10" y="28" width="28" height="5" rx="1.5" fill={ink} />
      <rect x="14" y="33" width="4" height="7" fill={ink} />
      <rect x="30" y="33" width="4" height="7" fill={ink} />
      <Head x={24} y={16} />
      <rect x="21" y="19" width="6" height="9" rx="2" fill={ink} />
      <Bar y={18} />
    </Svg>
  ),
  incline: (
    <Svg>
      <path d="M12 38 V22 L32 12 V18 L18 26 V38Z" fill={ink} />
      <Head x={30} y={12} />
      <Bar y={14} left={16} right={44} />
    </Svg>
  ),
  ohp: (
    <Svg>
      <Head x={24} y={22} />
      <rect x="20" y="25" width="8" height="12" rx="2" fill={ink} />
      <path d="M16 38 Q24 32 32 38" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Bar y={10} />
      <path d="M18 22 L10 12" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M30 22 L38 12" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  squat: (
    <Svg>
      <Bar y={11} />
      <Head x={24} y={16} />
      <rect x="20" y="19" width="8" height="8" rx="2" fill={ink} />
      <path d="M16 38 L20 27 H28 L32 38" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 22 L20 22" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M34 22 L28 22" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  deadlift: (
    <Svg>
      <Head x={24} y={12} />
      <rect x="20" y="15" width="8" height="10" rx="2" fill={ink} />
      <path d="M18 38 V28 H30 V38" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <Bar y={34} />
    </Svg>
  ),
  rdls: (
    <Svg>
      <Head x={18} y={14} />
      <rect x="16" y="17" width="7" height="12" rx="2" transform="rotate(-25 19 23)" fill={ink} />
      <path d="M22 30 L18 40" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M28 28 L34 38" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Bar y={32} left={8} right={36} />
    </Svg>
  ),
  row: (
    <Svg>
      <Head x={14} y={16} />
      <rect x="13" y="19" width="12" height="7" rx="2" transform="rotate(-35 19 22)" fill={ink} />
      <path d="M22 28 L16 40" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M26 26 L32 38" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Bar y={30} left={18} right={44} />
    </Svg>
  ),
  pulldown: (
    <Svg>
      <rect x="8" y="6" width="32" height="3" rx="1" fill={ink} />
      <rect x="23" y="6" width="2" height="12" fill={ink} />
      <rect x="14" y="16" width="20" height="3" rx="1" fill={ink} />
      <Head x={24} y={26} />
      <rect x="20" y="29" width="8" height="10" rx="2" fill={ink} />
    </Svg>
  ),
  pullup: (
    <Svg>
      <rect x="6" y="6" width="36" height="3" rx="1" fill={ink} />
      <path d="M14 7 V14" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M34 7 V14" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Head x={24} y={22} />
      <rect x="20" y="25" width="8" height="8" rx="2" fill={ink} />
      <path d="M16 38 L24 33 L32 38" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  fly: (
    <Svg>
      <Head x={24} y={14} />
      <rect x="20" y="17" width="8" height="12" rx="2" fill={ink} />
      <path d="M8 18 Q16 14 20 20" stroke={ink} strokeWidth="3" fill="none" />
      <path d="M40 18 Q32 14 28 20" stroke={ink} strokeWidth="3" fill="none" />
      <circle cx="8" cy="18" r="3" fill={ink} />
      <circle cx="40" cy="18" r="3" fill={ink} />
    </Svg>
  ),
  lateral: (
    <Svg>
      <Head x={24} y={14} />
      <rect x="20" y="17" width="8" height="12" rx="2" fill={ink} />
      <path d="M8 22 H20 M28 22 H40" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <circle cx="8" cy="22" r="3.2" fill={ink} />
      <circle cx="40" cy="22" r="3.2" fill={ink} />
    </Svg>
  ),
  facepull: (
    <Svg>
      <Head x={24} y={16} />
      <rect x="20" y="19" width="8" height="10" rx="2" fill={ink} />
      <path d="M8 16 H18 M30 16 H40" stroke={ink} strokeWidth="2.6" fill="none" />
      <path d="M16 20 L12 30 M32 20 L36 30" stroke={ink} strokeWidth="2.6" fill="none" />
    </Svg>
  ),
  curl: (
    <Svg>
      <Head x={24} y={10} />
      <rect x="21" y="13" width="6" height="10" rx="2" fill={ink} />
      <path d="M18 38 V24" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="20" r="5" fill="none" stroke={ink} strokeWidth="2.8" />
      <rect x="22" y="24" width="10" height="3" rx="1" fill={ink} />
    </Svg>
  ),
  pushdown: (
    <Svg>
      <rect x="23" y="6" width="2.4" height="16" fill={ink} />
      <rect x="16" y="20" width="16" height="3" rx="1" fill={ink} />
      <Head x={24} y={30} />
      <path d="M16 22 V34 M32 22 V34" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  skullcrusher: (
    <Svg>
      <Head x={24} y={20} />
      <rect x="20" y="23" width="8" height="10" rx="2" fill={ink} />
      <path d="M16 38 Q24 32 32 38" stroke={ink} strokeWidth="3" fill="none" />
      <path d="M24 12 V20" stroke={ink} strokeWidth="2.6" fill="none" />
      <Bar y={10} left={10} right={38} />
    </Svg>
  ),
  dip: (
    <Svg>
      <rect x="8" y="10" width="4" height="28" rx="1" fill={ink} />
      <rect x="36" y="10" width="4" height="28" rx="1" fill={ink} />
      <rect x="8" y="16" width="10" height="3" fill={ink} />
      <rect x="30" y="16" width="10" height="3" fill={ink} />
      <Head x={24} y={22} />
      <rect x="20" y="25" width="8" height="8" rx="2" fill={ink} />
    </Svg>
  ),
  lunge: (
    <Svg>
      <Head x={20} y={10} />
      <rect x="17" y="13" width="6" height="10" rx="2" fill={ink} />
      <path d="M16 24 L12 40 M20 24 L32 30 L36 40" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  legpress: (
    <Svg>
      <rect x="6" y="14" width="18" height="22" rx="2" fill={ink} opacity="0.35" />
      <rect x="22" y="16" width="18" height="14" rx="2" fill={ink} />
      <Head x={14} y={20} />
      <path d="M16 26 L28 22" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M16 30 L30 28" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  legext: (
    <Svg>
      <rect x="10" y="10" width="16" height="10" rx="2" fill={ink} />
      <Head x={18} y={8} r={3} />
      <path d="M22 20 V28 L36 32" stroke={ink} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="32" y="30" width="10" height="4" rx="1" fill={ink} />
    </Svg>
  ),
  legcurl: (
    <Svg>
      <rect x="8" y="18" width="22" height="8" rx="2" fill={ink} />
      <Head x={14} y={16} />
      <path d="M26 26 Q32 18 38 28" stroke={ink} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <rect x="34" y="26" width="8" height="4" rx="1" fill={ink} />
    </Svg>
  ),
  calf: (
    <Svg>
      <Head x={24} y={8} />
      <rect x="21" y="11" width="6" height="14" rx="2" fill={ink} />
      <path d="M18 40 L22 26 H26 L30 32 L34 40" stroke={ink} strokeWidth="3" fill="none" strokeLinejoin="round" />
      <rect x="14" y="39" width="22" height="3" rx="1" fill={ink} />
    </Svg>
  ),
  hipthrust: (
    <Svg>
      <rect x="8" y="26" width="32" height="5" rx="1.5" fill={ink} />
      <Head x={16} y={14} />
      <rect x="14" y="17" width="20" height="9" rx="2" fill={ink} />
      <path d="M34 26 L38 38" stroke={ink} strokeWidth="3" fill="none" />
    </Svg>
  ),
  plank: (
    <Svg>
      <Head x={10} y={16} />
      <rect x="12" y="18" width="24" height="6" rx="2" fill={ink} />
      <path d="M10 22 V32 M36 24 V32" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M6 32 H16 M32 32 H42" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  shrug: (
    <Svg>
      <Head x={24} y={12} />
      <rect x="20" y="15" width="8" height="12" rx="2" fill={ink} />
      <path d="M8 22 H20 M28 22 H40" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <circle cx="8" cy="22" r="3" fill={ink} />
      <circle cx="40" cy="22" r="3" fill={ink} />
    </Svg>
  ),
  cable: (
    <Svg>
      <rect x="22" y="6" width="4" height="28" rx="1" fill={ink} />
      <rect x="16" y="10" width="16" height="3" fill={ink} />
      <rect x="18" y="32" width="12" height="4" rx="1" fill={ink} />
    </Svg>
  ),
  default: (
    <Svg>
      <circle cx="14" cy="24" r="7" fill="none" stroke={ink} strokeWidth="2.8" />
      <circle cx="34" cy="24" r="7" fill="none" stroke={ink} strokeWidth="2.8" />
      <rect x="18" y="22" width="12" height="4" fill={ink} />
    </Svg>
  ),
};

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "glyph glyph-sm",
  md: "glyph glyph-md",
  lg: "glyph glyph-lg",
};

export function Glyph({ id, size = "md" }: { id: IconId; size?: Size }) {
  return (
    <span
      className={SIZES[size]}
      style={{ background: COLORS[id], color: "#14180c" }}
      title={ICON_LABELS[id]}
    >
      {SHAPES[id]}
    </span>
  );
}

export function iconColor(id: IconId): string {
  return COLORS[id];
}
