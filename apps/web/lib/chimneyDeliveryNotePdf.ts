import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import type { ChimneyEstimate } from "./chimneyEstimate";
import { deliveryNoteTerms } from "./deliveryNoteTerms";
import { estimateDiscount } from "./estimateDiscount";
import { operator } from "./privacy";

function money(value: number): string {
  return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** This form deliberately does not load/serialize logos, product images or internal notes. */
export function deliveryNoteDocument(estimate: ChimneyEstimate, quotationNumber: string, issuedAt = new Date()): TDocumentDefinitions {
  const number = quotationNumber.trim();
  if (!number) throw new Error("Укажите номер КП для товарной накладной");
  const totals = estimateDiscount(estimate.knownSubtotalRub, estimate.discountEnabled ?? false, estimate.discountPercent ?? 0);
  const date = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "Europe/Moscow" }).format(issuedAt);
  const rows: TableCell[][] = estimate.lines.map((line, index) => [
    { text: String(index + 1), alignment: "center" },
    { text: [line.skuName || line.label, ...line.characteristics].filter(Boolean).join(" · ") },
    { text: String(line.quantity), alignment: "center" },
    { text: "шт", alignment: "center" },
    { text: line.unitPriceRub === null ? "По запросу" : money(line.unitPriceRub), alignment: "right" },
    { text: line.lineTotalRub === null ? "—" : money(line.lineTotalRub), alignment: "right" },
  ]);
  const terms: Content[] = deliveryNoteTerms.flatMap(section => [
    { unbreakable: true, stack: [
      { text: section.title, bold: true, fontSize: 9, margin: [0, 8, 0, 3] },
      { text: section.paragraphs[0], fontSize: 8, margin: [0, 0, 0, 2] },
    ] } as Content,
    ...section.paragraphs.slice(1).map(text => ({ text, fontSize: 8, margin: [0, 0, 0, 2] } as Content)),
  ]);
  return {
    pageSize: "A4",
    pageMargins: [28, 28, 28, 36],
    info: { title: `Товарная накладная №${number}`, author: "Дымоход Трейд" },
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#000000", lineHeight: 1.05 },
    content: [
      { columns: [
        { text: `Товарная накладная №${number}`, bold: true, fontSize: 13, width: "*" },
        { text: `от ${date}`, alignment: "right", width: "auto" },
      ], margin: [0, 0, 0, 8] },
      { text: `${operator.name} · Санкт-Петербург, ул. 2-й Луч, д. 4, корп. 2 · +7 (812) 642-45-65`, fontSize: 8, margin: [0, 0, 0, 5] },
      { columns: [
        { text: `Покупатель: ${estimate.customer?.name?.trim() || "__________________"}`, width: "*" },
        { text: `${estimate.customer?.contactMethod === "max" ? "MAX" : estimate.customer?.contactMethod === "whatsapp" ? "WhatsApp" : estimate.customer?.contactMethod === "telegram" ? "Telegram" : estimate.customer?.contactMethod === "email" ? "Email" : "Телефон"}: ${estimate.customer?.contact || "__________________"}`, width: "auto" },
      ], columnGap: 10, margin: [0, 0, 0, 5] },
      { text: `Основание: Коммерческое предложение №${number}`, margin: [0, 0, 0, 7] },
      { table: { headerRows: 1, widths: [17, "*", 30, 27, 57, 64], body: [
        [{ text: "№", alignment: "center" }, { text: "Товары (работы, услуги)", alignment: "center" },
          { text: "Кол-во", alignment: "center" }, { text: "Ед. изм.", alignment: "center" },
          { text: "Цена", alignment: "right" }, { text: "Сумма", alignment: "right" }],
        ...rows,
      ] }, layout: {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5,
        paddingTop: () => 3, paddingBottom: () => 3,
        paddingLeft: () => 4, paddingRight: () => 4,
      }, margin: [0, 0, 0, 8] },
      { unbreakable: true, stack: [
        { text: `${estimate.unpricedLineCount ? "Итого по известным ценам" : "Итого"}: ${money(estimate.knownSubtotalRub)} руб.`, alignment: "right", margin: [0, 0, 0, 4] },
        ...(estimate.discountEnabled ? [
          { text: `Скидка ${estimate.discountPercent ?? 0}%: ${money(totals.discountAmountRub)} руб.`, alignment: "right", margin: [0, 0, 0, 4] } as Content,
        ] : []),
        { text: `Всего к оплате${estimate.unpricedLineCount ? " по известным ценам" : ""}: ${money(totals.totalAfterDiscountRub)} руб.`, bold: true, alignment: "right", margin: [0, 0, 0, 4] },
        { text: "Без налога (НДС)", alignment: "right", margin: [0, 0, 0, 5] },
        ...(estimate.unpricedLineCount ? [{ text: `${estimate.unpricedLineCount} поз. без цены не включены в итог; стоимость требует уточнения.`, fontSize: 8 } as Content] : []),
      ] },
      ...terms,
      { unbreakable: true, stack: [
        { text: "С условиями согласен", bold: true, margin: [0, 14, 0, 12] },
        { columns: [
          { text: "Подпись __________________________", width: "*" },
          { text: "Дата __________________", width: "auto" },
        ] },
      ] },
    ],
    footer: (page, count) => ({ text: `${page} / ${count}`, alignment: "center", fontSize: 8, margin: [0, 10, 0, 0] }),
  };
}

export async function createChimneyDeliveryNotePdfBlob(estimate: ChimneyEstimate, quotationNumber: string): Promise<Blob> {
  const [module, fonts] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
  const pdfMake = module.default;
  pdfMake.vfs = fonts.default as unknown as Record<string, string>;
  return new Promise(resolve => pdfMake.createPdf(deliveryNoteDocument(estimate, quotationNumber)).getBlob(resolve));
}
