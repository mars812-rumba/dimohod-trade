"use client";

import { Pencil } from "lucide-react";
import { useId, useRef, useState } from "react";
import styles from "./AdminCustomerManager.module.css";

export function CustomerNameEditor({ customerId, name, onSaved }: {
  customerId: string;
  name: string;
  onSaved: (name: string, updatedAt: string) => void;
}) {
  const id = useId();
  const sending = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [expectedName, setExpectedName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function cancel() {
    if (sending.current) return;
    setEditing(false);
    setError("");
  }

  async function save() {
    if (sending.current) return;
    sending.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const response = await fetch(`${base}/api/v1/admin/customers/${customerId}/name`, {
        method: "PATCH", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.trim(), expected_name: expectedName }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(response.status === 401
          ? "Сессия истекла. Войдите заново; имя не сохранено."
          : typeof data?.detail === "string" ? data.detail : "Не удалось сохранить имя. Попробуйте ещё раз.");
      }
      if (typeof data?.name !== "string" || typeof data?.updated_at !== "string") {
        throw new Error("Не удалось подтвердить сохранение имени. Обновите список клиентов.");
      }
      onSaved(data.name, data.updated_at);
      setEditing(false);
      setMessage(data.name ? "Имя сохранено" : "Имя удалено");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось сохранить имя");
    } finally {
      sending.current = false;
      setSaving(false);
    }
  }

  return <div className={styles.customerNameEditor}>
    <div className={styles.customerNameHeading}>
      <h2>{name || "Без имени"}</h2>
      {!editing ? <button
        aria-label={name ? `Редактировать имя клиента: ${name}` : "Добавить имя клиента"}
        className={styles.editNameButton}
        onClick={() => {
          setDraft(name); setExpectedName(name); setError(""); setMessage(""); setEditing(true);
        }}
        type="button"
      ><Pencil aria-hidden size={17} />{!name ? <span>Добавить имя</span> : null}</button> : null}
    </div>
    {editing ? <form aria-busy={saving} onSubmit={event => { event.preventDefault(); void save(); }}>
      <label htmlFor={id}>Имя клиента</label>
      <input autoFocus autoComplete="off" disabled={saving} id={id} maxLength={100}
        value={draft} type="text" aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); cancel(); } }} />
      <small id={`${id}-hint`}>До 100 символов. Пустое поле уберёт имя. Контакты и расчёты не изменятся.</small>
      {error ? <p id={`${id}-error`} role="alert">{error}</p> : null}
      <div className={styles.nameActions}>
        <button disabled={saving} type="submit">{saving ? "Сохраняем…" : "Сохранить"}</button>
        <button disabled={saving} onClick={cancel} type="button">Отмена</button>
      </div>
    </form> : null}
    <span className={styles.nameStatus} role="status">{message}</span>
  </div>;
}
