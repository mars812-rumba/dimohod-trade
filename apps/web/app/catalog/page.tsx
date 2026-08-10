import Link from "next/link";
import { ArrowRight, Boxes, Layers3, Ruler, type LucideIcon } from "lucide-react";
import { getCatalogTree, type CategoryNode } from "@/lib/api";

// The backend is not reachable from the isolated Next.js image build. Render the
// directory at request time so a transient build-time failure is never frozen
// into the published catalog page.
export const dynamic = "force-dynamic";

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function publicMediaUrl(url: string) {
  return url.startsWith("/media/") ? `${appBasePath}${url}` : url;
}

function leafCategories(categories: CategoryNode[]): CategoryNode[] {
  return categories.flatMap((category) =>
    category.children.length ? leafCategories(category.children) : [category],
  );
}

function compactList(values: string[], limit = 3) {
  const visible = values.slice(0, limit);
  const remaining = values.length - visible.length;
  return `${visible.join(", ")}${remaining > 0 ? ` · ещё ${remaining}` : ""}`;
}

function CategoryCard({ category }: { category: CategoryNode }) {
  const productNames = category.product_names ?? [];
  const standardLengths = category.standard_lengths_mm ?? [];
  const steelGrades = category.steel_grades ?? [];
  const facts = [
    productNames.length
      ? { icon: Boxes, label: "Изделия", value: compactList(productNames) }
      : null,
    standardLengths.length
      ? {
          icon: Ruler,
          label: "Стандартная длина",
          value: `${standardLengths.join(" / ")} мм`,
        }
      : null,
    steelGrades.length
      ? { icon: Layers3, label: "Марка стали", value: steelGrades.join(" / ") }
      : null,
  ].filter(
    (fact): fact is { icon: LucideIcon; label: string; value: string } => fact !== null,
  );

  return (
    <Link className="catalog-category-card" href={`/catalog/${category.slug}`}>
      <div className="catalog-category-media">
        {category.cover ? (
          <img
            alt={category.cover.alt ?? `${category.name} — ассортимент изделий`}
            src={publicMediaUrl(category.cover.url)}
          />
        ) : (
          <span>Фото категории</span>
        )}
      </div>
      <div className="catalog-category-body">
        <h2>{category.name}</h2>
        {category.description ? <p>{category.description}</p> : null}
        {facts.length ? (
          <dl className="catalog-category-facts">
            {facts.map((fact) => {
              const Icon = fact.icon;
              return (
                <div key={fact.label}>
                  <dt>
                    <Icon size={14} strokeWidth={1.65} aria-hidden />
                    <span>{fact.label}</span>
                  </dt>
                  <dd>{fact.value}</dd>
                </div>
              );
            })}
          </dl>
        ) : null}
        <span className="catalog-category-link">
          Смотреть изделия <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  );
}

export default async function CatalogPage() {
  let categories: CategoryNode[] = [];
  let loadError = false;
  try {
    categories = leafCategories(await getCatalogTree());
  } catch {
    loadError = true;
  }

  return (
    <main className="page catalog-page">
      <section className="section catalog-directory">
        <div className="section-head">
          <div>
            <p className="eyebrow">Каталог</p>
            <h1 className="product-title">Категории дымоходов</h1>
          </div>
          <p>
            Выберите тип изделия. На странице категории можно найти семейство по названию и
            отфильтровать варианты по диаметру, материалу и марке стали.
          </p>
        </div>

        {loadError ? <div className="state-empty">Не удалось загрузить категории.</div> : null}
        {!loadError && categories.length === 0 ? (
          <div className="state-empty">Категории пока не заполнены.</div>
        ) : null}
        {!loadError && categories.length > 0 ? (
          <div className="category-list catalog-category-list">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
