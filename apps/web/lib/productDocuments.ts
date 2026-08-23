import type { Product, SKU } from "@/lib/api";

export type ProductDocument = {
  id: string;
  title: string;
  kind: "certificate" | "material-reference";
  previewUrl: string;
  originalUrl: string;
  status: string;
  note: string;
};

const DOCUMENT_ROOT = "/documents/certificates";

const conformityCertificate: ProductDocument = {
  id: "modular-chimneys-conformity-2024-2027",
  title: "Сертификат соответствия на модульные дымоходы",
  kind: "certificate",
  previewUrl: `${DOCUMENT_ROOT}/certificate-conformity-modular-chimneys-2024-2027.webp`,
  originalUrl: `${DOCUMENT_ROOT}/certificate-conformity-modular-chimneys-2024-2027.jpg`,
  status: "Срок действия в документе: 10.01.2024–09.01.2027",
  note: "Область действия указана в самом сертификате: модульные дымоходы из нержавеющей стали, включая одностенные, утеплённые и коаксиальные исполнения.",
};

const materialDocuments: Record<"aisi-304" | "aisi-430", ProductDocument[]> = {
  "aisi-304": [
    {
      id: "mill-test-aisi-304-2011",
      title: "Документ на металл AISI 304",
      kind: "material-reference",
      previewUrl: `${DOCUMENT_ROOT}/mill-test-aisi-304-2011.webp`,
      originalUrl: `${DOCUMENT_ROOT}/mill-test-aisi-304-2011.jpg`,
      status: "Справочный документ партии от 08.12.2011",
      note: "Документ относится к указанным в нём партиям металла и не подтверждает происхождение выбранного SKU без прослеживаемости партии.",
    },
    {
      id: "inspection-s189-aisi-304-2012-page-1",
      title: "Документ на металл S189 / AISI 304 — страница 1 из 2",
      kind: "material-reference",
      previewUrl: `${DOCUMENT_ROOT}/inspection-s189-aisi-304-2012-page-1.webp`,
      originalUrl: `${DOCUMENT_ROOT}/inspection-s189-aisi-304-2012-page-1.jpg`,
      status: "Справочный документ партии от 19.01.2012",
      note: "Загружена только первая страница. Документ относится к указанным в нём партиям металла и не подтверждает происхождение выбранного SKU без прослеживаемости партии.",
    },
  ],
  "aisi-430": [
    {
      id: "inspection-aisi-430-2012",
      title: "Документ на металл AISI 430",
      kind: "material-reference",
      previewUrl: `${DOCUMENT_ROOT}/inspection-aisi-430-2012.webp`,
      originalUrl: `${DOCUMENT_ROOT}/inspection-aisi-430-2012.jpg`,
      status: "Справочный документ партии от 30.01.2012",
      note: "Документ относится к указанным в нём партиям металла и не подтверждает происхождение выбранного SKU без прослеживаемости партии.",
    },
  ],
};

function normalizedText(value: unknown) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("ru-RU") : "";
}

function isStainless(value: unknown) {
  const normalized = normalizedText(value);
  return normalized.includes("нерж") || normalized.includes("stainless");
}

function isCoveredContour(value: unknown) {
  const normalized = normalizedText(value);
  return (
    normalized.includes("одноконтур") ||
    normalized.includes("single") ||
    normalized.includes("сэндвич") ||
    normalized.includes("сендвич") ||
    normalized.includes("sandwich") ||
    normalized.includes("коакси") ||
    normalized.includes("coax")
  );
}

function normalizedSteelKey(value: unknown): "aisi-304" | "aisi-430" | null {
  const normalized = normalizedText(value).replace(/[^a-zа-я0-9]/g, "");
  if (normalized.includes("aisi304") || normalized === "304") {
    return "aisi-304";
  }
  if (normalized.includes("aisi430") || normalized === "430") {
    return "aisi-430";
  }
  return null;
}

export function documentsForSku(product: Product, sku: SKU | null): ProductDocument[] {
  if (!sku) {
    return [];
  }

  const outerMaterial = sku.attributes.outer_material;
  const contour = sku.contour ?? product.contour;
  const documents: ProductDocument[] = [];

  if (
    isCoveredContour(contour) &&
    (isStainless(sku.material ?? product.material) || isStainless(outerMaterial))
  ) {
    documents.push(conformityCertificate);
  }

  const steelKeys = new Set(
    [sku.steel_grade ?? product.steel_grade, sku.attributes.outer_steel_grade]
      .map(normalizedSteelKey)
      .filter((value): value is "aisi-304" | "aisi-430" => value !== null),
  );
  for (const steelKey of steelKeys) {
    documents.push(...materialDocuments[steelKey]);
  }

  return documents;
}
