"use client";

import { useRef, useState } from "react";
import type { QuickEstimateLead } from "@/lib/quickEstimateLead";
import { trackSolutionsCalculator } from "@/lib/solutionsCalculatorAnalytics";
import styles from "./HomeQuickEstimate.module.css";

export function EstimateCallbackRequest({ lead, source, onRequested }: {
  lead: QuickEstimateLead;
  source: string;
  onRequested: () => void;
}) {
  const sending = useRef(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  async function requestCallback() {
    if (sending.current || lead.callbackRequested) return;
    sending.current = true;
    setStatus("sending");
    setError("");
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const response = await fetch(`${base}/api/v1/leads/${lead.id}/callback`, {
        method: "POST", headers: { "X-Lead-Callback-Token": lead.callbackToken },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "callback_requested") {
        throw new Error("Не удалось отправить запрос. Попробуйте ещё раз.");
      }
      trackSolutionsCalculator("submit", { source });
      onRequested();
      setStatus("idle");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось отправить запрос.");
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  return <div className={styles.reviewRequest}>
    {lead.callbackRequested ? <p role="status"><strong>Запрос отправлен.</strong> Менеджер свяжется с вами по указанному контакту.</p> : <>
      <button className={styles.reviewButton} disabled={status === "sending"} onClick={() => void requestCallback()} type="button">
        {status === "sending" ? "Отправляем запрос…" : "Связаться со мной"}
      </button>
      <p>Контакт и расчёт уже сохранены. Нажмите кнопку, если хотите обсудить комплект с менеджером.</p>
    </>}
    {status === "error" ? <p className={styles.formError} role="alert">{error}</p> : null}
  </div>;
}
