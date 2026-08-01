"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { DimensionScheme } from "./DimensionScheme";
import styles from "./AdminCatalogManager.module.css";

type AdminCategory = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  product_count: number;
  media_count: number;
  extra_attributes: Record<string, unknown>;
};

type AdminProductListItem = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  slug: string;
  product_kind: string | null;
  sku_count: number;
  media_count: number;
  is_active: boolean;
};

type AdminMediaItem = {
  url: string;
  alt: string | null;
  role: string | null;
  file_name: string | null;
};

type AdminSKU = {
  id: string;
  product_id: string;
  article: string;
  name: string;
  slug: string | null;
  material: string | null;
  steel_grade: string | null;
  wall_thickness_mm: string | null;
  diameter_mm: number | null;
  outer_diameter_mm: number | null;
  contour: string | null;
  insulation_mm: number | null;
  length_mm: number | null;
  angle_deg: number | null;
  price_rub: string | null;
  stock_status: string;
  attributes: Record<string, unknown>;
  is_active: boolean;
};

type AdminSKUListItem = AdminSKU & {
  product_name: string;
  product_slug: string;
  product_kind: string | null;
  category_id: string;
  category_name: string;
};

type AdminProduct = AdminProductListItem & {
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  steel_grade: string | null;
  wall_thickness_mm: string | null;
  diameter_mm: number | null;
  contour: string | null;
  insulation_mm: number | null;
  max_temperature_c: number | null;
  purpose: string[];
  extra_attributes: Record<string, unknown>;
  application_tags: string[];
  compatibility_notes: string | null;
  media: AdminMediaItem[];
  skus: AdminSKU[];
};

type SKUFormState = {
  id: string | null;
  article: string;
  name: string;
  slug: string;
  material: string;
  steel_grade: string;
  wall_thickness_mm: string;
  diameter_mm: string;
  outer_diameter_mm: string;
  contour: string;
  insulation_mm: string;
  length_mm: string;
  angle_deg: string;
  price_rub: string;
  stock_status: string;
  attributesText: string;
  is_active: boolean;
};

type PhotoRole = "general" | "top" | "connection";

type PhotoDraft = {
  file: File | null;
  previewUrl: string | null;
  alt: string;
};

class ApiRequestError extends Error {
  status: number;
  url: string;

  constructor(status: number, url: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.url = url;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const allCategoriesId = "all";
const skuPageSize = 200;
const maxPhotoBytes = 8 * 1024 * 1024;
const photoSlots: Array<{ role: PhotoRole; number: string; title: string; hint: string }> = [
  { role: "general", number: "01", title: "Фото 1", hint: "Общий вид" },
  { role: "top", number: "02", title: "Фото 2", hint: "Вид сверху" },
  { role: "connection", number: "03", title: "Фото 3", hint: "Узел соединения" },
];

function createEmptyPhotoDrafts(): Record<PhotoRole, PhotoDraft> {
  return {
    general: { file: null, previewUrl: null, alt: "" },
    top: { file: null, previewUrl: null, alt: "" },
    connection: { file: null, previewUrl: null, alt: "" },
  };
}

const emptySkuForm: SKUFormState = {
  id: null,
  article: "",
  name: "",
  slug: "",
  material: "",
  steel_grade: "",
  wall_thickness_mm: "",
  diameter_mm: "",
  outer_diameter_mm: "",
  contour: "",
  insulation_mm: "",
  length_mm: "",
  angle_deg: "",
  price_rub: "",
  stock_status: "unknown",
  attributesText: "{}",
  is_active: true,
};

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать выбранный файл"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Не удалось прочитать выбранный файл"));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function formatApiDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const location = "loc" in item && Array.isArray(item.loc) ? item.loc.join(" → ") : "поле";
          return `${location}: ${String(item.msg)}`;
        }
        return JSON.stringify(item);
      })
      .join("\n");
  }
  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return "Запрос не выполнен";
}

