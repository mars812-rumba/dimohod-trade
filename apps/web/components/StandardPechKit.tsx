"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconArrowRight as ArrowRight, IconPhotoOff as PhotoOff } from "@tabler/icons-react";
import { formatRub } from "@/lib/chimneyEstimate";
import type { ProductListItem, ProductListResponse } from "@/lib/api";
import { productSelectionPath } from "@/lib/productUrls";
import styles from "./StandardPechKit.module.css";

type MatchLevel = "exact" | "review" | "family";

type KitLine = {
  key: string;
  label: string;
  specification: string;
  quantity: number;
  productSlug: string;
  article?: string;
  catalogQuery?: Record<string, string>;
  matchLevel: MatchLevel;
  reviewNote?: string;
};

const KIT_PRICE_RUB = 28_540;

const kitLines: KitLine[] = [
  { key: "pipe", label: "Труба 1000 мм", specification: "Ø120 · AISI 304 · 0,8 мм", quantity: 1, productSlug: "odnostennyi-truba", article: "DT-GOLYE-09-00-D120", matchLevel: "exact", catalogQuery: { category: "odnokonturnye-truby", diameter: "120:", length_mm: "1000", steel_grade: "AISI 304", wall_thickness_mm: "0.8" } },
  { key: "damper", label: "Шибер поворотный", specification: "Ø120 · AISI 304 · 0,8 мм", quantity: 1, productSlug: "odnostennyi-shiber-povorotnyi", article: "DT-GOLYE-09-11-D120", matchLevel: "exact", catalogQuery: { category: "shibery", q: "Шибер поворотный", diameter: "120:", steel_grade: "AISI 304", wall_thickness_mm: "0.8" } },
  { key: "cap", label: "Заглушка опорная", specification: "Ø120 · AISI 304 0,8 мм / AISI 430", quantity: 1, productSlug: "sendvich-zaglushka-opornaya", article: "DT-SW50-19-11-D120-220", matchLevel: "exact", catalogQuery: { category: "sendvich-zaglushki", diameter: "120:", steel_grade: "AISI 304", wall_thickness_mm: "0.8", outer_steel_grade: "AISI 430" } },
  { key: "passage-glass", label: "Проходной стакан", specification: "AISI 430 · 0,5 мм", quantity: 1, productSlug: "prohodnoy-stakan", matchLevel: "family", reviewNote: "В каталоге есть семейство, но исполнение AISI 430 0,5 мм не найдено." },
  { key: "sandwich-heavy", label: "Сэндвич-труба 1000 мм", specification: "Ø120/220 · AISI 304 0,8 мм / AISI 430", quantity: 2, productSlug: "sendvich-truba", article: "DT-SW50-19-00-D120-220", matchLevel: "exact", catalogQuery: { category: "sendvich-truby", diameter: "120:", length_mm: "1000", steel_grade: "AISI 304", wall_thickness_mm: "0.8", outer_steel_grade: "AISI 430" } },
  { key: "sandwich-light", label: "Сэндвич-труба 1000 мм", specification: "Ø120/220 · AISI 304 0,5 мм / AISI 430", quantity: 1, productSlug: "sendvich-truba", article: "DT-SW50-17-00-D120-220", matchLevel: "exact", catalogQuery: { category: "sendvich-truby", diameter: "120:", length_mm: "1000", steel_grade: "AISI 304", wall_thickness_mm: "0.5", outer_steel_grade: "AISI 430" } },
  { key: "flange", label: "Фланец 600×700 под углом", specification: "AISI 430 · 0,5 мм", quantity: 1, productSlug: "flanets-dekorativnyy", matchLevel: "family", reviewNote: "Точного размера 600×700 в текущем каталоге нет; замену без проверки не подставляем." },
  { key: "roof-passage", label: "Устройство прохода кровли", specification: "Для Ø120 · AISI 430 · 0,5 мм", quantity: 1, productSlug: "prohodnoy-uzel-krovli-upk-do-45", article: "DT-UPK-430-D100-125", matchLevel: "review", reviewNote: "Исполнение AISI 430 найдено; толщина в карточке каталога не заполнена.", catalogQuery: { category: "uzly-prohoda-krovli", q: "УПК", steel_grade: "AISI 430" } },
  { key: "deflector", label: "Дефлектор-конус", specification: "Ø120/220 · AISI 304 0,5 мм / AISI 430", quantity: 1, productSlug: "sendvich-ogolovok-deflektor-konus", article: "DT-SW50-17-15-D120-220", matchLevel: "exact", catalogQuery: { category: "sendvich-ogolovki-i-deflektory", q: "Дефлектор-конус", diameter: "120:", steel_grade: "AISI 304", wall_thickness_mm: "0.5", outer_steel_grade: "AISI 430" } },
];

