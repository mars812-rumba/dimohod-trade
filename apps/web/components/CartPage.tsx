"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ChimneyEstimate } from "@/lib/chimneyEstimate";
import { clearCart, removeCartItem, updateCartQuantity, useCart } from "@/lib/cart";
import { METRIKA_GOALS } from "@/lib/metrika";
import { EstimateLeadDialog } from "./EstimateLeadDialog";
import styles from "./CartPage.module.css";

function rub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CartPage() {
  const { items, knownTotalRub, totalUnits, unpricedCount } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const estimate = useMemo<ChimneyEstimate>(() => ({
    profileName: "Корзина товаров из каталога",
    generatedAt: new Date(),
    measurements: [{ label: "Источник", value: "Каталог товаров" }],
    lines: items.map((item) => ({
      key: `cart-${item.skuId}`,
      skuId: item.skuId,
      label: item.productName,
      article: item.article,
      skuName: item.skuName,
      quantity: item.quantity,
      unitPriceRub: item.unitPriceRub,
      lineTotalRub: item.unitPriceRub === null ? null : item.unitPriceRub * item.quantity,
      characteristics: item.characteristics,
      note: "Добавлено клиентом из каталога",
      matchStatus: "exact",
    })),
    knownSubtotalRub: knownTotalRub,
    pricedLineCount: items.length - unpricedCount,
    unpricedLineCount: unpricedCount,
    totalUnits,
    removedLabels: [],
    reviewItems: unpricedCount
      ? ["Уточнить актуальную цену позиций, отмеченных «По запросу»."]
      : [],
    calculationErrors: [],
  }), [items, knownTotalRub, totalUnits, unpricedCount]);

  if (submitted) {
    return (
      <main className={styles.page}>
        <section className={styles.empty} role="status">
          <ShoppingCart aria-hidden size={28} />
          <h1>Заявка с корзиной отправлена</h1>
          <p>Менеджер получил точные артикулы и количество. Корзину на этом устройстве очистили.</p>
          <Link href="/catalog">Вернуться в каталог</Link>
        </section>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className={styles.page}>
        <section className={styles.empty}>
          <ShoppingCart aria-hidden size={28} />
          <h1>Корзина пока пуста</h1>
          <p>Добавляйте конкретные исполнения товаров из каталога. Регистрация не нужна.</p>
          <Link href="/catalog">Перейти в каталог</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Корзина</h1>
          <p>Список хранится только в этом браузере. Перед заказом менеджер проверит совместимость, наличие и цены.</p>
        </div>
        <button
          className={styles.clear}
          onClick={() => {
            if (window.confirm("Удалить все товары из корзины?")) clearCart();
          }}
          type="button"
        >Очистить корзину</button>
      </header>

      <div className={styles.layout}>
        <section aria-label="Товары в корзине" className={styles.items}>
          {items.map((item) => (
            <article className={styles.item} key={item.skuId}>
              <Link className={styles.image} href={`/product/${item.productSlug}?sku=${encodeURIComponent(item.skuId)}`}>
                {item.imageUrl ? <img alt="" src={item.imageUrl} /> : <ShoppingCart aria-hidden size={24} />}
              </Link>
              <div className={styles.itemBody}>
                <Link href={`/product/${item.productSlug}?sku=${encodeURIComponent(item.skuId)}`}>
                  <strong>{item.productName}</strong>
                </Link>
                <span>Арт. {item.article}</span>
                {item.characteristics.length ? <small>{item.characteristics.join(" · ")}</small> : null}
              </div>
              <div className={styles.quantity} aria-label={`Количество ${item.productName}`}>
                <button
                  aria-label={`Уменьшить количество ${item.productName}`}
                  disabled={item.quantity <= 1}
                  onClick={() => updateCartQuantity(item.skuId, item.quantity - 1)}
                  type="button"
                ><Minus aria-hidden size={15} /></button>
                <input
                  aria-label={`Количество ${item.productName}`}
                  inputMode="numeric"
                  min="1"
                  max="999"
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 1) updateCartQuantity(item.skuId, value);
                  }}
                  type="number"
                  value={item.quantity}
                />
                <button
                  aria-label={`Увеличить количество ${item.productName}`}
                  disabled={item.quantity >= 999}
                  onClick={() => updateCartQuantity(item.skuId, item.quantity + 1)}
                  type="button"
                ><Plus aria-hidden size={15} /></button>
              </div>
              <div className={styles.price}>
                <span>{item.unitPriceRub === null ? "Цена по запросу" : rub(item.unitPriceRub)}</span>
                <strong>{item.unitPriceRub === null ? "—" : rub(item.unitPriceRub * item.quantity)}</strong>
              </div>
              <button
                aria-label={`Удалить ${item.productName} из корзины`}
                className={styles.remove}
                onClick={() => removeCartItem(item.skuId)}
                type="button"
              ><Trash2 aria-hidden size={17} /></button>
            </article>
          ))}
        </section>

        <aside className={styles.summary}>
          <h2>Заявка на товары</h2>
          <dl>
            <div><dt>Позиций</dt><dd>{items.length}</dd></div>
            <div><dt>Количество</dt><dd>{totalUnits} шт.</dd></div>
            {unpricedCount ? <div><dt>Без цены</dt><dd>{unpricedCount}</dd></div> : null}
          </dl>
          <div className={styles.total}>
            <span>{unpricedCount ? "Итого по известным ценам" : "Итого"}</span>
            <strong>{rub(knownTotalRub)}</strong>
          </div>
          <EstimateLeadDialog
            buttonLabel="Отправить заявку"
            description="Приложим список товаров и PDF. Менеджер проверит исполнения, совместимость и актуальные цены."
            estimate={estimate}
            heading="Отправить корзину менеджеру"
            metrikaGoal={METRIKA_GOALS.catalogCartSent}
            onSubmitted={() => {
              clearCart();
              setSubmitted(true);
            }}
            source="catalog-cart"
            submitLabel="Отправить товары"
            triggerClassName={styles.submit}
          />
          <p className={styles.disclaimer}>Это заявка на проверку, а не автоматическое оформление и оплата заказа.</p>
        </aside>
      </div>
    </main>
  );
}
