import type { Product, SKU } from "./api";

export type EstimateVariantField = "inner" | "innerThickness" | "outer" | "outerThickness" | "length";
type Variant = Pick<SKU, "id" | "material" | "steel_grade" | "wall_thickness_mm" | "outer_diameter_mm" | "length_mm" | "attributes">;
export const missingVariantValue = "__none__";

export function isSandwichProduct(product: Pick<Product, "category" | "contour" | "skus">): boolean {
  return product.category.slug.startsWith("sendvich-")
    || /сэндвич|двустен|sandwich/i.test(product.contour ?? "")
    || product.skus.some(sku => /сэндвич|двустен|sandwich/i.test(sku.contour ?? ""));
}

// Material changes must not silently change the object's diameter, angle or insulation.
export function estimateGeometryVariants<T extends Pick<SKU, "diameter_mm" | "outer_diameter_mm" | "angle_deg" | "insulation_mm" | "attributes">>(variants: readonly T[], current: T): T[] {
  return variants.filter(sku => {
    if (sku.diameter_mm !== current.diameter_mm || sku.outer_diameter_mm !== current.outer_diameter_mm
      || sku.angle_deg !== current.angle_deg || sku.insulation_mm !== current.insulation_mm) return false;
    const keys = new Set([...Object.keys(current.attributes), ...Object.keys(sku.attributes)]);
    return [...keys].filter(key => key === "base_size" || key === "execution"
      || (key.endsWith("_mm") && !/thickness|length/.test(key)))
      .every(key => String(sku.attributes[key] ?? "") === String(current.attributes[key] ?? ""));
  });
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : missingVariantValue;
}

function dimension(value: unknown): string {
  if (value === null || value === undefined || value === "") return missingVariantValue;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? String(number) : text(value);
}

// Material and AISI are different data fields. A missing AISI is not evidence of galvanization.
function execution(material: unknown, steel: unknown): string {
  const value = text(material);
  if (/оцинк|galvan/i.test(value)) return "Оцинковка";
  const grade = text(steel);
  return grade !== missingVariantValue ? grade : value;
}

export function estimateVariantValue(sku: Variant, field: EstimateVariantField): string {
  switch (field) {
    case "inner": return execution(sku.material, sku.steel_grade);
    case "innerThickness": return dimension(sku.wall_thickness_mm);
    case "outer": return execution(sku.attributes.outer_material, sku.attributes.outer_steel_grade);
    case "outerThickness": return dimension(sku.attributes.outer_wall_thickness_mm);
    case "length": return dimension(sku.length_mm);
  }
}

export function estimateVariantFields(variants: readonly Variant[]) {
  const doubleWall = variants.some(sku => sku.outer_diameter_mm !== null
    || estimateVariantValue(sku, "outer") !== missingVariantValue);
  const fields: Array<{ key: EstimateVariantField; label: string; suffix: string }> = [
    { key: "inner", label: doubleWall ? "Внутренняя труба" : "Материал и марка стали", suffix: "" },
  ];
  if (doubleWall) {
    fields.push({ key: "outer", label: "Наружная труба", suffix: "" });
  }
  fields.push({ key: "innerThickness", label: doubleWall ? "Толщина внутренней трубы" : "Толщина", suffix: " мм" });
  if (doubleWall) {
    if (variants.some(sku => estimateVariantValue(sku, "outerThickness") !== missingVariantValue)) {
      fields.push({ key: "outerThickness", label: "Толщина наружной трубы", suffix: " мм" });
    }
  }
  if (variants.some(sku => sku.length_mm !== null)) {
    fields.push({ key: "length", label: "Длина", suffix: " мм" });
  }
  return fields;
}

// Each downstream list is narrowed by the preceding fields; every option names a real SKU.
function candidatesBefore<T extends Variant>(variants: readonly T[], current: T, field: EstimateVariantField): T[] {
  const fields = estimateVariantFields(variants).map(item => item.key);
  const preceding = fields.slice(0, fields.indexOf(field));
  return variants.filter(sku => preceding.every(key => estimateVariantValue(sku, key) === estimateVariantValue(current, key)));
}

export function estimateVariantOptions<T extends Variant>(variants: readonly T[], current: T, field: EstimateVariantField): string[] {
  return [...new Set(candidatesBefore(variants, current, field).map(sku => estimateVariantValue(sku, field)))];
}

export function selectEstimateVariant<T extends Variant>(variants: readonly T[], current: T, field: EstimateVariantField, value: string): T | null {
  const weights: Array<[EstimateVariantField, number]> = [
    ["length", 16], ["outer", 8], ["outerThickness", 4], ["innerThickness", 2], ["inner", 1],
  ];
  const score = (sku: T) => weights.reduce((total, [key, weight]) => total
    + (estimateVariantValue(sku, key) === estimateVariantValue(current, key) ? weight : 0), 0);
  return candidatesBefore(variants, current, field)
    .filter(sku => estimateVariantValue(sku, field) === value)
    .sort((left, right) => score(right) - score(left)
      || Number(right.id === current.id) - Number(left.id === current.id))[0] ?? null;
}
