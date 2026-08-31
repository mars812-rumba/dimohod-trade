"use client";

import {
  IconAdjustmentsHorizontal as SlidersHorizontal,
  IconChevronDown as ChevronDown,
  IconMail as Mail,
  IconMapPin as MapPin,
  IconMenu2 as Menu,
  IconPhone as Phone,
  IconRuler as Ruler,
  IconX as X,
} from "@tabler/icons-react";
import { Construction } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CategoryNode, CatalogTreeResponse } from "@/lib/api";
import { InstallAppButton } from "./InstallAppButton";
import { CartHeaderLink } from "./CartHeaderLink";
import {
  personalDataConsentPath,
  privacyPolicyPath,
  userAgreementPath,
} from "@/lib/privacy";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function CategoryLinks({
  categories,
  closeMenu,
}: {
  categories: CategoryNode[];
  closeMenu: () => void;
}) {
  return (
    <ul className="mobile-menu-categories">
      {categories.map((category) => (
        <li key={category.id}>
          {category.children.length ? (
            <details>
              <summary>
                <span>{category.name}</span>
                <ChevronDown aria-hidden size={15} />
              </summary>
              <CategoryLinks categories={category.children} closeMenu={closeMenu} />
            </details>
          ) : (
            <Link href={`/catalog/${category.slug}`} onClick={closeMenu}>
              {category.name}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function DesktopCategoryLinks({ categories }: { categories: CategoryNode[] }) {
  return (
    <ul className="desktop-nav-categories">
      {categories.map((category) => (
        <li key={category.id}>
          <Link href={`/catalog/${category.slug}`}>{category.name}</Link>
          {category.children.length ? (
            <DesktopCategoryLinks categories={category.children} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/api/v1/catalog/tree`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Catalog tree request failed");
        return response.json() as Promise<CatalogTreeResponse>;
      })
      .then((data) => setCategories(data.items))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  function openMenu() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    document.body.classList.add("mobile-menu-open");
    setIsOpen(true);
  }

  function closeMenu() {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }

  function handleDialogClose() {
    document.body.classList.remove("mobile-menu-open");
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <header className="site-header">
        <div className="header-brand-group">
          <button
            ref={triggerRef}
            aria-controls="mobile-site-menu"
            aria-expanded={isOpen}
            aria-label="Открыть меню"
            className="mobile-menu-trigger"
            onClick={openMenu}
            type="button"
          >
            <Menu aria-hidden size={21} />
          </button>
          <Link href="/" className="brand" aria-label="Дымоход Трейд — главная">
            <img
              alt=""
              className="brand-logo"
              height="51"
              src={`${basePath}/brand/logo-original.jpg`}
              width="112"
            />
          </Link>
        </div>

        <nav className="top-nav" aria-label="Основная навигация">
          <details className="desktop-nav-menu">
            <summary>
              <span>Каталог</span>
              <ChevronDown aria-hidden size={14} />
            </summary>
            <div className="desktop-nav-dropdown desktop-nav-dropdown-catalog">
              <Link className="desktop-nav-all" href="/catalog">Все категории</Link>
              {categories.length ? <DesktopCategoryLinks categories={categories} /> : null}
            </div>
          </details>
          <Link href="/pechi">Печи</Link>
          <details className="desktop-nav-menu">
            <summary>
              <span>Решения</span>
              <ChevronDown aria-hidden size={14} />
            </summary>
            <div className="desktop-nav-dropdown">
              <Link className="desktop-nav-all" href="/solutions">Все сценарии</Link>
              <Link href="/solutions/banya">Для бани и сауны</Link>
              <Link href="/solutions/dom">Для частного дома</Link>
              <Link href="/solutions/pech">Для отопительной печи</Link>
              <Link href="/solutions/kamin">Для камина</Link>
              <Link href="/solutions/tverdotoplivny-kotel">Для твердотопливного котла</Link>
              <Link href="/solutions/gazovyy-kotel">Для газового котла</Link>
            </div>
          </details>
          <Link href="/guides">Статьи</Link>
          <Link href="/delivery">Доставка</Link>
          <details className="desktop-nav-menu desktop-nav-menu-end">
            <summary>
              <span>Ещё</span>
              <ChevronDown aria-hidden size={14} />
            </summary>
            <div className="desktop-nav-dropdown">
              <Link href="/configurator">Сохранённые расчёты</Link>
              <Link href="/#send-materials">Отправить фото или схему</Link>
              <span className="desktop-nav-label">Документы</span>
              <Link href={privacyPolicyPath}>Политика персональных данных</Link>
              <Link href={personalDataConsentPath}>Согласие на обработку данных</Link>
              <Link href={userAgreementPath}>Пользовательское соглашение</Link>
            </div>
          </details>
        </nav>

        <div className="header-right">
          <div className="header-install">
            <InstallAppButton />
          </div>
          <CartHeaderLink />
          <a
            aria-label="Позвонить: +7 965 075-65-55"
            className="header-phone"
            href="tel:+79650756555"
            title="Позвонить"
          >
            <Phone aria-hidden size={17} />
            <span>+7 (965) 075-65-55</span>
          </a>
          <Link className="header-configurator" href="/raschet">
            <SlidersHorizontal aria-hidden size={17} />
            <span>Начать <span className="header-configurator-extra">замер</span></span>
          </Link>
        </div>
      </header>

      <dialog
        aria-labelledby="mobile-menu-title"
        className="mobile-menu-dialog"
        id="mobile-site-menu"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        onClose={handleDialogClose}
        ref={dialogRef}
      >
        <div className="mobile-menu-panel">
          <div className="mobile-menu-head">
            <Link href="/" onClick={closeMenu}>
              <img
                alt="Дымоход Трейд"
                height="51"
                src={`${basePath}/brand/logo-original.jpg`}
                width="112"
              />
            </Link>
            <button autoFocus aria-label="Закрыть меню" onClick={closeMenu} type="button">
              <X aria-hidden size={22} />
            </button>
          </div>

          <nav aria-labelledby="mobile-menu-title" className="mobile-menu-nav">
            <h2 id="mobile-menu-title">Разделы сайта</h2>
            <Link href="/" onClick={closeMenu}>Главная</Link>
            <details className="mobile-menu-catalog">
              <summary>
                <span>Каталог</span>
                <ChevronDown aria-hidden size={17} />
              </summary>
              <div className="mobile-menu-catalog-body">
                <Link href="/catalog" onClick={closeMenu}>Все категории</Link>
                {categories.length ? (
                  <CategoryLinks categories={categories} closeMenu={closeMenu} />
                ) : null}
              </div>
            </details>
            <CartHeaderLink mobile onClick={closeMenu} />
            <Link href="/pechi" onClick={closeMenu}>Печи</Link>
            <details className="mobile-menu-catalog">
              <summary>
                <span>Решения</span>
                <ChevronDown aria-hidden size={17} />
              </summary>
              <div className="mobile-menu-catalog-body">
                <Link href="/solutions" onClick={closeMenu}>Все сценарии</Link>
                <Link href="/solutions/banya" onClick={closeMenu}>Для бани и сауны</Link>
                <Link href="/solutions/dom" onClick={closeMenu}>Для частного дома</Link>
                <Link href="/solutions/pech" onClick={closeMenu}>Для отопительной печи</Link>
                <Link href="/solutions/kamin" onClick={closeMenu}>Для камина</Link>
                <Link href="/solutions/tverdotoplivny-kotel" onClick={closeMenu}>
                  Для твердотопливного котла
                </Link>
                <Link href="/solutions/gazovyy-kotel" onClick={closeMenu}>
                  Для газового котла
                </Link>
              </div>
            </details>
            <Link href="/guides" onClick={closeMenu}>Статьи и инструкции</Link>
            <Link href="/delivery" onClick={closeMenu}>Доставка по России</Link>
            <Link className="mobile-menu-path mobile-menu-path-primary" href="/raschet" onClick={closeMenu}>
              <Ruler aria-hidden size={18} />
              <span><strong>Начать замер</strong><small>Выберите быстрый расчёт или глубокий замер</small></span>
            </Link>
            <Link className="mobile-menu-feature-link" href="/configurator" onClick={closeMenu}>
              <span><Construction aria-hidden size={17} /> Сохранённые расчёты</span>
            </Link>
            <Link href="/#send-materials" onClick={closeMenu}>Отправить фото или схему</Link>
            <div className="mobile-menu-legal" aria-label="Правовые документы">
              <p className="mobile-menu-legal-title">Документы</p>
              <Link href={privacyPolicyPath} onClick={closeMenu}>Политика персональных данных</Link>
              <Link href={personalDataConsentPath} onClick={closeMenu}>Согласие на обработку данных</Link>
              <Link href={userAgreementPath} onClick={closeMenu}>Пользовательское соглашение</Link>
            </div>
          </nav>

          <div className="mobile-menu-footer">
            <a href="tel:+79650756555">
              <Phone aria-hidden size={16} />
              <span>+7 (965) 075-65-55</span>
            </a>
            <a href="mailto:office@dimohod-trade.pro">
              <Mail aria-hidden size={16} />
              <span>office@dimohod-trade.pro</span>
            </a>
            <p>
              <MapPin aria-hidden size={16} />
              <span>Санкт-Петербург · доставка по России</span>
            </p>
            <div className="mobile-menu-install">
              <InstallAppButton />
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
