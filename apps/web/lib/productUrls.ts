type DiameterVariant = {
  diameter_mm: number | null;
  outer_diameter_mm: number | null;
};

export type ProductRoute = {
  familySlug: string;
  diameter: string | null;
  legacySku: string | null;
};

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function productDiameterValue(variant: DiameterVariant | null | undefined) {
  if (!variant || (variant.diameter_mm === null && variant.outer_diameter_mm === null)) {
    return null;
  }
  if (variant.diameter_mm !== null && variant.outer_diameter_mm !== null) {
    return `${variant.diameter_mm}:${variant.outer_diameter_mm}`;
  }
  return `${variant.diameter_mm ?? variant.outer_diameter_mm}:`;
}

export function productPublicPath(productSlug: string, variant?: DiameterVariant | null) {
  if (!variant || (variant.diameter_mm === null && variant.outer_diameter_mm === null)) {
    return `/product/${productSlug}`;
  }
  const diameterSuffix = variant.diameter_mm === null || variant.outer_diameter_mm === null
    ? `d${variant.diameter_mm ?? variant.outer_diameter_mm}`
    : `d${variant.diameter_mm}-${variant.outer_diameter_mm}`;
  return `/product/${productSlug}-${diameterSuffix}`;
}

export function productSelectionPath(
  productSlug: string,
  variant: DiameterVariant,
  skuReference?: string | null,
) {
  const path = productPublicPath(productSlug, variant);
  return skuReference ? `${path}?sku=${encodeURIComponent(skuReference)}` : path;
}

export function parseProductRoute(segment: string): ProductRoute {
  const legacySkuMatch = segment.match(new RegExp(`^(.*)-(${UUID_PATTERN})$`, "i"));
  if (legacySkuMatch) {
    return {
      familySlug: legacySkuMatch[1],
      diameter: null,
      legacySku: legacySkuMatch[2],
    };
  }
  const match = segment.match(/^(.*)-d(\d+)(?:-(\d+))?$/);
  if (!match) {
    return { familySlug: segment, diameter: null, legacySku: null };
  }
  return {
    familySlug: match[1],
    diameter: `${match[2]}:${match[3] ?? ""}`,
    legacySku: null,
  };
}

export function isUuidReference(value: string | null | undefined) {
  return Boolean(
    value &&
      new RegExp(`^${UUID_PATTERN}$`, "i").test(value),
  );
}
