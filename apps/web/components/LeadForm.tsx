"use client";

import { FormEvent, useId, useState } from "react";
import { CheckCircle2, Paperclip, Send } from "lucide-react";
import { METRIKA_GOALS, reachMetrikaGoal } from "@/lib/metrika";
import { PersonalDataConsent } from "./PersonalDataConsent";
import { PhoneContactFields } from "./PhoneContactFields";
import { quickEstimateContact } from "@/lib/quickEstimateLead";

type LeadFormProps = {
  source: string;
  configuration?: string;
  compact?: boolean;
  title?: string;
  commentPlaceholder?: string;
  attachmentLabel?: string;
  submitLabel?: string;
  successMessage?: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function LeadForm({
  source,
  configuration = "",
  compact = false,
  title,
  commentPlaceholder = "Модель печи, размеры, удобное время для звонка",
  attachmentLabel = "Фото или план",
  submitLabel = "Оставить заявку",
  successMessage = "Менеджер свяжется с вами выбранным способом и уточнит данные для подбора.",
}: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const attachmentHelpId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const contact = quickEstimateContact(String(data.get("contact") ?? ""), data.get("contact_method"));
    if (!contact) {
      setStatus("error");
      setMessage("Проверьте номер телефона для выбранного способа связи.");
      return;
    }
    data.set("contact", contact.value);
    data.set("contact_method", contact.method);
    data.set("source", source);
    data.set(
      "configuration",
      [configuration.trim(), `Страница заявки: ${window.location.href}`].filter(Boolean).join("\n\n"),
    );

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/leads`, { method: "POST", body: data });
      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) throw new Error(payload?.detail ?? "Не удалось отправить заявку");
      form.reset();
      setAttachmentName("");
      setStatus("success");
      reachMetrikaGoal(METRIKA_GOALS.leadSubmitted, {
        source,
        path: window.location.pathname,
      });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось отправить заявку");
    }
  }

  if (status === "success") {
    return (
      <div className="lead-form-success" role="status">
        <CheckCircle2 aria-hidden size={24} />
        <div>
          <strong>Заявка принята</strong>
          <span>{successMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <form
      aria-busy={status === "sending"}
      className={`lead-form${compact ? " lead-form-compact" : ""}`}
      onSubmit={submit}
    >
      {title ? <h3>{title}</h3> : null}
      <label>
        <span>Имя</span>
        <input name="name" autoComplete="name" minLength={2} maxLength={100} required />
      </label>
      <PhoneContactFields disabled={status === "sending"} />
      <label>
        <span>Комментарий — необязательно</span>
        <textarea
          name="comment"
          rows={compact ? 3 : 4}
          maxLength={2000}
          placeholder={commentPlaceholder}
        />
      </label>
      <div className="lead-form-footer">
        <label className="lead-file">
          <Paperclip aria-hidden size={16} />
          <span>{attachmentName ? `Прикреплено: ${attachmentName}` : `${attachmentLabel} — необязательно`}</span>
          <input
            name="attachment"
            type="file"
            aria-describedby={attachmentHelpId}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => setAttachmentName(event.currentTarget.files?.[0]?.name ?? "")}
          />
        </label>
        <button type="submit" disabled={status === "sending"}>
          <Send aria-hidden size={16} /> {status === "sending" ? "Отправляем…" : submitLabel}
        </button>
      </div>
      <small className="lead-form-note" id={attachmentHelpId}>Заявку можно отправить без вложений. Фото, план или паспорт помогут менеджеру проверить данные и уточнить комплект. Принимаем PDF, JPG, PNG и WebP до 10 МБ.</small>
      <PersonalDataConsent />
      {status === "error" ? <p className="lead-form-error" role="alert">{message}</p> : null}
    </form>
  );
}
