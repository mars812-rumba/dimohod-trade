# Dimohod Trade — project context for Codex

Обновлено: 2026-08-01
Репозиторий: `mars812-rumba/dimohod-trade`  
Текущая рабочая ветка: `ui/replit-port`

Этот файл — быстрый вход в проект. Перед началом новой задачи сначала читать его, а не весь
репозиторий. Если меняется архитектура, этап, URL, схема БД или ключевое продуктово-техническое
решение — обновить этот файл отдельным маленьким коммитом.

Для короткой карты ближайших приоритетов читать:

- `NEXT_STEPS.md`

Архитектура общих медиа, параметрических SVG, сцены конфигуратора и BOM зафиксирована в:

- `docs/PARAMETRIC_PRODUCT_MEDIA_AND_BOM_ARCHITECTURE.md`

## 1. Главная идея продукта

Мы строим не обычный интернет-магазин труб, а платформу подбора безопасных и совместимых
дымоходных систем.

Главный продукт сайта — не отдельная труба, а правильно собранный комплект дымохода:

- источник тепла;
- диаметр выходного патрубка;
- маршрут дымохода;
- материал и контур;
- проходы через стену, перекрытие, кровлю;
- крепеж, ревизии, оголовок;
- документы и монтажные инструкции.

Ключевой принцип: лучше оставить поле `NULL` и отправить запись на ручную проверку, чем угадать
диаметр, сталь или назначение. Это влияет на безопасность монтажа.

## 2. Текущий стек

- Frontend: Next.js App Router, TypeScript, CSS.
- Backend: FastAPI, SQLAlchemy 2, Alembic.
- DB: PostgreSQL.
- Cache/queue base: Redis.
- Runtime: Docker Compose.

Основные сервисы в `compose.yaml`:

- `postgres`
- `redis`
- `backend`
- `web`

## 3. Публичный и локальный доступ

Публичный frontend:

- `https://sunny-rentals.online/dimohod`

Публичная карточка демо-товара:

- `https://sunny-rentals.online/dimohod/product/sendvich-truba-115-200-nerzhaveyushchaya-stal-08`

Локально через Docker:

- frontend: `http://localhost:3000/dimohod`
- backend docs: `http://localhost:8000/api/docs`
- health: `http://localhost:8000/api/v1/health`

Важно: frontend в production работает с `NEXT_BASE_PATH=/dimohod`.

## 4. Текущая структура проекта

```text
.
├── apps/web/                         # Next.js frontend
│   ├── app/page.tsx                   # главная / wireframe landing
│   ├── app/admin/page.tsx             # MVP админки каталога
│   ├── app/catalog/page.tsx           # каталог
│   ├── app/product/[slug]/page.tsx    # карточка товара
│   ├── components/AdminCatalogManager.tsx
│   ├── components/ProductExperience.tsx
│   ├── lib/api.ts
│   └── next.config.ts
├── backend/                           # FastAPI backend
│   ├── app/main.py
│   ├── app/api/v1/router.py
│   ├── app/modules/catalog/
│   ├── app/modules/products/
│   ├── app/db/
│   └── alembic/
├── storage/                           # локальные медиа-заглушки товаров
├── compose.yaml
├── README.md
├── NEXT_STEPS.md
├── PRODUCT_VARIANT_SEO_ARCHITECTURE.md
├── codex_project_brief_chimney_platform.md
├── chimney_app_architecture_fastapi_nextjs.md
└── chimney_market_research_russia_2026.pdf
```

## 5. Что уже сделано

### Backend

Есть базовая модель каталога:

- `categories`
- `products`
- `skus`
- `needs_review`

Текущие API:

- `GET /api/v1/health`
- `GET /api/v1/catalog/tree`
- `GET /api/v1/compatibility/rules`
- `POST /api/v1/compatibility/check`
- `GET /api/v1/admin/categories`
- `GET /api/v1/admin/skus?category_id=&limit=&offset=&search=`
- `GET /api/v1/admin/products?category_id=`
- `GET /api/v1/admin/products/{product_id}`
- `POST /api/v1/admin/products/{product_id}/skus`
- `PATCH /api/v1/admin/skus/{sku_id}`
- `DELETE /api/v1/admin/skus/{sku_id}` — soft delete через `is_active = false`
- `POST /api/v1/admin/products/{product_id}/photos`
- `DELETE /api/v1/admin/products/{product_id}/photos/{photo_index}`
- `GET /api/v1/products?limit=&offset=&product_kind=`
- `GET /api/v1/products/filters`
- `GET /api/v1/products/{slug}`

Текущая модель `products` уже содержит часть будущих структурных полей:

- `diameter_mm`
- `wall_thickness_mm`
- `material`
- `steel_grade`
- `contour`
- `insulation_mm`
- `max_temperature_c`
- `product_kind`
- `purpose`
- `extra_attributes`
- `source_name`
- `application_tags`
- `compatibility_notes`

