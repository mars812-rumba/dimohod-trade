export type HomeDocument = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  previewUrl: string;
  originalUrl: string;
  featured?: boolean;
};

const DOCUMENT_ROOT = "/documents/certificates";

export const homeDocuments: HomeDocument[] = [
  {
    id: "modular-chimneys-conformity-2024-2027",
    title: "Сертификат соответствия на модульные дымоходы",
    eyebrow: "Основной документ · действует до 09.01.2027",
    description:
      "В документе указаны модульные дымоходы из нержавеющей стали: одностенные, утеплённые и коаксиальные исполнения.",
    previewUrl: `${DOCUMENT_ROOT}/certificate-conformity-modular-chimneys-2024-2027.webp`,
    originalUrl: `${DOCUMENT_ROOT}/certificate-conformity-modular-chimneys-2024-2027.jpg`,
    featured: true,
  },
  {
    id: "mill-test-aisi-304-2011",
    title: "Jindal Stainless — AISI 304",
    eyebrow: "Документ на металл · 08.12.2011",
    description: "Mill Test Certificate на листовую нержавеющую сталь марки 304.",
    previewUrl: `${DOCUMENT_ROOT}/mill-test-aisi-304-2011.webp`,
    originalUrl: `${DOCUMENT_ROOT}/mill-test-aisi-304-2011.jpg`,
  },
  {
    id: "inspection-aisi-430-2012",
    title: "Yeun Chyang — AISI 430",
    eyebrow: "Документ на металл · 30.01.2012",
    description: "Inspection Certificate на листовую нержавеющую сталь марки 430.",
    previewUrl: `${DOCUMENT_ROOT}/inspection-aisi-430-2012.webp`,
    originalUrl: `${DOCUMENT_ROOT}/inspection-aisi-430-2012.jpg`,
  },
  {
    id: "inspection-s189-aisi-304-2012-page-1",
    title: "POSCO Thainox — S189 / AISI 304",
    eyebrow: "Документ на металл · 19.01.2012",
    description: "Inspection Certificate, загружена первая страница из двух.",
    previewUrl: `${DOCUMENT_ROOT}/inspection-s189-aisi-304-2012-page-1.webp`,
    originalUrl: `${DOCUMENT_ROOT}/inspection-s189-aisi-304-2012-page-1.jpg`,
  },
];
