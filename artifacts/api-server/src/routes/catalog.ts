import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categories, products, skus } from "@workspace/db/schema";
import { eq, isNull } from "drizzle-orm";

const router: IRouter = Router();

// Build nested category tree from flat list
function buildTree(
  cats: Array<typeof categories.$inferSelect>,
  parentId: string | null = null,
): object[] {
  return cats
    .filter((c) => c.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      id: c.id,
      parent_id: c.parent_id ?? null,
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      sort_order: c.sort_order,
      children: buildTree(cats, c.id),
    }));
}

router.get("/v1/catalog/tree", async (req, res) => {
  try {
    const allCategories = await db.select().from(categories).where(eq(categories.is_active, true));
    const tree = buildTree(allCategories);
    res.json({ items: tree });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch catalog tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/v1/products/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const productRows = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (productRows.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const product = productRows[0]!;

    const [categoryRow, skuRows] = await Promise.all([
      db.select().from(categories).where(eq(categories.id, product.category_id)).limit(1),
      db.select().from(skus).where(eq(skus.product_id, product.id)),
    ]);

    const category = categoryRow[0];
    if (!category) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({
      id: product.id,
      category: { id: category.id, name: category.name, slug: category.slug },
      name: product.name,
      slug: product.slug,
      short_description: product.short_description ?? null,
      description: product.description ?? null,
      brand: product.brand ?? null,
      material: product.material ?? null,
      wall_thickness_mm: product.wall_thickness_mm ?? null,
      diameter_mm: product.diameter_mm ?? null,
      application_tags: product.application_tags ?? [],
      compatibility_notes: product.compatibility_notes ?? null,
      skus: skuRows.map((s) => ({
        id: s.id,
        article: s.article,
        name: s.name,
        price_rub: s.price_rub ?? null,
        stock_status: s.stock_status,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch product");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
