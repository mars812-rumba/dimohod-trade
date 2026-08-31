import type { Metadata } from "next";
import { CartPage } from "@/components/CartPage";

export const metadata: Metadata = {
  title: "Корзина — Дымоход Трейд",
  description: "Список выбранных элементов дымохода для отправки менеджеру.",
  robots: { index: false, follow: false },
};

export default function CartRoute() {
  return <CartPage />;
}
