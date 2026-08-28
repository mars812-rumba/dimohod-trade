"use client";

import Link from "next/link";
import { FormEvent, useId, useRef, useState } from "react";
import {
  IconCheck as Check,
  IconMailForward as MailForward,
  IconSend as Send,
  IconX as X,
} from "@tabler/icons-react";
import type { ChimneyEstimate } from "@/lib/chimneyEstimate";
import { chimneyEstimateText } from "@/lib/chimneyEstimate";
import { createChimneyEstimatePdfBlob } from "@/lib/chimneyEstimatePdf";
import { PersonalDataConsent } from "./PersonalDataConsent";

type ContactMethod = "phone" | "whatsapp" | "telegram" | "email";

type EstimateLeadDialogProps = {
  buttonLabel?: string;
  description?: string;
  disabled?: boolean;
  estimate: ChimneyEstimate;
  heading?: string;
  onSubmitted?: () => void;
  source?: string;
  submitLabel?: string;
  triggerClassName?: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const contactDetails: Record<
  ContactMethod,
  { label: string; placeholder: string; type: "email" | "tel" | "text"; autoComplete: string }
> = {
  phone: {
    label: "Номер телефона",
    placeholder: "+7 999 000-00-00",
    type: "tel",
    autoComplete: "tel",
  },
  whatsapp: {
    label: "Номер WhatsApp",
    placeholder: "+7 999 000-00-00",
    type: "tel",
    autoComplete: "tel",
  },
  telegram: {
    label: "Имя пользователя Telegram",
    placeholder: "@username",
    type: "text",
    autoComplete: "off",
  },
  email: {
    label: "Электронная почта",
    placeholder: "name@example.com",
    type: "email",
    autoComplete: "email",
  },
};

function responseError(payload: unknown): string {
  if (!payload || typeof payload !== "object" || !("detail" in payload)) {
    return "Не удалось отправить расчёт. Попробуйте ещё раз.";
  }
  const detail = payload.detail;
  if (typeof detail === "string") return detail;
  return "Проверьте заполненные поля и попробуйте ещё раз.";
}

export function EstimateLeadDialog({
  buttonLabel = "Отправить менеджеру",
  description = "Приложим текущую PDF-смету к заявке. Менеджер проверит состав и свяжется с вами в течение 30 минут.",
  disabled = false,
  estimate,
  heading = "Отправить BOM менеджеру",
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
  const [contactMethod, setContactMethod] = useState<ContactMethod>("phone");
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
      const currentEstimate = { ...estimate, generatedAt: new Date() };
      const pdf = await createChimneyEstimatePdfBlob(currentEstimate);
      const data = new FormData(form);
      data.set("source", source);
      data.set(
        "configuration",
        `${chimneyEstimateText(currentEstimate)}\n\nСтраница расчёта: ${window.location.href}`.slice(0, 12000),
      );
      data.set(
        "estimate_json",
        JSON.stringify({
          schemaVersion: 1,
          ...currentEstimate,
          generatedAt: currentEstimate.generatedAt.toISOString(),
          sourceUrl: window.location.href,
        }),
      );
      data.set("attachment", pdf, "predvaritelnaya-smeta-dymohoda.pdf");

      const response = await fetch(`${apiBaseUrl}/api/v1/leads`, {
        method: "POST",
        body: data,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseError(payload));
      form.reset();
      setContactMethod("phone");
      const emailStatus = payload && typeof payload === "object" && "email_status" in payload
        ? payload.email_status
        : null;
      setStatus(emailStatus === "sent" ? "success" : "saved");
      onSubmitted?.();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось отправить расчёт.");
    }
  }

  const contactDetail = contactDetails[contactMethod];

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
        className="estimate-lead-dialog"
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
                    ? "Менеджер свяжется с вами в течение 30 минут по указанному способу связи."
                    : "Письмо менеджеру сейчас не отправилось. Чтобы не ждать, позвоните по номеру +7 (965) 075-65-55."}
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

                <label>
                  <span>Как с вами связаться?</span>
                  <select
                    name="contact_method"
                    onChange={(event) => setContactMethod(event.target.value as ContactMethod)}
                    value={contactMethod}
                  >
                    <option value="phone">Телефон</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="email">Email</option>
                  </select>
                </label>

                <label>
                  <span>{contactDetail.label}</span>
                  <input
                    autoComplete={contactDetail.autoComplete}
                    key={contactMethod}
                    maxLength={160}
                    name="contact"
                    placeholder={contactDetail.placeholder}
                    required
                    type={contactDetail.type}
                  />
                </label>

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
                    PDF получит менеджер. При выборе email копия придёт и вам. Контакты компании — в{" "}
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
