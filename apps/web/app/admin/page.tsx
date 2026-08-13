import type { Metadata } from "next";
import AdminCatalogManager from "../../components/AdminCatalogManager";

export const metadata: Metadata = {
  title: "Админка каталога | Дымоход Трейд",
  description: "Управление SKU, фото и характеристиками каталога Дымоход Трейд.",
};

export default function AdminPage() {
  return <AdminCatalogManager />;
}

