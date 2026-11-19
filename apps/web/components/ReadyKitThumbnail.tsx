"use client";

import Link from "next/link";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import type { MediaItem } from "@/lib/api";
import styles from "./ReadyKit.module.css";

export function ReadyKitThumbnail({ image, href, name }: { image: MediaItem | null; href: string; name: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const raw = image?.thumbnail_url ?? image?.url;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const src = raw?.startsWith("/media/") ? `${base}${raw}` : raw;
  return <Link className={styles.itemThumb} href={href} aria-label={`Открыть товар «${name}»`}>
    {src && failed !== src ? <img src={src} alt={image?.alt ?? `${name}, общий вид`} width={72} height={72}
      decoding="async" loading="lazy" onError={() => setFailed(src)} />
      : <span><ImageOff aria-hidden size={22} /><span>Фото уточняется</span></span>}
  </Link>;
}
