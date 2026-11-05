/** Unknown stock must not become a promise of availability in structured data. */
export function productOfferAvailability(status: string | null | undefined): string | undefined {
  const availability: Record<string, string> = {
    in_stock: "InStock",
    out_of_stock: "OutOfStock",
    preorder: "PreOrder",
    on_order: "PreOrder",
  };
  const value = status ? availability[status] : undefined;
  return value ? `https://schema.org/${value}` : undefined;
}
