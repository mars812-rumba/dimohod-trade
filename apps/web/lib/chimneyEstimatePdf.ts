import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import type { ChimneyEstimate } from "./chimneyEstimate";
import { loadEstimatePdfImages } from "./estimatePdfImages";
import { workingHoursText } from "./contactLinks";
import { METRIKA_GOALS, reachMetrikaGoal } from "./metrika";

const MATCH_LABELS = {
  exact: "точное исполнение",
  candidate: "кандидат по типу — проверить",
  nearest: "ближайшая длина — проверить",
  missing: "SKU не найден — уточнить",
  manual: "ручная позиция менеджера",
} as const;

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const BRAND_LOGO_TIMEOUT_MS = 2500;

// A manager's estimate price may include kopecks; do not round it in the PDF.
function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency", currency: "RUB", minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(value);
}

async function loadBrandLogo(): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BRAND_LOGO_TIMEOUT_MS);
  try {
    const response = await fetch(`${appBasePath}/brand/logo-original.jpg`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  const [pdfMakeModule, fontsModule, brandLogo, thumbnails] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
    loadBrandLogo(),
    loadEstimatePdfImages(estimate.lines.map(line => line.image)),
  ]);
  const pdfMake = pdfMakeModule.default;
  pdfMake.vfs = fontsModule.default as unknown as Record<string, string>;
  const images: Record<string, string> = {};
  const imageNames = new Map<string, string>();
  const rowImages = thumbnails.map(data => {
    if (!data) return null;
    const existing = imageNames.get(data);
    if (existing) return existing;
    const name = `product${imageNames.size}`;
    images[name] = data;
    imageNames.set(data, name);
    return name;
  });

  const bomRows: TableCell[][] = estimate.lines.map((line, index) => [
    { text: String(index + 1), alignment: "center" },
    {
      columns: [
        ...(rowImages[index] ? [{ image: rowImages[index]!, fit: [36, 42] as [number, number], width: 36, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
        { width: "*", stack: [
        { text: line.label, bold: true },
        line.skuName ? { text: line.skuName, fontSize: 8, color: "#4f6066", margin: [0, 2, 0, 0] } : { text: "Каталожная позиция не найдена", fontSize: 8, color: "#a04428", margin: [0, 2, 0, 0] },
        line.article ? { text: `Арт. ${line.article}`, fontSize: 8, color: "#4f6066" } : { text: "Артикул требует уточнения", fontSize: 8, color: "#a04428" },
        line.characteristics.length ? { text: line.characteristics.join(" · "), fontSize: 8, color: "#4f6066" } : { text: "Характеристики требуют уточнения", fontSize: 8, color: "#a04428" },
        { text: MATCH_LABELS[line.matchStatus], fontSize: 8, color: line.matchStatus === "exact" ? "#2c6f55" : "#a04428" },
        line.note ? { text: line.note, fontSize: 7, color: "#66767b", margin: [0, 2, 0, 0] } : { text: "" },
        ] },
      ],
      columnGap: 7,
    },
    { text: String(line.quantity), alignment: "center" },
    { text: line.unitPriceRub === null ? "По запросу" : formatRub(line.unitPriceRub), alignment: "right" },
    { text: line.lineTotalRub === null ? "—" : formatRub(line.lineTotalRub), alignment: "right", bold: line.lineTotalRub !== null },
  ]);

  const warnings = [...estimate.calculationErrors, ...estimate.reviewItems];
  const content: Content[] = [
    brandLogo
      ? { image: brandLogo, width: 111, height: 51, margin: [0, 0, 0, 10] }
      : { text: "ДЫМОХОД ТРЕЙД", style: "brand" },
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
        body: estimate.measurements.length ? estimate.measurements.map((item) => [
          { text: item.label, color: "#607075" },
          { text: item.value, bold: true },
        ]) : [[{ text: "Параметры", color: "#607075" }, { text: "Не указаны" }]],
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
        { text: `${estimate.discountEnabled ? (estimate.unpricedLineCount ? "По известным ценам без скидки" : "Сумма без скидки") : (estimate.unpricedLineCount ? "Итого по известным ценам" : "Итого")}: ${formatRub(estimate.knownSubtotalRub)}`, bold: true, fontSize: 12, alignment: "right", width: "auto" },
      ],
      margin: [0, 0, 0, 6],
    },
    ...(estimate.unpricedLineCount ? [{ text: `${estimate.unpricedLineCount} поз. без подтверждённой цены не включены в итог.`, color: "#a04428", alignment: "right", fontSize: 8, margin: [0, 0, 0, 14] } as Content] : []),
    ...(estimate.discountEnabled ? [
      { text: `Скидка ${estimate.discountPercent ?? 0}%: −${formatRub(estimate.discountAmountRub ?? 0)}`, alignment: "right", margin: [0, 0, 0, 6] } as Content,
      { text: `${estimate.unpricedLineCount ? "Итого по известным ценам со скидкой" : "Итого со скидкой"}: ${formatRub(estimate.totalAfterDiscountRub ?? estimate.knownSubtotalRub)}`, bold: true, fontSize: 12, alignment: "right", margin: [0, 0, 0, 12] } as Content,
    ] : []),
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
    { text: `Дымоход Трейд · +7 (964) 342-45-65 · office@dimohod-trade.pro · ${workingHoursText}`, alignment: "center", color: "#607075", fontSize: 8, margin: [0, 14, 0, 0] },
  ];

  const documentDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    images,
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
  reachMetrikaGoal(METRIKA_GOALS.estimatePdfDownloadRequested);
}
