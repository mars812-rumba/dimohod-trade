# Dimohod Trade

MVP foundation для платформы подбора и продажи дымоходов: каталог, товарные карточки,
PostgreSQL-модель и Next.js витрина. Калькулятор комплекта дымохода логично добавлять следующим
вертикальным модулем поверх уже созданного каталога.

## Что уже собрано

- `backend/` - FastAPI, SQLAlchemy 2, Alembic, модели `Category`, `Product`, `SKU`.
- `apps/web/` - Next.js App Router: главная, каталог, карточка товара.
- `compose.yaml` - Postgres, Redis, backend, web.
- API:
  - `GET /api/v1/health`
  - `GET /api/v1/catalog/tree`
  - `GET /api/v1/products/{slug}`

## Быстрый запуск через Docker

```bash
cp .env.example .env
docker compose up --build
```

После старта:

- frontend: `http://localhost:3000`
- backend docs: `http://localhost:8000/api/docs`
- health: `http://localhost:8000/api/v1/health`

Чтобы добавить demo-данные:

```bash
docker compose exec backend python -m app.db.seed
```

Demo product slug:

```text
sendvich-truba-115-200-nerzhaveyushchaya-stal-08
```

## Локальный backend без Docker

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

Для локального запуска нужен `DATABASE_URL`, указывающий на PostgreSQL.

## Локальный frontend без Docker

```bash
cd apps/web
npm install
API_BASE_URL=http://localhost:8000 npm run dev
```

## Ближайший следующий инкремент

Актуальная короткая карта следующих шагов хранится в:

```text
NEXT_STEPS.md
```

Текущий порядок:

1. Довести `compatibility_rules` до первого расчета комплекта.
2. После этого сделать SEO-URL вариантов:
   `/catalog/{productSlug}/{variantSlug}`.
3. Затем докручивать карточку вариантов, медиа, документы и админку.
