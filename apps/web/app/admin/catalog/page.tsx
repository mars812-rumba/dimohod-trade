import type { Metadata } from "next";
import AdminCatalogManager from "@/components/AdminCatalogManager";

export const metadata: Metadata = {
  title: "Управление каталогом | Дымоход Трейд",
  description: "Внутреннее управление SKU, фото и характеристиками каталога.",
  robots: { index: false, follow: false },
};

export default function AdminCatalogPage() {
  return <AdminCatalogManager />;
}
