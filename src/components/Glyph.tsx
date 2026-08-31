import { catalogSrc, FALLBACK_ID } from "../logic/catalog";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "glyph glyph-sm",
  md: "glyph glyph-md",
  lg: "glyph glyph-lg",
};

export function Glyph({
  catalogId,
  size = "md",
}: {
  catalogId: string;
  size?: Size;
}) {
  return (
    <span className={SIZES[size]}>
      <img
        className="glyph-img"
        src={catalogSrc(catalogId)}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        onError={(event) => {
          const img = event.currentTarget;
          if (img.src.endsWith(`/${FALLBACK_ID}.webp`)) return;
          img.src = catalogSrc(FALLBACK_ID);
        }}
      />
    </span>
  );
}
