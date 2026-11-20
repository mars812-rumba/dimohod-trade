import Link from "next/link";
import type { ReadyKit } from "@/lib/readyKits";
import { kitPath, kitRub } from "@/lib/readyKits";
import { readyKitRecommendations, recommendationName } from "@/lib/readyKitRecommendations";
import styles from "./ReadyKitRecommendations.module.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ReadyKitRecommendations({ kit, variants }: { kit: ReadyKit; variants: ReadyKit[] }) {
  const recommendations = readyKitRecommendations(kit, variants);
  if (!recommendations.length) return null;
  return <section id="related" className={styles.section} aria-labelledby="kit-related-title" data-kit-recommendations>
    <h2 id="kit-related-title">Другие комплекты Ø{kit.diameter_mm} мм</h2>
    <ul className={styles.track} data-kit-recommendation-track>
      {recommendations.map(item => <li key={item.slug}>
        <Link className={styles.card} href={kitPath(item.slug)} data-kit-recommendation>
          <img src={`${base}${item.image_path}`} alt={`Иллюстрация: ${recommendationName(item).toLowerCase()}`}
            width={1254} height={1254} loading="lazy" />
          <h3>{recommendationName(item)}</h3>
          <span>Ø{item.diameter_mm} мм</span>
          <strong>{kitRub(item.total_rub)}</strong>
        </Link>
      </li>)}
    </ul>
  </section>;
}
