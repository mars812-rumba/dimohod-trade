import type { MediaItem } from "./api";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function loadImage(image: MediaItem | null | undefined): Promise<string | null> {
  if (!image || typeof window === "undefined") return null;
  const raw = image.thumbnail_url ?? image.url;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const url = new URL(raw.startsWith("/media/") ? `${base}${raw}` : raw, window.location.origin);
  // PDF images are fetched only from the application's own media service.
  if (url.origin !== window.location.origin) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.size > MAX_IMAGE_BYTES) return null;
    const bitmap = await createImageBitmap(blob);
    try {
      const scale = Math.min(1, 160 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadEstimatePdfImages(
  images: Array<MediaItem | null | undefined>,
): Promise<Array<string | null>> {
  const cache = new Map<string, Promise<string | null>>();
  const result: Array<string | null> = [];
  // Limit concurrent decodes and retain input order, including missing images.
  for (let offset = 0; offset < images.length; offset += 4) {
    result.push(...await Promise.all(images.slice(offset, offset + 4).map(image => {
      if (!image) return null;
      const key = image.thumbnail_url ?? image.url;
      if (!cache.has(key)) cache.set(key, loadImage(image));
      return cache.get(key)!;
    })));
  }
  return result;
}
