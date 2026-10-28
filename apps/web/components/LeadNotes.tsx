"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import styles from "./AdminCustomerManager.module.css";

export function LeadNotes({ customerId, leadId, notes = "", onSaved, children }: {
  customerId: string; leadId: string; notes?: string; onSaved: (notes: string) => void; children?: ReactNode;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save() {
    if (saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const response = await fetch(`${base}/api/v1/admin/customers/${customerId}/estimates/${leadId}/notes`, {
        method: "PATCH", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft, expected_notes: notes }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(response.status === 401 ? "Сессия истекла. Войдите заново; текст заметки не сохранён." : data?.detail || "Не удалось сохранить заметку. Попробуйте ещё раз.");
      onSaved(data.notes); setEditing(false); setMessage("Заметка сохранена");
    } catch (error) { setError(error instanceof Error ? error.message : "Не удалось сохранить заметку"); }
    finally { setSaving(false); }
  }

  return <div className={styles.leadNotes}>
    {editing ? <form onSubmit={event => { event.preventDefault(); void save(); }} aria-busy={saving}>
      <label htmlFor={id}>Заметка по заявке</label>
      <textarea id={id} value={draft} maxLength={5000} rows={4} disabled={saving}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        onChange={event => setDraft(event.target.value)} />
      <small id={`${id}-hint`}>Внутренняя заметка. Не попадёт в PDF и письма клиенту. До 5000 символов.</small>
      {error ? <p id={`${id}-error`} role="alert">{error}</p> : null}
      <div className={styles.noteActions}>
        <button type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить заметку"}</button>
        <button type="button" disabled={saving} onClick={() => { setEditing(false); setError(""); }}>Отмена</button>
      </div>
    </form> : <>
      {notes ? <p className={styles.noteText}>{notes}</p> : null}
      <div className={children ? styles.leadActionButtons : undefined}>
      <button type="button" onClick={() => { setDraft(notes); setMessage(""); setEditing(true); }}>{notes ? "Редактировать заметку" : "Добавить заметку"}</button>
      {children}
      </div>
    </>}
    {editing ? children : null}
    <span role="status">{message}</span>
  </div>;
}