function skuToForm(sku: AdminSKU): SKUFormState {
  return {
    id: sku.id,
    article: sku.article,
    name: sku.name,
    slug: sku.slug ?? "",
    material: sku.material ?? "",
    steel_grade: sku.steel_grade ?? "",
    wall_thickness_mm: sku.wall_thickness_mm ?? "",
    diameter_mm: sku.diameter_mm?.toString() ?? "",
    outer_diameter_mm: sku.outer_diameter_mm?.toString() ?? "",
    contour: sku.contour ?? "",
    insulation_mm: sku.insulation_mm?.toString() ?? "",
    length_mm: sku.length_mm?.toString() ?? "",
    angle_deg: sku.angle_deg?.toString() ?? "",
    price_rub: sku.price_rub ?? "",
    stock_status: sku.stock_status,
    attributesText: JSON.stringify(sku.attributes ?? {}, null, 2),
    is_active: sku.is_active,
  };
}

async function apiRequestWithStatus<T>(path: string, init?: RequestInit): Promise<{ data: T; status: number }> {
  const requestUrl = buildBackendUrl(path);
  const response = await fetch(requestUrl, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiRequestError(response.status, requestUrl, formatApiDetail(body?.detail));
  }

  return { data: (await response.json()) as T, status: response.status };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiRequestWithStatus<T>(path, init);
  return response.data;
}

function buildBackendUrl(path: string): string {
  return apiBaseUrl ? `${apiBaseUrl}${path}` : `${appBasePath}${path}`;
}

