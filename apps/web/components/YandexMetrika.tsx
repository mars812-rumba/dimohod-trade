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

type MetrikaFunction = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

type MetrikaWindow = Window & {
  dataLayer?: unknown[];
  ym?: MetrikaFunction;
  __dimohodMetrikaInitialized?: boolean;
};

const METRIKA_SCRIPT_ID = "yandex-metrika-script";

function initializeMetrika() {
  const metrikaWindow = window as MetrikaWindow;

  if (!metrikaWindow.ym) {
    const queuedYm: MetrikaFunction = (...args: unknown[]) => {
      queuedYm.a = queuedYm.a ?? [];
      queuedYm.a.push(args);
    };
    queuedYm.l = Date.now();
    metrikaWindow.ym = queuedYm;
  }

  if (!metrikaWindow.__dimohodMetrikaInitialized) {
    metrikaWindow.dataLayer = metrikaWindow.dataLayer ?? [];
    metrikaWindow.ym(YANDEX_METRIKA_COUNTER_ID, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: window.location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
    metrikaWindow.__dimohodMetrikaInitialized = true;
  }

  if (!document.getElementById(METRIKA_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = METRIKA_SCRIPT_ID;
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    script.addEventListener("load", flushMetrikaGoals, { once: true });
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
      metrikaWindow.ym?.(YANDEX_METRIKA_COUNTER_ID, "destruct");
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
