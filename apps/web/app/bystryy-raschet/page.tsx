import Link from "next/link";
import { HomeQuickEstimate } from "@/components/HomeQuickEstimate";
import styles from "./page.module.css";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export default function QuickEstimatePage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <Link href="/raschet">Выбор формата</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Быстрый расчёт</span>
        </nav>
      </div>
      <HomeQuickEstimate assetBasePath={assetBasePath} />
    </main>
  );
}
