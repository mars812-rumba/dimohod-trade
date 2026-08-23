import type { ProductFilterOption } from "@/lib/api";

export type CatalogMaterial = "stainless" | "galvanized";
export type CatalogSearchParamValue = string | string[] | undefined;
export type CatalogSearchParams = Record<string, CatalogSearchParamValue>;

export const CATALOG_FILTER_KEYS = [
  "diameter",
  "inner_pipe",
  "inner_thickness",
  "outer_pipe",
  "execution",
  "length",
  "page",
] as const;

export type CatalogFilterKey = (typeof CATALOG_FILTER_KEYS)[number];
export type CatalogFilters = Partial<Record<CatalogFilterKey, string>>;

const MAX_PAGE = 10_000;
const MAX_LENGTH_MM = 100_000;

function singleValue(value: CatalogSearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    const unique = Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
    return unique.length === 1 ? unique[0] : undefined;
  }
  const normalized = value?.trim();
  return normalized || undefined;
}

function boundedInteger(value: string, maximum: number, allowZero = false): string | undefined {
  if (!/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  const minimum = allowZero ? 0 : 1;
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? String(parsed)
    : undefined;
}

function boundedDecimal(value: string, maximum: number): string | undefined {
  const normalized = value.replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/u.test(normalized)) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maximum) return undefined;
  return String(parsed);
}

function normalizedDiameter(value: string): string | undefined {
  const parts = value.split(":");
  if (parts.length !== 2 || (!parts[0] && !parts[1])) return undefined;
  const inner = parts[0] ? boundedInteger(parts[0], 10_000) : "";
  const outer = parts[1] ? boundedInteger(parts[1], 10_000) : "";
  if ((parts[0] && !inner) || (parts[1] && !outer)) return undefined;
  return `${inner}:${outer}`;
}

function normalizedCompound(value: string, size: number): string | undefined {
  const parts = value.split("|");
  if (parts.length !== size) return undefined;
  const normalized = parts.map((part) => part.trim().replace(/\s+/gu, " "));
  if (!normalized.some(Boolean)) return undefined;
  if (normalized.some((part) => part.length > 64 || /[\u0000-\u001f\u007f]/u.test(part))) {
    return undefined;
  }
  return normalized.join("|");
}

function normalizedPipe(value: string, size: 2 | 3): string | undefined {
  const compound = normalizedCompound(value, size);
  if (!compound) return undefined;
  const parts = compound.split("|");
  parts[0] = parts[0].toLocaleLowerCase("en-US");
  if (size === 3 && parts[2]) {
    const thickness = boundedDecimal(parts[2], 100);
    if (!thickness) return undefined;
    parts[2] = thickness;
  }
  return parts.join("|");
}

function normalizedExecution(value: string): string | undefined {
  const compound = normalizedCompound(value, 2);
  if (!compound) return undefined;
  const [angle, insulation] = compound.split("|");
  const normalizedAngle = angle ? boundedInteger(angle, 360, true) : "";
  const normalizedInsulation = insulation ? boundedInteger(insulation, 10_000, true) : "";
  if ((angle && normalizedAngle === undefined) || (insulation && normalizedInsulation === undefined)) {
    return undefined;
  }
  return `${normalizedAngle}|${normalizedInsulation}`;
}

function normalizeFilterValue(key: CatalogFilterKey, value: string): string | undefined {
  switch (key) {
    case "diameter":
      return normalizedDiameter(value);
    case "inner_pipe":
      return normalizedPipe(value, 2);
    case "outer_pipe":
      return normalizedPipe(value, 3);
    case "execution":
      return normalizedExecution(value);
    case "inner_thickness":
      return boundedDecimal(value, 100);
    case "length":
      return value === "all" ? value : boundedInteger(value, MAX_LENGTH_MM);
    case "page": {
      const page = boundedInteger(value, MAX_PAGE);
      return page === "1" ? undefined : page;
    }
  }
}

export function normalizeCatalogFilters(
  filters: Partial<Record<CatalogFilterKey, CatalogSearchParamValue>>,
): CatalogFilters {
  const normalized: CatalogFilters = {};
  CATALOG_FILTER_KEYS.forEach((key) => {
    const value = singleValue(filters[key]);
    const result = value ? normalizeFilterValue(key, value) : undefined;
    if (result) normalized[key] = result;
  });
  return normalized;
}

export function parseCatalogFilters(searchParams: CatalogSearchParams | URLSearchParams): CatalogFilters {
  const values: Partial<Record<CatalogFilterKey, CatalogSearchParamValue>> = {};
  CATALOG_FILTER_KEYS.forEach((key) => {
    values[key] = searchParams instanceof URLSearchParams
      ? searchParams.getAll(key)
      : searchParams[key];
  });
  return normalizeCatalogFilters(values);
}

export function serializeCatalogFilters(filters: CatalogFilters): string {
  const normalized = normalizeCatalogFilters(filters);
  const params = new URLSearchParams();
  CATALOG_FILTER_KEYS.forEach((key) => {
    const value = normalized[key];
    if (value) params.set(key, value);
  });
  return params.toString();
}

export function getCatalogFilterKey(filters: CatalogFilters): string {
  return serializeCatalogFilters(filters);
}

export function catalogCategoryPath(categorySlug: string): string {
  return `/catalog/${encodeURIComponent(categorySlug)}`;
}

export function catalogFilterPath(categorySlug: string, filters: CatalogFilters): string {
  const query = serializeCatalogFilters(filters);
  const path = catalogCategoryPath(categorySlug);
  return query ? `${path}?${query}` : path;
}

export function hasCatalogQuery(searchParams: CatalogSearchParams): boolean {
  return Object.values(searchParams).some((value) =>
    Array.isArray(value) ? value.some((item) => item.trim()) : Boolean(value?.trim()),
  );
}

export function catalogFilteredHeading(categoryName: string, filters: CatalogFilters): string {
  const parts = [categoryName];
  const diameter = filters.diameter?.split(":").filter(Boolean).join("/");
  if (diameter) parts.push(diameter);

  const innerPipe = filters.inner_pipe?.split("|") ?? [];
  const outerPipe = filters.outer_pipe?.split("|") ?? [];
  const innerSteel = innerPipe[1];
  const outerSteel = outerPipe[1];
  const steel = innerSteel && outerSteel && innerSteel !== outerSteel
    ? `${innerSteel} / ${outerSteel}`
    : innerSteel || outerSteel;
  const thickness = outerPipe[2] || filters.inner_thickness;
  if (steel) parts.push(steel);
  if (thickness) parts.push(`${thickness} мм`);

  return parts.join(" ");
}

export function steelGradesForMaterial(
  steelGrades: ProductFilterOption[],
  material: CatalogMaterial,
) {
  // Марка стали описывает нержавеющее исполнение. Оцинковка является
  // самостоятельным материалом и не должна отсеиваться по steel_grade.
  return material === "stainless" ? steelGrades : [];
}

export function defaultCatalogMaterial(materials: ProductFilterOption[]): CatalogMaterial {
  if (materials.some((option) => option.value === "stainless")) {
    return "stainless";
  }
  return "galvanized";
}
