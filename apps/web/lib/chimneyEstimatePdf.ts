import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import type { ChimneyEstimate } from "./chimneyEstimate";
import { formatRub } from "./chimneyEstimate";

const MATCH_LABELS = {
  exact: "точное исполнение",
  candidate: "кандидат по типу — проверить",
  nearest: "ближайшая длина — проверить",
  missing: "SKU не найден — уточнить",
  manual: "ручная позиция менеджера",
} as const;

function filenameDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pdfDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

async function createChimneyEstimatePdf(estimate: ChimneyEstimate) {
  const [pdfMakeModule, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = pdfMakeModule.default;
  pdfMake.vfs = fontsModule.default as unknown as Record<string, string>;

  const bomRows: TableCell[][] = estimate.lines.map((line, index) => [
    { text: String(index + 1), alignment: "center" },
    {
      stack: [
        { text: line.label, bold: true },
        line.skuName ? { text: line.skuName, fontSize: 8, color: "#4f6066", margin: [0, 2, 0, 0] } : { text: "Каталожная позиция не найдена", fontSize: 8, color: "#a04428", margin: [0, 2, 0, 0] },
        line.article ? { text: `Арт. ${line.article}`, fontSize: 8, color: "#4f6066" } : { text: "Артикул требует уточнения", fontSize: 8, color: "#a04428" },
        line.characteristics.length ? { text: line.characteristics.join(" · "), fontSize: 8, color: "#4f6066" } : { text: "Характеристики требуют уточнения", fontSize: 8, color: "#a04428" },
        { text: MATCH_LABELS[line.matchStatus], fontSize: 8, color: line.matchStatus === "exact" ? "#2c6f55" : "#a04428" },
        line.note ? { text: line.note, fontSize: 7, color: "#66767b", margin: [0, 2, 0, 0] } : { text: "" },
      ],
    },
    { text: String(line.quantity), alignment: "center" },
    { text: line.unitPriceRub === null ? "По запросу" : formatRub(line.unitPriceRub), alignment: "right" },
    { text: line.lineTotalRub === null ? "—" : formatRub(line.lineTotalRub), alignment: "right", bold: line.lineTotalRub !== null },
  ]);

  const warnings = [...estimate.calculationErrors, ...estimate.reviewItems];
  const content: Content[] = [
    { text: "ДЫМОХОД ТРЕЙД", style: "brand" },
    { text: "Предварительная смета дымохода", style: "title" },
    {
      columns: [
        {
          text: [
            `Объект: ${estimate.profileName}`,
            estimate.reference ? `\n${estimate.reference}${estimate.revision ? ` · редакция ${estimate.revision}` : ""}` : "",
          ],
          width: "*",
        },
        { text: `Сформировано: ${pdfDate(estimate.generatedAt)}`, width: "auto", alignment: "right", color: "#607075" },
      ],
      margin: [0, 0, 0, 16],
      fontSize: 9,
    },
    ...(estimate.customer ? [
      { text: "Клиент", style: "section" } as Content,
      {
        table: {
          widths: ["42%", "58%"],
          body: [
            [{ text: "Имя", color: "#607075" }, { text: estimate.customer.name, bold: true }],
            [{ text: "Контакт", color: "#607075" }, { text: estimate.customer.contact, bold: true }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
      } as Content,
    ] : []),
    { text: "Размеры и параметры клиента", style: "section" },
    {
      table: {
        widths: ["42%", "58%"],
        body: estimate.measurements.map((item) => [
          { text: item.label, color: "#607075" },
          { text: item.value, bold: true },
        ]),
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 16],
    },
    { text: "BOM и смета", style: "section" },
    {
      table: {
        headerRows: 1,
        widths: [18, "*", 30, 62, 70],
        body: [
          [
            { text: "№", style: "tableHeader", alignment: "center" },
            { text: "Позиция и характеристики", style: "tableHeader" },
            { text: "Кол.", style: "tableHeader", alignment: "center" },
            { text: "Цена", style: "tableHeader", alignment: "right" },
            { text: "Сумма", style: "tableHeader", alignment: "right" },
          ],
          ...bomRows,
        ],
      },
      layout: {
        fillColor: (rowIndex: number) => rowIndex === 0 ? "#173d4c" : rowIndex % 2 === 0 ? "#f3f6f5" : null,
        hLineColor: () => "#cad3d5",
        vLineColor: () => "#cad3d5",
      },
      margin: [0, 0, 0, 12],
    },
    {
      columns: [
        { text: `${estimate.totalUnits} шт. · ${estimate.lines.length} типов позиций`, color: "#607075", width: "*" },
        { text: `${estimate.unpricedLineCount ? "Итого по известным ценам" : "Итого"}: ${formatRub(estimate.knownSubtotalRub)}`, bold: true, fontSize: 12, alignment: "right", width: "auto" },
      ],
      margin: [0, 0, 0, 6],
    },
    ...(estimate.unpricedLineCount ? [{ text: `${estimate.unpricedLineCount} поз. без подтверждённой цены не включены в итог.`, color: "#a04428", alignment: "right", fontSize: 8, margin: [0, 0, 0, 14] } as Content] : []),
    ...(estimate.removedLabels.length ? [
      { text: "Удалено клиентом из комплекта", style: "section" } as Content,
      { ul: estimate.removedLabels, color: "#607075", fontSize: 8, margin: [0, 0, 0, 12] } as Content,
    ] : []),
    ...(warnings.length ? [
      { text: "Проверить перед заказом", style: "section" } as Content,
      { ul: warnings, color: "#7d2f1d", fontSize: 8, margin: [0, 0, 0, 12] } as Content,
    ] : []),
    {
      text: "Предварительный расчёт. Итоговый состав, совместимость, наличие и стоимость необходимо подтвердить перед заказом. Цены зафиксированы на момент формирования документа.",
      style: "notice",
    },
    { text: "Дымоход Трейд · +7 (965) 075-65-55 · office@dimohod-trade.pro", alignment: "center", color: "#607075", fontSize: 8, margin: [0, 14, 0, 0] },
  ];

  const documentDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [34, 34, 34, 42],
    info: {
      title: "Предварительная смета дымохода",
      author: "Дымоход Трейд",
      subject: "BOM, размеры и цены выбранного комплекта дымохода",
    },
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#102127", lineHeight: 1.2 },
    styles: {
      brand: { fontSize: 9, bold: true, color: "#ed5b2a", characterSpacing: 1.2, margin: [0, 0, 0, 5] },
      title: { fontSize: 22, bold: true, color: "#173d4c", margin: [0, 0, 0, 10] },
      section: { fontSize: 12, bold: true, color: "#173d4c", margin: [0, 6, 0, 7] },
      tableHeader: { bold: true, color: "#ffffff", fontSize: 8 },
      notice: { fontSize: 8, color: "#4f6066", fillColor: "#eef2f2", margin: [0, 4, 0, 0] },
    },
    footer: (currentPage, pageCount) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: "center",
      color: "#829096",
      fontSize: 7,
      margin: [0, 12, 0, 0],
    }),
    content,
  };

  return pdfMake.createPdf(documentDefinition);
}

export async function createChimneyEstimatePdfBlob(estimate: ChimneyEstimate): Promise<Blob> {
  const pdf = await createChimneyEstimatePdf(estimate);
  return new Promise<Blob>((resolve) => pdf.getBlob(resolve));
}

export async function downloadChimneyEstimatePdf(estimate: ChimneyEstimate): Promise<void> {
  const pdf = await createChimneyEstimatePdf(estimate);
  const reference = estimate.reference?.toLocaleLowerCase("ru-RU") ?? "dymohoda";
  pdf.download(`smeta-${reference}-${filenameDate(estimate.generatedAt)}.pdf`);
}
