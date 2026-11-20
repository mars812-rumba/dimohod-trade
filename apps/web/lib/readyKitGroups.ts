import type { ReadyKit } from "./readyKits";

export type ReadyKitCardVariant = Pick<ReadyKit, "slug" | "name" | "diameter_mm" | "image_path" | "total_rub"> & {
  line_count: number;
  description: string;
  sandwich_steel: { inner: string; outer: string } | null;
};

const descriptions: Record<string, string> = {
  "roof-4": "Три метровых сэндвича и метровая одностенная труба. Один проход через перекрытие.",
  "roof-6": "Шесть метровых сэндвичей и метровая одностенная труба. На схеме показаны два прохода через перекрытия.",
  "wall-3": "Через стену проходит секция длиной 750 мм. От наружного тройника вверх идут три метровых сэндвича.",
  "wall-6": "Через стену проходит секция длиной 750 мм. Вдоль фасада поднимаются шесть метровых сэндвичей с двумя фасадными консолями.",
};

function variantSummary(kit: ReadyKit) {
  const layered = kit.lines.filter(line => line.length_mm != null && (line.characteristic_groups ?? []).some(group => group.kind === "inner"));
  const meters = layered.filter(line => line.length_mm === 1000).reduce((sum, line) => sum + line.quantity, 0);
  const quantity = (article: string) => kit.lines.filter(line => line.article === article).reduce((sum, line) => sum + line.quantity, 0);
  const roof = kit.route === "roof" && meters === (kit.height_m === 4 ? 3 : 6)
    && kit.lines.filter(line => line.length_mm === 1000 && !(line.characteristic_groups ?? []).some(group => group.kind === "inner"))
      .reduce((sum, line) => sum + line.quantity, 0) === 1
    && quantity("DT-PASSAGE-GLASS-GALV-D100-200") === (kit.height_m === 4 ? 1 : 2);
  const wall = kit.route === "wall" && meters === kit.height_m
    && layered.filter(line => line.length_mm === 750).reduce((sum, line) => sum + line.quantity, 0) === 1
    && (kit.height_m !== 6 || kit.lines.filter(line => line.label === "Консоль универсальная фасадная").reduce((sum, line) => sum + line.quantity, 0) === 2);
  const description = (roof || wall) ? descriptions[`${kit.route}-${kit.height_m}`] : undefined;
  const pairs = layered.map(line => ({
    inner: line.characteristic_groups.find(group => group.kind === "inner")?.fields.find(field => field.key === "steel")?.value.trim(),
    outer: line.characteristic_groups.find(group => group.kind === "outer")?.fields.find(field => field.key === "steel")?.value.trim(),
  }));
  const steel = pairs.length && pairs.every(pair => pair.inner && pair.outer) ? {
    inner: [...new Set(pairs.map(pair => pair.inner!))].join(" / "),
    outer: [...new Set(pairs.map(pair => pair.outer!))].join(" / "),
  } : null;
  return { description: description ?? "Полный состав выбранного диаметра — в спецификации комплекта.", sandwich_steel: steel };
}
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
      group = { key, name: `${kit.route === "roof" ? "Через перекрытие и кровлю" : "Через стену"} · ${kit.height_m} м${kit.route === "wall" ? " вверх" : ""}`,
        route: kit.route, height_m: kit.height_m, variants: [] };
      groups.set(key, group);
    }
    group.variants.push({ slug: kit.slug, name: kit.name, diameter_mm: kit.diameter_mm,
      image_path: kit.image_path, total_rub: kit.total_rub, line_count: kit.lines.length, ...variantSummary(kit) });
  }
  return [...groups.values()].sort((a, b) => (a.route === b.route ? a.height_m - b.height_m : a.route === "roof" ? -1 : 1))
    .map(group => ({ ...group, variants: group.variants.sort((a, b) => a.diameter_mm - b.diameter_mm) }));
}
