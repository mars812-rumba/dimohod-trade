import type { ReadyKit } from "./readyKits";

export type ReadyKitCardVariant = Pick<ReadyKit, "slug" | "name" | "diameter_mm" | "image_path" | "total_rub"> & {
  line_count: number;
};
export type ReadyKitGroup = {
  key: string;
  name: string;
  route: ReadyKit["route"];
  height_m: number;
  variants: ReadyKitCardVariant[];
};

// Presentation only: take published API results as-is; never infer a BOM or price.
export function groupReadyKits(kits: ReadyKit[]): ReadyKitGroup[] {
  const groups = new Map<string, ReadyKitGroup>();
  for (const kit of kits) {
    const key = `${kit.route}-${kit.height_m}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, name: `${kit.route === "roof" ? "Через перекрытие" : "Через стену"} — ${kit.height_m} м`,
        route: kit.route, height_m: kit.height_m, variants: [] };
      groups.set(key, group);
    }
    group.variants.push({ slug: kit.slug, name: kit.name, diameter_mm: kit.diameter_mm,
      image_path: kit.image_path, total_rub: kit.total_rub, line_count: kit.lines.length });
  }
  return [...groups.values()].sort((a, b) => (a.route === b.route ? a.height_m - b.height_m : a.route === "roof" ? -1 : 1))
    .map(group => ({ ...group, variants: group.variants.sort((a, b) => a.diameter_mm - b.diameter_mm) }));
}
