import type { Metadata } from "next";
import { ManagerEstimateCard } from "@/components/ManagerEstimateCard";

export const metadata: Metadata = {
  title: "Заявка клиента | Дымоход Трейд",
  description: "Внутренняя карточка клиентской сметы.",
  robots: { index: false, follow: false },
};

export default async function ManagerEstimatePage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  return <ManagerEstimateCard leadId={leadId} />;
}
