import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useCatalogTree, type CategoryNode } from "@/lib/api";

function CategoryRow({ category }: { category: CategoryNode }) {
  return (
    <article className="category-row">
      <div>
        <p className="meta">/{category.slug}</p>
        <h3>{category.name}</h3>
        {category.description ? <p>{category.description}</p> : null}
        {category.children.length > 0 ? (
          <div className="children">
            {category.children.map((child) => (
              <span className="chip" key={child.id}>
                {child.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <Link className="icon-button" href={`/catalog#${category.slug}`} aria-label={category.name}>
        <ArrowRight size={18} />
      </Link>
    </article>
  );
}

export default function CatalogPage() {
  const { data: categories, isLoading, isError } = useCatalogTree();

  return (
    <main className="page">
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Дерево каталога</p>
            <h1 className="product-title">Каталог дымоходов</h1>
          </div>
          <p>
            Первая API-вертикаль: backend отдает дерево категорий, frontend показывает структуру и
            готов к товарной выдаче.
          </p>
        </div>

        {isError ? (
          <div className="empty">Backend пока не ответил. Запусти API или docker compose.</div>
        ) : null}

        {isLoading ? (
          <div className="empty">Загружаем каталог…</div>
        ) : null}

        {!isLoading && !isError && categories && categories.length === 0 ? (
          <div className="empty">Категории пока пустые. Запусти seed для demo-данных.</div>
        ) : null}

        <div className="category-list">
          {(categories ?? []).map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </div>
      </section>
    </main>
  );
}
