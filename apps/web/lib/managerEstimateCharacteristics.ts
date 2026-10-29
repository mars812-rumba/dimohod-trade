/** Resolve only the exact SKU; never substitute a family/default variant. */
export function managerEstimateCharacteristics(
  line: { sku_id: string | null; characteristics: string[] },
  metadata: Record<string, { estimate_characteristics?: string[] | null }>,
): string[] {
  const canonical = line.sku_id ? metadata[line.sku_id]?.estimate_characteristics : null;
  return canonical?.length ? canonical : line.characteristics;
}

export function managerEstimateNames(
  line: { sku_id: string | null; label: string; sku_name: string | null },
  metadata: Record<string, { estimate_label?: string; estimate_sku_name?: string }>,
) {
  const item = line.sku_id ? metadata[line.sku_id] : null;
  return { label: item?.estimate_label ?? line.label, skuName: item?.estimate_sku_name ?? line.sku_name };
}
