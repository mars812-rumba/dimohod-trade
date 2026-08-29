"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cookiePolicyPath } from "@/lib/privacy";
import styles from "./YandexMetrika.module.css";

const counterId = 112054099;
const consentStorageKey = "dimohod_analytics_consent_v1";

type ConsentState = "loading" | "undecided" | "accepted" | "declined";

type MetrikaWindow = Window & {
  dataLayer?: unknown[];
  ym?: (...args: unknown[]) => void;
};

export function YandexMetrika() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentState>("loading");

  useEffect(() => {
    try {
      const savedConsent = window.localStorage.getItem(consentStorageKey);
      setConsent(savedConsent === "accepted" || savedConsent === "declined" ? savedConsent : "undecided");
    } catch {
      setConsent("undecided");
    }
  }, []);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  function saveConsent(value: Extract<ConsentState, "accepted" | "declined">) {
    try {
      window.localStorage.setItem(consentStorageKey, value);
    } catch {
      // The choice still applies for the current page when browser storage is unavailable.
    }
    setConsent(value);
  }

  function initializeMetrika() {
    const metrikaWindow = window as MetrikaWindow;
    if (!metrikaWindow.ym) return;

    metrikaWindow.dataLayer = metrikaWindow.dataLayer ?? [];
    metrikaWindow.ym(counterId, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: window.location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  }

  return (
    <>
      {consent === "accepted" ? (
        <Script
          id="yandex-metrika"
          onLoad={initializeMetrika}
          src={`https://mc.yandex.ru/metrika/tag.js?id=${counterId}`}
          strategy="afterInteractive"
        />
      ) : null}

      {consent === "undecided" ? (
        <section aria-labelledby="analytics-consent-title" className={styles.banner}>
          <div className={styles.copy}>
            <strong id="analytics-consent-title">Помогите сделать сайт удобнее</strong>
            <p>
              Разрешите Яндекс Метрику: она покажет, какие разделы полезны посетителям. Подробнее — в{" "}
              <Link href={cookiePolicyPath}>политике cookie</Link>.
            </p>
          </div>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={() => saveConsent("declined")} type="button">
              Только необходимые
            </button>
            <button className={styles.primary} onClick={() => saveConsent("accepted")} type="button">
              Разрешить аналитику
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
