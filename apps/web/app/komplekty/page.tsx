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
const title = "Купить готовый комплект дымохода — состав и цены | Дымоход Трейд";
const description = "Закажите комплект дымохода через стену или перекрытие и кровлю. Сравните маршруты, диаметры, состав и стоимость изделий по актуальным ценам каталога.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/komplekty" },
  openGraph: { type: "website", url: "/komplekty", title, description },
  twitter: { card: "summary", title, description },
};

export default async function ReadyKitsPage() {
  const kits = await getReadyKits();
  const groups = groupReadyKits(kits);
  return <main className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="Хлебные крошки"><Link href="/">Главная</Link> / <span>Готовые комплекты</span></nav>
    <header className={styles.heading}><p className="eyebrow">Каталог комплектов</p><h1>Готовые комплекты дымоходов</h1><p>Выберите маршрут и откройте полный состав с текущей стоимостью изделий. Условия монтажа уточним по вашему объекту.</p></header>
    {kits.length ? <div className={groupStyles.cards}>{groups.map(group => <ReadyKitGroupCard key={group.key} group={group} catalogPreview={readyKitCatalogPilot(group.route, group.height_m)} />)}</div> : <p>Согласованные комплекты пока не опубликованы.</p>}
    <ReadyKitCustomRequest />
    <p><Link href="/catalog">Каталог отдельных изделий →</Link></p>
  </main>;
}
