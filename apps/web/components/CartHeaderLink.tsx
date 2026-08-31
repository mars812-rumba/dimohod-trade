"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartHeaderLink({ mobile = false, onClick }: { mobile?: boolean; onClick?: () => void }) {
  const { totalUnits } = useCart();
  return (
    <Link
      aria-label={totalUnits ? `Корзина, товаров: ${totalUnits}` : "Корзина пуста"}
      className={mobile ? "mobile-menu-cart" : "header-cart"}
      href="/cart"
      onClick={onClick}
    >
      <ShoppingCart aria-hidden size={mobile ? 17 : 18} />
      <span>Корзина</span>
      {totalUnits ? <strong aria-hidden>{totalUnits > 99 ? "99+" : totalUnits}</strong> : null}
    </Link>
  );
}
