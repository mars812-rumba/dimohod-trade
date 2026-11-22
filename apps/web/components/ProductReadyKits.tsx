import Link from "next/link";
import { Package } from "lucide-react";
import type { ProductReadyKitLink } from "@/lib/productReadyKits";
import styles from "./ProductReadyKits.module.css";

export function ProductReadyKits({ links }: { links: readonly ProductReadyKitLink[] }) {
  if (!links.length) return null;
  return <section className={styles.section} aria-labelledby="product-ready-kits-title" data-product-ready-kits>
    <h3 id="product-ready-kits-title" className="product-copy-heading">
      <span className="product-copy-heading-icon" aria-hidden="true"><Package size={17} strokeWidth={2} /></span>
      <span>Входит в готовые комплекты</span>
    </h3>
    <ul className={styles.links}>
      {links.map(link => <li key={link.href}><Link href={link.href} prefetch={false}>{link.label}</Link></li>)}
    </ul>
  </section>;
}
