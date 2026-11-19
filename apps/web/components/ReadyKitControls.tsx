"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReadyKit } from "@/lib/readyKits";
import { kitPath, readyKitEstimate } from "@/lib/readyKits";
import { Download } from "lucide-react";
import { quickEstimateContact } from "@/lib/quickEstimateLead";
import { METRIKA_GOALS, reachMetrikaGoal } from "@/lib/metrika";
import { PersonalDataConsent } from "./PersonalDataConsent";
import styles from "./ReadyKit.module.css";

type Option = Pick<ReadyKit, "slug" | "route" | "height_m" | "diameter_mm">;

export function ReadyKitPdf({ kit }: { kit: ReadyKit }) {
  const busy = useRef(false);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  async function download() {
    if (busy.current) return;
    busy.current = true;
    setStatus("working");
    try {
      const { downloadChimneyEstimatePdf } = await import("@/lib/chimneyEstimatePdf");
      await downloadChimneyEstimatePdf(readyKitEstimate(kit));
      setStatus("idle");
    } catch { setStatus("error"); }
    finally { busy.current = false; }
  }
  return <div className={styles.pdfDownload}>
    <button className={styles.secondary} type="button" disabled={status === "working"} onClick={() => void download()}>
      <Download aria-hidden size={17} />{status === "working" ? "Готовим PDF…" : "Скачать спецификацию PDF"}
    </button>
    {status === "error" ? <p role="alert">Не удалось подготовить PDF. Попробуйте ещё раз.</p> : null}
  </div>;
}

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

function ReadyKitContactForm({ slug, intent }: { slug: string; intent: "order" | "consultation" }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const sending = useRef(false);
  const errorId = useId();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const data = new FormData(event.currentTarget);
    const contact = quickEstimateContact(String(data.get("contact") ?? ""));
    if (!contact) {
      setStatus("error");
      setMessage("Укажите номер телефона или Telegram в формате @username.");
      return;
    }
    if (data.get("personal_data_consent") !== "true") return;
    sending.current = true;
    setStatus("sending");
    setMessage("");
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const response = await fetch(`${api}/api/v1/ready-kits/${encodeURIComponent(slug)}/inquiry`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_method: contact.method, contact: contact.value, intent,
          personal_data_consent: true, consent_version: data.get("consent_version"),
          website: data.get("website") ?? "" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "accepted" || !/^[a-f0-9]{32}$/.test(payload?.id ?? "")) {
        throw new Error(typeof payload?.detail === "string" ? payload.detail : "Не удалось отправить заявку. Попробуйте ещё раз.");
      }
      setStatus("success");
      reachMetrikaGoal(METRIKA_GOALS.leadSubmitted, { source: `ready-kit-${intent}`, path: window.location.pathname });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось отправить заявку.");
    } finally {
      sending.current = false;
    }
  }
  if (status === "success") return <div role="status" className="lead-form-success">
    <div><strong>Заявка принята</strong><span>Менеджер свяжется с вами по указанному контакту и уточнит условия заказа.</span></div>
  </div>;
  return <form className="lead-form lead-form-compact" onSubmit={submit} aria-busy={status === "sending"}>
    <label><span>Телефон или Telegram</span>
      <input name="contact" type="text" autoComplete="off" required maxLength={160}
        placeholder="+7 999 000-00-00 или @username" aria-describedby={status === "error" ? errorId : undefined} />
    </label>
    <label aria-hidden="true" className="estimate-lead-honeypot">Сайт<input name="website" autoComplete="off" tabIndex={-1} /></label>
    <PersonalDataConsent />
    {status === "error" ? <p id={errorId} className="lead-form-error" role="alert">{message}</p> : null}
    <button className={styles.primary} type="submit" disabled={status === "sending"}>
      {status === "sending" ? "Отправляем…" : intent === "order" ? "Отправить заявку на комплект" : "Запросить консультацию"}
    </button>
    <small>Сохраним выбранный комплект и его состав для менеджера. Наличие и окончательные условия заказа уточняются при общении.</small>
  </form>;
}

export function ReadyKitInquiry({ name, slug, priced }: { name: string; slug: string; priced: boolean }) {
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
      <ReadyKitContactForm key={`${slug}-${intent}`} slug={slug} intent={intent} />
    </dialog>
  </>;
}
