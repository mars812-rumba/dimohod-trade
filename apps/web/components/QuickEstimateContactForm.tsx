"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { IconArrowRight as ArrowRight } from "@tabler/icons-react";
import { chimneyEstimateLeadPayload, type ChimneyEstimate } from "@/lib/chimneyEstimate";
import { METRIKA_GOALS, reachMetrikaGoal } from "@/lib/metrika";
import { isQuickEstimateLead, quickEstimateContact, type QuickEstimateLead } from "@/lib/quickEstimateLead";
import { PersonalDataConsent } from "./PersonalDataConsent";
import styles from "./HomeQuickEstimate.module.css";

export function QuickEstimateContactForm({ estimate, source, apiBaseUrl, disabled, onSubmitted }: {
  estimate: ChimneyEstimate;
  source: string;
  apiBaseUrl: string;
  disabled: boolean;
  onSubmitted: (lead: QuickEstimateLead) => void;
}) {
  const contactId = useId();
  const errorId = useId();
  const mounted = useRef(true);
  const sending = useRef(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || sending.current) return;
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
      data.set("contact", contact.value);
      data.set("contact_method", contact.method);
      data.set("source", source);
      data.set("intent", "estimate_access");
      data.set("estimate_json", JSON.stringify(chimneyEstimateLeadPayload(estimate, window.location.href)));
      const response = await fetch(`${apiBaseUrl}/api/v1/leads`, { method: "POST", body: data });
      const payload = await response.json().catch(() => null);
      const lead = {
        id: payload?.id,
        callbackToken: payload?.callback_token,
        callbackRequested: false,
        customer: { name: "", contactMethod: contact.method, contact: contact.value },
      };
      if (!response.ok || payload?.status !== "accepted" || !isQuickEstimateLead(lead)) {
        throw new Error(typeof payload?.detail === "string" ? payload.detail : "Не удалось сохранить контакт. Попробуйте ещё раз.");
      }
      if (!mounted.current) return;
      const details = { source, path: window.location.pathname };
      reachMetrikaGoal(METRIKA_GOALS.leadSubmitted, details);
      reachMetrikaGoal(METRIKA_GOALS.quickEstimateContactSent, details);
      onSubmitted(lead);
    } catch (error) {
      if (!mounted.current) return;
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить контакт.");
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  return <form className={styles.leadGate} onSubmit={submit} aria-busy={status === "sending"}>
    <label className={styles.field} htmlFor={contactId}>
      Телефон или Telegram
      <input aria-describedby={status === "error" ? errorId : undefined} autoComplete="off"
        id={contactId} maxLength={160} name="contact" placeholder="+7 999 000-00-00 или @username" required type="text" />
    </label>
    <label aria-hidden="true" className="estimate-lead-honeypot">
      Сайт<input autoComplete="off" name="website" tabIndex={-1} />
    </label>
    <PersonalDataConsent />
    {status === "error" ? <p className={styles.formError} id={errorId} role="alert">{message}</p> : null}
    <button className={styles.gateButton} disabled={disabled || status === "sending"} type="submit">
      {status === "sending" ? "Сохраняем контакт…" : "Получить расчёт"}<ArrowRight aria-hidden size={18} />
    </button>
    <small>Сразу покажем состав комплекта и предварительную стоимость. Если захотите обсудить заказ, нажмите «Связаться со мной» под сметой.</small>
  </form>;
}
