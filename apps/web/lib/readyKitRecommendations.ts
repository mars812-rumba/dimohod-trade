import type { ReadyKit } from "./readyKits";

type Variant = Pick<ReadyKit, "slug" | "route" | "height_m" | "diameter_mm">;

// The API supplies published variants with current catalog totals. Never build
// a missing variant or substitute a different diameter to fill the carousel.
export function readyKitRecommendations<T extends Variant>(kit: Variant, variants: T[]): T[] {
  const candidates = variants.filter(item => item.diameter_mm === kit.diameter_mm
    && item.slug !== kit.slug && (item.route !== kit.route || item.height_m !== kit.height_m));
  candidates.sort((a, b) => Number(a.route !== kit.route) - Number(b.route !== kit.route)
    || Math.abs(a.height_m - kit.height_m) - Math.abs(b.height_m - kit.height_m)
    || a.height_m - b.height_m || a.slug.localeCompare(b.slug));
  const seen = new Set<string>();
  return candidates.filter(item => {
    const scheme = `${item.route}-${item.height_m}`;
    if (seen.has(scheme)) return false;
    seen.add(scheme);
    return true;
  }).slice(0, 3);
}

export function recommendationName(kit: Pick<ReadyKit, "route" | "height_m">) {
  return kit.route === "roof" ? `Через перекрытие · ${kit.height_m} м` : `Через стену · ${kit.height_m} м вверх`;
}
