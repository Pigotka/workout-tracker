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
  legcurl: "#6fd67a",
  calf: "#b6ff73",
  hipthrust: "#d0ff6a",
  plank: "#7ad7ff",
  shrug: "#a0b4c8",
  cable: "#6ad0e8",
  default: "#d6ff3e",
};

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="glyph-svg">
      {children}
    </svg>
  );
}

const ST = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SHAPES: Record<IconId, ReactNode> = {
  bench: (
    <Svg>
      <path d="M8 30h32" {...ST} />
      <path d="M12 30V22h24v8" {...ST} />
      <path d="M6 16h36" {...ST} />
      <circle cx="10" cy="16" r="3.2" {...ST} />
      <circle cx="38" cy="16" r="3.2" {...ST} />
    </Svg>
  ),
  incline: (
    <Svg>
      <path d="M10 34h28" {...ST} />
      <path d="M12 34 28 14h8v6" {...ST} />
      <path d="M20 20h22" {...ST} />
      <circle cx="24" cy="20" r="2.8" {...ST} />
      <circle cx="38" cy="20" r="2.8" {...ST} />
    </Svg>
  ),
  ohp: (
    <Svg>
      <circle cx="24" cy="30" r="5" {...ST} />
      <path d="M24 25V16" {...ST} />
      <path d="M8 16h32" {...ST} />
      <circle cx="10" cy="16" r="3" {...ST} />
      <circle cx="38" cy="16" r="3" {...ST} />
    </Svg>
  ),
  squat: (
    <Svg>
      <circle cx="24" cy="14" r="4" {...ST} />
      <path d="M24 18v6" {...ST} />
      <path d="M16 34 24 24l8 10" {...ST} />
      <path d="M10 16h28" {...ST} />
      <circle cx="12" cy="16" r="2.6" {...ST} />
      <circle cx="36" cy="16" r="2.6" {...ST} />
    </Svg>
  ),
  deadlift: (
    <Svg>
      <path d="M16 14v20" {...ST} />
      <path d="M32 14v20" {...ST} />
      <path d="M8 34h32" {...ST} />
      <circle cx="10" cy="34" r="3" {...ST} />
      <circle cx="38" cy="34" r="3" {...ST} />
    </Svg>
  ),
  rdls: (
    <Svg>
      <circle cx="24" cy="12" r="3.4" {...ST} />
      <path d="M24 16 14 28" {...ST} />
      <path d="M24 22l8 6" {...ST} />
      <path d="M8 34h20" {...ST} />
      <circle cx="10" cy="34" r="2.8" {...ST} />
      <circle cx="26" cy="34" r="2.8" {...ST} />
    </Svg>
  ),
  row: (
    <Svg>
      <circle cx="16" cy="14" r="3.2" {...ST} />
      <path d="M18 16 30 28" {...ST} />
      <path d="M8 36h24" {...ST} />
      <circle cx="10" cy="36" r="2.8" {...ST} />
      <circle cx="30" cy="36" r="2.8" {...ST} />
    </Svg>
  ),
  pulldown: (
    <Svg>
      <path d="M8 10h32" {...ST} />
      <path d="M24 10v12" {...ST} />
      <path d="M14 28h20" {...ST} />
      <path d="M16 28v8" {...ST} />
      <path d="M32 28v8" {...ST} />
    </Svg>
  ),
  pullup: (
    <Svg>
      <path d="M6 10h36" {...ST} />
      <path d="M16 10v8" {...ST} />
      <path d="M32 10v8" {...ST} />
      <circle cx="24" cy="28" r="4" {...ST} />
      <path d="M24 22v2" {...ST} />
      <path d="M18 36 24 30l6 6" {...ST} />
    </Svg>
  ),
  fly: (
    <Svg>
      <circle cx="24" cy="22" r="4" {...ST} />
      <path d="M8 16 20 20" {...ST} />
      <path d="M40 16 28 20" {...ST} />
      <path d="M24 26v10" {...ST} />
    </Svg>
  ),
  lateral: (
    <Svg>
      <circle cx="24" cy="20" r="4" {...ST} />
      <path d="M8 20h12" {...ST} />
      <path d="M28 20h12" {...ST} />
      <path d="M20 24 16 36" {...ST} />
      <path d="M28 24l4 12" {...ST} />
      <circle cx="8" cy="20" r="2.4" {...ST} />
      <circle cx="40" cy="20" r="2.4" {...ST} />
    </Svg>
  ),
  facepull: (
    <Svg>
      <circle cx="24" cy="16" r="4" {...ST} />
      <path d="M8 16h12" {...ST} />
      <path d="M28 16h12" {...ST} />
      <path d="M18 20 16 34" {...ST} />
      <path d="M30 20l2 14" {...ST} />
    </Svg>
  ),
  curl: (
    <Svg>
      <path d="M16 36 22 20" {...ST} />
      <circle cx="24" cy="16" r="5" {...ST} />
      <path d="M18 16h12" {...ST} />
    </Svg>
  ),
  pushdown: (
    <Svg>
      <path d="M24 8v14" {...ST} />
      <path d="M16 22h16" {...ST} />
      <path d="M18 22 16 36" {...ST} />
      <path d="M30 22l2 14" {...ST} />
    </Svg>
  ),
  skullcrusher: (
    <Svg>
      <circle cx="24" cy="16" r="4" {...ST} />
      <path d="M24 20v8" {...ST} />
      <path d="M10 28h28" {...ST} />
      <circle cx="12" cy="28" r="2.6" {...ST} />
      <circle cx="36" cy="28" r="2.6" {...ST} />
    </Svg>
  ),
  dip: (
    <Svg>
      <path d="M10 12v24" {...ST} />
      <path d="M38 12v24" {...ST} />
      <path d="M10 18h8" {...ST} />
      <path d="M38 18h-8" {...ST} />
      <circle cx="24" cy="26" r="4" {...ST} />
    </Svg>
  ),
  lunge: (
    <Svg>
      <circle cx="20" cy="10" r="3.2" {...ST} />
      <path d="M20 14 16 28" {...ST} />
      <path d="M16 28 10 38" {...ST} />
      <path d="M16 28l16 4 4 6" {...ST} />
    </Svg>
  ),
  legpress: (
    <Svg>
      <path d="M10 14h20v20H10z" {...ST} />
      <path d="M30 18h8v12h-8" {...ST} />
      <path d="M14 34h12" {...ST} />
    </Svg>
  ),
  legcurl: (
    <Svg>
      <path d="M12 14h16v8H12z" {...ST} />
      <path d="M20 22 14 38" {...ST} />
      <path d="M20 22l10 8" {...ST} />
    </Svg>
  ),
  calf: (
    <Svg>
      <path d="M22 8v20" {...ST} />
      <path d="M16 28h16l-2 10H18z" {...ST} />
    </Svg>
  ),
  hipthrust: (
    <Svg>
      <path d="M8 28h32" {...ST} />
      <path d="M14 28V18h20v10" {...ST} />
      <circle cx="24" cy="14" r="3.2" {...ST} />
    </Svg>
  ),
  plank: (
    <Svg>
      <circle cx="12" cy="16" r="3" {...ST} />
      <path d="M15 18h20" {...ST} />
      <path d="M12 19v10" {...ST} />
      <path d="M35 18v10" {...ST} />
      <path d="M8 30h8" {...ST} />
      <path d="M32 30h8" {...ST} />
    </Svg>
  ),
  shrug: (
    <Svg>
      <circle cx="24" cy="14" r="4" {...ST} />
      <path d="M12 24h24" {...ST} />
      <path d="M18 18 12 24" {...ST} />
      <path d="M30 18l6 6" {...ST} />
      <circle cx="12" cy="24" r="2.4" {...ST} />
      <circle cx="36" cy="24" r="2.4" {...ST} />
    </Svg>
  ),
  cable: (
    <Svg>
      <path d="M24 8v28" {...ST} />
      <path d="M16 12h16" {...ST} />
      <path d="M18 36h12" {...ST} />
    </Svg>
  ),
  default: (
    <Svg>
      <path d="M16 24h16" {...ST} />
      <circle cx="14" cy="24" r="6" {...ST} />
      <circle cx="34" cy="24" r="6" {...ST} />
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
    <span className={SIZES[size]} style={{ background: COLORS[id], color: "#14180c" }}>
      {SHAPES[id]}
    </span>
  );
}

export function iconColor(id: IconId): string {
  return COLORS[id];
}
