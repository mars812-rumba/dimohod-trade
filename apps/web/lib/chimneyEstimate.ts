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
  skuId: string | null;
  label: string;
  article: string | null;
  skuName: string | null;
  quantity: number;
  unitPriceRub: number | null;
  lineTotalRub: number | null;
  characteristics: string[];
  note: string;
  matchStatus: "exact" | "candidate" | "nearest" | "missing" | "manual";
};

export type ChimneyEstimateCustomer = {
  name: string;
  contactMethod: "phone" | "whatsapp" | "telegram" | "email";
  contact: string;
};

export type ChimneyEstimate = {
  reference?: string;
  revision?: number;
  customer?: ChimneyEstimateCustomer;
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

export type ChimneyEstimateLeadPayload = {
  schemaVersion: 1;
  profileName: string;
  generatedAt: string;
  sourceUrl: string;
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

const LEAD_MATCH_STATUSES = new Set(["exact", "candidate", "nearest", "missing"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function leadText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function leadOptionalText(value: unknown, maxLength: number): string | null {
  const normalized = leadText(value, maxLength);
  return normalized || null;
}

function leadMoney(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function chimneyEstimateLeadPayload(
  estimate: ChimneyEstimate,
  sourceUrl: string,
): ChimneyEstimateLeadPayload {
  // The lead endpoint deliberately has a strict Pydantic contract. Catalog
  // values are external data, so normalize them at this boundary instead of
  // allowing one stale/oversized SKU field to block the whole public result.
  const lines = estimate.lines
    .filter((line) => Number.isFinite(line.quantity) && line.quantity >= 1)
    .slice(0, 300)
    .map((line): ChimneyEstimateLine => ({
      key: leadText(line.key, 180),
      skuId: typeof line.skuId === "string" && UUID_PATTERN.test(line.skuId) ? line.skuId : null,
      label: leadText(line.label, 240),
      article: leadOptionalText(line.article, 120),
      skuName: leadOptionalText(line.skuName, 220),
      quantity: Math.min(10_000, Math.max(1, Math.trunc(line.quantity))),
      unitPriceRub: leadMoney(line.unitPriceRub),
      lineTotalRub: leadMoney(line.lineTotalRub),
      characteristics: line.characteristics
        .filter((value): value is string => typeof value === "string")
        .slice(0, 30),
      note: leadText(line.note, 4000),
      matchStatus: LEAD_MATCH_STATUSES.has(line.matchStatus) ? line.matchStatus : "missing",
    }))
    .filter((line) => line.key.length > 0 && line.label.length > 0);
  const knownSubtotalRub = lines.reduce((sum, line) => sum + (line.lineTotalRub ?? 0), 0);

  return {
    schemaVersion: 1,
    profileName: leadText(estimate.profileName, 180),
    generatedAt: Number.isNaN(estimate.generatedAt.getTime())
      ? new Date().toISOString()
      : estimate.generatedAt.toISOString(),
    sourceUrl: leadText(sourceUrl, 1000) || "/",
    measurements: estimate.measurements
      .map((measurement) => ({
        label: leadText(measurement.label, 180),
        value: leadText(measurement.value, 240),
      }))
      .filter((measurement) => measurement.label.length > 0 && measurement.value.length > 0)
      .slice(0, 100),
    lines,
    knownSubtotalRub,
    pricedLineCount: lines.filter((line) => line.lineTotalRub !== null).length,
    unpricedLineCount: lines.filter((line) => line.lineTotalRub === null).length,
    totalUnits: lines.reduce((sum, line) => sum + line.quantity, 0),
    removedLabels: estimate.removedLabels.filter((value): value is string => typeof value === "string").slice(0, 300),
    reviewItems: estimate.reviewItems.filter((value): value is string => typeof value === "string").slice(0, 100),
    calculationErrors: estimate.calculationErrors.filter((value): value is string => typeof value === "string").slice(0, 100),
  };
}

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
    const catalogUnitPriceRub = match ? positivePrice(match.item.price_rub) : null;
    const unitPriceRub = bomLine.priceOnRequest
      ? null
      : bomLine.fixedUnitPriceRub ?? catalogUnitPriceRub;
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
      skuId: match?.item.selected_sku_id ?? null,
      label: bomLine.label,
      article: match?.item.article ?? null,
      skuName: match?.item.name ?? null,
      quantity: bomLine.quantity,
      unitPriceRub,
      lineTotalRub,
      characteristics: match ? itemCharacteristics(match.item) : [],
      note: [
        bomLine.quantityNote,
        bomLine.selectionReason,
      ].filter(Boolean).join(" · "),
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
