import type { MediaItem } from "./api";
import type { ChimneyEstimate } from "./chimneyEstimate";
import type { SpecificationGroup } from "./estimateSpecification";

export type ReadyKitLine = {
  sku_id: string; label: string; sku_name: string; article: string; quantity: number;
  product_slug: string; diameter_mm: number | null; outer_diameter_mm: number | null;
  length_mm: number | null; characteristics: string[];
  unit_price_rub: string | null; line_total_rub: string | null;
  primary_image: MediaItem | null; characteristic_groups: SpecificationGroup[];
};

export type ReadyKit = {
  slug: string; name: string; route: "roof" | "wall"; height_m: number; diameter_mm: number;
  image_path: string; description: string; limitations: string[]; lines: ReadyKitLine[];
  total_rub: string | null; known_subtotal_rub: string; unpriced_count: number;
};

export const kitPath = (slug: string) => `/komplekty/${slug}`;

export function readyKitEstimate(kit: ReadyKit): ChimneyEstimate {
  return {
    profileName: kit.name, reference: kit.slug, generatedAt: new Date(), measurements: [],
    lines: kit.lines.map((line, index) => ({
      key: `${kit.slug}:${index}`, skuId: line.sku_id, label: line.label,
      skuName: line.sku_name, article: line.article, image: line.primary_image,
      characteristicGroups: line.characteristic_groups,
      characteristics: line.characteristics, quantity: line.quantity,
      unitPriceRub: line.unit_price_rub === null ? null : Number(line.unit_price_rub),
      lineTotalRub: line.line_total_rub === null ? null : Number(line.line_total_rub),
      note: "", matchStatus: "exact",
    })),
    knownSubtotalRub: Number(kit.known_subtotal_rub),
    pricedLineCount: kit.lines.length - kit.unpriced_count, unpricedLineCount: kit.unpriced_count,
    totalUnits: kit.lines.reduce((sum, line) => sum + line.quantity, 0),
    removedLabels: [], reviewItems: kit.limitations, calculationErrors: [],
  };
}
export const kitRub = (price: string | null) => price === null ? "Цена уточняется" : new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "RUB", maximumFractionDigits: 2,
}).format(Number(price));

export function kitMetadata(kit: Pick<ReadyKit, "name" | "route" | "height_m" | "diameter_mm" | "slug">) {
  const route = kit.route === "roof" ? "через перекрытие" : "через стену";
  return {
    title: `${kit.name} | Дымоход Трейд`,
    description: `Комплект ${route}, ${kit.height_m} м, диаметр ${kit.diameter_mm} мм: состав с артикулами, количествами и актуальными ценами. Закажите комплект или обсудите подбор со специалистом.`,
    alternates: { canonical: kitPath(kit.slug) },
  };
}

const apiBase = process.env.API_BASE_URL ?? "http://localhost:8000";
async function request<T>(path: string): Promise<T | null> {
  const response = await fetch(`${apiBase}/api/v1/ready-kits${path}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Не удалось загрузить комплекты");
  return response.json() as Promise<T>;
}

export async function getReadyKits(): Promise<ReadyKit[]> {
  return (await request<{ items: ReadyKit[] }>(""))?.items ?? [];
}
export async function getReadyKit(slug: string) {
  // Only fixed human-readable paths are forwarded to the API.
  if (!/^cherez-(perekrytie|stenu)-(3|4|6)m-d(115|120|150)$/.test(slug)) return null;
  return request<{ kit: ReadyKit; variants: ReadyKit[] }>(`/${encodeURIComponent(slug)}`);
}
