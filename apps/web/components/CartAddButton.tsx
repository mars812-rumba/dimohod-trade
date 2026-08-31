"use client";

import { Check, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { addCartItem, type CartItemInput, useCart } from "@/lib/cart";

export function CartAddButton({
  item,
  className = "cart-add-button",
  compact = false,
}: {
  item: CartItemInput;
  className?: string;
  compact?: boolean;
}) {
  const { items } = useCart();
  const cartItem = items.find((candidate) => candidate.skuId === item.skuId);
  const wrapperClassName = `${className.trim().split(/\s+/).at(-1) ?? "cart-add-button"}-wrap`;

  return (
    <div className={wrapperClassName}>
      <button
        className={className}
        onClick={() => addCartItem(item)}
        type="button"
      >
        {cartItem ? <Check aria-hidden size={17} /> : <ShoppingCart aria-hidden size={17} />}
        {cartItem ? (compact ? `В корзине · ${cartItem.quantity}` : `Добавить ещё · в корзине ${cartItem.quantity}`) : "В корзину"}
      </button>
      {cartItem && !compact ? <Link href="/cart">Открыть корзину</Link> : null}
      <span className="sr-only" aria-live="polite">
        {cartItem ? `${item.productName} в корзине, количество ${cartItem.quantity}` : ""}
      </span>
    </div>
  );
}
