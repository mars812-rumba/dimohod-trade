# Product Variant & SEO Architecture

Обновлено: 2026-07-20

Этот документ фиксирует целевую архитектуру карточек товара, вариантов/SKU и SEO-URL для
Dimohod Trade. Он важнее текущей временной модели импорта, где после первых прайсов многие SKU были
загружены как отдельные `products`.

## 1. Core Principle

Система должна разделять Product и Variant.

Product — логический тип товара:

- одноконтурная труба;
- сэндвич-труба;
- отвод 45°;
- отвод 90°;
- тройник;
- переходник;
- шибер;
- оголовок;
- хомут.

Variant — конкретная покупаемая позиция/SKU.

Variant attributes:

- `diameter_mm`;
- `outer_diameter_mm`;
- `length_mm`;
- `angle_deg`;
- `steel_grade`;
- `wall_thickness_mm`;
- `contour`;
- `insulation_mm`;
- `price`;
- `sku/article`;
- `availability`;
- `documents`;
- `drawings`;
- `compatibility`.

## 2. One Product → Many Variants

Один Product имеет много Variants.

Пример:

```text
Product:
  single-wall-pipe

Variants:
  d115-l1000-aisi430-t05
  d150-l1000-aisi430-t05
  d200-l500-aisi304-t08
```

Frontend должен использовать один reusable Product Detail component.

Не должно быть отдельных React-страниц под каждую комбинацию диаметра/стали/длины. Меняются только
данные выбранного Variant.

## 3. URL Strategy

Каждый SEO-важный Variant должен иметь собственный canonical URL.

Целевой формат:

```text
/catalog/single-wall-pipe/d115-1000-aisi430
/catalog/single-wall-pipe/d150-1000-aisi430
/catalog/single-wall-pipe/d200-500-aisi304
/catalog/sandwich-pipe/d115-200-1000-aisi430-ins50
```

Где:

- `single-wall-pipe` — slug логического Product;
- `d115-1000-aisi430` — slug конкретного Variant.

Старый временный формат:

```text
/product/{slug}
```

может остаться как legacy/redirect, но целевая SEO-модель должна идти через product slug + variant
slug.

## 4. Variant Selection UX

Внутри карточки Product пользователь выбирает:

- диаметр;
- длину;
- марку стали;
- толщину;
- изоляцию;
- другие значимые свойства.

При изменении SEO-значимого параметра:

1. обновляется URL через Next.js routing;
2. не происходит полный reload страницы;
3. layout карточки остается тем же;
4. backend refresh возвращает данные нового Variant;
5. обновляются цена, артикул, характеристики, документы, совместимость и availability.

## 5. SEO

Каждый Variant имеет независимые SEO metadata:

- `title`;
- `description`;
- `h1`;
- `canonical_url`;
- `OpenGraph`;
- `Schema.org Product`;
- `Offer`;
- breadcrumbs.

SEO-поля могут быть:

1. заданы вручную в админке;
2. сгенерированы автоматически из Product + Variant attributes;
3. переопределены для приоритетных вариантов.

Fallback generation example:

```text
H1:
  Труба одноконтурная Ø115, 1000 мм, AISI 430

Title:
  Труба одноконтурная Ø115 1000 мм AISI 430 — купить в Санкт-Петербурге

Description:
  Одноконтурная труба Ø115 длиной 1000 мм из AISI 430. Цена, характеристики, совместимость,
  документы и подбор комплекта дымохода.
```

## 6. Rendering

Product Detail component рендерит данные, полученные от backend.

Variant change updates:

- URL;
- price;
- SKU/article;
- characteristics;
- drawings;
- documents;
- compatibility;
- availability;
- SEO metadata.

Не должно быть дублирования JSX/React pages.

## 7. Source of Truth

Все данные о Product, Variant, SEO, совместимости, документах, медиа и ценах должны существовать
только один раз в PostgreSQL.

Единый backend API должны использовать:

- frontend;
- configurator;
- AI sales assistant;
- catalog;
- search;
- admin panel;
- future mobile app;
- ERP/CRM integrations;
- marketplace sync.

Дублировать продуктовые данные на фронте запрещено.

## 8. Target Database Shape

Текущие таблицы `products` и `skus` есть, но целевая модель должна быть яснее.

Целевая схема:

```text
products
  id
  category_id
  slug                      # logical product slug: single-wall-pipe
  name
  product_kind
  contour
  default_media_key
  description
  is_active

product_variants / skus
  id
  product_id
  slug                      # variant slug: d115-1000-aisi430
  article
  diameter_mm
  outer_diameter_mm
  length_mm
  angle_deg
  steel_grade
  wall_thickness_mm
  insulation_mm
  price_rub
  stock_status
  attributes jsonb
  is_active

variant_seo
  id
  variant_id
  title
  description
  h1
  canonical_url
  og_title
  og_description
  robots_policy
  schema_json jsonb
```

Можно использовать существующую таблицу `skus` как Variant table, если расширить ее slug/SEO и
перенести структурированные свойства с `products` на variant-level.

## 9. Import Strategy

Импортер из Excel/JSON не должен бесконечно плодить logical Products.

Новый импорт должен делать так:

1. Определить logical product key:
   - `single-wall-pipe`;
   - `single-wall-elbow-45`;
   - `sandwich-pipe-50`;
   - `sandwich-tee-90-50`.
2. Найти или создать Product по logical key.
3. Создать/обновить Variant по variant key.
4. Записать price/SKU/availability на Variant.
5. Сгенерировать canonical URL и SEO fallback.

Текущий импорт `6340 products` является временным состоянием MVP. Его нужно мигрировать в
Product → Variant до дальнейшей массовой загрузки ассортимента.

## 10. Configurator Compatibility

Конфигуратор должен выбирать Variant, а не Product.

Пример rule query:

```text
find variant where:
  product.product_kind = труба
  product.contour = сэндвич
  variant.diameter_mm = selected_diameter
  variant.insulation_mm = 50
  variant.length_mm = 1000
```

Главное правило:

```text
outdoor / cold zone => only sandwich variants
```

## 11. API Target

Целевые endpoints:

```text
GET /api/v1/catalog/products
GET /api/v1/products/{product_slug}
GET /api/v1/products/{product_slug}/variants
GET /api/v1/products/{product_slug}/variants/{variant_slug}
GET /api/v1/variants/{variant_slug}
GET /api/v1/seo/page?path=/catalog/{product_slug}/{variant_slug}
```

Для фронта карточки удобен один агрегированный endpoint:

```text
GET /api/v1/products/{product_slug}/variants/{variant_slug}/detail
```

Он должен вернуть:

- product;
- selected variant;
- sibling variants/options;
- price;
- availability;
- media;
- documents;
- compatibility;
- SEO metadata;
- JSON-LD.

## 12. Frontend Target

Целевая Next.js route:

```text
apps/web/app/catalog/[productSlug]/[variantSlug]/page.tsx
```

Компонент:

```text
ProductExperience
```

должен оставаться единым reusable layout.

Variant selector должен использовать `router.push()`/Link для изменения URL без полной перезагрузки
приложения.

## 13. Future Scalability

Эта архитектура должна поддерживать без переделки карточки:

- configurator;
- AI sales assistant;
- admin panel;
- automatic SEO generation;
- Excel import;
- JSON import/export;
- ERP/CRM integration;
- marketplace synchronization.
