import Link from "next/link";
import { Circle, CircleDot, Cylinder, Hash, Layers3, Ruler } from "lucide-react";
import type { ReadyKitLine } from "@/lib/readyKits";
import { productSelectionPath } from "@/lib/productUrls";
import { ReadyKitThumbnail } from "./ReadyKitThumbnail";
import styles from "./ReadyKit.module.css";

const groupIcons = { general: Ruler, inner: Cylinder, insulation: Layers3, outer: CircleDot };
const fieldIcons: Record<string, typeof Ruler> = { diameter: Circle, length: Ruler, thickness: Layers3, insulation: Layers3 };

export function ReadyKitLineDetails({ line }: { line: ReadyKitLine }) {
  const href = productSelectionPath(line.product_slug, line, line.article);
  const groups = (line.characteristic_groups ?? []).filter(group => group.fields.length);
  const brief = line.characteristics.length ? line.characteristics.join(" · ")
    : groups.flatMap(group => group.fields.map(field => `${field.label}: ${field.value}`)).join(" · ");
  return <div className={styles.item}>
    <div className={styles.itemHead}>
      <ReadyKitThumbnail key={line.sku_id} image={line.primary_image} href={href} name={line.label} />
      <div className={styles.itemName}>
        <Link href={href}>{line.label}</Link>
        <small className={styles.article}><Hash aria-hidden size={13} /><span>Арт. {line.article}</span></small>
        {brief ? <p className={styles.itemSummary} data-spec-summary>{brief}</p> : null}
      </div>
    </div>
    <details className={styles.itemDisclosure}>
      <summary>Все характеристики<span className={styles.srOnly}>: {line.label}, арт. {line.article}</span></summary>
      {line.sku_name ? <p className={styles.itemFullName}>{line.sku_name}</p> : null}
      <div className={styles.itemGroups}>
      {groups.map(group => {
        const Icon = groupIcons[group.kind];
        return <section key={group.kind} className={styles.itemGroup} data-spec-group={group.kind} aria-label={group.title}>
          <h3><Icon aria-hidden size={15} />{group.title}</h3>
          <dl>{group.fields.map(field => {
            const FieldIcon = fieldIcons[field.key];
            return <div key={field.key}><dt>{FieldIcon ? <FieldIcon aria-hidden size={12} /> : null}{field.label}</dt><dd>{field.value}</dd></div>;
          })}</dl>
        </section>;
      })}
      </div>
      {line.characteristics.length ? <p className={styles.itemFullName}>{line.characteristics.join(" · ")}</p> : null}
    </details>
  </div>;
}
