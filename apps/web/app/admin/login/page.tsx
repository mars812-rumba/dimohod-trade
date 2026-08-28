import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Вход в админку | Дымоход Трейд",
  description: "Защищённый вход в административный раздел.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <Suspense fallback={null}><AdminLoginForm /></Suspense>;
}
