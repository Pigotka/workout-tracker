export const FALLBACK_ID = "squat";

export type CatalogEntry = {
  id: string;
  name: string;
  equipment: string;
};

export function catalogSrc(id: string): string {
  return `/catalog/${id || FALLBACK_ID}.webp`;
}

export function searchCatalog(q: string, entries: CatalogEntry[]): CatalogEntry[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(needle) ||
      entry.equipment.toLowerCase().includes(needle),
  );
}

export async function loadCatalog(): Promise<CatalogEntry[]> {
  const response = await fetch("/catalog/exercises.json");
  return (await response.json()) as CatalogEntry[];
}