export default function AdminCatalogManager() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(allCategoriesId);
  const [skuItems, setSkuItems] = useState<AdminSKUListItem[]>([]);
  const [skuTotal, setSkuTotal] = useState(0);
  const [skuOffset, setSkuOffset] = useState(0);
  const [skuSearch, setSkuSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [skuForm, setSkuForm] = useState<SKUFormState>(emptySkuForm);
  const [photoDrafts, setPhotoDrafts] = useState<Record<PhotoRole, PhotoDraft>>(createEmptyPhotoDrafts);
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const totalSkuCount = useMemo(
    () => categories.reduce((sum, category) => sum + category.product_count, 0),
    [categories],
  );
  const pendingPhotoCount = photoSlots.filter(({ role }) => photoDrafts[role].file).length;
  const normalizedProductName = selectedProduct?.name.toLocaleLowerCase("ru-RU") ?? "";
  const hasConeTerminationScheme =
    normalizedProductName.includes("конус") &&
    (normalizedProductName.includes("дефлектор") || normalizedProductName.includes("оголовок"));

  async function loadCategories() {
    const data = await apiRequest<AdminCategory[]>("/api/v1/admin/categories");
    setCategories(data);
  }

  async function loadSkus(categoryId = selectedCategoryId, offset = skuOffset) {
    const params = new URLSearchParams({ limit: String(skuPageSize), offset: String(offset) });
    if (categoryId !== allCategoriesId) {
      params.set("category_id", categoryId);
    }
    if (skuSearch.trim()) {
      params.set("search", skuSearch.trim());
    }
    const data = await apiRequest<{ items: AdminSKUListItem[]; total: number; offset: number }>(
      `/api/v1/admin/skus?${params.toString()}`,
    );
    setSkuItems(data.items);
    setSkuTotal(data.total);
    setSkuOffset(data.offset);
  }

  async function loadProduct(productId: string, skuId?: string) {
    const data = await apiRequest<AdminProduct>(`/api/v1/admin/products/${productId}`);
    setSelectedProduct(data);
    const selectedSku = skuId ? data.skus.find((sku) => sku.id === skuId) : data.skus[0];
    setSkuForm(selectedSku ? skuToForm(selectedSku) : emptySkuForm);
  }

  useEffect(() => {
    loadCategories().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    setSelectedProduct(null);
    setSkuForm(emptySkuForm);
    loadSkus(selectedCategoryId, 0).catch((error) => setStatus(error.message));
  }, [selectedCategoryId]);

  useEffect(() => {
    resetPhotoDrafts();
  }, [selectedProduct?.id]);

  async function refreshCurrentProduct(skuId?: string) {
    if (!selectedProduct) {
      return;
    }
    await loadProduct(selectedProduct.id, skuId);
    await loadSkus();
  }

  function updateForm(field: keyof SKUFormState, value: string | boolean) {
    setSkuForm((current) => ({ ...current, [field]: value }));
  }

  function resetPhotoDrafts() {
    setPhotoDrafts((current) => {
      Object.values(current).forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });
      return createEmptyPhotoDrafts();
    });
  }

  function updatePhotoDraft(role: PhotoRole, patch: Partial<PhotoDraft>) {
    setPhotoDrafts((current) => ({
      ...current,
      [role]: { ...current[role], ...patch },
    }));
  }

  function selectPhoto(role: PhotoRole, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const currentPreview = photoDrafts[role].previewUrl;
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }
    updatePhotoDraft(role, {
      file,
      previewUrl: file ? URL.createObjectURL(file) : null,
    });
    event.target.value = "";
  }

  function clearPhotoDraft(role: PhotoRole) {
    const currentPreview = photoDrafts[role].previewUrl;
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }
    updatePhotoDraft(role, { file: null, previewUrl: null });
  }

  async function persistPhotoDraft(role: PhotoRole, draft: PhotoDraft) {
    if (!selectedProduct || !draft.file) {
      throw new Error("Фото не выбрано");
    }

    const contentBase64 = await fileToBase64(draft.file);
    const uploadResponse = await apiRequestWithStatus<AdminProduct>(
      `/api/v1/admin/products/${selectedProduct.id}/photos`,
      {
        method: "POST",
        body: JSON.stringify({
          file_name: draft.file.name,
          content_base64: contentBase64,
          role,
          alt: textOrNull(draft.alt),
        }),
      },
    );
    const uploadedMedia =
      uploadResponse.data.media.find((item) => item.role === role) ?? uploadResponse.data.media.at(-1);
    if (!uploadedMedia) {
      throw new Error("Backend принял файл, но не вернул его в media форм-фактора");
    }

    const mediaUrl = buildBackendUrl(uploadedMedia.url);
    const mediaResponse = await fetch(mediaUrl, { cache: "no-store" });
    if (!mediaResponse.ok) {
      throw new ApiRequestError(mediaResponse.status, mediaUrl, "Фото записано, но URL изображения недоступен");
    }

    return {
      product: uploadResponse.data,
      uploadStatus: uploadResponse.status,
      mediaStatus: mediaResponse.status,
      fileName: draft.file.name,
    };
  }

  async function saveSku(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }

    let attributes: Record<string, unknown>;
    try {
      attributes = JSON.parse(skuForm.attributesText) as Record<string, unknown>;
    } catch {
      const message = "Ошибка [CLIENT_VALIDATION]\nХарактеристики должны быть валидным JSON";
      setStatus("Характеристики должны быть валидным JSON");
      window.alert(message);
      return;
    }
    const oversizedPhoto = photoSlots.find(({ role }) => (photoDrafts[role].file?.size ?? 0) > maxPhotoBytes);
    if (oversizedPhoto) {
      const message = `Ошибка [CLIENT_VALIDATION]\n${oversizedPhoto.title} больше 8 МБ. Выберите файл меньшего размера`;
      setStatus("Фото больше 8 МБ. Выберите файл меньшего размера");
      window.alert(message);
      return;
    }

    const payload = {
      article: skuForm.article,
      name: skuForm.name,
      slug: textOrNull(skuForm.slug),
      material: textOrNull(skuForm.material),
      steel_grade: textOrNull(skuForm.steel_grade),
      wall_thickness_mm: textOrNull(skuForm.wall_thickness_mm),
      diameter_mm: numberOrNull(skuForm.diameter_mm),
      outer_diameter_mm: numberOrNull(skuForm.outer_diameter_mm),
      contour: textOrNull(skuForm.contour),
      insulation_mm: numberOrNull(skuForm.insulation_mm),
      length_mm: numberOrNull(skuForm.length_mm),
      angle_deg: numberOrNull(skuForm.angle_deg),
      price_rub: textOrNull(skuForm.price_rub),
      stock_status: skuForm.stock_status || "unknown",
      attributes,
      is_active: skuForm.is_active,
    };

    setIsBusy(true);
    setStatus("Сохраняю SKU...");
    let savedSku: AdminSKU | null = null;
    let successStatus: number | null = null;
    const savedPhotos: string[] = [];
    try {
      if (skuForm.id) {
        const response = await apiRequestWithStatus<AdminSKU>(`/api/v1/admin/skus/${skuForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        savedSku = response.data;
        successStatus = response.status;
      } else {
        const response = await apiRequestWithStatus<AdminSKU>(
          `/api/v1/admin/products/${selectedProduct.id}/skus`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        savedSku = response.data;
        successStatus = response.status;
      }
      const photoResults = [];
      for (const slot of photoSlots) {
        const draft = photoDrafts[slot.role];
        if (draft.file) {
          const result = await persistPhotoDraft(slot.role, draft);
          photoResults.push(result);
          savedPhotos.push(slot.title);
        }
      }
      await refreshCurrentProduct(savedSku.id);
      if (photoResults.length) {
        resetPhotoDrafts();
      }
      setStatus(photoResults.length ? `SKU и ${photoResults.length} фото сохранены` : "SKU сохранён");
      const photoStatus = photoResults.length
        ? `\nФото: ${photoResults.length} шт., UPLOAD HTTP ${photoResults.map((item) => item.uploadStatus).join(
            "/",
          )}, MEDIA HTTP ${photoResults.map((item) => item.mediaStatus).join("/")}`
        : "\nНовых фото не было";
      window.alert(`Успешно\nSKU: HTTP ${successStatus}, ${savedSku.article}${photoStatus}`);
    } catch (error) {
      const statusMessage = error instanceof Error ? error.message : "Не удалось сохранить SKU";
      setStatus(statusMessage);
      const partialSave = savedSku
        ? `SKU ${savedSku.article} сохранён (HTTP ${successStatus}). Фото сохранено: ${savedPhotos.length}.\n`
        : "";
      if (error instanceof ApiRequestError) {
        window.alert(`${partialSave}Ошибка [HTTP ${error.status}]\n${error.message}\n${error.url}`);
      } else {
        window.alert(`${partialSave}Ошибка [NETWORK]\n${statusMessage}`);
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function deactivateSelectedSku() {
    if (!skuForm.id) {
      return;
    }
    setIsBusy(true);
    setStatus("Отключаю SKU...");
    try {
      await apiRequest<AdminSKU>(`/api/v1/admin/skus/${skuForm.id}`, { method: "DELETE" });
      await refreshCurrentProduct();
      setStatus("SKU отключён");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось отключить SKU");
    } finally {
      setIsBusy(false);
    }
  }

  async function deletePhoto(index: number) {
    if (!selectedProduct) {
      return;
    }
    setIsBusy(true);
    setStatus("Удаляю фото из карточки...");
    try {
      const product = await apiRequest<AdminProduct>(
        `/api/v1/admin/products/${selectedProduct.id}/photos/${index}`,
        { method: "DELETE" },
      );
      setSelectedProduct(product);
      await loadSkus();
      setStatus("Фото убрано из карточки");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось убрать фото");
    } finally {
      setIsBusy(false);
    }
  }

  function submitSkuSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadSkus(selectedCategoryId, 0).catch((error) => setStatus(error.message));
  }

  return (
    <main className={styles.shell}>
      <div className={styles.topline}>
        <div>
          <h1 className={styles.title}>Админка каталога</h1>
          <p className={styles.subtitle}>
            Фото и схемы хранятся один раз на логический форм-фактор товара, размеры и цена — в SKU.
          </p>
        </div>
        <div className={styles.status}>{status}</div>
      </div>

      <section className={styles.workspace}>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Категории</h2>
            <span className={styles.badge}>{categories.length}</span>
          </div>
          <div className={styles.scrollList}>
            <button
              className={`${styles.rowButton} ${
                selectedCategoryId === allCategoriesId ? styles.rowButtonActive : ""
              }`}
              onClick={() => setSelectedCategoryId(allCategoriesId)}
              type="button"
            >
              <span>
                <span className={styles.rowTitle}>Все SKU</span>
                <span className={styles.rowMeta}>без фильтра по категории</span>
              </span>
              <span className={styles.badge}>{totalSkuCount}</span>
            </button>
            {categories.map((category) => (
              <button
                className={`${styles.rowButton} ${
                  category.id === selectedCategoryId ? styles.rowButtonActive : ""
                }`}
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                <span>
                  <span className={styles.rowTitle}>{category.name}</span>
                  <span className={styles.rowMeta}>
                    {category.slug} · SKU {category.product_count}
                  </span>
                </span>
                <span className={styles.badge}>{category.product_count}</span>
              </button>
            ))}
          </div>
        </aside>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>{selectedCategoryId === allCategoriesId ? "Все SKU" : selectedCategory?.name ?? "SKU"}</h2>
            <span className={styles.badge}>{skuTotal}</span>
          </div>
          <form className={styles.listControls} onSubmit={submitSkuSearch}>
            <input
              placeholder="Артикул, название или товар"
              value={skuSearch}
              onChange={(event) => setSkuSearch(event.target.value)}
            />
            <button className={styles.ghostButton} type="submit">
              Найти
            </button>
            <button className={styles.ghostButton} onClick={() => loadSkus()} type="button">
              <RefreshCcw size={15} /> Обновить
            </button>
          </form>
          <div className={styles.scrollList}>
            {skuItems.map((sku) => (
              <button
                className={`${styles.rowButton} ${
                  sku.id === skuForm.id ? styles.rowButtonActive : ""
                }`}
                key={sku.id}
                onClick={() => loadProduct(sku.product_id, sku.id).catch((error) => setStatus(error.message))}
                type="button"
              >
                <span>
                  <span className={styles.rowTitle}>{sku.article}</span>
                  <span className={styles.rowMeta}>
                    {sku.product_name} · d {sku.diameter_mm ?? "—"} · D {sku.outer_diameter_mm ?? "—"} · L{" "}
                    {sku.length_mm ?? "—"} · {sku.price_rub ?? "без цены"}
                  </span>
                </span>
                <span className={styles.badge}>{sku.is_active ? "on" : "off"}</span>
              </button>
            ))}
            {!skuItems.length ? <p className={styles.notice}>SKU не найдены.</p> : null}
          </div>
          <div className={styles.pager}>
            <button
              className={styles.ghostButton}
              disabled={skuOffset <= 0}
              onClick={() => loadSkus(selectedCategoryId, Math.max(0, skuOffset - skuPageSize))}
              type="button"
            >
              Назад
            </button>
            <span className={styles.rowMeta}>
              {skuTotal ? `${skuOffset + 1}-${Math.min(skuOffset + skuPageSize, skuTotal)} из ${skuTotal}` : "0 из 0"}
            </span>
            <button
              className={styles.ghostButton}
              disabled={skuOffset + skuPageSize >= skuTotal}
              onClick={() => loadSkus(selectedCategoryId, skuOffset + skuPageSize)}
              type="button"
            >
              Далее
            </button>
          </div>
        </aside>

        <section className={styles.panel}>
          {!selectedProduct ? (
            <p className={styles.notice}>Выберите SKU, чтобы управлять общими фото форм-фактора и характеристиками варианта.</p>
          ) : (
            <div className={styles.detail}>
              <div className={styles.productHead}>
                <h2>{selectedProduct.name}</h2>
                <span className={styles.muted}>
                  {selectedProduct.category_name} · {selectedProduct.slug} · SKU {selectedProduct.skus.length}
                </span>
              </div>

              <div className={styles.photoSlots}>
                {photoSlots.map((slot) => {
                  const draft = photoDrafts[slot.role];
                  const existingIndex = selectedProduct.media.findIndex(
                    (item) => item.role === slot.role || (slot.role === "connection" && item.role === "detail"),
                  );
                  const existing = existingIndex >= 0 ? selectedProduct.media[existingIndex] : null;
                  const previewSrc = draft.previewUrl ?? (existing ? buildBackendUrl(existing.url) : null);
                  const inputId = `photo-${selectedProduct.id}-${slot.role}`;

                  return (
                    <article className={styles.photoSlot} key={slot.role}>
                      <div className={styles.photoSlotHead}>
                        <span className={styles.photoNumber}>{slot.number}</span>
                        <span>
                          <strong>{slot.title}</strong>
                          <small>{slot.hint}</small>
                        </span>
                        <span className={draft.file ? styles.pendingBadge : styles.savedBadge}>
                          {draft.file ? "выбрано" : existing ? "сохранено" : "пусто"}
                        </span>
                      </div>

                      <div className={styles.photoPreview}>
                        {previewSrc ? (
                          <img alt={draft.alt || existing?.alt || `${selectedProduct.name}, ${slot.hint}`} src={previewSrc} />
                        ) : (
                          <div className={styles.photoPlaceholder}>
                            <ImagePlus size={24} />
                            <span>{slot.hint}</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.photoSlotActions}>
                        <input
                          accept="image/*"
                          className={styles.slotFileInput}
                          id={inputId}
                          onChange={(event) => selectPhoto(slot.role, event)}
                          type="file"
                        />
                        <label className={styles.fileButton} htmlFor={inputId}>
                          {previewSrc ? "Заменить файл" : "Выбрать файл"}
                        </label>
                        {draft.file ? (
                          <button className={styles.clearButton} onClick={() => clearPhotoDraft(slot.role)} type="button">
                            Отменить выбор
                          </button>
                        ) : existing ? (
                          <button
                            className={styles.clearButton}
                            disabled={isBusy}
                            onClick={() => deletePhoto(existingIndex)}
                            type="button"
                          >
                            Удалить
                          </button>
                        ) : null}
                      </div>

                      <label className={styles.photoAltField}>
                        Описание
                        <input
                          onChange={(event) => updatePhotoDraft(slot.role, { alt: event.target.value })}
                          placeholder={`${selectedProduct.name}, ${slot.hint.toLocaleLowerCase("ru-RU")}`}
                          value={draft.alt}
                        />
                      </label>
                      {draft.file ? <span className={styles.fileName}>{draft.file.name}</span> : null}
                    </article>
                  );
                })}
                {hasConeTerminationScheme ? (
                  <article className={`${styles.photoSlot} ${styles.schemeSlot}`}>
                    <div className={styles.photoSlotHead}>
                      <span className={styles.photoNumber}>04</span>
                      <span>
                        <strong>SVG-схема</strong>
                        <small>Размеры выбранного SKU</small>
                      </span>
                      <span className={styles.savedBadge}>авто</span>
                    </div>

                    <div className={`${styles.photoPreview} ${styles.schemePreview}`}>
                      <DimensionScheme
                        title={selectedProduct.name}
                        dimensions={{
                          L: skuForm.length_mm,
                          D: skuForm.outer_diameter_mm,
                          d: skuForm.diameter_mm,
                          S: skuForm.wall_thickness_mm,
                          insulation: skuForm.insulation_mm,
                        }}
                        steelGrade={textOrNull(skuForm.steel_grade) ?? selectedProduct.steel_grade}
                        material={textOrNull(skuForm.material) ?? selectedProduct.material}
                      />
                    </div>
                    <p className={styles.schemeNote}>
                      Контур общий для форм-фактора. Значения подставляются из выбранного SKU.
                    </p>
                  </article>
                ) : null}
              </div>

              <div className={styles.saveBar}>
                <span>
                  {pendingPhotoCount
                    ? `К сохранению: SKU и ${pendingPhotoCount} фото`
                    : "Изменения SKU и фотографии сохраняются вместе"}
                </span>
                <button className={styles.button} disabled={isBusy} form="sku-editor-form" type="submit">
                  <Save size={15} /> Сохранить всё{pendingPhotoCount ? ` · ${pendingPhotoCount} фото` : ""}
                </button>
              </div>

              <div className={styles.panelHeader}>
                <h2>SKU</h2>
                <button className={styles.ghostButton} onClick={() => setSkuForm(emptySkuForm)} type="button">
                  <Plus size={15} /> Новый SKU
                </button>
              </div>
              <div className={styles.scrollList}>
                <table className={styles.skuTable}>
                  <thead>
                    <tr>
                      <th>Артикул</th>
                      <th>D</th>
                      <th>d</th>
                      <th>L</th>
                      <th>Цена</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.skus.map((sku) => (
                      <tr className={sku.is_active ? "" : styles.inactive} key={sku.id}>
                        <td>
                          <button onClick={() => setSkuForm(skuToForm(sku))} type="button">
                            {sku.article}
                          </button>
                        </td>
                        <td>{sku.outer_diameter_mm ?? "—"}</td>
                        <td>{sku.diameter_mm ?? "—"}</td>
                        <td>{sku.length_mm ?? "—"}</td>
                        <td>{sku.price_rub ?? "—"}</td>
                        <td>{sku.stock_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form className={styles.formGrid} id="sku-editor-form" onSubmit={saveSku}>
                <label className={styles.field}>
                  Артикул
                  <input required value={skuForm.article} onChange={(event) => updateForm("article", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Название
                  <input required value={skuForm.name} onChange={(event) => updateForm("name", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Slug
                  <input value={skuForm.slug} onChange={(event) => updateForm("slug", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Материал
                  <input value={skuForm.material} onChange={(event) => updateForm("material", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Сталь
                  <input value={skuForm.steel_grade} onChange={(event) => updateForm("steel_grade", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Толщина стали S
                  <input value={skuForm.wall_thickness_mm} onChange={(event) => updateForm("wall_thickness_mm", event.target.value)} />
                </label>
                <label className={styles.field}>
                  d, мм
                  <input inputMode="numeric" value={skuForm.diameter_mm} onChange={(event) => updateForm("diameter_mm", event.target.value)} />
                </label>
                <label className={styles.field}>
                  D, мм
                  <input inputMode="numeric" value={skuForm.outer_diameter_mm} onChange={(event) => updateForm("outer_diameter_mm", event.target.value)} />
                </label>
                <label className={styles.field}>
                  L, мм
                  <input inputMode="numeric" value={skuForm.length_mm} onChange={(event) => updateForm("length_mm", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Угол
                  <input inputMode="numeric" value={skuForm.angle_deg} onChange={(event) => updateForm("angle_deg", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Контур
                  <select value={skuForm.contour} onChange={(event) => updateForm("contour", event.target.value)}>
                    <option value="">Не задано</option>
                    <option value="одностенный">Одностенный</option>
                    <option value="сэндвич">Сэндвич</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Утепление, мм
                  <input inputMode="numeric" value={skuForm.insulation_mm} onChange={(event) => updateForm("insulation_mm", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Цена
                  <input inputMode="decimal" value={skuForm.price_rub} onChange={(event) => updateForm("price_rub", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Наличие
                  <input value={skuForm.stock_status} onChange={(event) => updateForm("stock_status", event.target.value)} />
                </label>
                <label className={styles.field}>
                  Активен
                  <select
                    value={skuForm.is_active ? "true" : "false"}
                    onChange={(event) => updateForm("is_active", event.target.value === "true")}
                  >
                    <option value="true">Да</option>
                    <option value="false">Нет</option>
                  </select>
                </label>
                <label className={styles.wideField}>
                  Характеристики JSON
                  <textarea
                    spellCheck={false}
                    value={skuForm.attributesText}
                    onChange={(event) => updateForm("attributesText", event.target.value)}
                  />
                </label>
                <div className={styles.toolbar}>
                  <button className={styles.dangerButton} disabled={isBusy || !skuForm.id} onClick={deactivateSelectedSku} type="button">
                    <Trash2 size={15} /> Отключить
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