Первое расширение схемы под импорт прайсов выполнено миграцией:

- `backend/alembic/versions/202607170001_product_import_fields.py`

Расширение `skus` до Variant/SKU выполнено миграцией:

- `backend/alembic/versions/202607200002_sku_variant_fields.py`

Первый слой правил совместимости выполнен миграцией:

- `backend/alembic/versions/202607200003_compatibility_rules.py`

Теперь `skus` содержит variant-поля:

- `slug`
- `diameter_mm`
- `outer_diameter_mm`
- `length_mm`
- `angle_deg`
- `material`
- `steel_grade`
- `wall_thickness_mm`
- `contour`
- `insulation_mm`

Таблица `compatibility_rules` хранит правила, которые применяются к Variant/SKU и сценариям
конфигуратора:

- `conditions jsonb`;
- `result jsonb`;
- `severity = info/warning/error`;
- `message`;
- `applies_to_product_kind`.

Seed базовых правил:

```bash
python -m app.db.seed_compatibility_rules
```

На 2026-07-20 засеяно `11` правил:

- улица/чердак/холодная зона требуют `contour = сэндвич`;
- одноконтурные элементы — только теплая зона/стартовый участок;
- рабочий диаметр комплекта должен совпадать;
- сэндвич должен иметь `insulation_mm`;
- сэндвич 50 мм — базовый наружный/холодный контур;
- крепеж подбирается по наружному диаметру;
- тройник должен оставлять доступ к ревизии;
- оголовок ставится только сверху системы;
- газовый котел требует проверки стали.

Импортер JSON-прайса:

- `backend/app/db/import_price_list.py`

Команда импорта внутри backend-контейнера:

```bash
python -m app.db.import_price_list /tmp/price_list.json --sheet голые
```

На 2026-07-17 импортирован лист `голые` из `prices/price_list.json`:

- импортировано products: `2295`;
- импортировано SKU: `2295`;
- `needs_review`: `0`;
- `contour = одностенный`;
- `insulation_mm = NULL`;
- `purpose = []`;
- `Дефлектор` замаплен в `product_kind = оголовок`;
- оцинковка хранится как `material = оцинковка`, `steel_grade = NULL`;
- AISI хранится как `steel_grade = AISI 430/304/321/316`, `material = нержавеющая сталь`.

На 2026-07-20 импортирован сэндвич 50 мм из `prices/50mm.json`, лист `Лист1`:

- импортировано products: `4044`;
- импортировано SKU: `4044`;
- `needs_review`: `0`;
- `contour = сэндвич`;
- `insulation_mm = 50`;
- `diameter_mm` хранит внутренний диаметр;
- наружный диаметр хранится в `extra_attributes.outer_diameter_mm`;
- внутренняя труба используется как главный `steel_grade` и `wall_thickness_mm`;
- наружный кожух хранится в `extra_attributes.outer_material`,
  `extra_attributes.outer_steel_grade`, `extra_attributes.outer_wall_thickness_mm`;
- `Оголовок-конус` замаплен в `product_kind = оголовок`.

Итого после импорта одноконтурных + сэндвич 50 мм + demo:

- products: `6340`;
- одностенный: `2295`;
- сэндвич 50 мм: `4044`;
- demo без нового contour: `1`.

На 2026-07-20 выполнен переход текущих импортированных позиций к модели Product → Variant/SKU:

- физически в таблице `products`: `6340`;
- активных logical products: `40`;
- legacy products выключено через `is_active = false`: `6300`;
- всего SKU: `6341`;
- импортированных SKU с `slug` варианта и variant-полями: `6339`;
- `needs_review`: `0`.

Активные logical products по типу изделия:

- `труба`: `2`;
- `отвод`: `4`;
- `тройник`: `8`;
- `четверник`: `4`;
- `шибер`: `9`;
- `ревизия`: `1`;
- `конденсатоотвод`: `1`;
- `заглушка`: `3`;
- `крепеж`: `2`;
- `оголовок`: `5`.

Скрипт группировки:

```bash
python -m app.db.group_products_into_variants
```

Важное архитектурное решение от 2026-07-20:

- старое состояние, где каждая позиция прайса лежала как отдельный `products`, переведено в
  legacy/inactive;
- целевая модель каталога: `Product` = логический тип товара, `Variant/SKU` = конкретная покупаемая
  позиция;
- каждая SEO-важная вариация должна иметь собственный canonical URL;
- карточка товара на frontend должна быть одна переиспользуемая, без копирования React-страниц под
  разные диаметры, длины и стали;
- источником правды для frontend, конфигуратора, AI-помощника, админки, поиска и будущих интеграций
  остается PostgreSQL.

