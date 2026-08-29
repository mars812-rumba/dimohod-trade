"use client";

import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  async function loadCustomers(search = "") {
    setStatus("loading");
    setMessage("");
    try {
      const suffix = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/customers${suffix}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (response.status === 401) {
        router.replace("/admin/login?next=/admin/customers");
        return;
      }
      if (!response.ok) throw new Error("Не удалось загрузить клиентов");
      const data = await response.json() as CustomerResponse;
      setCustomers(data.items);
      setTotal(data.total);
      setStatus("ready");
    } catch (error) {
      setCustomers([]);
      setTotal(0);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить клиентов");
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadCustomers(query);
  }

  async function logout() {
    await fetch(`${apiBaseUrl}/api/v1/admin/auth/logout`, {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className={styles.shell}>
      <nav className={styles.topbar} aria-label="Навигация администратора">
        <button onClick={() => void logout()} type="button"><LogOut aria-hidden size={16} /> Выйти</button>
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