function mediaUrl(path: string | undefined, assetBasePath: string) {
  if (!path) return null;
  return path.startsWith("/media/") ? `${assetBasePath}${path}` : path;
}

export function StandardPechKit({ assetBasePath = "" }: { assetBasePath?: string }) {
  const [items, setItems] = useState<Record<string, ProductListItem>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const linkedLines = kitLines.filter((line) => line.catalogQuery && line.article);
    Promise.all(linkedLines.map(async (line) => {
      const params = new URLSearchParams({ limit: "24", offset: "0", ...line.catalogQuery });
      const response = await fetch(`${assetBasePath}/api/v1/products?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Catalog request failed: ${line.key}`);
      const payload = await response.json() as ProductListResponse;
      const item = payload.items.find((candidate) => candidate.selected_sku === line.article);
      return item ? [line.key, item] as const : null;
    })).then((entries) => {
      setItems(Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))));
      setStatus("ready");
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
    });
    return () => controller.abort();
  }, [assetBasePath]);

  const resolved = useMemo(() => kitLines.map((line) => ({ ...line, item: items[line.key] ?? null })), [items]);

  return (
    <section className={styles.section} aria-labelledby="standard-kit-title">
      <div className={styles.shell}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>Готовый комплект</p>
          <h2 id="standard-kit-title">Стандарт №1 для печи, Ø120 мм</h2>
          <p>Исходный состав и цена перенесены из предложения со старого сайта. Точные совпадения связаны с текущими товарами каталога; остальные позиции оставлены на проверку без автоматической замены.</p>
        </div>
        <div className={styles.layout}>
          <aside className={styles.priceCard}>
            <small>Цена готового комплекта</small>
            <strong>{formatRub(KIT_PRICE_RUB)}</strong>
            <span>9 позиций · 10 изделий</span>
            <p>Перед заказом менеджер подтвердит актуальность цены, состав и соответствие выбранной печи и объекту.</p>
          </aside>
          <div>
            <ul className={styles.list} aria-label="Состав готового комплекта Стандарт №1">
              {resolved.map((line) => {
                const imageUrl = mediaUrl(line.item?.primary_image?.thumbnail_url ?? line.item?.primary_image?.url, assetBasePath);
                const href = line.item
                  ? productSelectionPath(line.item.slug, line.item, line.item.selected_sku)
                  : `/product/${line.productSlug}`;
                return (
                  <li className={styles.line} key={line.key}>
                    <div className={styles.product}>
                      <span className={styles.thumb}>
                        {imageUrl ? <img alt={line.item?.primary_image?.alt ?? line.label} height="68" loading="lazy" src={imageUrl} width="68" /> : <PhotoOff aria-hidden size={20} />}
                      </span>
                      <div className={styles.copy}>
                        <h3>{line.label}</h3>
                        <p>{line.specification}</p>
                        <Link className={styles.catalogLink} href={href}>{line.item ? "Открыть товар" : "Открыть семейство"} <ArrowRight aria-hidden size={14} /></Link>
                      </div>
                    </div>
                    <div className={styles.meta}>
                      <strong>{line.quantity} шт.</strong>
                      {line.item?.price_rub ? <small>Каталог: {formatRub(Number(line.item.price_rub))}/шт.</small> : <small>Цена в составе комплекта</small>}
                      {line.matchLevel !== "exact" ? <small className={styles.review}>{line.reviewNote}</small> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {status === "loading" ? <p className={styles.status} role="status">Связываем позиции с каталогом…</p> : null}
            {status === "error" ? <p className={styles.status} role="status">Каталог временно недоступен. Исходный состав комплекта всё равно показан полностью.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
