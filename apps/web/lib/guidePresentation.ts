import type { GuideEstimateExample } from "./guideArticles";

export function guideDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(value));
}

export function guideEstimateTotal(lines: GuideEstimateExample["lines"]): number | null {
  if (!lines.length) return null;
  let total = 0;
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0
      || line.unitPriceRub === null || !Number.isFinite(line.unitPriceRub) || line.unitPriceRub <= 0) return null;
    total += line.quantity * line.unitPriceRub;
  }
  return Number.isFinite(total) ? total : null;
}
