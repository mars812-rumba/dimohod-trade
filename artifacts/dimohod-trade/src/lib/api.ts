import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiUrl(path: string) {
  return `${BASE}/api${path}`;
}

export type CategoryNode = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  children: CategoryNode[];
};

export type SKU = {
  id: string;
  article: string;
  name: string;
  price_rub: string | null;
  stock_status: string;
};

export type Product = {
  id: string;
  category: { id: string; name: string; slug: string };
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  brand: string | null;
  material: string | null;
  wall_thickness_mm: string | null;
  diameter_mm: number | null;
  application_tags: string[];
  compatibility_notes: string | null;
  skus: SKU[];
};

export function useCatalogTree() {
  return useQuery<CategoryNode[]>({
    queryKey: ["catalog", "tree"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/v1/catalog/tree"));
      if (!res.ok) throw new Error("Failed to load catalog");
      const data = await res.json();
      return data.items as CategoryNode[];
    },
  });
}

export function useProduct(slug: string) {
  return useQuery<Product>({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/v1/products/${slug}`));
      if (res.status === 404) throw new Error("not_found");
      if (!res.ok) throw new Error("Failed to load product");
      return res.json() as Promise<Product>;
    },
    enabled: !!slug,
    retry: false,
  });
}
