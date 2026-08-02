import type { ProductFilterOption } from "@/lib/api";

export type CatalogMaterial = "stainless" | "galvanized";

export function isAisi430(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "") === "AISI430";
}

export function steelGradesForMaterial(
  steelGrades: ProductFilterOption[],
  material: CatalogMaterial,
) {
  return steelGrades.filter((option) =>
    material === "galvanized" ? isAisi430(option.value) : !isAisi430(option.value),
  );
}

export function defaultCatalogMaterial(materials: ProductFilterOption[]): CatalogMaterial {
  if (materials.some((option) => option.value === "stainless")) {
    return "stainless";
  }
  return "galvanized";
}
