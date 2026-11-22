"use client";

import Link from "next/link";
import { useState } from "react";
import { Circle, Layers3 } from "lucide-react";
import type { ReadyKitGroup } from "@/lib/readyKitGroups";
import { kitPath, kitRub } from "@/lib/readyKits";
import styles from "./ReadyKitGroups.module.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ReadyKitGroupCard({ group, catalogPreview = false }: { group: ReadyKitGroup; catalogPreview?: boolean }) {
  const [selectedSlug, setSelectedSlug] = useState(() => (group.variants.find(kit => kit.diameter_mm === 115) ?? group.variants[0])?.slug);
  const kit = group.variants.find(variant => variant.slug === selectedSlug) ?? group.variants[0];
  if (!kit) return null;
  const headingId = `kit-group-${group.key}`;
  return <article className={`${styles.card}${catalogPreview ? ` ${styles.catalogCard}` : ""}`} aria-labelledby={headingId} data-kit-group={group.key} data-catalog-pilot={catalogPreview || undefined}>
    <div className={styles.top}>
      <Link className={styles.media} href={kitPath(kit.slug)} aria-label={kit.name}>
        <img src={`${base}${kit.image_path}`} alt={group.route === "roof" ? "Иллюстрация прохода через перекрытие и кровлю" : "Иллюстрация прохода через стену"} width={1254} height={1254} loading="lazy" />
      </Link>
      <div className={styles.body}>
        <h2 id={headingId}><Link href={kitPath(kit.slug)}>{group.name}</Link></h2>
        <p className={styles.description} data-kit-description>{kit.description}</p>
      </div>
    </div>
    <p className={styles.steel} data-kit-steel><span className={styles.label}>{catalogPreview ? <Layers3 size={15} aria-hidden /> : null}Сталь сэндвича:</span>{" "}<span className={styles.steelValue}>{kit.sandwich_steel
      ? <>внутри {kit.sandwich_steel.inner}, снаружи {kit.sandwich_steel.outer}.</>
      : "уточните по спецификации."}</span></p>
    <div className={styles.parameters}>
      <p className={styles.label}>{catalogPreview ? <Circle size={15} aria-hidden /> : null}Диаметр, мм:</p>
      <nav className={styles.diameters} aria-label={`Диаметр: ${group.name}`}>
        {group.variants.map(variant => <Link key={variant.slug} href={kitPath(variant.slug)}
          aria-label={variant.name} aria-current={variant.slug === kit.slug ? "true" : undefined}
          onClick={event => {
            // Modified/middle clicks retain normal link behaviour, including new tabs.
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            setSelectedSlug(variant.slug);
          }}>Ø{variant.diameter_mm}</Link>)}
      </nav>
    </div>
    <div className={styles.price} aria-live="polite" aria-atomic="true">
      <strong data-kit-price>{kitRub(kit.total_rub)}</strong>
      <span data-kit-price-caption>за комплект Ø{kit.diameter_mm}</span>
    </div>
    <Link className={styles.open} data-kit-open href={kitPath(kit.slug)}>Схема и состав →</Link>
  </article>;
}
