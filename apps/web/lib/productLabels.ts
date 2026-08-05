export function compactMillimeterValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(String(value).replace(",", "."));
  if (Number.isFinite(parsed)) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(parsed);
  }
  return String(value).replace(".", ",");
}

export function steelWithThicknessLabel(
  steel: string | null | undefined,
  thickness: string | number | null | undefined,
) {
  if (!steel) {
    return null;
  }
  const thicknessLabel = compactMillimeterValue(thickness);
  return thicknessLabel ? `${steel} · ${thicknessLabel} мм` : steel;
}
