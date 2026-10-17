"use client";

import {
  IconBrandTelegram as BrandTelegram,
  IconFileCheck as FileCheck,
  IconMapPin as MapPin,
  IconMail as Mail,
  IconPhone as Phone,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  cookiePolicyPath,
  personalDataConsentPath,
  privacyPolicyPath,
  userAgreementPath,
} from "@/lib/privacy";
import styles from "./SiteFooter.module.css";
import { MaxContactLink } from "./MaxContactLink";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Link href="/" aria-label="Дымоход Трейд — главная">
              <img
                alt="Дымоход Трейд"
                height="82"
                src={`${basePath}/brand/logo-original.jpg`}
                width="180"
              />
            </Link>
            <p>Подбор, комплектация и поставка дымоходных систем.</p>
          </div>

          <nav className={styles.links} aria-label="Разделы сайта">
            <strong>Разделы сайта</strong>
            <Link href="/catalog">Каталог</Link>
            <Link href="/solutions">Решения</Link>
            <Link href="/guides">Статьи</Link>
            <Link href="/delivery">Доставка по России</Link>
            <Link href="/warranty">Гарантия</Link>
            <Link href="/about">О компании</Link>
            <Link href="/configurator">Конфигуратор</Link>
            <Link href="/montazh">Монтаж и замер</Link>
            <Link href="/contacts">Контакты</Link>
          </nav>

          <nav className={styles.links} aria-label="Правовые документы">
            <strong>Документы</strong>
            <Link href={privacyPolicyPath}>Политика персональных данных</Link>
            <Link href={personalDataConsentPath}>Согласие на обработку данных</Link>
            <Link href={cookiePolicyPath}>Cookie и локальные технологии</Link>
            <Link href={userAgreementPath}>Пользовательское соглашение</Link>
          </nav>

          <div className={styles.contacts}>
            <strong>Контакты</strong>
            <a className={styles.contactLink} href="tel:+79643424565">
              <Phone aria-hidden size={15} />
              <span>+7 (964) 342-45-65</span>
            </a>
            <a className={styles.contactLink} href="tel:+78126424545">
              <Phone aria-hidden size={15} />
              <span>+7 (812) 642-45-45</span>
            </a>
            <a className={styles.contactLink} href="mailto:office@dimohod-trade.pro">
              <Mail aria-hidden size={15} />
              <span>office@dimohod-trade.pro</span>
            </a>
            <MaxContactLink />
            <div>
              <MapPin aria-hidden size={15} />
              <span>Санкт-Петербург, ул. 2-й Луч, 4, корп. 2</span>
            </div>
            <div>
              <FileCheck aria-hidden size={15} />
              <span>ООО «Дымоходы-трейд плюс» · ИНН 7811635572 · ОГРН 1177847018216</span>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© 2026 Дымоход Трейд</span>
          <a
            className={styles.developer}
            href="https://t.me/marseloid"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Сайт разработан @marseloid — открыть Telegram"
          >
            <BrandTelegram aria-hidden size={15} />
            <span>Сайт разработан: @marseloid</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
