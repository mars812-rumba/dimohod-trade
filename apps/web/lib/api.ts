export type CategoryNode = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  cover: MediaItem | null;
  children: CategoryNode[];
};

export type MediaItem = {
  url: string;
  alt: string | null;
  role: string | null;
};

export type CatalogTreeResponse = {
  items: CategoryNode[];
};

export type SKU = {
  id: string;
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
  compatibility_messages: Array<{
    code: string;
    severity: "info" | "warning" | "error" | string;
    message: string;
    rule_type: string;
  }>;
};

export type ProductListItem = {
  id: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  name: string;
  slug: string;
  article: string | null;
  material: string | null;
  steel_grade: string | null;
  wall_thickness_mm: string | null;
  diameter_mm: number | null;
  outer_diameter_mm: number | null;
  contour: string | null;
  insulation_mm: number | null;
  length_mm: number | null;
  angle_deg: number | null;
  stock_status: string | null;
  attributes: Record<string, unknown>;
  product_kind: string | null;
  primary_image: MediaItem | null;
  price_rub: string | null;
  sku_count: number;
  selected_sku: string | null;
};

export type ProductListResponse = {
  items: ProductListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ProductKindFilter = {
  value: string;
  label: string;
  count: number;
};

export type ProductFilterOption = {
  value: string;
  label: string;
  count: number;
};

export type ProductFiltersResponse = {
  product_kinds: ProductKindFilter[];
  diameters: ProductFilterOption[];
  steel_grades: ProductFilterOption[];
  materials: ProductFilterOption[];
  lengths: ProductFilterOption[];
  wall_thicknesses: ProductFilterOption[];
  angles: ProductFilterOption[];
  insulations: ProductFilterOption[];
  contours: ProductFilterOption[];
};

export type CompatibleProduct = {
  source_sku_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  sku_id: string;
  sku_key: string;
  article: string;
  name: string;
  length_mm: number | null;
  diameter_mm: number | null;
  outer_diameter_mm: number | null;
  insulation_mm: number | null;
  steel_grade: string | null;
  material: string | null;
  price_rub: string | null;
  stock_status: string;
  primary_image: MediaItem | null;
};

export type Product = {
  id: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  name: string;
  slug: string;
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
  product_kind: string | null;
  purpose: string[];
  extra_attributes: Record<string, unknown>;
  application_tags: string[];
  compatibility_notes: string | null;
  skus: SKU[];
  compatible_products: CompatibleProduct[];
};

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8000";

export async function getCatalogTree(): Promise<CategoryNode[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/catalog/tree`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("Failed to load catalog tree");
  }

  const data = (await response.json()) as CatalogTreeResponse;
  return data.items;
}

export async function getProducts({
  limit = 48,
  offset = 0,
  productKind,
  category,
  search,
  diameter,
  steelGrade,
  material,
  length,
  wallThickness,
  angle,
  insulation,
  contour,
}: {
  limit?: number;
  offset?: number;
  productKind?: string;
  category?: string;
  search?: string;
  diameter?: string;
  steelGrade?: string;
  material?: string;
  length?: string;
  wallThickness?: string;
  angle?: string;
  insulation?: string;
  contour?: string;
} = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (productKind) {
    params.set("product_kind", productKind);
  }
  if (category) {
    params.set("category", category);
  }
  if (search) {
    params.set("q", search);
  }
  if (diameter) {
    params.set("diameter", diameter);
  }
  if (steelGrade) {
    params.set("steel_grade", steelGrade);
  }
  if (material) {
    params.set("material", material);
  }
  if (length) {
    params.set("length_mm", length);
  }
  if (wallThickness) {
    params.set("wall_thickness_mm", wallThickness);
  }
  if (angle) {
    params.set("angle_deg", angle);
  }
  if (insulation) {
    params.set("insulation_mm", insulation);
  }
  if (contour) {
    params.set("contour", contour);
  }
  const response = await fetch(`${apiBaseUrl}/api/v1/products?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load products");
  }

  return (await response.json()) as ProductListResponse;
}

export async function getProductFilters(category?: string): Promise<ProductFiltersResponse> {
  const params = new URLSearchParams();
  if (category) {
    params.set("category", category);
  }
  const query = params.toString();
  const response = await fetch(`${apiBaseUrl}/api/v1/products/filters${query ? `?${query}` : ""}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("Failed to load product filters");
  }

  return (await response.json()) as ProductFiltersResponse;
}

export async function getProduct(slug: string, sku?: string): Promise<Product | null> {
  const params = new URLSearchParams();
  if (sku) {
    params.set("sku", sku);
  }
  const query = params.toString();
  const response = await fetch(`${apiBaseUrl}/api/v1/products/${slug}${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load product");
  }

  return (await response.json()) as Product;
}
