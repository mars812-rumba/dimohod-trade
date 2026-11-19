"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReadyKitGroup } from "@/lib/readyKitGroups";
import { kitPath, kitRub } from "@/lib/readyKits";
import cardStyles from "./ReadyKit.module.css";
import styles from "./ReadyKitGroups.module.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ReadyKitGroupCard({ group }: { group: ReadyKitGroup }) {
  const [selectedSlug, setSelectedSlug] = useState(() => (group.variants.find(kit => kit.diameter_mm === 115) ?? group.variants[0])?.slug);
  const kit = group.variants.find(variant => variant.slug === selectedSlug) ?? group.variants[0];
  if (!kit) return null;
  const headingId = `kit-group-${group.key}`;
  return <article className={`${cardStyles.card} ${styles.card}`} aria-labelledby={headingId} data-kit-group={group.key}>
    <Link href={kitPath(kit.slug)} aria-label={kit.name}>
      <img src={`${base}${kit.image_path}`} alt={group.route === "roof" ? "Иллюстрация прохода через перекрытие и кровлю" : "Иллюстрация прохода через стену"} width={1254} height={1254} loading="lazy" />
    </Link>
    <div className={styles.body}>
      <h2 id={headingId}><Link href={kitPath(kit.slug)}>{group.name}</Link></h2>
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
      <div aria-live="polite" aria-atomic="true">
        <span data-kit-count>{kit.line_count} позиций в составе</span>
        <strong data-kit-price>{kitRub(kit.total_rub)}</strong>
      </div>
      <Link className={styles.open} data-kit-open href={kitPath(kit.slug)}>Состав и стоимость →</Link>
    </div>
  </article>;
}
