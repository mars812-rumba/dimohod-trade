"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { LeadForm } from "./LeadForm";
import kitStyles from "./ReadyKit.module.css";
import styles from "./ReadyKitCustomRequest.module.css";

export function ReadyKitCustomRequest() {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  return <section className={styles.section} aria-labelledby={`${id}-title`} data-kit-custom-request>
    <div>
      <h2 id={`${id}-title`}>Нужен другой диаметр, высота или маршрут?</h2>
      <p>Рассчитайте комплект под свою печь или передайте размеры специалисту</p>
    </div>
    <div className={styles.actions}>
      <Link className={`button ${styles.calculate}`} href="/bystryy-raschet">Рассчитать в калькуляторе</Link>
      <button className={styles.request} type="button" aria-haspopup="dialog" aria-controls={`${id}-dialog`}
        onClick={() => dialog.current?.showModal()}>Заказать индивидуальный расчёт</button>
    </div>
    <dialog id={`${id}-dialog`} ref={dialog} className={kitStyles.dialog} aria-labelledby={`${id}-form-title`}>
      <button type="button" className={kitStyles.close} aria-label="Закрыть форму" onClick={() => dialog.current?.close()}>×</button>
      <h2 id={`${id}-form-title`}>Индивидуальный расчёт комплекта</h2>
      <LeadForm source="Готовые комплекты" compact commentPlaceholder="Модель печи, нужный диаметр, высота и маршрут. Укажите известные размеры."
        submitLabel="Заказать индивидуальный расчёт" />
    </dialog>
  </section>;
}