Подробно зафиксировано в:

- `PRODUCT_VARIANT_SEO_ARCHITECTURE.md`

Правила конфигуратора и совместимости зафиксированы в:

- `backend/configurator/CONFIGURATOR_RULES.md`

### Frontend

Собраны:

- главная страница как wireframe-каркас;
- каталог;
- карточка товара;
- медиа-блок карточки товара с временными изображениями.
- фильтрация каталога по типу изделия через `product_kind`.
- вывод сообщений совместимости на карточке из `compatibility_rules` для выбранного SKU.

На главной главный CTA сейчас:

- primary: `Рассчитать комплект`;
- secondary: `Открыть каталог`.

Решение по CTA: для концепции платформы лучше вести новичка в подбор комплекта, а каталог оставить
вторым путем для тех, кто уже знает товар или артикул.

### Media

Для демо-товара есть временные картинки:

```text
storage/catalog/products/sendvich-truba-115-200-nerzhaveyushchaya-stal-08/photos/
├── main.png
├── dimensions.png
└── installed.png
```

Текущая договоренность по медиа: фото, видео и документы должны жить рядом с сущностью каталога,
но данные о ценах, совместимости, характеристиках и привязках должны идти из БД и управляться через
админку.

MVP админки доступен на `/admin`. Центральный список админки показывает SKU/варианты, а не только
40 logical products: есть фильтр по категории, поиск по артикулу/названию/товару и пагинация.
Реализовано управление SKU внутри выбранного товара, загрузка фото товара и редактирование
характеристик SKU через `SKU.attributes`. Фото сохраняются в
`storage/catalog/admin/<product-slug>/`, а backend раздает `storage/` через `/media`.
В Docker для этого используется `MEDIA_STORAGE_DIR=/app/storage` и volume `./storage:/app/storage`.
Авторизация и роли для админки пока не реализованы; перед production-доступом маршрут нужно закрыть.

## 6. Продуктовая структура главной страницы

Главная — это вход в подбор, а не просто витрина.

Текущий порядок блоков:

1. Hero: купить не трубу, а безопасный комплект.
2. Быстрый выбор сценария.
3. Trust strip: совместимость, каталог, документы, доставка.
4. Почему нужен такой подход.
5. Сценарные входы:
   - баня и сауна;
   - камин;
   - газовый котел;
   - твердотопливный котел;
   - гильзование канала.
6. Калькулятор v1 / собрать комплект.
7. Быстрый вход в каталог.
8. Блок совместимости: что именно проверяем.
9. Анатомия карточки товара.
10. Медиа и база знаний.
11. Финальная заявка.

## 7. Ближайший большой этап: загрузка каталога товаров в БД

Пользовательская задача зафиксирована так:

> Загрузка каталога дымоходов "Дымоход Трейд" в БД + парсинг моделей печей/каминов/котлов для
> системы автоподбора.

Начинать нужно с этапа 1: нормализация и загрузка каталога товаров.

Нельзя сразу писать миграцию и импорт. Порядок строго такой:

1. Пользователь дает исходную таблицу производства и формат файла.
2. Прочитать таблицу.
3. Найти и показать сводку встреченных форматов диаметра.
4. Показать проект схемы БД / миграции.
5. Только после подтверждения — писать миграцию и импортер.
6. После загрузки — вывести статистику.

## 8. Требования к нормализованной схеме товаров

Для всех категорий товаров диаметр должен быть приведен к единому числу:

```text
diameter_mm integer nullable
```

Это обязательное условие, чтобы трубы, отводы, тройники, проходные узлы и крепеж можно было
соединять между собой через JOIN и правила совместимости.

Обязательные структурированные поля, которые нельзя прятать только в JSON:

```text
diameter_mm integer
steel_grade varchar/enum                 # AISI 430, 304, 316L, 310S...
wall_thickness_mm numeric
contour enum                             # одностенный / сэндвич
insulation_mm integer nullable
max_temperature_c integer
category enum                            # труба / отвод / тройник / ревизия / проходной_узел / оголовок / крепёж...
purpose text[] or jsonb tags             # баня / камин / газовый_котел / твердотопливный_котел...
extra_attributes jsonb                   # остальные свойства
```

Рекомендованный подход к схеме:

- оставить `categories/products/skus` как базовый слой каталога;
- `products` использовать для логического типа товара: труба, отвод 45°, тройник, адаптер;
- `skus` или будущую `product_variants` использовать для покупаемой позиции: диаметр, длина, сталь,
  толщина, утепление, цена, артикул, остаток;
- SEO-значимые характеристики варианта должны участвовать в `variant_slug` и canonical URL;
- нормализованные характеристики, которые отличают покупаемые позиции, хранить на уровне
  Variant/SKU;
- добавить таблицу или лог `needs_review`.

