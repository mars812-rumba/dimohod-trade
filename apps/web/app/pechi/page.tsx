import type { Metadata } from "next";
import { StoveCatalogPage } from "@/components/StoveCatalogPage";
import { stoves } from "@/lib/stoves";

export const metadata: Metadata = {
  title: "Печи для бани: модели и фотографии | Дымоход Трейд",
  description: `Каталог банных печей: ${stoves.length} моделей с названиями и фотографиями. Выберите модель перед переходом к расчёту дымохода.`,
  alternates: { canonical: "/pechi" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/pechi",
    title: "Печи для бани: модели и фотографии",
    description: "Справочный каталог моделей банных печей с фотографиями.",
    images: [{ url: stoves[0].image, alt: stoves[0].name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Печи для бани: модели и фотографии",
    description: "Справочный каталог моделей банных печей с фотографиями.",
    images: [stoves[0].image],
  },
};

export default function StovesPage() {
  return <StoveCatalogPage page={1} />;
}
