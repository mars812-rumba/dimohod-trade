"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReadyKit } from "@/lib/readyKits";
import { kitPath } from "@/lib/readyKits";
import { LeadForm } from "./LeadForm";
import styles from "./ReadyKit.module.css";

type Option = Pick<ReadyKit, "slug" | "route" | "height_m" | "diameter_mm">;

export function ReadyKitSelectors({ kit, variants }: { kit: Option; variants: Option[] }) {
  const router = useRouter();
  const available = variants.filter(item => item.route === kit.route);
  const heights = [...new Set(available.map(item => item.height_m))].sort((a, b) => a - b);
  const diameters = [...new Set(available.filter(item => item.height_m === kit.height_m).map(item => item.diameter_mm))].sort((a, b) => a - b);
  function heightChange(value: number) {
    const next = available.find(item => item.height_m === value && item.diameter_mm === kit.diameter_mm);
    if (next) router.push(kitPath(next.slug));
  }
  return <div className={styles.selectors}>
    <label>Высота комплекта
      <select aria-label="Высота комплекта" value={kit.height_m} onChange={event => heightChange(Number(event.target.value))}>
        {heights.map(height => <option key={height} value={height} disabled={!available.some(item => item.height_m === height && item.diameter_mm === kit.diameter_mm)}>{height} м</option>)}
      </select>
    </label>
    <label>Диаметр
      <select aria-label="Диаметр комплекта" value={kit.diameter_mm} onChange={event => {
        const next = available.find(item => item.height_m === kit.height_m && item.diameter_mm === Number(event.target.value));
        if (next) router.push(kitPath(next.slug));
      }}>
        {diameters.map(diameter => <option key={diameter} value={diameter}>Ø{diameter} мм</option>)}
      </select>
    </label>
  </div>;
}

export function ReadyKitInquiry({ name, configuration, priced }: { name: string; configuration: string; priced: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [intent, setIntent] = useState<"order" | "consultation">("order");
  function open(value: typeof intent) { setIntent(value); dialog.current?.showModal(); }
  return <>
    <div className={styles.actions}>
      <button className={styles.primary} disabled={!priced} onClick={() => open("order")}>Заказать комплект</button>
      <button className={styles.secondary} onClick={() => open("consultation")}>Проконсультироваться</button>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="kit-inquiry-title">
      <button className={styles.close} aria-label="Закрыть форму" onClick={() => dialog.current?.close()}>×</button>
      <h2 id="kit-inquiry-title">{intent === "order" ? "Заказать комплект" : "Консультация по комплекту"}</h2>
      <p>{name}</p>
      <LeadForm key={intent} compact source={`ready-kit-${intent}`} configuration={configuration}
        submitLabel={intent === "order" ? "Отправить заявку на комплект" : "Запросить консультацию"}
        successMessage="Заявка принята. Менеджер свяжется с вами и уточнит условия заказа." />
    </dialog>
  </>;
}
