export type SolutionCertificate = {
  id: string;
  title: string;
  validity: string;
  description: string;
  previewUrl: string;
  originalUrl: string;
};

const CERTIFICATE_ROOT = "/documents/certificates";

export const solutionCertificates: SolutionCertificate[] = [
  {
    id: "fire-safety-2025-2028",
    title: "Сертификат пожарной безопасности",
    validity: "Добровольная сертификация · действует до 30.06.2028",
    description:
      "Документ относится к перечисленным в нём дымоходам и элементам из нержавеющей стали.",
    previewUrl: `${CERTIFICATE_ROOT}/certificate-fire-safety-2025-2028.webp`,
    originalUrl: `${CERTIFICATE_ROOT}/certificate-fire-safety-2025-2028.jpg`,
  },
  {
    id: "modular-chimneys-conformity-2024-2027",
    title: "Сертификат соответствия на модульные дымоходы",
    validity: "Добровольная сертификация · действует до 09.01.2027",
    description:
      "В документе указаны одностенные, утеплённые и коаксиальные исполнения из нержавеющей стали.",
    previewUrl: `${CERTIFICATE_ROOT}/certificate-conformity-modular-chimneys-2024-2027.webp`,
    originalUrl: `${CERTIFICATE_ROOT}/certificate-conformity-modular-chimneys-2024-2027.jpg`,
  },
];
