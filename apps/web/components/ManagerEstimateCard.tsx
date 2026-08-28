"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
  Mail,
  MessageCircle,
  Phone,
  Ruler,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { ProductListItem, ProductListResponse } from "@/lib/api";
import styles from "./ManagerEstimateCard.module.css";

type ManagerEstimateLine = {
  id: string;
  key: string;
  sku_id: string | null;
  label: string;
  article: string | null;
  sku_name: string | null;
  quantity: number;
  unit_price_rub: number | null;
  line_total_rub: number | null;
  characteristics: string[];
  note: string;
  match_status: "exact" | "candidate" | "nearest" | "missing" | "manual";
  removed_at?: string;
};

type ManagerEstimateEnvelope = {
  schema_version: number;
  lead_id: string;
  status: string;
  revision: number;
  removed_lines: ManagerEstimateLine[];
  customer: {
    name: string;
    contact_method: "phone" | "whatsapp" | "telegram" | "email";
    contact: string;
  };
  estimate: {
    profile_name: string;
    generated_at: string;
    source_url: string;
    measurements: Array<{ label: string; value: string }>;
    lines: ManagerEstimateLine[];
    known_subtotal_rub: number;
    priced_line_count: number;
    unpriced_line_count: number;
    total_units: number;
    review_items: string[];
    calculation_errors: string[];
  };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
type AccessHeader = "X-Lead-Manager-Token" | "X-BOM-Admin-Token";

type LineDraft = {
  label: string;
  quantity: string;
  unitPrice: string;
  characteristics: string;
  note: string;
};

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function contactHref(method: ManagerEstimateEnvelope["customer"]["contact_method"], contact: string) {
  if (method === "email") return `mailto:${contact}`;
  if (method === "telegram") return `https://t.me/${contact.replace(/^@/, "")}`;
  if (method === "whatsapp") return `https://wa.me/${contact.replace(/\D/g, "")}`;
  return `tel:${contact.replace(/[^+\d]/g, "")}`;
}

function ContactIcon({ method }: { method: ManagerEstimateEnvelope["customer"]["contact_method"] }) {
  if (method === "email") return <Mail aria-hidden size={18} />;
  if (method === "telegram" || method === "whatsapp") return <MessageCircle aria-hidden size={18} />;
  return <Phone aria-hidden size={18} />;
}

function productCharacteristics(item: ProductListItem): string[] {
  return [
    item.diameter_mm === null ? null : `Ø ${item.diameter_mm}${item.outer_diameter_mm === null ? "" : `/${item.outer_diameter_mm}`} мм`,
    item.length_mm === null ? null : `L ${item.length_mm} мм`,
    item.steel_grade,
    item.wall_thickness_mm ? `${item.wall_thickness_mm} мм` : null,
  ].filter((value): value is string => Boolean(value));
}

function lineDraft(line: ManagerEstimateLine): LineDraft {
  return {
    label: line.label,
    quantity: String(line.quantity),
    unitPrice: line.unit_price_rub === null ? "" : String(line.unit_price_rub),
    characteristics: line.characteristics.join("\n"),
    note: line.note,
  };
}

export function ManagerEstimateCard({ leadId }: { leadId: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [payload, setPayload] = useState<ManagerEstimateEnvelope | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [accessHeader, setAccessHeader] = useState<AccessHeader>("X-Lead-Manager-Token");
  const [usesAdminSession, setUsesAdminSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LineDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [replaceLineId, setReplaceLineId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<LineDraft>({ label: "", quantity: "1", unitPrice: "", characteristics: "", note: "" });

  useEffect(() => {
    const storageKey = `dimohod-trade:lead-manager:${leadId}`;
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hashToken = hashParams.get("token");
    const requestedAdminSession = !hashToken && hashParams.get("admin") === "1";
    const header: AccessHeader = "X-Lead-Manager-Token";
    let token = hashToken;
    try {
      if (hashToken) window.sessionStorage.setItem(storageKey, hashToken);
      if (!requestedAdminSession) token ??= window.sessionStorage.getItem(storageKey);
    } catch {
      // The email link still works when session storage is unavailable.
    }
    const useAdminSession = requestedAdminSession || !token;
    if (hashToken || requestedAdminSession) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setAccessToken(token ?? "");
    setAccessHeader(header);
    setUsesAdminSession(useAdminSession);

    const controller = new AbortController();
    fetch(`${apiBaseUrl}/api/v1/leads/${encodeURIComponent(leadId)}/manager`, {
      cache: "no-store",
      credentials: "include",
      headers: useAdminSession ? {} : { [header]: token ?? "" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("access-denied");
        return response.json() as Promise<ManagerEstimateEnvelope>;
      })
      .then((data) => {
        setPayload(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!useAdminSession) {
          try {
            window.sessionStorage.removeItem(storageKey);
          } catch {
            // Nothing else to clean up.
          }
        }
        setStatus("error");
      });
    return () => controller.abort();
  }, [leadId]);

  async function mutate(path: string, method: "POST" | "PATCH" | "DELETE", body: object) {
    if (!payload || (!usesAdminSession && !accessToken) || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/leads/${encodeURIComponent(leadId)}/manager${path}`, {
        method,
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(usesAdminSession ? {} : { [accessHeader]: accessToken }),
        },
        body: JSON.stringify({ revision: payload.revision, ...body }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail ?? "Не удалось сохранить изменение");
      setPayload(data as ManagerEstimateEnvelope);
      setNotice("Изменение сохранено");
      setEditingId(null);
      setDraft(null);
      setReplaceLineId(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить изменение");
    } finally {
      setBusy(false);
    }
  }

  async function searchProducts() {
    const query = searchQuery.trim();
    if (query.length < 2 || searching) return;
    setSearching(true);
    setNotice("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/products?q=${encodeURIComponent(query)}&limit=10`, { cache: "no-store" });
      if (!response.ok) throw new Error("Поиск каталога временно недоступен");
      const data = await response.json() as ProductListResponse;
      setSearchResults(data.items);
      if (!data.items.length) setNotice("В каталоге ничего не найдено");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось выполнить поиск");
    } finally {
      setSearching(false);
    }
  }

  function addOrReplaceProduct(item: ProductListItem) {
    const values = {
      skuId: item.selected_sku_id,
      label: item.name,
      article: item.article,
      skuName: item.name,
      quantity: 1,
      unitPriceRub: item.price_rub === null ? null : Number(item.price_rub),
      characteristics: productCharacteristics(item),
      note: "Добавлено менеджером из каталога",
      matchStatus: "exact",
    };
    void mutate(replaceLineId ? `/items/${replaceLineId}` : "/items", replaceLineId ? "PATCH" : "POST", values);
  }

  function saveDraft(lineId: string) {
    if (!draft) return;
    void mutate(`/items/${lineId}`, "PATCH", {
      label: draft.label.trim(),
      quantity: Number(draft.quantity),
      unitPriceRub: draft.unitPrice.trim() ? Number(draft.unitPrice.replace(",", ".")) : null,
      characteristics: draft.characteristics.split("\n").map((value) => value.trim()).filter(Boolean),
      note: draft.note.trim(),
    });
  }

  function addManualLine() {
    void mutate("/items", "POST", {
      label: manualDraft.label.trim(),
      quantity: Number(manualDraft.quantity),
      unitPriceRub: manualDraft.unitPrice.trim() ? Number(manualDraft.unitPrice.replace(",", ".")) : null,
      characteristics: manualDraft.characteristics.split("\n").map((value) => value.trim()).filter(Boolean),
      note: manualDraft.note.trim(),
      matchStatus: "manual",
    });
    setManualOpen(false);
    setManualDraft({ label: "", quantity: "1", unitPrice: "", characteristics: "", note: "" });
  }

  const generatedAt = useMemo(() => {
    if (!payload) return "";
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" })
      .format(new Date(payload.estimate.generated_at));
  }, [payload]);

  if (status === "loading") {
    return (
      <main className={styles.shell}>
        <div className={styles.stateCard} role="status">
          <ClipboardList aria-hidden size={28} />
          <h1>Открываем заявку</h1>
          <p>Загружаем клиента, замеры и состав комплекта.</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !payload) {
    return (
      <main className={styles.shell}>
        <div className={styles.stateCard} role="alert">
          <AlertTriangle aria-hidden size={28} />
          <h1>Ссылка недействительна</h1>
          <p>Откройте исходную ссылку из письма менеджеру или запросите новую.</p>
          <Link href="/admin"><ArrowLeft aria-hidden size={17} /> В админку</Link>
        </div>
      </main>
    );
  }

  const warnings = [...payload.estimate.calculation_errors, ...payload.estimate.review_items];
  const contact = payload.customer;

  return (
    <main className={styles.shell}>
      <div className={styles.topbar}>
        <Link href={usesAdminSession ? "/admin/customers" : "/admin"}>
          <ArrowLeft aria-hidden size={17} /> {usesAdminSession ? "Все клиенты" : "Каталог"}
        </Link>
        <span>Заявка {payload.lead_id.slice(0, 8).toUpperCase()}</span>
      </div>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Заявка · редакция {payload.revision}</span>
          <h1>{payload.estimate.profile_name}</h1>
          <p>Сформирована {generatedAt}</p>
        </div>
        <div className={styles.total}>
          <span>{payload.estimate.unpriced_line_count ? "Итого по известным ценам" : "Итого"}</span>
          <strong>{formatRub(payload.estimate.known_subtotal_rub)}</strong>
          <small>{payload.estimate.lines.length} поз. · {payload.estimate.total_units} шт.</small>
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label="Клиент и параметры замера">
        <article className={styles.panel}>
          <div className={styles.panelTitle}><UserRound aria-hidden size={19} /><h2>Клиент</h2></div>
          <strong className={styles.customerName}>{contact.name}</strong>
          <a
            href={contactHref(contact.contact_method, contact.contact)}
            rel={contact.contact_method === "phone" ? undefined : "noreferrer"}
            target={contact.contact_method === "phone" ? undefined : "_blank"}
          >
            <ContactIcon method={contact.contact_method} />
            {contact.contact}
          </a>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelTitle}><Ruler aria-hidden size={19} /><h2>Замеры</h2></div>
          <dl className={styles.measurements}>
            {payload.estimate.measurements.map((item) => (
              <div key={`${item.label}-${item.value}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>
            ))}
          </dl>
        </article>
      </section>

      <section className={styles.bomSection}>
        <div className={styles.sectionHeading}>
          <div><span>BOM</span><h2>Состав комплекта</h2></div>
          <button className={styles.secondaryButton} onClick={() => setManualOpen((value) => !value)} type="button">
            {manualOpen ? <X aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
            {manualOpen ? "Отменить" : "Ручная позиция"}
          </button>
        </div>

        <div className={styles.catalogSearch}>
          <label htmlFor="manager-sku-search">Добавить или заменить SKU из каталога</label>
          <div>
            <input
              id="manager-sku-search"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchProducts();
                }
              }}
              placeholder="Название или артикул"
              value={searchQuery}
            />
            <button disabled={searchQuery.trim().length < 2 || searching} onClick={() => void searchProducts()} type="button">
              <Search aria-hidden size={16} /> {searching ? "Ищем…" : "Найти"}
            </button>
          </div>
          {replaceLineId ? (
            <p className={styles.replaceNotice} role="status">
              Выберите SKU для замены позиции.
              <button onClick={() => setReplaceLineId(null)} type="button">Отменить замену</button>
            </p>
          ) : null}
          {searchResults.length ? (
            <ul className={styles.searchResults}>
              {searchResults.map((item) => (
                <li key={`${item.id}-${item.selected_sku_id ?? item.article}`}>
                  <div><strong>{item.name}</strong><span>{item.article ?? "Без артикула"} · {productCharacteristics(item).join(" · ")}</span></div>
                  <button disabled={busy || !item.selected_sku_id} onClick={() => addOrReplaceProduct(item)} type="button">
                    {replaceLineId ? "Заменить" : "Добавить"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {manualOpen ? (
          <form className={styles.lineForm} onSubmit={(event) => { event.preventDefault(); addManualLine(); }}>
            <label><span>Название</span><input required value={manualDraft.label} onChange={(event) => setManualDraft({ ...manualDraft, label: event.target.value })} /></label>
            <label><span>Количество</span><input min="1" required type="number" value={manualDraft.quantity} onChange={(event) => setManualDraft({ ...manualDraft, quantity: event.target.value })} /></label>
            <label><span>Цена за единицу</span><input min="0" step="0.01" type="number" value={manualDraft.unitPrice} onChange={(event) => setManualDraft({ ...manualDraft, unitPrice: event.target.value })} /></label>
            <label className={styles.wideField}><span>Характеристики, каждая с новой строки</span><textarea rows={2} value={manualDraft.characteristics} onChange={(event) => setManualDraft({ ...manualDraft, characteristics: event.target.value })} /></label>
            <label className={styles.wideField}><span>Примечание</span><textarea rows={2} value={manualDraft.note} onChange={(event) => setManualDraft({ ...manualDraft, note: event.target.value })} /></label>
            <button disabled={busy} type="submit"><Plus aria-hidden size={16} /> Добавить позицию</button>
          </form>
        ) : null}

        <p aria-live="polite" className={styles.saveNotice}>{busy ? "Сохраняем изменение…" : notice}</p>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Позиция</th><th>Кол.</th><th>Цена</th><th>Сумма</th><th><span className={styles.srOnly}>Действия</span></th></tr></thead>
            <tbody>
              {payload.estimate.lines.map((line) => (
                <Fragment key={line.id}>
                  <tr>
                    <td>
                      <strong>{line.label}</strong>
                      <span>{line.article ? `Арт. ${line.article}` : "Артикул уточняется"}</span>
                      {line.characteristics.length ? <small>{line.characteristics.join(" · ")}</small> : null}
                      {line.note ? <small>{line.note}</small> : null}
                    </td>
                    <td>{line.quantity}</td>
                    <td>{line.unit_price_rub === null ? "По запросу" : formatRub(line.unit_price_rub)}</td>
                    <td>{line.line_total_rub === null ? "—" : formatRub(line.line_total_rub)}</td>
                    <td className={styles.rowActions}>
                      <button aria-label={`Редактировать ${line.label}`} disabled={busy} onClick={() => { setEditingId(line.id); setDraft(lineDraft(line)); }} type="button"><Pencil aria-hidden size={15} /></button>
                      <button aria-label={`Заменить SKU для ${line.label}`} disabled={busy} onClick={() => { setReplaceLineId(line.id); document.getElementById("manager-sku-search")?.focus(); }} type="button"><RotateCcw aria-hidden size={15} /></button>
                      <button aria-label={`Удалить ${line.label}`} disabled={busy} onClick={() => void mutate(`/items/${line.id}`, "DELETE", {})} type="button"><Trash2 aria-hidden size={15} /></button>
                    </td>
                  </tr>
                  {editingId === line.id && draft ? (
                    <tr className={styles.editorRow}>
                      <td colSpan={5}>
                        <form className={styles.lineForm} onSubmit={(event) => { event.preventDefault(); saveDraft(line.id); }}>
                          <label><span>Название</span><input required value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label>
                          <label><span>Количество</span><input min="1" required type="number" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
                          <label><span>Цена за единицу</span><input min="0" step="0.01" type="number" value={draft.unitPrice} onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} /></label>
                          <label className={styles.wideField}><span>Характеристики</span><textarea rows={2} value={draft.characteristics} onChange={(event) => setDraft({ ...draft, characteristics: event.target.value })} /></label>
                          <label className={styles.wideField}><span>Примечание</span><textarea rows={2} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
                          <div className={styles.formActions}>
                            <button disabled={busy} type="submit"><Save aria-hidden size={16} /> Сохранить</button>
                            <button disabled={busy} onClick={() => { setEditingId(null); setDraft(null); }} type="button"><X aria-hidden size={16} /> Отменить</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {payload.removed_lines.length ? (
          <div className={styles.removedLines}>
            <h3>Удалённые позиции</h3>
            <ul>{payload.removed_lines.map((line) => (
              <li key={line.id}><span>{line.label} · {line.quantity} шт.</span><button disabled={busy} onClick={() => void mutate(`/items/${line.id}/restore`, "POST", {})} type="button"><RotateCcw aria-hidden size={15} /> Вернуть</button></li>
            ))}</ul>
          </div>
        ) : null}
      </section>

      {warnings.length ? (
        <section className={styles.warningPanel}>
          <div className={styles.panelTitle}><AlertTriangle aria-hidden size={19} /><h2>Проверить менеджеру</h2></div>
          <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </section>
      ) : (
        <div className={styles.okay}><CheckCircle2 aria-hidden size={18} /> В расчёте нет дополнительных предупреждений.</div>
      )}
    </main>
  );
}
