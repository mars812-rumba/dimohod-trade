import type { Metadata } from "next";
import { AdminCustomerManager } from "@/components/AdminCustomerManager";

export const metadata: Metadata = {
  title: "Клиенты и замеры | Дымоход Трейд",
  description: "Внутренняя база клиентов и смет Дымоход Трейд.",
  robots: { index: false, follow: false },
};

export default function AdminCustomersPage() {
  return <AdminCustomerManager />;
}
