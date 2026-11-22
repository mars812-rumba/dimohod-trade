import type { ReadyKit } from "./readyKits";
import { kitPath } from "./readyKits";
import { recommendationName } from "./readyKitRecommendations";

export type ProductReadyKitLink = { href: string; label: string };
export type ProductReadyKitMembership = ProductReadyKitLink & { skuIds: string[] };
type PublishedSpecification = Pick<ReadyKit, "slug" | "route" | "height_m" | "diameter_mm"> & {
  lines: readonly { sku_id: string }[];
};

// Input comes from the public, current specifications, never from seed definitions.
// Every published variant is eligible; neither kit count nor diameters are fixed here.
export function productReadyKitMemberships(kits: readonly PublishedSpecification[]): ProductReadyKitMembership[] {
  const seen = new Set<string>();
  return kits.filter(kit => {
    if (seen.has(kit.slug)) return false;
    seen.add(kit.slug);
    return true;
  }).map(kit => ({
    href: kitPath(kit.slug),
    label: `${recommendationName(kit)} · Ø${kit.diameter_mm} мм →`,
    skuIds: [...new Set(kit.lines.map(line => line.sku_id))],
  }));
}

export function productReadyKitLinks(memberships: readonly ProductReadyKitMembership[], skuId: string | null | undefined): ProductReadyKitLink[] {
  if (!skuId) return [];
  return memberships.filter(kit => kit.skuIds.includes(skuId)).map(({ href, label }) => ({ href, label }));
}
