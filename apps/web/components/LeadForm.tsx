"use client";

import { FormEvent, useState } from "react";
import {
  IconCircleCheck as CheckCircle2,
  IconPaperclip as Paperclip,
  IconSend as Send,
} from "@tabler/icons-react";
import { PersonalDataConsent } from "./PersonalDataConsent";

type LeadFormProps = {
  source: string;
  configuration?: string;
  compact?: boolean;
  title?: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function LeadForm({ source, configuration = "", compact = false, title }: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("source", source);
    data.set("configuration", configuration);

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/leads`, { method: "POST", body: data });
      const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
      if (!response.ok) throw new Error(payload?.detail ?? "Не удалось отправить заявку");
      form.reset();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось отправить заявку");
    }
  }

  if (status === "success") {
    return (
      <div className="lead-form-success" role="status">
        <CheckCircle2 size={24} />
        <div>
          <strong>Заявка принята</strong>
          <span>Специалист проверит материалы и свяжется с вами.</span>
        </div>
      </div>
    );
  }

  return (
    <form className={`lead-form${compact ? " lead-form-compact" : ""}`} onSubmit={submit}>
      {title ? <h3>{title}</h3> : null}
      <div className="lead-form-grid">
        <label>
          <span>Имя</span>
          <input name="name" autoComplete="name" minLength={2} maxLength={100} required />
        </label>
        <label>
          <span>Телефон</span>
          <input name="phone" type="tel" autoComplete="tel" placeholder="+7 999 000-00-00" required />
        </label>
      </div>
      <label>
        <span>Комментарий</span>
        <textarea name="comment" rows={compact ? 3 : 4} maxLength={2000} placeholder="Модель печи, размеры, удобное время для звонка" />
      </label>
      <div className="lead-form-footer">
        <label className="lead-file">
          <Paperclip size={16} />
          <span>Фото или план</span>
          <input name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
        </label>
        <button type="submit" disabled={status === "sending"}>
          <Send size={16} /> {status === "sending" ? "Отправляем…" : "Отправить инженеру"}
        </button>
      </div>
      <small className="lead-form-note">PDF, JPG, PNG или WebP до 10 МБ.</small>
      <PersonalDataConsent />
      {status === "error" ? <p className="lead-form-error" role="alert">{message}</p> : null}
    </form>
  );
}
