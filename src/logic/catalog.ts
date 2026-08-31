import catalogData from "./catalog-data.json" with { type: "json" };

export const FALLBACK_ID = "squat";

export type CatalogEntry = {
  id: string;
  name: string;
  equipment: string;
  bodyPart: string;
};

export const CATALOG: CatalogEntry[] = catalogData as CatalogEntry[];

const BY_ID = new Map(CATALOG.map((entry) => [entry.id, entry]));

export const BODY_PARTS = [
  "chest",
  "back",
  "shoulders",
  "upper_arms",
  "lower_arms",
  "upper_legs",
  "lower_legs",
  "core",
  "full_body",
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

const BODY_LABELS: Record<BodyPart, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  upper_arms: "Arms",
  lower_arms: "Forearms",
  upper_legs: "Legs",
  lower_legs: "Calves",
  core: "Core",
  full_body: "Full body",
};

const BODY_COLORS: Record<BodyPart, string> = {
  chest: "#ff6b81",
  back: "#4dabf7",
  shoulders: "#fcc419",
  upper_arms: "#ff922b",
  lower_arms: "#e599f7",
  upper_legs: "#d6ff3e",
  lower_legs: "#51cf66",
  core: "#da77f2",
  full_body: "#66d9e8",
};

const LIME = "#d6ff3e";

function isBodyPart(value: string): value is BodyPart {
  return (BODY_PARTS as readonly string[]).includes(value);
}

export function bodyLabel(part: string): string {
  return isBodyPart(part) ? BODY_LABELS[part] : part.replaceAll("_", " ");
}

export function catalogSrc(id: string): string {
  return `/catalog/${id || FALLBACK_ID}.webp`;
}

export function catalogEntry(id: string): CatalogEntry | undefined {
  return BY_ID.get(id);
}

export function bodyColor(part: string): string {
  return isBodyPart(part) ? BODY_COLORS[part] : LIME;
}

export function liftTint(catalogId: string, override?: string): string {
  if (override && /^#[0-9a-fA-F]{6}$/.test(override)) return override;
  return bodyColor(BY_ID.get(catalogId)?.bodyPart ?? "");
}

export function searchCatalog(
  q: string,
  entries: CatalogEntry[],
  bodyPart = "",
): CatalogEntry[] {
  const needle = q.trim().toLowerCase();
  return entries.filter((entry) => {
    if (bodyPart && entry.bodyPart !== bodyPart) return false;
    if (!needle) return true;
    return (
      entry.name.toLowerCase().includes(needle) ||
      entry.equipment.toLowerCase().includes(needle) ||
      bodyLabel(entry.bodyPart).toLowerCase().includes(needle)
    );
  });
}
