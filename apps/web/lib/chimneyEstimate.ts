import type { ProductListItem } from "./api";
import type { ChimneyBomLine } from "./chimneyCalculation";

export type CatalogEstimateMatch = {
  item: ProductListItem;
  exactByFields: boolean;
  lengthMatch?: "exact" | "nearest";
  requestedLengthMm?: number;
};

export type EstimateMeasurement = {
  label: string;
  value: string;
};

export type ChimneyEstimateLine = {
  key: string;
  label: string;
  article: string | null;
  skuName: string | null;
  quantity: number;
  unitPriceRub: number | null;
  lineTotalRub: number | null;
  characteristics: string[];
  note: string;
  matchStatus: "exact" | "candidate" | "nearest" | "missing";
};

export type ChimneyEstimate = {
  profileName: string;
  generatedAt: Date;
  measurements: EstimateMeasurement[];
  lines: ChimneyEstimateLine[];
  knownSubtotalRub: number;
  pricedLineCount: number;
  unpricedLineCount: number;
  totalUnits: number;
  removedLabels: string[];
  reviewItems: string[];
  calculationErrors: string[];
};

function positivePrice(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function textAttribute(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function itemCharacteristics(item: ProductListItem): string[] {
  const diameter = item.diameter_mm === null
    ? null
    : `Ø ${item.diameter_mm}${item.outer_diameter_mm === null ? "" : `/${item.outer_diameter_mm}`} мм`;
  const material = [item.material, item.steel_grade, item.wall_thickness_mm ? `${item.wall_thickness_mm} мм` : null]
    .filter(Boolean)
    .join(" · ");
  const outerMaterial = [
    textAttribute(item.attributes.outer_material),
    textAttribute(item.attributes.outer_steel_grade),
    textAttribute(item.attributes.outer_wall_thickness_mm),
  ].filter(Boolean).join(" · ");
  return [
    diameter,
    item.length_mm === null ? null : `L ${item.length_mm} мм`,
    item.insulation_mm === null ? null : `изоляция ${item.insulation_mm} мм`,
    material || null,
    outerMaterial ? `наружный кожух: ${outerMaterial}` : null,
  ].filter((value): value is string => Boolean(value));
}

export function buildChimneyEstimate({
  selectedBom,
  matches,
  measurements,
  profileName,
  removedLabels,
  reviewItems,
  calculationErrors,
  generatedAt = new Date(),
}: {
  selectedBom: ChimneyBomLine[];
  matches: Record<string, CatalogEstimateMatch>;
  measurements: EstimateMeasurement[];
  profileName: string;
  removedLabels: string[];
  reviewItems: string[];
  calculationErrors: string[];
  generatedAt?: Date;
}): ChimneyEstimate {
  const lines = selectedBom.map((bomLine): ChimneyEstimateLine => {
    const match = matches[bomLine.key];
    const unitPriceRub = match ? positivePrice(match.item.price_rub) : null;
    const lineTotalRub = unitPriceRub === null ? null : unitPriceRub * bomLine.quantity;
    const matchStatus = !match
      ? "missing"
      : match.lengthMatch === "nearest"
        ? "nearest"
        : match.exactByFields
          ? "exact"
          : "candidate";
    return {
      key: bomLine.key,
      label: bomLine.label,
      article: match?.item.article ?? null,
      skuName: match?.item.name ?? null,
      quantity: bomLine.quantity,
      unitPriceRub,
      lineTotalRub,
      characteristics: match ? itemCharacteristics(match.item) : [],
      note: [bomLine.quantityNote, bomLine.selectionReason].filter(Boolean).join(" · "),
      matchStatus,
    };
  });

  return {
    profileName,
    generatedAt,
    measurements,
    lines,
    knownSubtotalRub: lines.reduce((sum, line) => sum + (line.lineTotalRub ?? 0), 0),
    pricedLineCount: lines.filter((line) => line.lineTotalRub !== null).length,
    unpricedLineCount: lines.filter((line) => line.lineTotalRub === null).length,
    totalUnits: lines.reduce((sum, line) => sum + line.quantity, 0),
    removedLabels,
    reviewItems,
    calculationErrors,
  };
}

export function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function chimneyEstimateText(estimate: ChimneyEstimate): string {
  const lines = estimate.lines.map((line, index) => {
    const details = [
      `${index + 1}. ${line.label}`,
      line.article ? `арт. ${line.article}` : "артикул уточняется",
      line.characteristics.join(" · "),
      `${line.quantity} шт.`,
      line.lineTotalRub === null ? "цена по запросу" : formatRub(line.lineTotalRub),
    ].filter(Boolean);
    return details.join(" | ");
  });
  return [
    `Расчёт: ${estimate.profileName}`,
    `Позиций: ${estimate.lines.length}; единиц: ${estimate.totalUnits}`,
    `Итого по известным ценам: ${formatRub(estimate.knownSubtotalRub)}`,
    estimate.unpricedLineCount ? `Без цены: ${estimate.unpricedLineCount}` : "",
    "",
    "BOM:",
    ...lines,
    "",
    "Проверить перед заказом:",
    ...estimate.reviewItems,
    ...estimate.calculationErrors,
  ].filter((line) => line !== "").join("\n");
}
