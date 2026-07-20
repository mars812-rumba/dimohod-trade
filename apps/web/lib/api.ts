export type CategoryNode = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  children: CategoryNode[];
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
  material: string | null;
  steel_grade: string | null;
  wall_thickness_mm: string | null;
  diameter_mm: number | null;
  outer_diameter_mm: number | null;
  contour: string | null;
  insulation_mm: number | null;
  product_kind: string | null;
  price_rub: string | null;
  sku_count: number;
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

export type ProductFiltersResponse = {
  product_kinds: ProductKindFilter[];
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
}: {
  limit?: number;
  offset?: number;
  productKind?: string;
} = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (productKind) {
    params.set("product_kind", productKind);
  }
  const response = await fetch(`${apiBaseUrl}/api/v1/products?${params.toString()}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("Failed to load products");
  }

  return (await response.json()) as ProductListResponse;
}

export async function getProductFilters(): Promise<ProductFiltersResponse> {
  const response = await fetch(`${apiBaseUrl}/api/v1/products/filters`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("Failed to load product filters");
  }

  return (await response.json()) as ProductFiltersResponse;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/products/${slug}`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load product");
  }

  return (await response.json()) as Product;
}
