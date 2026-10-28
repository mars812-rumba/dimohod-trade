export function estimateDiscount(subtotal: number, enabled: boolean, percent: number) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100 || Math.abs(percent * 100 - Math.round(percent * 100)) > 1e-7) {
    throw new Error("Скидка должна быть от 0 до 100%, не более двух знаков после запятой");
  }
  const cents = Math.round((subtotal + Number.EPSILON) * 100);
  const discountCents = enabled ? Math.round(cents * Math.round(percent * 100) / 10000) : 0;
  return { discountAmountRub: discountCents / 100, totalAfterDiscountRub: (cents - discountCents) / 100 };
}
