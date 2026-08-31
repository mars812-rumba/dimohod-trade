"use client";

import { useSyncExternalStore } from "react";

export type CartItem = {
  skuId: string;
  productId: string;
  productSlug: string;
  productName: string;
  article: string;
  skuName: string;
  quantity: number;
  unitPriceRub: number | null;
  characteristics: string[];
  imageUrl: string | null;
  addedAt: string;
};

export type CartItemInput = Omit<CartItem, "quantity" | "addedAt">;

const STORAGE_KEY = "dimohod_trade_cart_v1";
const CART_EVENT = "dimohod:cart-change";
const EMPTY_CART: CartItem[] = [];
let currentCart = EMPTY_CART;
let hydrated = false;

function text(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function normalizeItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const skuId = text(item.skuId, 80);
  const productId = text(item.productId, 80);
  const productSlug = text(item.productSlug, 180);
  const productName = text(item.productName, 240);
  const article = text(item.article, 120);
  const skuName = text(item.skuName, 220);
  if (!skuId || !productId || !productSlug || !productName || !article || !skuName) return null;
  const quantity = Number(item.quantity);
  const rawPrice = item.unitPriceRub;
  const price = rawPrice === null ? null : Number(rawPrice);
  const characteristics = Array.isArray(item.characteristics)
    ? item.characteristics.flatMap((entry) => text(entry, 180) ?? []).slice(0, 20)
    : [];
  return {
    skuId,
    productId,
    productSlug,
    productName,
    article,
    skuName,
    quantity: Number.isInteger(quantity) ? Math.min(999, Math.max(1, quantity)) : 1,
    unitPriceRub: price !== null && Number.isFinite(price) && price >= 0 ? price : null,
    characteristics,
    imageUrl: text(item.imageUrl, 1200),
    addedAt: text(item.addedAt, 40) ?? new Date().toISOString(),
  };
}

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
    const values = parsed && typeof parsed === "object" && "items" in parsed
      ? (parsed as { items?: unknown }).items
      : null;
    if (!Array.isArray(values)) return EMPTY_CART;
    return values.flatMap((item) => normalizeItem(item) ?? []).slice(0, 100);
  } catch {
    return EMPTY_CART;
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  currentCart = readStorage();
  hydrated = true;
}

function publish(items: CartItem[]) {
  currentCart = items;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }));
  } catch {
    // The in-memory cart remains usable when storage is blocked or full.
  }
  window.dispatchEvent(new Event(CART_EVENT));
}

function subscribe(callback: () => void) {
  hydrate();
  const handleCart = () => callback();
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    currentCart = readStorage();
    hydrated = true;
    callback();
  };
  window.addEventListener(CART_EVENT, handleCart);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CART_EVENT, handleCart);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  hydrate();
  return currentCart;
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_CART);
  return {
    items,
    totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
    knownTotalRub: items.reduce(
      (sum, item) => sum + (item.unitPriceRub === null ? 0 : item.unitPriceRub * item.quantity),
      0,
    ),
    unpricedCount: items.filter((item) => item.unitPriceRub === null).length,
  };
}

export function addCartItem(input: CartItemInput, quantity = 1) {
  hydrate();
  const safeQuantity = Math.min(999, Math.max(1, Math.round(quantity)));
  const existing = currentCart.find((item) => item.skuId === input.skuId);
  const next = existing
    ? currentCart.map((item) => item.skuId === input.skuId
      ? { ...item, ...input, quantity: Math.min(999, item.quantity + safeQuantity) }
      : item)
    : [...currentCart, { ...input, quantity: safeQuantity, addedAt: new Date().toISOString() }];
  publish(next);
}

export function updateCartQuantity(skuId: string, quantity: number) {
  hydrate();
  if (!Number.isInteger(quantity) || quantity < 1) return;
  publish(currentCart.map((item) => item.skuId === skuId
    ? { ...item, quantity: Math.min(999, quantity) }
    : item));
}

export function removeCartItem(skuId: string) {
  hydrate();
  publish(currentCart.filter((item) => item.skuId !== skuId));
}

export function clearCart() {
  publish(EMPTY_CART);
}
