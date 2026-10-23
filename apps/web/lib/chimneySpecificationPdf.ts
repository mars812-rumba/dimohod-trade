import type { TDocumentDefinitions, TableCell } from "pdfmake/interfaces";
import type { ChimneyEstimate } from "./chimneyEstimate";

/** A separate, price-free print form. Do not serialize notes, totals or photos here. */
export function specificationDocument(estimate: ChimneyEstimate, quotationNumber: string): TDocumentDefinitions {
  const rows: TableCell[][] = estimate.lines.map((line, index) => [
    { text: String(index + 1), alignment: "center" },
    { text: [line.skuName || line.label, ...line.characteristics].filter(Boolean).join(" · ") },
    { text: String(line.quantity), alignment: "center" },
    { text: "шт", alignment: "center" },
  ]);
  return {
    pageSize: "A4",
    pageMargins: [34, 34, 34, 38],
    info: { title: `Коммерческое предложение №${quotationNumber}`, author: "Дымоход Трейд" },
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#000000" },
    content: [
      { columns: [{ text: "Начало изготовления: __________________", width: "*" }, { text: "Конец изготовления: __________________", width: "auto" }], fontSize: 8, margin: [0, 0, 0, 6] },
      { table: { widths: ["*", 175], body: [[
        { text: `Коммерческое предложение №${quotationNumber}`, bold: true },
        { text: "Готовность: __________________" },
      ]] }, layout: "lightHorizontalLines", margin: [0, 0, 0, 5] },
      { text: `Покупатель: ${estimate.customer?.name ?? "__________________"}`, margin: [0, 0, 0, 4] },
      { text: `Контакт: ${estimate.customer?.contact ?? "__________________"}`, margin: [0, 0, 0, 8] },
      { text: "ДИАМЕТР: __________________", bold: true, margin: [0, 0, 0, 5] },
      { table: { headerRows: 1, widths: [22, "*", 38, 32], body: [
        [{ text: "№", alignment: "center" }, { text: "Товар (работы, услуги)", alignment: "center" },
          { text: "Кол-во", alignment: "center" }, { text: "Ед. изм.", alignment: "center" }],
        ...rows,
      ] }, layout: {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5,
        paddingTop: () => 3, paddingBottom: () => 3,
      }, margin: [0, 0, 0, 14] },
      { unbreakable: true, stack: [
        { text: "Со спецификацией согласен", margin: [0, 0, 0, 10] },
        { text: "__________________    __________________________    ______________", alignment: "right" },
        { text: "подпись                         расшифровка                         дата", alignment: "right", fontSize: 8 },
      ] },
    ],
    footer: (page, count) => ({ text: `${page} / ${count}`, alignment: "center", fontSize: 8, margin: [0, 10, 0, 0] }),
  };
}

export async function createChimneySpecificationPdfBlob(estimate: ChimneyEstimate, quotationNumber: string): Promise<Blob> {
  const [module, fonts] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
  const pdfMake = module.default;
  pdfMake.vfs = fonts.default as unknown as Record<string, string>;
  return new Promise(resolve => pdfMake.createPdf(specificationDocument(estimate, quotationNumber)).getBlob(resolve));
}
