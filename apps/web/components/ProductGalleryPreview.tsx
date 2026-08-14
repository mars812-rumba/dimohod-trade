"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { MediaItem } from "@/lib/api";
import type { SteelBadge } from "@/lib/steelSelection";
import { YandexRatingBadge } from "./YandexRatingBadge";
import styles from "../app/page.module.css";

type ProductGalleryPreviewProps = {
  media: MediaItem[];
  productName: string;
  badges: SteelBadge[];
  connectionTechnology?: string;
};

const roleLabels: Record<string, string> = {
  general: "Общий вид",
  top: "Вид сверху",
  connection: "Соединение",
  installed: "В монтаже",
  dimensions: "Размеры",
};

function roleLabel(role: string | null, index: number) {
  return role ? roleLabels[role] ?? role : `Фото ${index + 1}`;
}

export function ProductGalleryPreview({
  media,
  productName,
  badges,
  connectionTechnology,
}: ProductGalleryPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = media[selectedIndex] ?? media[0];

  if (!selected) {
    return null;
  }

  return (
    <div className={styles.productPreviewGallery}>
      <div className={styles.productCardImage} aria-live="polite">
        <YandexRatingBadge />
        <Image
          key={selected.thumbnail_url ?? selected.url}
          src={selected.thumbnail_url ?? selected.url}
          alt={selected.alt ?? `${productName} — ${roleLabel(selected.role, selectedIndex)}`}
          fill
          loading="lazy"
          unoptimized
          sizes="(max-width: 720px) calc(100vw - 30px), 480px"
        />
        {selected.role === "connection" && connectionTechnology ? (
          <div className="product-image-technology-badge">
            <Sparkles aria-hidden="true" size={13} strokeWidth={1.8} />
            <span>{connectionTechnology}</span>
          </div>
        ) : null}
        {badges.length > 0 ? (
          <div className="product-image-badges" aria-label="Характеристики выбранного варианта">
            {badges.map((badge) => (
              <span
                className={`product-image-badge product-image-badge-${badge.tone}`}
                key={`${badge.tone}-${badge.label}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {media.length > 1 ? (
        <div className={styles.productPreviewThumbs} aria-label={`Галерея товара «${productName}»`}>
          {media.map((item, index) => {
            const label = roleLabel(item.role, index);
            const active = index === selectedIndex;
            return (
              <button
                aria-label={`Показать: ${label}`}
                aria-pressed={active}
                className={`${styles.productPreviewThumb} ${active ? styles.productPreviewThumbActive : ""}`}
                key={item.url}
                onClick={() => setSelectedIndex(index)}
                type="button"
              >
                <span className={styles.productPreviewThumbImage}>
                  <Image
                    src={item.thumbnail_url ?? item.url}
                    alt=""
                    aria-hidden="true"
                    fill
                    loading="lazy"
                    unoptimized
                    sizes="96px"
                  />
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
