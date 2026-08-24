type DiameterVariant = {
  diameter_mm: number | null;
  outer_diameter_mm: number | null;
};

const DIAMETER_TEMPLATE_PATTERN = /\{(?:d|D|diameter|dimensions)\}/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function diameterLabel(variant: DiameterVariant | null) {
  if (!variant) return null;
  if (variant.diameter_mm !== null && variant.outer_diameter_mm !== null) {
    return `${variant.diameter_mm}×${variant.outer_diameter_mm} мм`;
  }
  const diameter = variant.diameter_mm ?? variant.outer_diameter_mm;
  return diameter === null ? null : `${diameter} мм`;
}

function titleContainsDiameter(title: string, variant: DiameterVariant) {
  if (variant.diameter_mm !== null && variant.outer_diameter_mm !== null) {
    const inner = escapeRegExp(String(variant.diameter_mm));
    const outer = escapeRegExp(String(variant.outer_diameter_mm));
    return new RegExp(`(?:Ø\\s*)?${inner}\\s*(?:×|x|х|/)\\s*${outer}(?:\\s*мм)?`, "i").test(title);
  }
  const diameter = variant.diameter_mm ?? variant.outer_diameter_mm;
  if (diameter === null) return false;
  const value = escapeRegExp(String(diameter));
  return new RegExp(`(?:Ø|[dD]\\s*=?|диаметр\\s*)${value}(?:\\s*мм)?|\\b${value}\\s*мм\\b`, "i").test(title);
}

export function ensureDiameterInTitle(
  template: string,
  renderedTitle: string,
  variant: DiameterVariant | null,
) {
  const label = diameterLabel(variant);
  if (
    !variant ||
    !label ||
    DIAMETER_TEMPLATE_PATTERN.test(template) ||
    titleContainsDiameter(renderedTitle, variant)
  ) {
    return renderedTitle;
  }

  const brandSuffix = renderedTitle.match(
    /(\s+—\s+купить\s+\|\s+Дымоход Трейд|\s+(?:—|\|)\s+Дымоход Трейд)$/i,
  )?.[1];
  if (brandSuffix) {
    return `${renderedTitle.slice(0, -brandSuffix.length)} ${label}${brandSuffix}`;
  }
  return `${renderedTitle} — ${label}`;
}
