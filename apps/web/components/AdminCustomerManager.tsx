"use client";

import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  KeyRound,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "./AdminCustomerManager.module.css";

type CustomerContact = {
  method: "phone" | "whatsapp" | "telegram" | "email";
  value: string;
};

type CustomerEstimate = {
  lead_id: string;
  profile_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  known_total_rub: number;
  item_count: number;
  total_units: number;
};

type CustomerRecord = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  contacts: CustomerContact[];
  estimates: CustomerEstimate[];
};

type CustomerResponse = {
  items: CustomerRecord[];
  total: number;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const tokenStorageKey = "dimohod-trade:bom-admin-token";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function contactHref(contact: CustomerContact): string {
  if (contact.method === "email") return `mailto:${contact.value}`;
  if (contact.method === "telegram") return `https://t.me/${contact.value.replace(/^@/, "")}`;
  if (contact.method === "whatsapp") return `https://wa.me/${contact.value.replace(/\D/g, "")}`;
  return `tel:${contact.value.replace(/[^+\d]/g, "")}`;
}

function ContactIcon({ method }: { method: CustomerContact["method"] }) {
  if (method === "email") return <Mail aria-hidden size={17} />;
  if (method === "telegram" || method === "whatsapp") return <MessageCircle aria-hidden size={17} />;
  return <Phone aria-hidden size={17} />;
}

export function AdminCustomerManager() {
  const [token, setToken] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"locked" | "loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  async function loadCustomers(accessToken: string, search = "") {
    setStatus("loading");
    setMessage("");
    try {
      const suffix = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/customers${suffix}`, {
        cache: "no-store",
        headers: { "X-BOM-Admin-Token": accessToken },
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Неверный ключ доступа" : "Не удалось загрузить клиентов");
      const data = await response.json() as CustomerResponse;
      setCustomers(data.items);
      setTotal(data.total);
      setToken(accessToken);
      setStatus("ready");
      try {
        window.sessionStorage.setItem(tokenStorageKey, accessToken);
      } catch {
        // The loaded page remains usable when browser storage is unavailable.
      }
    } catch (error) {
      try {
        window.sessionStorage.removeItem(tokenStorageKey);
      } catch {
        // Nothing else to clean up.
      }
      setCustomers([]);
      setTotal(0);
      setToken("");
      setStatus("locked");
      setMessage(error instanceof Error ? error.message : "Не удалось войти");
    }
  }

  useEffect(() => {
    let savedToken = "";
    try {
      savedToken = window.sessionStorage.getItem(tokenStorageKey) ?? "";
    } catch {
      // The manager can still enter the token manually.
    }
    if (!savedToken) {
      setStatus("locked");
      return;
    }
    void loadCustomers(savedToken);
  }, []);

  function submitToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = tokenDraft.trim();
    if (!value) {
      setMessage("Введите ключ доступа");
      return;
    }
    void loadCustomers(value);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token) void loadCustomers(token, query);
  }

  function logout() {
    try {
      window.sessionStorage.removeItem(tokenStorageKey);
    } catch {
      // The local session is already unavailable.
    }
    setToken("");
    setTokenDraft("");
    setCustomers([]);
    setTotal(0);
    setMessage("");
    setStatus("locked");
  }

  if (status === "locked") {
    return (
      <main className={styles.shell}>
        <section className={styles.loginCard} aria-labelledby="customer-login-title">
          <div className={styles.loginIcon}><KeyRound aria-hidden size={24} /></div>
          <p className={styles.eyebrow}>Внутренний раздел</p>
          <h1 id="customer-login-title">Клиенты и замеры</h1>
          <p>Введите ключ менеджера. Он сохранится только в текущей вкладке браузера.</p>
          <form onSubmit={submitToken}>
            <label htmlFor="customer-admin-token">Ключ доступа</label>
            <input
              aria-describedby={message ? "customer-login-error" : undefined}
              aria-invalid={Boolean(message)}
              autoComplete="current-password"
              id="customer-admin-token"
              onChange={(event) => setTokenDraft(event.target.value)}
              required
              type="password"
              value={tokenDraft}
            />
            {message ? <p className={styles.formError} id="customer-login-error" role="alert">{message}</p> : null}
            <button type="submit"><KeyRound aria-hidden size={17} /> Открыть базу</button>
          </form>
          <Link className={styles.backLink} href="/admin"><ArrowLeft aria-hidden size={17} /> Вернуться в каталог</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="Навигация администратора">
        <Link href="/admin"><ArrowLeft aria-hidden size={17} /> Каталог</Link>
        <button onClick={logout} type="button"><LogOut aria-hidden size={16} /> Выйти</button>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Журнал замеров</p>
          <h1>Клиенты и сметы</h1>
          <p>Контакты клиента и все сохранённые расчёты в одном месте.</p>
        </div>
        <div className={styles.counter} aria-label={`Всего клиентов: ${total}`}>
          <UserRound aria-hidden size={19} />
          <strong>{total}</strong>
          <span>{total === 1 ? "клиент" : "клиентов"}</span>
        </div>
      </header>

      <form className={styles.searchBar} onSubmit={submitSearch} role="search">
        <label htmlFor="customer-search">Поиск клиента или замера</label>
        <div>
          <Search aria-hidden size={18} />
          <input
            id="customer-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Имя, телефон, почта или название замера"
            type="search"
            value={query}
          />
          <button type="submit">Найти</button>
        </div>
      </form>

      <p aria-live="polite" className={styles.statusMessage}>
        {status === "loading" ? "Загружаем клиентов…" : message}
      </p>

      {status === "ready" && customers.length === 0 ? (
        <section className={styles.emptyState}>
          <ClipboardList aria-hidden size={28} />
          <h2>{query.trim() ? "Ничего не найдено" : "Клиентов пока нет"}</h2>
          <p>{query.trim() ? "Попробуйте другой телефон, имя или название замера." : "Новые заявки со сметой появятся здесь автоматически."}</p>
        </section>
      ) : null}

      <section className={styles.customerList} aria-label="Список клиентов">
        {customers.map((customer) => (
          <article className={styles.customerCard} key={customer.id}>
            <header className={styles.customerHeader}>
              <div>
                <h2>{customer.name || "Без имени"}</h2>
                <div className={styles.contacts}>
                  {customer.contacts.map((contact) => (
                    <a
                      href={contactHref(contact)}
                      key={`${contact.method}-${contact.value}`}
                      rel={contact.method === "phone" ? undefined : "noreferrer"}
                      target={contact.method === "phone" ? undefined : "_blank"}
                    >
                      <ContactIcon method={contact.method} /> {contact.value}
                    </a>
                  ))}
                </div>
              </div>
              <div className={styles.customerMeta}>
                <strong>{customer.estimates.length}</strong>
                <span>{customer.estimates.length === 1 ? "смета" : "смет"}</span>
                <small>обновлено {formatDate(customer.updated_at)}</small>
              </div>
            </header>

            <div className={styles.estimateList}>
              {customer.estimates.map((estimate) => (
                <div className={styles.estimateRow} key={estimate.lead_id}>
                  <div className={styles.estimateIdentity}>
                    <ClipboardList aria-hidden size={18} />
                    <div>
                      <strong>{estimate.profile_name}</strong>
                      <span><CalendarDays aria-hidden size={14} /> {formatDate(estimate.created_at)}</span>
                    </div>
                  </div>
                  <dl className={styles.estimateStats}>
                    <div><dt>Позиций</dt><dd>{estimate.item_count}</dd></div>
                    <div><dt>Единиц</dt><dd>{estimate.total_units}</dd></div>
                    <div><dt>Сумма</dt><dd>{formatRub(estimate.known_total_rub)}</dd></div>
                  </dl>
                  <Link href={`/admin/estimates/${estimate.lead_id}#admin=1`}>
                    Открыть смету «{estimate.profile_name}» <ExternalLink aria-hidden size={16} />
                  </Link>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
