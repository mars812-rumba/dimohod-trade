import type { ProductFilterOption } from "@/lib/api";

export type CatalogMaterial = "stainless" | "galvanized";

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
