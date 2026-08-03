"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, Link2, Plus, RefreshCcw, Save, Sparkles, Trash2, X } from "lucide-react";
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
  compatible_product_ids: string[];
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
  seo_h1: string;
  seo_short_description: string;
  seo_description: string;
  seo_title: string;
  seo_meta_description: string;
  attributesText: string;
  is_active: boolean;
};

type ProductSeoFormState = {
  short_description: string;
  description: string;
  seo_title: string;
  seo_description: string;
  knowledge: ProductSeoKnowledgeFormState;
};

type GeneratedProductSeo = Omit<ProductSeoFormState, "knowledge"> & {
  model: string;
  fact_warnings: string[];
};

type ProductSeoKnowledgeFormState = {
  purpose: string;
  installationZones: string;
  compatibleWith: string;
  incompatibleWith: string;
  installationVariants: string;
  selectionRules: string;
  installationWarnings: string;
  fireSafety: string;
  requiredInputData: string;
  sourceNotes: string;
  configuratorCtaText: string;
  configuratorCtaHref: string;
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
const productPageSize = 100;
const maxPhotoBytes = 8 * 1024 * 1024;
const photoSlots: Array<{ role: PhotoRole; number: string; title: string; hint: string }> = [
  { role: "general", number: "01", title: "Фото 1", hint: "Общий вид" },
  { role: "top", number: "02", title: "Фото 2", hint: "Вид сверху" },
  { role: "connection", number: "03", title: "Фото 3", hint: "Порты / присоединение" },
];

function createEmptyPhotoDrafts(): Record<PhotoRole, PhotoDraft> {
  return {
    general: { file: null, previewUrl: null, alt: "" },
    top: { file: null, previewUrl: null, alt: "" },
    connection: { file: null, previewUrl: null, alt: "" },
  };
}

function createEmptyPhotoDraft(): PhotoDraft {
  return { file: null, previewUrl: null, alt: "" };
}

function mediaItemFromValue(value: unknown): AdminMediaItem | null {
  if (!value || typeof value !== "object" || !("url" in value) || typeof value.url !== "string") {
    return null;
  }
  return {
    url: value.url,
    alt: "alt" in value && typeof value.alt === "string" ? value.alt : null,
    role: "role" in value && typeof value.role === "string" ? value.role : null,
    file_name: "file_name" in value && typeof value.file_name === "string" ? value.file_name : null,
  };
}

function mediaRole(value: string | null): PhotoRole | null {
  if (value === "general" || value === "top" || value === "connection") {
    return value;
  }
  return value === "detail" ? "connection" : null;
}

function mediaByRole(values: AdminMediaItem[]): Partial<Record<PhotoRole, AdminMediaItem>> {
  return values.reduce<Partial<Record<PhotoRole, AdminMediaItem>>>((result, item, index) => {
    const role = mediaRole(item.role) ?? photoSlots[index]?.role ?? null;
    if (role) {
      result[role] = item;
    }
    return result;
  }, {});
}

function skuMediaByRole(attributes: Record<string, unknown> | undefined): Partial<Record<PhotoRole, AdminMediaItem>> {
  const result: Partial<Record<PhotoRole, AdminMediaItem>> = {};
  const rawMedia = attributes?.sku_media;
  if (Array.isArray(rawMedia)) {
    rawMedia.forEach((value) => {
      const item = mediaItemFromValue(value);
      const role = mediaRole(item?.role ?? null);
      if (item && role) {
        result[role] = item;
      }
    });
  }
  if (!result.general) {
    const legacy = mediaItemFromValue(attributes?.sku_photo);
    if (legacy) {
      result.general = { ...legacy, role: "general" };
    }
  }
  return result;
}

function skuMaterialGroup(material: string | null | undefined) {
  const normalized = material?.toLocaleLowerCase("ru-RU") ?? "";
  if (normalized.includes("нерж") || normalized.includes("stainless")) {
    return "stainless";
  }
  if (normalized.includes("оцинк") || normalized.includes("galvan")) {
    return "galvanized";
  }
  return normalized.trim();
}

function skuHasSameVisualExecution(left: AdminSKU, right: AdminSKU) {
  return (
    skuMaterialGroup(left.material) === skuMaterialGroup(right.material) &&
    left.length_mm === right.length_mm &&
    left.diameter_mm === right.diameter_mm &&
    left.outer_diameter_mm === right.outer_diameter_mm
  );
}

function visualSkuMediaByRole(
  skus: AdminSKU[],
  selectedSku: AdminSKU | null,
): Partial<Record<PhotoRole, AdminMediaItem>> {
  if (!selectedSku) {
    return {};
  }
  const result = skuMediaByRole(selectedSku.attributes);
  for (const sibling of skus) {
    if (sibling.id === selectedSku.id || !skuHasSameVisualExecution(sibling, selectedSku)) {
      continue;
    }
    const siblingMedia = skuMediaByRole(sibling.attributes);
    for (const slot of photoSlots) {
      result[slot.role] ??= siblingMedia[slot.role];
    }
  }
  return result;
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
  seo_h1: "",
  seo_short_description: "",
  seo_description: "",
  seo_title: "",
  seo_meta_description: "",
  attributesText: "{}",
  is_active: true,
};

const emptyProductSeoForm: ProductSeoFormState = {
  short_description: "",
  description: "",
  seo_title: "",
  seo_description: "",
  knowledge: {
    purpose: "",
    installationZones: "",
    compatibleWith: "",
    incompatibleWith: "",
    installationVariants: "",
    selectionRules: "",
    installationWarnings: "",
    fireSafety: "",
    requiredInputData: "",
    sourceNotes: "",
    configuratorCtaText: "Подберите совместимые элементы и рассчитайте полный комплект дымохода в конфигураторе.",
    configuratorCtaHref: "/#calculator",
  },
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
  const rawSeo = sku.attributes?.sku_seo;
  const seo = rawSeo && typeof rawSeo === "object" ? rawSeo as Record<string, unknown> : {};
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
    seo_h1: stringAttribute(seo, "h1"),
    seo_short_description: stringAttribute(seo, "short_description"),
    seo_description: stringAttribute(seo, "description"),
    seo_title: stringAttribute(seo, "seo_title"),
    seo_meta_description: stringAttribute(seo, "seo_description"),
    attributesText: JSON.stringify(sku.attributes ?? {}, null, 2),
    is_active: sku.is_active,
  };
}

function stringAttribute(attributes: Record<string, unknown>, key: string): string {
  const value = attributes[key];
  return typeof value === "string" ? value : "";
}

function stringList(value: unknown): string {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("\n") : "";
}

function lines(value: string): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function knowledgeFromProduct(product: AdminProduct): ProductSeoKnowledgeFormState {
  const raw = product.extra_attributes.seo_knowledge;
  const knowledge = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const rawCta = knowledge.configuratorCta;
  const cta = rawCta && typeof rawCta === "object" ? rawCta as Record<string, unknown> : {};
  return {
    purpose: stringList(knowledge.purpose),
    installationZones: stringList(knowledge.installationZones),
    compatibleWith: stringList(knowledge.compatibleWith),
    incompatibleWith: stringList(knowledge.incompatibleWith),
    installationVariants: stringList(knowledge.installationVariants),
    selectionRules: stringList(knowledge.selectionRules),
    installationWarnings: stringList(knowledge.installationWarnings),
    fireSafety: stringList(knowledge.fireSafety),
    requiredInputData: stringList(knowledge.requiredInputData),
    sourceNotes: stringList(knowledge.sourceNotes),
    configuratorCtaText: typeof cta.text === "string" ? cta.text : emptyProductSeoForm.knowledge.configuratorCtaText,
    configuratorCtaHref: typeof cta.href === "string" ? cta.href : emptyProductSeoForm.knowledge.configuratorCtaHref,
  };
}

