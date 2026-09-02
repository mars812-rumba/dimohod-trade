"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  flushMetrikaGoals,
  METRIKA_GOALS,
  reachMetrikaGoal,
  YANDEX_METRIKA_COUNTER_ID,
} from "@/lib/metrika";
import { cookiePolicyPath } from "@/lib/privacy";
import styles from "./YandexMetrika.module.css";

type ConsentState = "loading" | "undecided" | "accepted" | "declined";

type MetrikaFunction = (counterId: number, method: string, ...args: unknown[]) => void;
type MetrikaCounter = Record<string, unknown> & { destruct?: () => void };
type MetrikaConstructor = new (options: Record<string, unknown>) => MetrikaCounter;

type MetrikaWindow = Window & {
  dataLayer?: unknown[];
  ym?: MetrikaFunction;
  Ya?: { Metrika2?: MetrikaConstructor };
  __dimohodMetrikaCounter?: MetrikaCounter;
  __dimohodMetrikaInitialized?: boolean;
};

const METRIKA_SCRIPT_ID = "yandex-metrika-script";

function startMetrikaCounter() {
  const metrikaWindow = window as MetrikaWindow;
  if (metrikaWindow.__dimohodMetrikaCounter) return;

  const Counter = metrikaWindow.Ya?.Metrika2;
  if (!Counter) return;

  metrikaWindow.dataLayer = metrikaWindow.dataLayer ?? [];
  const counter = new Counter({
    id: YANDEX_METRIKA_COUNTER_ID,
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: window.location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
  metrikaWindow.__dimohodMetrikaCounter = counter;
  metrikaWindow.__dimohodMetrikaInitialized = true;
  metrikaWindow.ym = (counterId, method, ...args) => {
    if (counterId !== YANDEX_METRIKA_COUNTER_ID) return;
    const handler = counter[method];
    if (typeof handler === "function") handler.apply(counter, args);
  };
  flushMetrikaGoals();
}

function initializeMetrika() {
  const metrikaWindow = window as MetrikaWindow;
  if (metrikaWindow.Ya?.Metrika2) {
    startMetrikaCounter();
    return;
  }

  const existingScript = document.getElementById(METRIKA_SCRIPT_ID);
  if (existingScript) {
    existingScript.addEventListener("load", startMetrikaCounter, { once: true });
  } else {
    const script = document.createElement("script");
    script.id = METRIKA_SCRIPT_ID;
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    script.addEventListener("load", startMetrikaCounter, { once: true });
    document.head.appendChild(script);
  }
}

export function YandexMetrika() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentState>("loading");

  useEffect(() => {
    try {
      const savedConsent = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
      setConsent(savedConsent === "accepted" || savedConsent === "declined" ? savedConsent : "undecided");
    } catch {
      setConsent("undecided");
    }
  }, []);

  useEffect(() => {
    if (consent === "loading" || consent === "declined" || pathname.startsWith("/admin")) return;
    initializeMetrika();
  }, [consent, pathname]);

  useEffect(() => {
    if (consent === "loading" || consent === "declined" || pathname.startsWith("/admin")) return;

    const trackPhoneClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="tel:"]') : null;
      if (!target) return;
      reachMetrikaGoal(METRIKA_GOALS.phoneClick, { path: window.location.pathname });
    };

    document.addEventListener("click", trackPhoneClick, { capture: true });
    return () => document.removeEventListener("click", trackPhoneClick, { capture: true });
  }, [consent, pathname]);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  function saveConsent(value: Extract<ConsentState, "accepted" | "declined">) {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
    } catch {
      // The choice still applies for the current page when browser storage is unavailable.
    }
    if (value === "declined") {
      const metrikaWindow = window as MetrikaWindow;
      metrikaWindow.__dimohodMetrikaCounter?.destruct?.();
      delete metrikaWindow.__dimohodMetrikaCounter;
      delete metrikaWindow.ym;
      metrikaWindow.__dimohodMetrikaInitialized = false;
    }
    setConsent(value);
  }

  return (
    <>
      {consent === "undecided" ? (
        <section aria-labelledby="analytics-consent-title" className={styles.banner}>
          <div className={styles.copy}>
            <strong id="analytics-consent-title">Помогите сделать сайт удобнее</strong>
            <p>
              Сайт использует Яндекс Метрику для анализа посещаемости и улучшения интерфейса. Подробнее — в{" "}
              <Link href={cookiePolicyPath}>политике cookie</Link>.
            </p>
          </div>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={() => saveConsent("declined")} type="button">
              Отключить аналитику
            </button>
            <button className={styles.primary} onClick={() => saveConsent("accepted")} type="button">
              Понятно
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
