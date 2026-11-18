"use client";

import { Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import styles from "./AdminCustomerManager.module.css";

type Preview = { customer_id: string; version: string; lead_count: number; estimate_count: number };

export function CustomerDeleteButton({ customerId, name, onDeleted, compact = false }: {
  customerId: string;
  name: string;
  onDeleted: (deletionId: string) => void;
  compact?: boolean;
}) {
  const id = useId();
  const sending = useRef(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

  async function requestPreview() {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(""); setConfirmed(false);
    try {
      const response = await fetch(`${base}/api/v1/admin/customers/${customerId}/deletion-preview`, {
        credentials: "include", cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(response.status === 401 ? "Сессия истекла. Войдите заново."
        : typeof data?.detail === "string" ? data.detail : "Не удалось проверить связанные сметы.");
      if (data?.customer_id !== customerId || typeof data?.version !== "string"
        || !Number.isInteger(data?.lead_count) || !Number.isInteger(data?.estimate_count)) {
        throw new Error("Не удалось подтвердить состав удаления. Обновите список.");
      }
      setPreview(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка проверки"); }
    finally { sending.current = false; setBusy(false); }
  }

  async function remove() {
    if (sending.current || !preview || !confirmed) return;
    sending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`${base}/api/v1/admin/customers/${customerId}`, {
        method: "DELETE", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected_version: preview.version, confirmation: "delete_customer_with_estimates" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409) { setPreview(null); setConfirmed(false); }
        throw new Error(response.status === 401 ? "Сессия истекла. Удаление не выполнено."
          : typeof data?.detail === "string" ? data.detail : "Не удалось удалить клиента. Обновите список перед повтором.");
      }
      if (data?.status !== "deleted" || data.customer_id !== customerId || typeof data.deletion_id !== "string") {
        throw new Error("Не удалось подтвердить удаление. Обновите список клиентов.");
      }
      onDeleted(data.deletion_id);
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка удаления"); }
    finally { sending.current = false; setBusy(false); }
  }

  return <div className={`${styles.customerDeletion}${compact ? ` ${styles.customerDeletionCompact}` : ""}`}>
    {compact || !preview ? <button className={styles.deleteButton} disabled={busy || !!preview} type="button"
      aria-label={compact ? "Удалить клиента и все его сметы" : undefined}
      title={compact ? "Удалить клиента и все его сметы" : undefined}
      aria-busy={busy} onClick={() => void requestPreview()}><Trash2 aria-hidden size={compact ? 18 : 16} />
      {compact ? null : busy ? "Проверяем…" : "Удалить клиента и сметы"}</button> : null}
    {preview ?
      <div className={styles.deleteConfirmation} role="dialog" aria-labelledby={`${id}-title`} aria-busy={busy}
        onKeyDown={e => { if (e.key === "Escape" && !busy) { setPreview(null); setError(""); } }}>
        <strong id={`${id}-title`}>Удалить клиента «{name || "Без имени"}»?</strong>
        <p>Вместе с карточкой будут удалены заявки: {preview.lead_count}, сметы: {preview.estimate_count},
          их PDF, вложения, заметки и сохранённые версии. Ссылки на них перестанут работать.</p>
        <p>Данные переместятся в закрытую корзину. После удаления появится кнопка восстановления.</p>
        <label><input type="checkbox" checked={confirmed} disabled={busy}
          onChange={e => setConfirmed(e.target.checked)} />Удалить всю карточку и все связанные сметы</label>
        <div className={styles.deleteActions}>
          <button autoFocus disabled={busy} type="button" onClick={() => { setPreview(null); setError(""); }}>Отмена</button>
          <button className={styles.deleteButton} disabled={busy || !confirmed} type="button"
            onClick={() => void remove()}>{busy ? "Удаляем…" : "Подтвердить удаление"}</button>
        </div>
      </div> : null}
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
