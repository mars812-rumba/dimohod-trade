import Link from "next/link";
import type { ReadyKit } from "@/lib/readyKits";
import { kitPath, kitRub } from "@/lib/readyKits";
import styles from "./ReadyKit.module.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function ReadyKitCard({ kit }: { kit: ReadyKit }) {
  return <Link className={styles.card} href={kitPath(kit.slug)}>
    <img src={`${base}${kit.image_path}`} alt={kit.route === "roof" ? "Иллюстрация прохода через перекрытие и кровлю" : "Иллюстрация прохода через стену"} width={1254} height={1254} loading="lazy" />
    <div><h2>{kit.name}</h2><span>{kit.lines.length} позиций в составе</span><strong>{kitRub(kit.total_rub)}</strong><span>Состав и стоимость →</span></div>
  </Link>;
}
