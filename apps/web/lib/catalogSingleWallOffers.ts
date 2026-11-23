import { getProducts, type ProductListItem } from "./api";

const diameters = [100, 115, 120, 150] as const;

function exactOffer(item: ProductListItem, diameter: number) {
  return item.category.slug === "odnokonturnye-truby"
    && item.product_kind === "труба"
    && item.contour === "одностенный"
    && item.diameter_mm === diameter && item.outer_diameter_mm === null
    && item.length_mm === 1000 && item.steel_grade === "AISI 304"
    && Number(item.wall_thickness_mm) === 0.5
    && item.material === "нержавеющая сталь"
    && Boolean(item.selected_sku && item.selected_sku_id);
}

export async function getSingleWallOffers(): Promise<ProductListItem[]> {
  const offers = await Promise.all(diameters.map(async diameter => {
    // Use the same public SKU selection and price source as catalog cards.
    const response = await getProducts({
      category: "odnokonturnye-truby", productKind: "труба", contour: "одностенный",
      diameter: `${diameter}:`, length: "1000", steelGrade: "AISI 304",
      material: "stainless", wallThickness: "0.5",
    }).catch(() => null);
    return response?.items.find(item => exactOffer(item, diameter));
  }));
  return offers.filter((item): item is ProductListItem => item !== undefined);
}

export function splitSingleWallDescription(description: string | null | undefined) {
  const text = description?.trim() ?? "";
  const ends = [...text.matchAll(/[.!?]+(?=\s|$)/gu)];
  const splitAt = ends[1] ? ends[1].index + ends[1][0].length : text.length;
  return { intro: text.slice(0, splitAt), remainder: text.slice(splitAt).trim() };
}
