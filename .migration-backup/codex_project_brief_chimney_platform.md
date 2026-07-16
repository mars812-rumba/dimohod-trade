# Codex Project Brief: Chimney Platform

## Роль проекта

Нужно разработать веб-платформу для продажи дымоходов в России.

Это не обычный интернет-магазин. Главная идея: пользователь должен не просто купить отдельную трубу, а подобрать безопасный и совместимый комплект дымохода.

## Стек

Backend:

- FastAPI
- PostgreSQL
- SQLAlchemy 2.0
- Alembic
- Pydantic v2
- Redis

Frontend:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS или CSS Modules

Search:

- Meilisearch на MVP
- OpenSearch позже при необходимости

Storage:

- S3 / MinIO для изображений, сертификатов, инструкций и PDF-смет

## Бизнес-цель

Создать лучший сайт по продаже дымоходов в России:

- удобный каталог;
- сильные SEO-страницы;
- подробные карточки товаров;
- калькулятор / конфигуратор полного комплекта;
- доверие через документы, кейсы, сертификаты;
- высокая конверсия в заявку.

## Основные модули

1. Catalog
2. Products
3. SKU
4. Attributes
5. SEO Pages
6. Content / Blog / FAQ
7. Calculator
8. Compatibility Rules
9. BOM / Specification
10. Leads
11. Admin
12. Documents
13. Reviews
14. Search

## MVP

В MVP нужно реализовать:

1. Monorepo.
2. Backend FastAPI.
3. Frontend Next.js.
4. Docker Compose.
5. PostgreSQL.
6. Категории.
7. Товары.
8. SKU.
9. Характеристики.
10. Фильтры.
11. Карточку товара.
12. SEO metadata.
13. Заявки.
14. Калькулятор v1.
15. PDF-смету v1.

## Базовая структура

```text
chimney-platform/
├── apps/
│   └── web/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   ├── api/
│   │   ├── modules/
│   │   │   ├── catalog/
│   │   │   ├── products/
│   │   │   ├── calculator/
│   │   │   ├── compatibility/
│   │   │   ├── seo/
│   │   │   ├── content/
│   │   │   ├── leads/
│   │   │   └── admin/
│   │   └── db/
│   ├── alembic/
│   └── tests/
├── infra/
├── docs/
└── README.md
```

## Первый промпт для реализации

```text
Создай monorepo chimney-platform.

Стек:
- backend: FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, Pydantic v2
- frontend: Next.js App Router, TypeScript
- infra: Docker Compose

Сделай:
1. apps/web с Next.js.
2. backend с FastAPI.
3. docker-compose с postgres, redis, backend, web.
4. endpoint GET /api/v1/health.
5. Alembic config.
6. Модели Category, Product, SKU.
7. Endpoint GET /api/v1/catalog/tree.
8. Endpoint GET /api/v1/products/{slug}.
9. На frontend:
   - главную страницу;
   - страницу каталога;
   - страницу товара-заглушку.
10. README с командами запуска.

Делай код модульным. Проект должен быть готов к расширению под SEO, калькулятор дымоходов, правила совместимости и админку.
```

## Важные продуктовые принципы

- Каталог должен быть не только по товарам, но и по сценариям: баня, камин, газовый котёл, гильзование.
- Карточка товара должна объяснять совместимость.
- Калькулятор должен собирать полный комплект.
- SEO-страницы должны быть отдельной сущностью.
- Правила совместимости должны храниться отдельно от товаров.
- Заявка из калькулятора важнее обычной формы обратного звонка.

