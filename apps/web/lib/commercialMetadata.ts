// Apply after resolving saved Product/SKU/category overrides and SKU tokens.
// This changes metadata output only; saved copy and technical facts stay intact.
const purchaseAction = /(?<!\p{L})(?:купить|заказать|закажите|приобрести|покупка|на\s+заказ|под\s+заказ)(?!\p{L})/iu;

export function purchaseMetadata(
  title: string,
  description: string,
  callToAction = "Закажите выбранное исполнение.",
) {
  let commercialTitle = title.trim();
  if (!purchaseAction.test(commercialTitle)) {
    const brand = commercialTitle.match(/\s*(?:\||—)\s*Дымоход Трейд\s*$/iu)?.[0] ?? "";
    const subject = commercialTitle.slice(0, commercialTitle.length - brand.length)
      .replace(/\s*[—–-]\s*каталог(?:\s+и\s+цены)?(?=\s|$)/giu, "")
      .replace(/\s{2,}/g, " ").trim();
    commercialTitle = `${subject} — купить${brand}`;
  }
  const savedDescription = description.trim();
  return {
    title: commercialTitle,
    // Keep the full approved text, including variant parameters and caveats.
    // Prepending the short action avoids truncating facts to fit a new suffix.
    description: purchaseAction.test(savedDescription)
      ? savedDescription
      : `${callToAction} ${savedDescription}`.trim(),
  };
}