Черновик будущих таблиц/полей:

```sql
-- возможное расширение products или отдельная product_specs
diameter_mm integer null;
steel_grade varchar(32) null;
wall_thickness_mm numeric(5, 2) null;
contour varchar(32) null;
insulation_mm integer null;
max_temperature_c integer null;
product_kind varchar(64) null;
purpose jsonb not null default '[]';
extra_attributes jsonb not null default '{}';

-- лог ручной проверки
needs_review (
  id uuid primary key,
  source_file text not null,
  source_row_number integer null,
  source_text text not null,
  field_name text not null,
  reason text not null,
  raw_value text null,
  created_at timestamptz not null default now()
);
```

## 9. Правила парсинга каталога

### Диаметр

Нужно приводить к `integer` в миллиметрах:

- `Ø115` → `115`
- `115мм` → `115`
- `115 mm` → `115`
- `ф115` → `115`
- `115/200` требует внимательности:
  - для сэндвич-трубы внутренний диаметр может быть `115`;
  - внешний диаметр и/или insulation могут быть отдельными полями;
  - нельзя молча записывать `115200` или весь текст.

Если формат неоднородный, перед миграцией обязательно показать пользователю сводку форматов.

Если диаметр нельзя однозначно распарсить:

- `diameter_mm = NULL`;
- создать запись в `needs_review`;
- указать исходный текст и причину.

### Сталь

Нужно выделять явно:

- `AISI 430`
- `AISI 304`
- `AISI 316L`
- `AISI 310S`

Если сталь не найдена или неоднозначна:

- `steel_grade = NULL`;
- запись в `needs_review`.

### Назначение

Назначение хранить тегами:

- `баня`
- `камин`
- `газовый_котел`
- `твердотопливный_котел`
- `гильзование`
- другие теги по исходным данным.

Если назначение неочевидно — не угадывать. Оставить пустой массив или `NULL` по выбранной схеме и
добавить запись в `needs_review`.

## 10. Отчет после загрузки каталога

После импорта нужно вывести:

- сколько строк исходной таблицы прочитано;
- сколько товаров создано;
- сколько SKU создано;
- сколько категорий создано/сопоставлено;
- сколько записей ушло в `needs_review`;
- разбивка `needs_review` по причинам:
  - не распарсен диаметр;
  - не распарсена сталь;
  - не распарсено назначение;
  - конфликт артикула;
  - неоднозначная категория;
  - другое.

## 11. Следующий отдельный этап: модели печей/каминов/котлов

Этап 2 не начинать, пока этап 1 не завершен и не подтвержден.

Будущая таблица:

```text
stove_models
```

Поля:

```text
id uuid
manufacturer text
model text
type enum/varchar                         # печь / камин / котел
diameter_mm integer nullable              # диаметр ВЫХОДНОГО ПАТРУБКА дымохода
fuel text nullable
power_kw numeric nullable
source_url text
source_verified boolean default false
confidence enum/varchar                   # verified / parsed / uncertain
raw_source jsonb
created_at timestamptz
updated_at timestamptz
```

Критически важно: `diameter_mm` здесь — диаметр выходного патрубка дымохода, не диаметр топки и не
любой другой размер изделия.

Правила confidence:

- `verified` — вручную подтверждено;
- `parsed` — явно найдено в спецификации производителя;
- `uncertain` — выведено косвенно или найдено неуверенно.

Записи `uncertain` не должны попадать в автоподбор без ручной проверки.

Никогда не подставлять “типичный” диаметр по умолчанию. Лучше `NULL`, чем угаданное число.

## 12. Безопасные рабочие правила для следующих задач

- Не менять схему БД без миграции Alembic.
- Не запускать массовый импорт без предварительной сводки по исходному файлу.
- Не угадывать технические параметры.
- Не затирать пользовательские изменения.
- Перед деплоем frontend запускать:

```bash
npm --workspace apps/web run build
```

- Для production frontend под `/dimohod` пересобирать web-контейнер:

```bash
docker compose up -d --build web
```

- После деплоя проверять:

```bash
curl -I https://sunny-rentals.online/dimohod
```

## 13. Что делать дальше, когда пользователь даст таблицу производства

Первый ответ/действие должно быть не миграцией, а анализом файла:

1. Определить формат: CSV/XLSX/ODS/Google export/другое.
2. Прочитать заголовки.
3. Показать первые строки в безопасной сводке.
4. Составить список колонок-кандидатов:
   - артикул;
   - название;
   - категория;
   - диаметр;
   - сталь;
   - толщина;
   - контур;
   - изоляция;
   - температура;
   - назначение;
   - цена;
   - остаток.
5. Показать сводку форматов диаметра.
6. Показать схему нормализации.
7. Дождаться подтверждения перед миграцией и импортом.
