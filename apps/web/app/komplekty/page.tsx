import type { Metadata } from "next";
import Link from "next/link";
import { getReadyKits } from "@/lib/readyKits";
import { groupReadyKits } from "@/lib/readyKitGroups";
import { readyKitCatalogPilot } from "@/lib/readyKitCatalogPilot";
import { ReadyKitGroupCard } from "@/components/ReadyKitGroupCard";
import { ReadyKitCustomRequest } from "@/components/ReadyKitCustomRequest";
import styles from "@/components/ReadyKit.module.css";
import groupStyles from "@/components/ReadyKitGroups.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Готовые комплекты дымоходов — состав и цены | Дымоход Трейд",
  description: "Комплекты дымоходов через перекрытие и через стену. Сравните опубликованные составы, диаметры и стоимость изделий по актуальным ценам каталога.",
  alternates: { canonical: "/komplekty" },
};

export default async function ReadyKitsPage() {
  const kits = await getReadyKits();
  const groups = groupReadyKits(kits);
  return <main className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="Хлебные крошки"><Link href="/">Главная</Link> / <span>Готовые комплекты</span></nav>
    <header className={styles.heading}><p className="eyebrow">Каталог комплектов</p><h1>Готовые комплекты дымоходов</h1><p>Выберите маршрут и откройте полный состав с текущей стоимостью изделий. Условия монтажа проверяются для конкретного объекта.</p></header>
    {kits.length ? <div className={groupStyles.cards}>{groups.map(group => <ReadyKitGroupCard key={group.key} group={group} catalogPreview={readyKitCatalogPilot(group.route, group.height_m)} />)}</div> : <p>Согласованные комплекты пока не опубликованы.</p>}
    <ReadyKitCustomRequest />
    <p><Link href="/catalog">Каталог отдельных изделий →</Link></p>
  </main>;
}