function knowledgePayload(knowledge: ProductSeoKnowledgeFormState) {
  return {
    purpose: lines(knowledge.purpose),
    installationZones: lines(knowledge.installationZones),
    compatibleWith: lines(knowledge.compatibleWith),
    incompatibleWith: lines(knowledge.incompatibleWith),
    installationVariants: lines(knowledge.installationVariants),
    selectionRules: lines(knowledge.selectionRules),
    installationWarnings: lines(knowledge.installationWarnings),
    fireSafety: lines(knowledge.fireSafety),
    requiredInputData: lines(knowledge.requiredInputData),
    sourceNotes: lines(knowledge.sourceNotes),
    configuratorCta: {
      text: knowledge.configuratorCtaText.trim(),
      href: knowledge.configuratorCtaHref.trim(),
    },
  };
}

function renderSeoTemplatePreview(template: string, product: AdminProduct, sku: SKUFormState): string {
  const diameter = sku.diameter_mm && sku.outer_diameter_mm
    ? `${sku.diameter_mm}×${sku.outer_diameter_mm} мм`
    : sku.diameter_mm
      ? `${sku.diameter_mm} мм`
      : "";
  const dimensions = [
    sku.diameter_mm ? `d=${sku.diameter_mm} мм` : null,
    sku.outer_diameter_mm ? `D=${sku.outer_diameter_mm} мм` : null,
    sku.length_mm ? `L=${sku.length_mm} мм` : null,
    sku.wall_thickness_mm ? `S=${sku.wall_thickness_mm} мм` : null,
  ].filter(Boolean).join(", ");
  const replacements: Record<string, string> = {
    "{name}": product.name,
    "{article}": sku.article,
    "{d}": sku.diameter_mm,
    "{D}": sku.outer_diameter_mm,
    "{L}": sku.length_mm,
    "{S}": sku.wall_thickness_mm,
    "{thickness}": sku.wall_thickness_mm,
    "{steel}": sku.steel_grade,
    "{material}": sku.material,
    "{contour}": sku.contour,
    "{angle}": sku.angle_deg,
    "{insulation}": sku.insulation_mm,
    "{diameter}": diameter,
    "{dimensions}": dimensions,
  };
  return Object.entries(replacements)
    .reduce((result, [token, replacement]) => result.replaceAll(token, replacement), template)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function staleDiameterWarning(template: string, sku: SKUFormState): string | null {
  const match = template.match(/(?:Ø\s*)?(\d{2,4})\s*[/×xх]\s*(\d{2,4})/i);
  if (!match || !sku.diameter_mm || !sku.outer_diameter_mm) {
    return null;
  }
  if (match[1] === sku.diameter_mm && match[2] === sku.outer_diameter_mm) {
    return "В поле записан конкретный диаметр. Замените его на {diameter} или {d}/{D}, чтобы он менялся вместе с SKU.";
  }
  return `В тексте указан Ø${match[1]}/${match[2]}, а выбран SKU Ø${sku.diameter_mm}/${sku.outer_diameter_mm}. Перегенерируйте SEO.`;
}

function productToSeoForm(product: AdminProduct): ProductSeoFormState {
  return {
    short_description: product.short_description ?? "",
    description: product.description ?? "",
    seo_title: stringAttribute(product.extra_attributes, "seo_title"),
    seo_description: stringAttribute(product.extra_attributes, "seo_description"),
    knowledge: knowledgeFromProduct(product),
  };
}

const seoKnowledgeFields: Array<{ key: keyof ProductSeoKnowledgeFormState; label: string; hint: string }> = [
  { key: "purpose", label: "Назначение", hint: "Что делает элемент и какую задачу решает" },
  { key: "installationZones", label: "Зоны установки", hint: "По одному подтверждённому варианту на строку" },
  { key: "compatibleWith", label: "Совместимо с", hint: "Семейства и соседние элементы" },
  { key: "incompatibleWith", label: "Несовместимо с", hint: "Только подтверждённые ограничения" },
  { key: "installationVariants", label: "Варианты монтажа", hint: "Без универсальных монтажных советов" },
  { key: "selectionRules", label: "Правила подбора", hint: "Какие параметры должны совпасть" },
  { key: "installationWarnings", label: "Ошибки и ограничения", hint: "Типичные подтверждённые ошибки выбора" },
  { key: "fireSafety", label: "Пожарная безопасность", hint: "Только требования с источником" },
  { key: "requiredInputData", label: "Данные для расчёта", hint: "Что нужно знать об объекте" },
  { key: "sourceNotes", label: "Источники", hint: "Документ, правило БД, раздел или примечание" },
];

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

async function apiRequestNoContent(path: string, init?: RequestInit): Promise<number> {
  const requestUrl = buildBackendUrl(path);
  const response = await fetch(requestUrl, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiRequestError(response.status, requestUrl, formatApiDetail(body?.detail));
  }
  return response.status;
}

function buildBackendUrl(path: string): string {
  return apiBaseUrl ? `${apiBaseUrl}${path}` : `${appBasePath}${path}`;
}

export default function AdminCatalogManager() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(allCategoriesId);
  const [productItems, setProductItems] = useState<AdminProductListItem[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productOffset, setProductOffset] = useState(0);
  const [skuSearch, setSkuSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [compatibilityCatalog, setCompatibilityCatalog] = useState<AdminProductListItem[]>([]);
  const [compatibleCategoryId, setCompatibleCategoryId] = useState("");
  const [compatibleCandidateId, setCompatibleCandidateId] = useState("");
  const [compatibleProductIds, setCompatibleProductIds] = useState<string[]>([]);
  const [skuForm, setSkuForm] = useState<SKUFormState>(emptySkuForm);
  const [productSeoForm, setProductSeoForm] = useState<ProductSeoFormState>(emptyProductSeoForm);
  const [photoDrafts, setPhotoDrafts] = useState<Record<PhotoRole, PhotoDraft>>(createEmptyPhotoDrafts);
  const [categoryCoverDraft, setCategoryCoverDraft] = useState<PhotoDraft>(createEmptyPhotoDraft);
  const [skuPhotoDrafts, setSkuPhotoDrafts] = useState<Record<PhotoRole, PhotoDraft>>(createEmptyPhotoDrafts);
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const selectedCategoryCover = useMemo(
    () => mediaItemFromValue(selectedCategory?.extra_attributes.category_cover),
    [selectedCategory],
  );
  const selectedSku = useMemo(
    () => selectedProduct?.skus.find((sku) => sku.id === skuForm.id) ?? null,
    [selectedProduct, skuForm.id],
  );
  const selectedSkuMedia = useMemo(
    () => visualSkuMediaByRole(selectedProduct?.skus ?? [], selectedSku),
    [selectedProduct?.skus, selectedSku],
  );
  const selectedSkuOwnMedia = useMemo(
    () => skuMediaByRole(selectedSku?.attributes),
    [selectedSku],
  );
  const selectedFamilyMedia = useMemo(
    () => mediaByRole(selectedProduct?.media ?? []),
    [selectedProduct?.media],
  );
  const totalProductCount = useMemo(
    () => categories.reduce((sum, category) => sum + category.product_count, 0),
    [categories],
  );
  const compatibleProductOptions = useMemo(
    () =>
      compatibleCategoryId
        ? compatibilityCatalog.filter(
            (product) =>
              product.id !== selectedProduct?.id && product.category_id === compatibleCategoryId,
          )
        : [],
    [compatibilityCatalog, compatibleCategoryId, selectedProduct?.id],
  );
  const selectedCompatibleProducts = useMemo(
    () => compatibleProductIds.flatMap((productId) => {
      const product = compatibilityCatalog.find((item) => item.id === productId);
      return product ? [product] : [];
    }),
    [compatibilityCatalog, compatibleProductIds],
  );
  const pendingFamilyPhotoCount = photoSlots.filter(({ role }) => photoDrafts[role].file).length;
  const pendingSkuPhotoCount = photoSlots.filter(({ role }) => skuPhotoDrafts[role].file).length;
  const pendingPhotoCount = pendingFamilyPhotoCount + pendingSkuPhotoCount;
  const normalizedProductName = selectedProduct?.name.toLocaleLowerCase("ru-RU") ?? "";
  const hasConeTerminationScheme =
    normalizedProductName.includes("конус") &&
    (normalizedProductName.includes("дефлектор") || normalizedProductName.includes("оголовок"));

  async function loadCategories() {
    const data = await apiRequest<AdminCategory[]>("/api/v1/admin/categories");
    setCategories(data);
  }

  async function loadProducts(categoryId = selectedCategoryId, offset = productOffset) {
    const params = new URLSearchParams({ limit: String(productPageSize), offset: String(offset) });
    if (categoryId !== allCategoriesId) {
      params.set("category_id", categoryId);
    }
    if (skuSearch.trim()) {
      params.set("search", skuSearch.trim());
    }
    const data = await apiRequest<{ items: AdminProductListItem[]; total: number; offset: number }>(
      `/api/v1/admin/products?${params.toString()}`,
    );
    setProductItems(data.items);
    setProductTotal(data.total);
    setProductOffset(data.offset);
  }

  async function loadCompatibilityCatalog(categoryId = "") {
    const params = new URLSearchParams({ limit: "500", offset: "0" });
    if (categoryId) {
      params.set("category_id", categoryId);
    }
    const data = await apiRequest<{ items: AdminProductListItem[] }>(
      `/api/v1/admin/products?${params.toString()}`,
    );
    setCompatibilityCatalog((current) => {
      const merged = new Map(current.map((product) => [product.id, product]));
      data.items.forEach((product) => merged.set(product.id, product));
      return Array.from(merged.values());
    });
  }

  async function loadProduct(productId: string, skuId?: string) {
    const data = await apiRequest<AdminProduct>(`/api/v1/admin/products/${productId}`);
    setSelectedProduct(data);
    setCompatibleProductIds(data.compatible_product_ids ?? []);
    setProductSeoForm(productToSeoForm(data));
    const activeSkus = data.skus.filter((sku) => sku.is_active);
    const selectedSku = skuId ? activeSkus.find((sku) => sku.id === skuId) : activeSkus[0];
    setSkuForm(selectedSku ? skuToForm(selectedSku) : emptySkuForm);
  }

  useEffect(() => {
    loadCategories().catch((error) => setStatus(error.message));
    loadCompatibilityCatalog().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (compatibleCategoryId) {
      loadCompatibilityCatalog(compatibleCategoryId).catch((error) => setStatus(error.message));
    }
  }, [compatibleCategoryId]);

  useEffect(() => {
    setSelectedProduct(null);
    setSkuForm(emptySkuForm);
    loadProducts(selectedCategoryId, 0).catch((error) => setStatus(error.message));
  }, [selectedCategoryId]);

  useEffect(() => {
    resetPhotoDrafts();
  }, [selectedProduct?.id]);

  useEffect(() => {
    setCategoryCoverDraft((current) => {
      if (current.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return createEmptyPhotoDraft();
    });
  }, [selectedCategoryId]);

  useEffect(() => {
    resetSkuPhotoDrafts();
  }, [skuForm.id]);

  async function refreshCurrentProduct(skuId?: string) {
    if (!selectedProduct) {
      return;
    }
    await loadProduct(selectedProduct.id, skuId);
    await loadProducts();
  }

  function updateForm(field: keyof SKUFormState, value: string | boolean) {
    setSkuForm((current) => ({ ...current, [field]: value }));
  }

  function selectSkuMaterial(material: "stainless" | "galvanized") {
    setSkuForm((current) => ({
      ...current,
      material: material === "stainless" ? "Нержавеющая сталь" : "Оцинкованная сталь",
      steel_grade: material === "galvanized" ? "" : current.steel_grade,
    }));
  }

  function updateProductSeoForm(field: Exclude<keyof ProductSeoFormState, "knowledge">, value: string) {
    setProductSeoForm((current) => ({ ...current, [field]: value }));
  }

  function updateSeoKnowledge(field: keyof ProductSeoKnowledgeFormState, value: string) {
    setProductSeoForm((current) => ({
      ...current,
      knowledge: { ...current.knowledge, [field]: value },
    }));
  }

  function copyFamilySeoToSku() {
    if (!selectedProduct) {
      return;
    }
    setSkuForm((current) => ({
      ...current,
      seo_h1: current.seo_h1 || current.name || selectedProduct.name,
      seo_short_description: current.seo_short_description || productSeoForm.short_description,
      seo_description: current.seo_description || productSeoForm.description,
      seo_title: current.seo_title || renderSeoTemplatePreview(productSeoForm.seo_title, selectedProduct, current),
      seo_meta_description:
        current.seo_meta_description ||
        renderSeoTemplatePreview(productSeoForm.seo_description, selectedProduct, current),
    }));
    setStatus("SEO семейства скопировано в пустые поля выбранного SKU. Проверьте текст перед сохранением.");
  }

  async function saveProductSeo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }
    setIsBusy(true);
    setStatus("Сохраняю описание семейства...");
    try {
      const response = await apiRequestWithStatus<AdminProduct>(
        `/api/v1/admin/products/${selectedProduct.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            short_description: textOrNull(productSeoForm.short_description),
            description: textOrNull(productSeoForm.description),
            seo_title: textOrNull(productSeoForm.seo_title),
            seo_description: textOrNull(productSeoForm.seo_description),
            seoKnowledge: knowledgePayload(productSeoForm.knowledge),
          }),
        },
      );
      setSelectedProduct(response.data);
      setProductSeoForm(productToSeoForm(response.data));
      setStatus("Описание семейства сохранено");
      window.alert(`Успешно\nSEO и описание семейства: HTTP ${response.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить описание семейства";
      setStatus(message);
      window.alert(
        error instanceof ApiRequestError
          ? `Ошибка [HTTP ${error.status}]\n${message}`
          : `Ошибка [NETWORK]\n${message}`,
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function generateProductSeo() {
    if (!selectedProduct) {
      return;
    }
    const hasExistingText = [
      productSeoForm.short_description,
      productSeoForm.description,
      productSeoForm.seo_title,
      productSeoForm.seo_description,
    ].some((value) => value.trim());
    if (hasExistingText && !window.confirm("Заменить текущий SEO-текст новым черновиком Codex?")) {
      return;
    }

    setIsGeneratingSeo(true);
    setStatus("Codex формирует SEO-черновик по характеристикам SKU...");
    try {
      const response = await apiRequestWithStatus<GeneratedProductSeo>(
        `/api/v1/admin/products/${selectedProduct.id}/seo/generate`,
        {
          method: "POST",
          body: JSON.stringify({
            selected_sku_id: skuForm.id,
            seoKnowledge: knowledgePayload(productSeoForm.knowledge),
          }),
        },
      );
      setProductSeoForm({
        short_description: response.data.short_description,
        description: response.data.description,
        seo_title: response.data.seo_title,
        seo_description: response.data.seo_description,
        knowledge: productSeoForm.knowledge,
      });
      const warning = response.data.fact_warnings.length
        ? ` Не заполнено подтверждённых разделов: ${response.data.fact_warnings.length}.`
        : "";
      setStatus(`SEO-черновик создан (${response.data.model}).${warning} Проверьте текст и нажмите «Сохранить описание».`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сгенерировать SEO";
      setStatus(message);
      window.alert(
        error instanceof ApiRequestError
          ? `Ошибка генерации [HTTP ${error.status}]\n${message}`
          : `Ошибка генерации [NETWORK]\n${message}`,
      );
    } finally {
      setIsGeneratingSeo(false);
    }
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

  function selectCategoryCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setCategoryCoverDraft((current) => {
      if (current.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return { ...current, file, previewUrl: file ? URL.createObjectURL(file) : null };
    });
    event.target.value = "";
  }

  function clearCategoryCoverDraft() {
    setCategoryCoverDraft((current) => {
      if (current.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return createEmptyPhotoDraft();
    });
  }

  function resetSkuPhotoDrafts() {
    setSkuPhotoDrafts((current) => {
      Object.values(current).forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });
      return createEmptyPhotoDrafts();
    });
  }

  function updateSkuPhotoDraft(role: PhotoRole, patch: Partial<PhotoDraft>) {
    setSkuPhotoDrafts((current) => ({
      ...current,
      [role]: { ...current[role], ...patch },
    }));
  }

  function selectSkuPhoto(role: PhotoRole, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const currentPreview = skuPhotoDrafts[role].previewUrl;
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }
    updateSkuPhotoDraft(role, {
      file,
      previewUrl: file ? URL.createObjectURL(file) : null,
    });
    event.target.value = "";
  }

  function clearSkuPhotoDraft(role: PhotoRole) {
    const currentPreview = skuPhotoDrafts[role].previewUrl;
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }
    updateSkuPhotoDraft(role, { file: null, previewUrl: null });
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
          alt:
            textOrNull(draft.alt) ??
            `${selectedProduct.name} — ${photoSlots
              .find((slot) => slot.role === role)
              ?.hint.toLocaleLowerCase("ru-RU")}`,
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

  async function persistSkuPhoto(sku: AdminSKU, role: PhotoRole, draft: PhotoDraft) {
    if (!draft.file) {
      throw new Error("Фото SKU не выбрано");
    }
    const contentBase64 = await fileToBase64(draft.file);
    const uploadResponse = await apiRequestWithStatus<AdminMediaItem>(`/api/v1/admin/skus/${sku.id}/photo`, {
      method: "POST",
      body: JSON.stringify({
        file_name: draft.file.name,
        content_base64: contentBase64,
        role,
        alt:
          textOrNull(draft.alt) ??
          `${sku.name} (${sku.article}) — ${photoSlots
            .find((slot) => slot.role === role)
            ?.hint.toLocaleLowerCase("ru-RU")}`,
      }),
    });
    const mediaUrl = buildBackendUrl(uploadResponse.data.url);
    const mediaResponse = await fetch(mediaUrl, { cache: "no-store" });
    if (!mediaResponse.ok) {
      throw new ApiRequestError(mediaResponse.status, mediaUrl, "Фото SKU записано, но URL изображения недоступен");
    }
    return { uploadStatus: uploadResponse.status, mediaStatus: mediaResponse.status };
  }

  async function saveCategoryCover() {
    if (!selectedCategory || !categoryCoverDraft.file) {
      return;
    }
    if (categoryCoverDraft.file.size > maxPhotoBytes) {
      window.alert("Ошибка [CLIENT_VALIDATION]\nОбложка категории больше 8 МБ");
      return;
    }
    setIsBusy(true);
    setStatus("Сохраняю обложку категории...");
    try {
      const contentBase64 = await fileToBase64(categoryCoverDraft.file);
      const response = await apiRequestWithStatus<AdminMediaItem>(
        `/api/v1/admin/categories/${selectedCategory.id}/cover`,
        {
          method: "POST",
          body: JSON.stringify({
            file_name: categoryCoverDraft.file.name,
            content_base64: contentBase64,
            role: "category-cover",
            alt: textOrNull(categoryCoverDraft.alt) ?? `${selectedCategory.name} — ассортимент изделий`,
          }),
        },
      );
      const mediaUrl = buildBackendUrl(response.data.url);
      const mediaResponse = await fetch(mediaUrl, { cache: "no-store" });
      if (!mediaResponse.ok) {
        throw new ApiRequestError(mediaResponse.status, mediaUrl, "Обложка записана, но URL изображения недоступен");
      }
      clearCategoryCoverDraft();
      await loadCategories();
      setStatus("Обложка категории сохранена");
      window.alert(`Успешно\nОбложка категории: HTTP ${response.status}, MEDIA HTTP ${mediaResponse.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить обложку категории";
      setStatus(message);
      window.alert(error instanceof ApiRequestError ? `Ошибка [HTTP ${error.status}]\n${message}` : `Ошибка [NETWORK]\n${message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteCategoryCover() {
    if (!selectedCategory) {
      return;
    }
    setIsBusy(true);
    try {
      await apiRequestNoContent(`/api/v1/admin/categories/${selectedCategory.id}/cover`, { method: "DELETE" });
      await loadCategories();
      setStatus("Обложка категории удалена");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось удалить обложку категории");
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteSelectedSkuPhoto(role: PhotoRole) {
    if (!skuForm.id) {
      return;
    }
    setIsBusy(true);
    try {
      await apiRequestNoContent(`/api/v1/admin/skus/${skuForm.id}/photo?role=${role}`, { method: "DELETE" });
      await refreshCurrentProduct(skuForm.id);
      setStatus(`Фото SKU «${photoSlots.find((slot) => slot.role === role)?.hint}» удалено; используется фото семейства`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось удалить фото SKU");
    } finally {
      setIsBusy(false);
    }
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
    const skuSeo = {
      h1: textOrNull(skuForm.seo_h1),
      short_description: textOrNull(skuForm.seo_short_description),
      description: textOrNull(skuForm.seo_description),
      seo_title: textOrNull(skuForm.seo_title),
      seo_description: textOrNull(skuForm.seo_meta_description),
    };
    const persistedSkuSeo = Object.fromEntries(
      Object.entries(skuSeo).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    if (Object.keys(persistedSkuSeo).length) {
      attributes.sku_seo = persistedSkuSeo;
    } else {
      delete attributes.sku_seo;
    }
    const oversizedPhoto = photoSlots.find(({ role }) => (photoDrafts[role].file?.size ?? 0) > maxPhotoBytes);
    if (oversizedPhoto) {
      const message = `Ошибка [CLIENT_VALIDATION]\n${oversizedPhoto.title} больше 8 МБ. Выберите файл меньшего размера`;
      setStatus("Фото больше 8 МБ. Выберите файл меньшего размера");
      window.alert(message);
      return;
    }
    const oversizedSkuPhoto = photoSlots.find(
      ({ role }) => (skuPhotoDrafts[role].file?.size ?? 0) > maxPhotoBytes,
    );
    if (oversizedSkuPhoto) {
      const message = `Ошибка [CLIENT_VALIDATION]\nФото SKU «${oversizedSkuPhoto.hint}» больше 8 МБ`;
      setStatus("Фото SKU больше 8 МБ. Выберите файл меньшего размера");
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
      for (const slot of photoSlots) {
        const draft = skuPhotoDrafts[slot.role];
        if (draft.file) {
          const result = await persistSkuPhoto(savedSku, slot.role, draft);
          photoResults.push(result);
          savedPhotos.push(`SKU · ${slot.hint}`);
        }
      }
      await refreshCurrentProduct(savedSku.id);
      if (photoResults.length) {
        resetPhotoDrafts();
        resetSkuPhotoDrafts();
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

  async function savePendingPhotos() {
    if (!selectedProduct || pendingPhotoCount === 0) {
      return;
    }
    const oversizedPhoto = photoSlots.find(({ role }) => (photoDrafts[role].file?.size ?? 0) > maxPhotoBytes);
    if (oversizedPhoto) {
      const message = `Ошибка [CLIENT_VALIDATION]\n${oversizedPhoto.title} больше 8 МБ. Выберите файл меньшего размера`;
      setStatus("Фото больше 8 МБ. Выберите файл меньшего размера");
      window.alert(message);
      return;
    }
    const oversizedSkuPhoto = photoSlots.find(
      ({ role }) => (skuPhotoDrafts[role].file?.size ?? 0) > maxPhotoBytes,
    );
    if (oversizedSkuPhoto) {
      setStatus("Фото SKU больше 8 МБ. Выберите файл меньшего размера");
      window.alert(`Ошибка [CLIENT_VALIDATION]\nФото SKU «${oversizedSkuPhoto.hint}» больше 8 МБ`);
      return;
    }

    setIsBusy(true);
    setStatus("Сохраняю фотографии...");
    try {
      let savedPhotoCount = 0;
      for (const slot of photoSlots) {
        const draft = photoDrafts[slot.role];
        if (draft.file) {
          await persistPhotoDraft(slot.role, draft);
          savedPhotoCount += 1;
        }
      }
      for (const slot of photoSlots) {
        const draft = skuPhotoDrafts[slot.role];
        if (!draft.file) {
          continue;
        }
        if (!selectedSku) {
          throw new Error("Выберите SKU перед загрузкой его фотографий");
        }
        await persistSkuPhoto(selectedSku, slot.role, draft);
        savedPhotoCount += 1;
      }
      await refreshCurrentProduct(selectedSku?.id);
      resetPhotoDrafts();
      resetSkuPhotoDrafts();
      setStatus(`Сохранено фотографий: ${savedPhotoCount}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить фотографии";
      setStatus(message);
      window.alert(
        error instanceof ApiRequestError
          ? `Ошибка [HTTP ${error.status}]\n${message}`
          : `Ошибка [NETWORK]\n${message}`,
      );
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
      await loadProducts();
      setStatus("Фото убрано из карточки");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось убрать фото");
    } finally {
      setIsBusy(false);
    }
  }

  function submitSkuSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadProducts(selectedCategoryId, 0).catch((error) => setStatus(error.message));
  }

  function addCompatibleProduct() {
    if (!compatibleCandidateId || compatibleProductIds.includes(compatibleCandidateId)) {
      return;
    }
    setCompatibleProductIds((current) => [...current, compatibleCandidateId]);
    setCompatibleCandidateId("");
  }

  function removeCompatibleProduct(productId: string) {
    setCompatibleProductIds((current) => current.filter((value) => value !== productId));
  }

  async function saveCompatibility() {
    if (!selectedProduct) {
      window.alert("Ошибка [CLIENT_VALIDATION]\nСначала выберите семейство товара");
      return;
    }
    setIsBusy(true);
    setStatus("Сохраняю совместимые изделия...");
    try {
      const response = await apiRequestWithStatus<AdminProduct>(
        `/api/v1/admin/products/${selectedProduct.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ compatibleProductIds }),
        },
      );
      const persistedProduct = await apiRequest<AdminProduct>(
        `/api/v1/admin/products/${selectedProduct.id}`,
      );
      const expectedIds = [...compatibleProductIds].sort();
      const persistedIds = [...(persistedProduct.compatible_product_ids ?? [])].sort();
      if (JSON.stringify(expectedIds) !== JSON.stringify(persistedIds)) {
        throw new Error("Сервер не подтвердил сохранённый список совместимых изделий");
      }
      setSelectedProduct(persistedProduct);
      setCompatibleProductIds(persistedIds);
      const resultMessage = persistedIds.length
        ? `Сохранено совместимых семейств: ${persistedIds.length}`
        : "Список совместимых семейств очищен";
      setStatus(resultMessage);
      window.alert(`Успешно [HTTP ${response.status}]\n${resultMessage}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить совместимость";
      setStatus(message);
      window.alert(
        error instanceof ApiRequestError
          ? `Ошибка [HTTP ${error.status}]\n${message}`
          : `Ошибка [NETWORK]\n${message}`,
      );
    } finally {
      setIsBusy(false);
    }
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
            <h2>Категория</h2>
            <span className={styles.badge}>{categories.length}</span>
          </div>
          <div className={styles.categoryPicker}>
            <label htmlFor="admin-category-select">Выберите категорию</label>
            <select
              className={styles.categorySelect}
              id="admin-category-select"
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              value={selectedCategoryId}
            >
              <option value={allCategoriesId}>Все категории · {totalProductCount} семейств</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} · {category.product_count} семейств
                </option>
              ))}
            </select>
            <div className={styles.categorySummary}>
              <strong>{selectedCategory?.name ?? "Все категории"}</strong>
              <span className={styles.categoryFolder}>
                Папка: {selectedCategory?.slug ?? "без фильтра по категории"}
              </span>
            </div>
            {selectedCategory ? (
              <div className={styles.categoryCoverBlock}>
                <div className={styles.mediaSectionHeader}>
                  <h3>Обложка категории</h3>
                  <p>Можно показать несколько изделий категории на одном фото.</p>
                </div>
                <div className={styles.photoPreview}>
                  {categoryCoverDraft.previewUrl || selectedCategoryCover ? (
                    <img
                      alt={
                        categoryCoverDraft.alt ||
                        selectedCategoryCover?.alt ||
                        `${selectedCategory.name} — ассортимент изделий`
                      }
                      src={
                        categoryCoverDraft.previewUrl ?? buildBackendUrl(selectedCategoryCover?.url ?? "")
                      }
                    />
                  ) : (
                    <div className={styles.photoPlaceholder}>
                      <ImagePlus size={24} />
                      <span>Обложка категории</span>
                    </div>
                  )}
                </div>
                <div className={styles.photoSlotActions}>
                  <input
                    accept="image/*"
                    className={styles.slotFileInput}
                    id={`category-cover-${selectedCategory.id}`}
                    onChange={selectCategoryCover}
                    type="file"
                  />
                  <label className={styles.fileButton} htmlFor={`category-cover-${selectedCategory.id}`}>
                    {categoryCoverDraft.previewUrl || selectedCategoryCover ? "Заменить" : "Выбрать файл"}
                  </label>
                  {categoryCoverDraft.file ? (
                    <button className={styles.clearButton} onClick={clearCategoryCoverDraft} type="button">
                      Отменить
                    </button>
                  ) : selectedCategoryCover ? (
                    <button className={styles.clearButton} disabled={isBusy} onClick={deleteCategoryCover} type="button">
                      Удалить
                    </button>
                  ) : null}
                </div>
                <label className={styles.photoAltField}>
                  Описание
                  <input
                    onChange={(event) => setCategoryCoverDraft((current) => ({ ...current, alt: event.target.value }))}
                    placeholder={`${selectedCategory.name} — ассортимент изделий`}
                    value={categoryCoverDraft.alt}
                  />
                </label>
                <button
                  className={styles.button}
                  disabled={isBusy || !categoryCoverDraft.file}
                  onClick={saveCategoryCover}
                  type="button"
                >
                  <Save size={15} /> Сохранить обложку
                </button>
              </div>
            ) : (
              <p className={styles.categoryHint}>Выберите конкретную категорию, чтобы добавить обложку.</p>
            )}
          </div>
        </aside>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Семейства изделий</h2>
              <span className={styles.rowMeta}>
                {selectedCategoryId === allCategoriesId ? "Все категории" : selectedCategory?.name ?? "Категория"}
              </span>
            </div>
            <span className={styles.badge}>{productTotal}</span>
          </div>
          <form className={styles.listControls} onSubmit={submitSkuSearch}>
            <input
              placeholder="Название или slug семейства"
              value={skuSearch}
              onChange={(event) => setSkuSearch(event.target.value)}
            />
            <button className={styles.ghostButton} type="submit">
              Найти
            </button>
            <button className={styles.ghostButton} onClick={() => loadProducts()} type="button">
              <RefreshCcw size={15} /> Обновить
            </button>
          </form>
          <div className={styles.scrollList}>
            {productItems.map((product) => (
              <button
                className={`${styles.rowButton} ${
                  product.id === selectedProduct?.id ? styles.rowButtonActive : ""
                }`}
                key={product.id}
                onClick={() => loadProduct(product.id).catch((error) => setStatus(error.message))}
                type="button"
              >
                <span className={styles.rowContent}>
                  <span className={styles.rowTitle}>{product.name}</span>
                  <span className={styles.rowMeta}>{product.slug}</span>
                  <span className={styles.rowDetails}>
                    {product.category_name} · {product.product_kind ?? "тип не задан"} · {product.sku_count} SKU
                  </span>
                </span>
                <span className={styles.badge}>{product.is_active ? "on" : "off"}</span>
              </button>
            ))}
            {!productItems.length ? <p className={styles.notice}>Семейства не найдены.</p> : null}
          </div>
          <div className={styles.pager}>
            <button
              className={styles.ghostButton}
              disabled={productOffset <= 0}
              onClick={() => loadProducts(selectedCategoryId, Math.max(0, productOffset - productPageSize))}
              type="button"
            >
              Назад
            </button>
            <span className={styles.rowMeta}>
              {productTotal
                ? `${productOffset + 1}-${Math.min(productOffset + productPageSize, productTotal)} из ${productTotal}`
                : "0 из 0"}
            </span>
            <button
              className={styles.ghostButton}
              disabled={productOffset + productPageSize >= productTotal}
              onClick={() => loadProducts(selectedCategoryId, productOffset + productPageSize)}
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

              <section className={styles.skuEditor}>
                <div className={styles.skuEditorHead}>
                  <div>
                    <span className={styles.skuEditorEyebrow}>Конкретная модель</span>
                    <h3>{skuForm.id ? skuForm.name : "Новый SKU"}</h3>
                    <p>
                      Выберите исполнение семейства и заполните его размеры, цену, фотографии и собственное SEO.
                    </p>
                  </div>
                  <span className={styles.skuArticle}>{skuForm.article || "без артикула"}</span>
                </div>

                <div className={styles.skuChooser}>
                  <label className={styles.field}>
                    Модель в этом семействе
                    <select
                      onChange={(event) => {
                        const sku = selectedProduct.skus.find((item) => item.id === event.target.value);
                        setSkuForm(sku ? skuToForm(sku) : emptySkuForm);
                      }}
                      value={skuForm.id ?? ""}
                    >
                      <option value="">Новый SKU</option>
                      {selectedProduct.skus.filter((sku) => sku.is_active).map((sku) => (
                        <option key={sku.id} value={sku.id}>
                          {sku.article} · L={sku.length_mm ?? "—"} · d/D={sku.diameter_mm ?? "—"}/{sku.outer_diameter_mm ?? "—"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className={styles.ghostButton} onClick={() => setSkuForm(emptySkuForm)} type="button">
                    <Plus size={15} /> Создать SKU
                  </button>
                </div>

                <fieldset className={styles.materialSwitcher}>
                  <legend>Материал стали</legend>
                  <div className={styles.materialSwitcherOptions}>
                    <button
                      aria-pressed={skuMaterialGroup(skuForm.material) === "stainless"}
                      className={
                        skuMaterialGroup(skuForm.material) === "stainless"
                          ? styles.materialSwitcherActive
                          : undefined
                      }
                      onClick={() => selectSkuMaterial("stainless")}
                      type="button"
                    >
                      <strong>Нержавейка</strong>
                      <span>Общие фото для всех AISI</span>
                    </button>
                    <button
                      aria-pressed={skuMaterialGroup(skuForm.material) === "galvanized"}
                      className={
                        skuMaterialGroup(skuForm.material) === "galvanized"
                          ? styles.materialSwitcherActive
                          : undefined
                      }
                      onClick={() => selectSkuMaterial("galvanized")}
                      type="button"
                    >
                      <strong>Оцинковка</strong>
                      <span>Отдельное исполнение</span>
                    </button>
                  </div>
                </fieldset>

                <form className={styles.skuForm} onSubmit={saveSku}>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      Артикул
                      <input required maxLength={120} onChange={(event) => updateForm("article", event.target.value)} value={skuForm.article} />
                    </label>
                    <label className={styles.field}>
                      Название модели
                      <input required maxLength={220} onChange={(event) => updateForm("name", event.target.value)} value={skuForm.name} />
                    </label>
                    <label className={styles.field}>
                      Slug модели
                      <input maxLength={240} onChange={(event) => updateForm("slug", event.target.value)} placeholder="odnokonturnaya-truba-l500-d115" value={skuForm.slug} />
                    </label>
                    <label className={styles.field}>
                      Длина L, мм
                      <input inputMode="numeric" onChange={(event) => updateForm("length_mm", event.target.value)} value={skuForm.length_mm} />
                    </label>
                    <label className={styles.field}>
                      Внутренний диаметр d, мм
                      <input inputMode="numeric" onChange={(event) => updateForm("diameter_mm", event.target.value)} value={skuForm.diameter_mm} />
                    </label>
                    <label className={styles.field}>
                      Наружный диаметр D, мм
                      <input inputMode="numeric" onChange={(event) => updateForm("outer_diameter_mm", event.target.value)} value={skuForm.outer_diameter_mm} />
                    </label>
                    {skuMaterialGroup(skuForm.material) === "stainless" ? (
                      <label className={styles.field}>
                        Марка нержавеющей стали
                        <input
                          onChange={(event) => updateForm("steel_grade", event.target.value)}
                          placeholder="Например, AISI 430"
                          value={skuForm.steel_grade}
                        />
                      </label>
                    ) : null}
                    <label className={styles.field}>
                      Толщина стали S, мм
                      <input inputMode="decimal" onChange={(event) => updateForm("wall_thickness_mm", event.target.value)} value={skuForm.wall_thickness_mm} />
                    </label>
                    <label className={styles.field}>
                      Утепление, мм
                      <input inputMode="numeric" onChange={(event) => updateForm("insulation_mm", event.target.value)} value={skuForm.insulation_mm} />
                    </label>
                    <label className={styles.field}>
                      Цена, ₽
                      <input inputMode="decimal" onChange={(event) => updateForm("price_rub", event.target.value)} value={skuForm.price_rub} />
                    </label>
                    <label className={styles.field}>
                      Наличие
                      <select onChange={(event) => updateForm("stock_status", event.target.value)} value={skuForm.stock_status}>
                        <option value="unknown">Не указано</option>
                        <option value="in_stock">В наличии</option>
                        <option value="out_of_stock">Нет в наличии</option>
                        <option value="on_order">Под заказ</option>
                      </select>
                    </label>
                  </div>

                  <div className={styles.skuSeoEditor}>
                    <div className={styles.mediaSectionHeader}>
                      <h3>SEO выбранного SKU</h3>
                      <p>
                        Эти поля относятся только к модели {skuForm.article || "без артикула"}. Пустые поля наследуются от семейства.
                      </p>
                    </div>
                    <div className={styles.formGrid}>
                      <label className={styles.wideField}>
                        H1 модели
                        <input maxLength={220} onChange={(event) => updateForm("seo_h1", event.target.value)} placeholder={skuForm.name || selectedProduct.name} value={skuForm.seo_h1} />
                      </label>
                      <label className={styles.wideField}>
                        Короткое описание модели
                        <textarea maxLength={500} onChange={(event) => updateForm("seo_short_description", event.target.value)} placeholder="Чем отличается именно это исполнение" value={skuForm.seo_short_description} />
                        <small>{skuForm.seo_short_description.length}/500</small>
                      </label>
                      <label className={styles.wideField}>
                        SEO-описание модели
                        <textarea className={styles.descriptionTextarea} onChange={(event) => updateForm("seo_description", event.target.value)} placeholder="Текст только о выбранном SKU; характеристики уже известны из полей выше" value={skuForm.seo_description} />
                      </label>
                      <label className={styles.field}>
                        SEO title модели
                        <input maxLength={180} onChange={(event) => updateForm("seo_title", event.target.value)} placeholder={`${skuForm.name || selectedProduct.name} — купить | Дымоход Трейд`} value={skuForm.seo_title} />
                        <small>{skuForm.seo_title.length}/180</small>
                      </label>
                      <label className={styles.field}>
                        Meta description модели
                        <textarea maxLength={320} onChange={(event) => updateForm("seo_meta_description", event.target.value)} placeholder="Описание конкретной модели для поисковой выдачи" value={skuForm.seo_meta_description} />
                        <small>{skuForm.seo_meta_description.length}/320</small>
                      </label>
                    </div>
                    <button className={styles.ghostButton} onClick={copyFamilySeoToSku} type="button">
                      Скопировать пустые поля из семейства
                    </button>
                  </div>

                  <details className={styles.seoKnowledge}>
                    <summary>Дополнительные атрибуты SKU (JSON)</summary>
                    <label className={styles.wideField}>
                      Служебные характеристики
                      <textarea onChange={(event) => updateForm("attributesText", event.target.value)} value={skuForm.attributesText} />
                    </label>
                  </details>

                  <div className={styles.skuEditorActions}>
                    <label className={styles.activeToggle}>
                      <input checked={skuForm.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} type="checkbox" />
                      Модель активна
                    </label>
                    <div className={styles.seoEditorButtons}>
                      {skuForm.id ? (
                        <button className={styles.clearButton} disabled={isBusy} onClick={deactivateSelectedSku} type="button">
                          Отключить SKU
                        </button>
                      ) : null}
                      <button className={styles.button} disabled={isBusy} type="submit">
                        <Save size={15} /> Сохранить модель и SEO
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              <form className={styles.seoEditor} onSubmit={saveProductSeo}>
                <div className={styles.mediaSectionHeader}>
                  <h3>SEO и описание семейства</h3>
                  <p>Пишется один раз для семейства. Размеры, сталь, артикул и цена выбранного SKU добавляются автоматически.</p>
                </div>
                <details className={styles.seoKnowledge}>
                  <summary>Подтверждённые данные для SEO</summary>
                  <p>
                    Сначала заполните известные факты. Одна самостоятельная запись на строку. Генератор не должен
                    дополнять отсутствующие технические сведения самостоятельно.
                  </p>
                  <div className={styles.seoKnowledgeGrid}>
                    {seoKnowledgeFields.map((field) => (
                      <label className={styles.wideField} key={field.key}>
                        {field.label}
                        <textarea
                          onChange={(event) => updateSeoKnowledge(field.key, event.target.value)}
                          placeholder={field.hint}
                          value={productSeoForm.knowledge[field.key]}
                        />
                      </label>
                    ))}
                    <label className={styles.wideField}>
                      CTA конфигуратора
                      <textarea
                        onChange={(event) => updateSeoKnowledge("configuratorCtaText", event.target.value)}
                        value={productSeoForm.knowledge.configuratorCtaText}
                      />
                    </label>
                    <label className={styles.field}>
                      Ссылка на конфигуратор
                      <input
                        onChange={(event) => updateSeoKnowledge("configuratorCtaHref", event.target.value)}
                        value={productSeoForm.knowledge.configuratorCtaHref}
                      />
                    </label>
                  </div>
                </details>
                <label className={styles.wideField}>
                  Короткое описание
                  <textarea
                    maxLength={500}
                    onChange={(event) => updateProductSeoForm("short_description", event.target.value)}
                    placeholder="Кратко: назначение изделия и главное преимущество"
                    value={productSeoForm.short_description}
                  />
                  <small>{productSeoForm.short_description.length}/500</small>
                </label>
                <label className={styles.wideField}>
                  Основное SEO-описание
                  <textarea
                    className={styles.descriptionTextarea}
                    onChange={(event) => updateProductSeoForm("description", event.target.value)}
                    placeholder="Назначение, конструкция, совместимость, материалы и особенности монтажа"
                    value={productSeoForm.description}
                  />
                </label>
                <div className={styles.seoMetaGrid}>
                  <label className={styles.field}>
                    SEO title
                    <input
                      maxLength={180}
                      onChange={(event) => updateProductSeoForm("seo_title", event.target.value)}
                      placeholder="{name} {d}×{D} мм, L={L} — купить | Дымоход Трейд"
                      value={productSeoForm.seo_title}
                    />
                    <small>{productSeoForm.seo_title.length}/180</small>
                    {productSeoForm.seo_title ? (
                      <span className={styles.seoPreview}>
                        Предпросмотр: {renderSeoTemplatePreview(productSeoForm.seo_title, selectedProduct, skuForm)}
                      </span>
                    ) : null}
                  </label>
                  <label className={styles.field}>
                    Meta description
                    <textarea
                      maxLength={320}
                      onChange={(event) => updateProductSeoForm("seo_description", event.target.value)}
                      placeholder="Описание семейства для поисковой выдачи"
                      value={productSeoForm.seo_description}
                    />
                    <small>{productSeoForm.seo_description.length}/320</small>
                    {productSeoForm.seo_description ? (
                      <span className={styles.seoPreview}>
                        Предпросмотр: {renderSeoTemplatePreview(productSeoForm.seo_description, selectedProduct, skuForm)}
                      </span>
                    ) : null}
                    {staleDiameterWarning(productSeoForm.seo_description, skuForm) ? (
                      <span className={styles.seoTemplateWarning}>
                        {staleDiameterWarning(productSeoForm.seo_description, skuForm)}
                      </span>
                    ) : null}
                  </label>
                </div>
                <div className={styles.seoEditorActions}>
                  <span>
                    Доступны переменные: {"{name}"}, {"{article}"}, {"{diameter}"}, {"{dimensions}"}, {"{d}"}, {"{D}"}, {"{L}"}, {"{S}"}, {"{material}"}, {"{steel}"}, {"{contour}"}, {"{angle}"}, {"{insulation}"}.
                    Пустые поля заполняются автоматически.
                  </span>
                  <div className={styles.seoEditorButtons}>
                    <button
                      className={styles.ghostButton}
                      disabled={isBusy || isGeneratingSeo}
                      onClick={generateProductSeo}
                      type="button"
                    >
                      <Sparkles size={15} /> {isGeneratingSeo ? "Генерирую…" : "Сгенерировать SEO"}
                    </button>
                    <button className={styles.button} disabled={isBusy || isGeneratingSeo} type="submit">
                      <Save size={15} /> Сохранить описание
                    </button>
                  </div>
                </div>
              </form>

              <div className={styles.mediaSectionHeader}>
                <h3>Фотографии семейства</h3>
                <p>Общие для всех размеров, толщин и марок стали этого форм-фактора.</p>
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

              <div className={styles.skuPhotoSection}>
                <div className={styles.mediaSectionHeader}>
                  <h3>Фотографии выбранного SKU</h3>
                  <p>
                    Фото объединяются по материалу, длине и диаметру. Марки нержавеющей стали используют
                    одну галерею; если фото исполнения нет, показывается фото семейства.
                  </p>
                </div>
                <div className={`${styles.photoSlots} ${styles.skuPhotoSlots}`}>
                  {photoSlots.map((slot) => {
                    const draft = skuPhotoDrafts[slot.role];
                    const ownMedia = selectedSkuOwnMedia[slot.role] ?? null;
                    const existing = selectedSkuMedia[slot.role] ?? null;
                    const familyFallback = selectedFamilyMedia[slot.role] ?? null;
                    const visibleMedia = existing ?? familyFallback;
                    const previewSrc = draft.previewUrl ?? (visibleMedia ? buildBackendUrl(visibleMedia.url) : null);
                    const inputId = `sku-photo-${skuForm.id ?? "new"}-${slot.role}`;
                    const usesSharedSkuMedia = !draft.file && !ownMedia && Boolean(existing);
                    const usesFamilyFallback = !draft.file && !existing && Boolean(familyFallback);

                    return (
                      <article className={styles.photoSlot} key={slot.role}>
                        <div className={styles.photoSlotHead}>
                          <span className={styles.photoNumber}>{slot.number}</span>
                          <span>
                            <strong>SKU · {slot.title}</strong>
                            <small>{slot.hint}</small>
                          </span>
                          <span className={draft.file ? styles.pendingBadge : styles.savedBadge}>
                            {draft.file
                              ? "новый файл"
                              : ownMedia
                                ? "сохранено"
                                : usesSharedSkuMedia
                                  ? "общее фото"
                                  : "не задано"}
                          </span>
                        </div>

                        <div className={styles.photoPreview}>
                          {previewSrc ? (
                            <img
                              alt={
                                draft.alt ||
                                visibleMedia?.alt ||
                                `${skuForm.name || selectedProduct.name} (${skuForm.article || "артикул"}) — ${slot.hint.toLocaleLowerCase("ru-RU")}`
                              }
                              src={previewSrc}
                            />
                          ) : (
                            <div className={styles.photoPlaceholder}>
                              <ImagePlus size={24} />
                              <span>Фото не задано</span>
                            </div>
                          )}
                          {usesFamilyFallback ? (
                            <span className={styles.fallbackLabel}>Показано фото семейства</span>
                          ) : usesSharedSkuMedia ? (
                            <span className={styles.fallbackLabel}>Общее фото исполнения</span>
                          ) : null}
                        </div>

                        <div className={styles.photoSlotActions}>
                          <input
                            accept="image/*"
                            className={styles.slotFileInput}
                            id={inputId}
                            onChange={(event) => selectSkuPhoto(slot.role, event)}
                            type="file"
                          />
                          <label className={styles.fileButton} htmlFor={inputId}>
                            {draft.previewUrl || existing ? "Заменить файл" : "Выбрать файл"}
                          </label>
                          {draft.file ? (
                            <button
                              className={styles.clearButton}
                              onClick={() => clearSkuPhotoDraft(slot.role)}
                              type="button"
                            >
                              Отменить
                            </button>
                          ) : ownMedia ? (
                            <button
                              className={styles.clearButton}
                              disabled={isBusy}
                              onClick={() => deleteSelectedSkuPhoto(slot.role)}
                              type="button"
                            >
                              Удалить
                            </button>
                          ) : null}
                        </div>

                        <label className={styles.photoAltField}>
                          Описание
                          <input
                            onChange={(event) => updateSkuPhotoDraft(slot.role, { alt: event.target.value })}
                            placeholder={`${skuForm.name || selectedProduct.name} (${skuForm.article || "артикул"}) — ${slot.hint.toLocaleLowerCase("ru-RU")}`}
                            value={draft.alt}
                          />
                        </label>
                        {draft.file ? <span className={styles.fileName}>{draft.file.name}</span> : null}
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className={styles.saveBar}>
                <span>
                  {pendingPhotoCount
                    ? `К сохранению: ${pendingPhotoCount} фото`
                    : "Новые фотографии не выбраны"}
                </span>
                <button
                  className={styles.button}
                  disabled={isBusy || pendingPhotoCount === 0}
                  onClick={savePendingPhotos}
                  type="button"
                >
                  <Save size={15} /> Сохранить фото{pendingPhotoCount ? ` · ${pendingPhotoCount}` : ""}
                </button>
              </div>

              <section className={styles.compatibilityEditor}>
                <div className={styles.compatibilityHeader}>
                  <span className={styles.compatibilityIcon}><Link2 size={20} /></span>
                  <div>
                    <h2>Совместимые детали</h2>
                    <p>
                      Выберите допустимые семейства. Конкретная деталь для карточки подбирается
                      автоматически по параметрам выбранного SKU.
                    </p>
                  </div>
                </div>

                <div className={styles.sourceVariant}>
                  <label className={styles.field}>
                    Вариант для проверки
                    <select
                      onChange={(event) => {
                        const sku = selectedProduct.skus.find((item) => item.id === event.target.value);
                        if (sku) setSkuForm(skuToForm(sku));
                      }}
                      value={skuForm.id ?? ""}
                    >
                      {selectedProduct.skus.filter((sku) => sku.is_active).map((sku) => (
                        <option key={sku.id} value={sku.id}>{sku.article}</option>
                      ))}
                    </select>
                  </label>
                  <div className={styles.autoFacts}>
                    <span><small>Категория</small><strong>{selectedProduct.category_name}</strong></span>
                    <span><small>Товар</small><strong>{selectedProduct.name}</strong></span>
                    <span><small>Диаметр d/D</small><strong>{skuForm.diameter_mm || "—"}/{skuForm.outer_diameter_mm || "—"} мм</strong></span>
                    <span><small>Марка стали</small><strong>{skuForm.steel_grade || "—"}</strong></span>
                    <span><small>Вид стали</small><strong>{skuForm.material || "—"}</strong></span>
                    <span><small>Утепление</small><strong>{skuForm.insulation_mm ? `${skuForm.insulation_mm} мм` : "—"}</strong></span>
                  </div>
                </div>

                <div className={styles.compatibilityPicker}>
                  <label className={styles.field}>
                    Категория совместимой детали
                    <select
                      onChange={(event) => {
                        setCompatibleCategoryId(event.target.value);
                        setCompatibleCandidateId("");
                      }}
                      value={compatibleCategoryId}
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Семейство изделия
                    <select
                      onChange={(event) => setCompatibleCandidateId(event.target.value)}
                      value={compatibleCandidateId}
                    >
                      <option value="">Выберите изделие</option>
                      {compatibleProductOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} · {product.sku_count} SKU
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={styles.ghostButton}
                    disabled={!compatibleCandidateId || compatibleProductIds.includes(compatibleCandidateId)}
                    onClick={addCompatibleProduct}
                    type="button"
                  >
                    <Plus size={15} /> Добавить
                  </button>
                </div>

                <div className={styles.compatibilityList}>
                  {selectedCompatibleProducts.map((product) => (
                    <article key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.category_name} · {product.product_kind ?? "тип не задан"} · {product.sku_count} SKU</span>
                      </div>
                      <button
                        aria-label={`Убрать ${product.name}`}
                        onClick={() => removeCompatibleProduct(product.id)}
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    </article>
                  ))}
                  {!selectedCompatibleProducts.length ? (
                    <p className={styles.compatibilityEmpty}>
                      Совместимые семейства ещё не выбраны. Публичная карточка не будет показывать
                      детали, пока список не сохранён.
                    </p>
                  ) : null}
                </div>

                <div className={styles.compatibilityActions}>
                  <span>Диаметр, утепление, марка и вид стали берутся из SKU автоматически.</span>
                  <button className={styles.button} disabled={isBusy} onClick={saveCompatibility} type="button">
                    <Save size={15} /> Сохранить совместимость
                  </button>
                </div>
              </section>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
