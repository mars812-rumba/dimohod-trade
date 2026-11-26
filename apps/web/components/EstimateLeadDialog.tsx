"use client";

import Link from "next/link";
import { FormEvent, useId, useRef, useState } from "react";
import {
  IconCheck as Check,
  IconMailForward as MailForward,
  IconSend as Send,
  IconX as X,
} from "@tabler/icons-react";
import type { ChimneyEstimate, ChimneyEstimateCustomer } from "@/lib/chimneyEstimate";
import { chimneyEstimateLeadPayload, chimneyEstimateText } from "@/lib/chimneyEstimate";
import { createChimneyEstimatePdfBlob } from "@/lib/chimneyEstimatePdf";
import { METRIKA_GOALS, reachMetrikaGoal, type MetrikaGoal } from "@/lib/metrika";
import { PersonalDataConsent } from "./PersonalDataConsent";
import { PhoneContactFields } from "./PhoneContactFields";
import { isQuickEstimateLead, quickEstimateContact, type QuickEstimateLead } from "@/lib/quickEstimateLead";

type EstimateLeadDialogProps = {
  buttonLabel?: string;
  description?: string;
  disabled?: boolean;
  estimate: ChimneyEstimate;
  heading?: string;
  inline?: boolean;
  intent?: "manager_review" | "estimate_access";
  reviewMode?: boolean;
  metrikaGoal?: MetrikaGoal;
  onSubmitted?: (customer: ChimneyEstimateCustomer, lead?: QuickEstimateLead) => void;
  source?: string;
  submitLabel?: string;
  triggerClassName?: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const PDF_ATTACHMENT_TIMEOUT_MS = 4000;

function responseError(payload: unknown): string {
  if (!payload || typeof payload !== "object" || !("detail" in payload)) {
    return "Не удалось отправить расчёт. Попробуйте ещё раз.";
  }
  const detail = payload.detail;
  if (typeof detail === "string") return detail;
  return "Проверьте заполненные поля и попробуйте ещё раз.";
}

async function createOptionalPdfAttachment(estimate: ChimneyEstimate): Promise<Blob | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      createChimneyEstimatePdfBlob(estimate).catch(() => null),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), PDF_ATTACHMENT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function EstimateLeadDialog({
  buttonLabel = "Отправить менеджеру",
  description = "Приложим текущую PDF-смету к заявке. Менеджер проверит состав и свяжется с вами в течение 30 минут.",
  disabled = false,
  estimate,
  heading = "Отправить расчёт менеджеру",
  inline = false,
  intent = "manager_review",
  reviewMode = false,
  metrikaGoal = METRIKA_GOALS.deepMeasurementFormSent,
  onSubmitted,
  source = "chimney-estimate",
  submitLabel = "Отправить расчёт",
  triggerClassName = "configurator-estimate-send",
}: EstimateLeadDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const open = () => {
    setStatus("idle");
    setMessage("");
    dialogRef.current?.showModal();
    window.requestAnimationFrame(() => nameRef.current?.focus());
  };

  const close = () => dialogRef.current?.close();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;

    try {
      const data = new FormData(form);
      const contact = quickEstimateContact(String(data.get("contact") ?? ""), data.get("contact_method"));
      if (!contact) throw new Error("Проверьте номер телефона для выбранного способа связи.");
      data.set("contact", contact.value);
      data.set("contact_method", contact.method);
      const customer: ChimneyEstimateCustomer = {
        name: String(data.get("name") ?? "").trim(),
        contactMethod: contact.method,
        contact: contact.value,
      };
      const currentEstimate = { ...estimate, customer, generatedAt: new Date() };
      data.set("source", source);
      data.set("intent", intent);
      data.set(
        "configuration",
        `${chimneyEstimateText(currentEstimate)}\n\nСтраница расчёта: ${window.location.href}`.slice(0, 12000),
      );
      data.set(
        "estimate_json",
        JSON.stringify(chimneyEstimateLeadPayload(currentEstimate, window.location.href)),
      );
      const pdf = await createOptionalPdfAttachment(currentEstimate);
      if (pdf) data.set("attachment", pdf, "predvaritelnaya-smeta-dymohoda.pdf");

      const response = await fetch(`${apiBaseUrl}/api/v1/leads`, {
        method: "POST",
        body: data,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status !== "accepted") throw new Error(responseError(payload));
      const lead = {
        id: payload?.id, callbackToken: payload?.callback_token, customer, callbackRequested: false,
      };
      if (intent === "estimate_access" && !isQuickEstimateLead(lead)) {
        throw new Error("Не удалось подтвердить сохранение контакта. Попробуйте ещё раз.");
      }
      form.reset();
      const emailStatus = payload && typeof payload === "object" && "email_status" in payload
        ? payload.email_status
        : null;
      setStatus(emailStatus === "sent" ? "success" : "saved");
      const goalParams = { source, path: window.location.pathname };
      reachMetrikaGoal(METRIKA_GOALS.leadSubmitted, goalParams);
      reachMetrikaGoal(metrikaGoal, goalParams);
      onSubmitted?.(customer, intent === "estimate_access" ? lead : undefined);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось отправить расчёт.");
    }
  }

  if (inline) {
    if (status === "success" || status === "saved") {
      return (
        <div className="estimate-lead-inline-success" data-delivery={status} role="status">
          <Check aria-hidden size={22} />
          <p>Контакты отправлены. Открываем предварительную стоимость и состав комплекта.</p>
        </div>
      );
    }

    return (
      <div className="estimate-lead-inline" aria-labelledby={titleId}>
        <div className="estimate-lead-dialog-heading">
          <h4 id={titleId}>{heading}</h4>
          <p id={descriptionId}>{description}</p>
        </div>
        <form
          aria-busy={status === "sending"}
          aria-describedby={status === "error" ? errorId : descriptionId}
          className="estimate-lead-form estimate-lead-form-inline"
          onSubmit={submit}
        >
          <label>
            <span>Имя</span>
            <input autoComplete="name" maxLength={100} minLength={2} name="name" ref={nameRef} required />
          </label>
          <PhoneContactFields describedBy={status === "error" ? errorId : undefined} disabled={status === "sending"} />
          <label aria-hidden="true" className="estimate-lead-honeypot">
            <span>Сайт</span>
            <input autoComplete="off" name="website" tabIndex={-1} />
          </label>
          <PersonalDataConsent />
          {status === "error" ? (
            <p className="estimate-lead-error" id={errorId} role="alert">{message}</p>
          ) : null}
          <div className="estimate-lead-actions estimate-lead-inline-actions">
            <button disabled={disabled || status === "sending"} type="submit">
              <Send aria-hidden size={17} />
              {status === "sending" ? "Отправляем расчёт…" : submitLabel}
            </button>
            <small>{intent === "estimate_access"
              ? "После сохранения контакта покажем стоимость и состав. Чтобы попросить менеджера связаться, нажмите «Связаться со мной» под сметой."
              : "После отправки сразу покажем предварительную стоимость и состав. Менеджер получит расчёт для проверки."}</small>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <button
        className={triggerClassName}
        disabled={disabled}
        onClick={open}
        ref={triggerRef}
        type="button"
      >
        <MailForward aria-hidden size={17} />
        {buttonLabel}
      </button>

      <dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className={`estimate-lead-dialog${reviewMode ? " estimate-lead-dialog-review" : ""}`}
        onCancel={(event) => {
          if (status === "sending") event.preventDefault();
        }}
        onClose={() => triggerRef.current?.focus()}
        ref={dialogRef}
      >
        <div className="estimate-lead-dialog-card">
          <button
            aria-label="Закрыть форму"
            className="estimate-lead-dialog-close"
            disabled={status === "sending"}
            onClick={close}
            type="button"
          >
            <X aria-hidden size={21} />
          </button>

          {status === "success" || status === "saved" ? (
            <div className="estimate-lead-success" data-delivery={status} role="status">
              <span aria-hidden><Check size={24} /></span>
              <div>
                <h2 id={titleId}>{status === "success" ? "Спасибо! Расчёт отправлен" : "Заявка сохранена"}</h2>
                <p id={descriptionId}>
                  {status === "success"
                    ? "Менеджер проверит расчёт и свяжется с вами по указанному способу связи."
                    : "Письмо менеджеру сейчас не отправилось. Чтобы не ждать, позвоните по номеру +7 (964) 342-45-65."}
                </p>
                <button onClick={close} type="button">Закрыть</button>
              </div>
            </div>
          ) : (
            <>
              <div className="estimate-lead-dialog-heading">
                <span>Расчёт комплекта</span>
                <h2 id={titleId}>{heading}</h2>
                <p id={descriptionId}>
                  {description}
                </p>
              </div>

              <form
                aria-busy={status === "sending"}
                aria-describedby={status === "error" ? errorId : undefined}
                className="estimate-lead-form"
                onSubmit={submit}
              >
                <label>
                  <span>Имя</span>
                  <input autoComplete="name" maxLength={100} minLength={2} name="name" ref={nameRef} required />
                </label>

                <PhoneContactFields describedBy={status === "error" ? errorId : undefined} disabled={status === "sending"} />

                <label>
                  <span>Комментарий <small>необязательно</small></span>
                  <textarea
                    maxLength={2000}
                    name="comment"
                    placeholder="Например, удобное время для связи"
                    rows={3}
                  />
                </label>

                <label aria-hidden="true" className="estimate-lead-honeypot">
                  <span>Сайт</span>
                  <input autoComplete="off" name="website" tabIndex={-1} />
                </label>

                <PersonalDataConsent />

                {status === "error" ? (
                  <p className="estimate-lead-error" id={errorId} role="alert">{message}</p>
                ) : null}

                <div className="estimate-lead-actions">
                  <button disabled={status === "sending"} type="submit">
                    <Send aria-hidden size={17} />
                    {status === "sending" ? "Формируем и отправляем…" : submitLabel}
                  </button>
                  <small>
                    PDF получит менеджер. Контакты компании — в{" "}
                    <Link href="/privacy" target="_blank">Политике</Link>.
                  </small>
                </div>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
