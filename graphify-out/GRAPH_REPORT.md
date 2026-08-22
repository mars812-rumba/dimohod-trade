# Graph Report - dimohod-trade  (2026-08-22)

## Corpus Check
- 249 files · ~5,143,364 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2137 nodes · 4221 edges · 186 communities (163 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c22ead9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin/router.py
- compatibility/service.py
- import_price_list.py
- ProductExperience.tsx
- BotUtilitiesTest
- BanyaIntakeFlow.tsx
- BotApplication
- AdminCatalogManager.tsx
- web/package.json
- compilerOptions
- group_products_into_variants.py
- bot.py
- Canonical Parametric SVG Creation Prompt
- Dimohod Trade — project context for Codex
- detect_natural_release_intent
- .run
- compatible_items_for_sku
- ReleaseManager
- Dimohod Trade — правила конфигуратора и совместимости
- 7. SQLAlchemy
- Path
- catalog/router.py
- Дымоходы: устройство проекта и руководство владельца
- Архитектура приложения для сайта продажи дымоходов
- Codex Project Brief: Chimney Platform
- 5. База данных для новичка
- 6. Фактическая схема базы данных
- Dimohod Trade — next steps
- package.json
- Telegram → Codex для Dimohod Trade и Sunny Rentals
- 6.2 Основные таблицы
- 7. Калькулятор / конфигуратор дымохода
- 17. Этапы разработки
- 8. SEO-архитектура
- Dimohod Trade
- 15. Технический долг и опасные зависимости
- 13. Конфигурация, Docker и деплой
- 3. Архитектура целиком
- 4. Как проходит один реальный запрос
- 15. Нефункциональные требования
- 12. Изображения, документы и внешние интеграции
- 14. Тесты, логи и ошибки
- 1. Что это за система
- 9. API и Pydantic-схемы
- layout.tsx
- ScenarioCard.tsx
- 202607160001_initial_catalog.py
- 202607170001_product_import_fields.py
- 202607200002_sku_variant_fields.py
- 202607200003_compatibility_rules.py
- 5. Frontend: Next.js
- 9. API дизайн
- next.config.ts
- next-env.d.ts
- codex-launcher.sh
- codex_telegram_bot/__init__.py
- api/__init__.py
- v1/__init__.py
- core/__init__.py
- db/__init__.py
- app/__init__.py
- admin/__init__.py
- catalog/__init__.py
- AdminMediaItem
- AsyncSession
- SKU
- UUID
- products/router.py
- dimohod-trade-backend
- SKU
- catalog/page.tsx
- catalog/router.py
- Объяснимый цифровой инженер-комплектовщик
- Real SKU BOM Contract
- SVG Connection Ports
- Canonical Parametric SVG
- 5. Что уже сделано
- 9. Правила парсинга каталога
- configuratorDraft.ts
- steel_selection_profiles.py
- Product
- AdminMediaItem
- AdminMediaItem
- Any
- Q: Почему бейджи категории и карточки появлялись только после смены фильтра и как синхронизированы сопутствующие товары?
- ProductMediaItem
- products/router.py
- SKU
- compatible_items_for_sku
- 202608040001_passage_catalog.py
- CompatibleProductItem
- AsyncSession
- ProductMediaItem
- primary_product_image
- AdminProductUpdate
- AdminSEOGenerateResponse
- AdminSKUCreate
- resolve_product_media
- Q: Почему категория Хомуты и крепеж показывала только опорную площадку?
- compatibility/service.py
- Q: Почему цена сопутствующей трубы была за 1 м, но кнопка 1000 мм не подсвечивалась?
- Q: Почему при наружной нержавейке AISI 304 рекомендуемая метровая труба показывала оцинковку?
- CatalogProductCard.tsx
- catalog/page.tsx
- steelSelection.ts
- AsyncSession
- Decimal
- Product
- Q: Почему тройник из категории открывался как AISI 304 с неожиданной наружной оцинковкой и нужен ли has_diameter?
- mediaRoleLabel
- DimensionScheme.tsx
- visible_category_ids
- Привязка фотографий SKU по диаметру и длинам — 2026-08-08
- Q: Как привязать одну фотографию SKU к выбранному диаметру и нескольким длинам?
- primary_visual_sku_image
- sitemap.ts
- Any
- ScenarioPageTemplate.tsx
- Response
- SKU
- Product
- InstallAppButton.tsx
- compatibleProductScore
- steelSelection.ts
- compactDecimal
- admin/layout.tsx
- app/page.tsx
- steel_selection_profiles.py
- catalog/service.py
- read_products
- Q: Как карточки категорий показывают изделия, стандартные длины и марки стали?
- catalog/service.py
- primary_product_image
- SiteHeader.tsx
- Q: Как перестроен первый экран после блока с цифрами и облегчена типографика?
- Q: Как исправлено обрезание изображений и перегруженность карточек категорий?
- steelSelection.ts
- compatibleProductScore
- visible_category_ids
- ScenarioPageTemplate.tsx
- catalog/page.tsx
- Q: Как устроено мобильное бургер-меню и новый хедер?
- test_svg_route_generation_rules.py
- app/page.tsx
- read_products
- CatalogProductCard.tsx
- calculationProfiles.ts
- 202608110002_remove_single_wall_indoor_copy.py
- 202608110001_remove_single_wall_outdoor_seo.py
- solutions/page.tsx
- Оптимизация фотографий каталога
- media/__init__.py
- scripts/__init__.py
- compatibility/service.py
- BanyaIntakeFlow.tsx
- chimneyEstimate.ts
- RouteImageViewer.tsx
- wallRouteLayout.ts
- solutions/page.tsx
- ChimneyConfigurator.tsx
- roofGeometry.ts
- compatibility/service.py
- 202608040004_normalize_four_way_angles.py

## God Nodes (most connected - your core abstractions)
1. `BotUtilitiesTest` - 52 edges
2. `BotApplication` - 40 edges
3. `StateStore` - 34 edges
4. `import_price_list()` - 30 edges
5. `Product` - 26 edges
6. `SKU` - 26 edges
7. `Category` - 24 edges
8. `attach_product_photo_content()` - 22 edges
9. `ProductExperience()` - 21 edges
10. `ReleaseManager` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Целевое обещание Dimohod Trade` --semantically_similar_to--> `1. Главная идея продукта`  [INFERRED] [semantically similar]
  docs/PRODUCT_DIRECTION_9_OF_10.md → PROJECT_CONTEXT.md
- `unique_product_slug()` --indirect_call--> `Product`  [INFERRED]
  backend/app/db/group_products_into_variants.py → backend/app/modules/products/models.py
- `group_products_into_variants()` --indirect_call--> `Product`  [INFERRED]
  backend/app/db/group_products_into_variants.py → backend/app/modules/products/models.py
- `SectionSpec` --uses--> `Category`  [INFERRED]
  backend/app/db/import_price_list.py → backend/app/modules/catalog/models.py
- `import_price_list()` --indirect_call--> `NeedsReview`  [INFERRED]
  backend/app/db/import_price_list.py → backend/app/modules/products/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shared Parametric Geometry System** — docs_parametric_product_media_and_bom_architecture_geometry_family, docs_parametric_product_media_and_bom_architecture_parametric_svg, docs_parametric_product_media_and_bom_architecture_geometry_registry, docs_parametric_product_media_and_bom_architecture_dimension_scheme, docs_parametric_product_media_and_bom_architecture_configurator_part [EXTRACTED 1.00]
- **Safe Configurator Output** — docs_parametric_product_media_and_bom_architecture_sku_dimensions, docs_parametric_product_media_and_bom_architecture_scene_composer, docs_parametric_product_media_and_bom_architecture_real_sku_bom, docs_parametric_product_media_and_bom_architecture_backend_safety_boundary [EXTRACTED 1.00]
- **Основной продуктовый путь 9/10** — docs_product_direction_9_of_10_scenario_first_selection, docs_product_direction_9_of_10_real_sku_bom, docs_product_direction_9_of_10_explainable_selection, docs_product_direction_9_of_10_project_handoff [EXTRACTED 1.00]

## Communities (186 total, 23 thin omitted)

### Community 0 - "admin/router.py"
Cohesion: 0.25
Nodes (7): SEO, Каталог и карточка семейства, Проверки этапа, Прогресс Dimohod Trade на 2026-08-01, Совместимые изделия, Ускорение карточек, Что делать дальше

### Community 1 - "compatibility/service.py"
Cohesion: 0.11
Nodes (28): absoluteUrl(), allCategories(), categoryBySlug(), categoryHref(), CategoryPage(), CategoryPageProps, combinationValue(), compoundParts() (+20 more)

### Community 2 - "import_price_list.py"
Cohesion: 0.12
Nodes (25): HTTPError, acquire_instance_lock(), allowed_changed_paths(), analyze_photo(), analyze_photos(), encode_multipart(), encode_multipart_payload(), extract_openai_output_text() (+17 more)

### Community 3 - "ProductExperience.tsx"
Cohesion: 0.05
Nodes (53): metadata, AdminCatalogManager(), AdminCategory, AdminMediaItem, adminMediaPreviewUrl(), AdminProduct, AdminProductListItem, AdminSKU (+45 more)

### Community 4 - "BotUtilitiesTest"
Cohesion: 0.09
Nodes (7): CodexRunner, detect_natural_release_intent(), NaturalReleaseIntent, Recognize Russian release commands coming from text or speech transcription., StateStore, BotUtilitiesTest, ValueError

### Community 5 - "BanyaIntakeFlow.tsx"
Cohesion: 0.16
Nodes (21): BanyaIntakeFlow(), BanyaIntakeFlowProps, MeasurementField(), MeasurementFieldProps, MeasurementScheme, normalizeIntakeDraft(), statusLabels, calculationProfileConfiguratorHref() (+13 more)

### Community 6 - "BotApplication"
Cohesion: 0.06
Nodes (59): buildVariantDimensions(), compactCompatibleMaterial(), compactDecimal(), compatibilityCacheKey(), compatibilityFieldScore(), compatibleDiameterLabel(), compatiblePipePriceUnit(), compatiblePipeProfile() (+51 more)

### Community 7 - "AdminCatalogManager.tsx"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как каталог группирует Product SKU в карточки и как админка сохраняет совместимые семейства, почему вместо выбранного хомута добавляется текущая сэндвич-труба?, Source Nodes

### Community 8 - "web/package.json"
Cohesion: 0.13
Nodes (11): commit_message_from_prompt(), consume_codex_event(), detect_natural_confirmation(), is_missing_rollout_error(), model_keyboard(), natural_image_prompt(), openai_key_keyboard(), OpenAIQuotaError (+3 more)

### Community 9 - "compilerOptions"
Cohesion: 0.15
Nodes (7): BotApplication, compact_command(), PendingAction, PhotoAlbum, Any, Debounce consecutive Telegram messages into one Codex prompt., TextBatch

### Community 10 - "group_products_into_variants.py"
Cohesion: 0.24
Nodes (18): _atomic_write(), catalog_image_paths(), CatalogImageError, encode_catalog_image(), EncodedCatalogImage, Path, Raised when uploaded content cannot be safely processed as a raster image., store_catalog_image() (+10 more)

### Community 11 - "bot.py"
Cohesion: 0.06
Nodes (30): dependencies, next, pdfmake, react, react-dom, @tabler/icons-react, devDependencies, @types/node (+22 more)

### Community 12 - "Canonical Parametric SVG Creation Prompt"
Cohesion: 0.22
Nodes (9): Product and SKU Data Boundary, SKU L D d S Dimensions, Canonical Parametric SVG Creation Prompt, Dynamic L D d S Insulation Callouts, Real Product Photo Is Geometry Source, Front Technical Projection and Symmetry, Parametric SVG Quality Gates, Static Form Factor Geometry with Dynamic SKU Labels (+1 more)

### Community 13 - "Dimohod Trade — project context for Codex"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 15 - ".run"
Cohesion: 0.13
Nodes (14): 10. Отчет после загрузки каталога, 11.1 Публичные URL товарных карточек, 11. Следующий отдельный этап: модели печей/каминов/котлов, 12. Безопасные рабочие правила для следующих задач, 13. Что делать дальше, когда пользователь даст таблицу производства, 2. Текущий стек, 3. Публичный и локальный доступ, 4. Текущая структура проекта (+6 more)

### Community 16 - "compatible_items_for_sku"
Cohesion: 0.10
Nodes (41): AdminMediaItem, attach_category_cover(), attach_product_photo_content(), attach_sku_photo(), canonical_photo_name(), canonical_sku_photo_name(), decode_photo_payload(), encode_uploaded_photo() (+33 more)

### Community 18 - "Dimohod Trade — правила конфигуратора и совместимости"
Cohesion: 0.13
Nodes (14): 10. Configurator Compatibility, 11. API Target, 12. Frontend Target, 13. Future Scalability, 1. Core Principle, 2. One Product → Many Variants, 3. URL Strategy, 4. Variant Selection UX (+6 more)

### Community 19 - "7. SQLAlchemy"
Cohesion: 0.18
Nodes (7): RuntimeError, build_project_configs(), project_keyboard(), ProjectConfig, Narrow host-side Git and deploy operations unavailable inside Codex sandbox., ReleaseManager, run_host_command()

### Community 20 - "Path"
Cohesion: 0.12
Nodes (15): 10. Набор product_kind для правил, 11. Что пока нельзя автоматизировать без уточнений, 12.1. Подтвержденные исполнения с внутренней оцинковкой, 12. Подтвержденные профили внутренней стали дымового канала, 1. Главный принцип, 2. Базовое правило улицы, 3. Диаметр, 4.1. Оформление прямых проходов (+7 more)

### Community 21 - "catalog/router.py"
Cohesion: 0.15
Nodes (13): 7.10. Relationship и стратегии загрузки, 7.11. Где возможны N+1 и лишние запросы, 7.12. Где заканчивается транзакция, 7.1. Зачем он нужен, 7.2. Подключение к базе, 7.3. Где объявлен Base, 7.4. Как описаны модели, 7.5. Что такое Session (+5 more)

### Community 22 - "Дымоходы: устройство проекта и руководство владельца"
Cohesion: 0.15
Nodes (11): Источники и структурированные поля, Минимальная схема без миграции, Правила совместимости, Приоритет источников, Разделение семейства и SKU, SEO товарных семейств дымоходов, Естественный язык, Контроль качества (+3 more)

### Community 23 - "Архитектура приложения для сайта продажи дымоходов"
Cohesion: 0.16
Nodes (6): extract_file_requests(), graphify_query_context(), Return bounded structural context without blocking the task if Graphify fails., recovery_context_prompt(), RunningTask, task_changed_paths()

### Community 24 - "Codex Project Brief: Chimney Platform"
Cohesion: 0.25
Nodes (7): 11. Аутентификация и роли, 16. Безопасный порядок дальнейшей разработки, 2. Карта проекта, 8. Alembic и эволюция схемы, Дымоходы: устройство проекта и руководство владельца, Как читать это руководство, Слои backend

### Community 25 - "5. База данных для новичка"
Cohesion: 0.20
Nodes (9): 10. Админ-панель, 11. Карточка товара: данные, 14. Интеграции, 18. Что первым дать Codex на реализацию, 19. Главный архитектурный принцип, 1. Продуктовая идея, 2. High-level архитектура, 3. Рекомендуемая структура репозитория (+1 more)

### Community 26 - "6. Фактическая схема базы данных"
Cohesion: 0.20
Nodes (9): Codex Project Brief: Chimney Platform, MVP, Базовая структура, Бизнес-цель, Важные продуктовые принципы, Основные модули, Первый промпт для реализации, Роль проекта (+1 more)

### Community 27 - "Dimohod Trade — next steps"
Cohesion: 0.20
Nodes (10): 5.1. PostgreSQL, 5.2. Таблица, строка и колонка, 5.3. Primary key, 5.4. Foreign key, 5.5. Unique constraint, 5.6. Индекс, 5.7. Транзакция, 5.8. One-to-many (+2 more)

### Community 28 - "package.json"
Cohesion: 0.20
Nodes (10): 6.1. `categories`, 6.2. `products`, 6.3. `skus`, 6.4. `needs_review`, 6.5. `compatibility_rules`, 6.6. Категории, семейства, продукты, варианты и SKU, 6.7. Изображения, 6.8. BOM (+2 more)

### Community 29 - "Telegram → Codex для Dimohod Trade и Sunny Rentals"
Cohesion: 0.20
Nodes (9): Dimohod Trade — next steps, Главный следующий этап, Не делать сейчас, Приоритет 1 — Compatibility MVP → первый комплект, Приоритет 2 — URL карточек и SEO — выполнено, Приоритет 3 — Уточнение правил у дымоходчиков, Приоритет 4 — Карточка товара и варианты, Приоритет 5 — Медиа и документы (+1 more)

### Community 30 - "6.2 Основные таблицы"
Cohesion: 0.22
Nodes (8): name, private, scripts, build:web, dev:web, version, workspaces, apps/web

### Community 31 - "7. Калькулятор / конфигуратор дымохода"
Cohesion: 0.22
Nodes (8): GitHub и deploy, Telegram → Codex для Dimohod Trade и Sunny Rentals, Возможности, Запуск, Запуск через systemd, Использование в Telegram, Конфигурация, Проверка

### Community 32 - "17. Этапы разработки"
Cohesion: 0.25
Nodes (8): 6.1 Каталог, 6.2 Основные таблицы, 6. Доменные сущности, attributes, categories, product_attribute_values, products, skus

### Community 33 - "8. SEO-архитектура"
Cohesion: 0.25
Nodes (8): 7.1 Цель, 7.2 Сценарий пользователя, 7.3 Основные сущности калькулятора, 7.4 Rule Engine, 7. Калькулятор / конфигуратор дымохода, calculator_bom_items, calculator_projects, compatibility_rules

### Community 34 - "Dimohod Trade"
Cohesion: 0.29
Nodes (7): 17. Этапы разработки, Этап 1. Foundation, Этап 2. Catalog Core, Этап 3. SEO Core, Этап 4. Calculator v1, Этап 5. Admin, Этап 6. Integrations

### Community 35 - "15. Технический долг и опасные зависимости"
Cohesion: 0.29
Nodes (7): 8.1 Типы страниц, 8.2 Правила индексации фильтров, 8.3 SEO-сущность, 8.4 Canonical URL для вариантов товаров, 8.5 Schema.org, 8. SEO-архитектура, seo_pages

### Community 36 - "13. Конфигурация, Docker и деплой"
Cohesion: 0.29
Nodes (6): Dimohod Trade, Ближайший следующий инкремент, Быстрый запуск через Docker, Локальный backend без Docker, Локальный frontend без Docker, Что уже собрано

### Community 37 - "3. Архитектура целиком"
Cohesion: 0.33
Nodes (6): 15. Технический долг и опасные зависимости, Документация против реализации, Инфраструктура, Критичные границы MVP, Производительность, Целостность данных

### Community 38 - "4. Как проходит один реальный запрос"
Cohesion: 0.18
Nodes (17): category_id(), disable_one_wall_caps(), downgrade(), marked_attributes(), merge_sandwich_support_caps(), Connection, UUID, Normalize support caps and add the sandwich support platform.  Revision ID: 2026 (+9 more)

### Community 39 - "15. Нефункциональные требования"
Cohesion: 0.40
Nodes (5): 13.1. Окружение, 13.2. Compose, 13.3. Frontend base path, 13.4. Деплой, 13. Конфигурация, Docker и деплой

### Community 40 - "12. Изображения, документы и внешние интеграции"
Cohesion: 0.40
Nodes (5): 3.1. Реальная схема выполнения, 3.2. Что делает Next.js, 3.3. Что делает FastAPI, 3.4. Redis, 3. Архитектура целиком

### Community 41 - "14. Тесты, логи и ошибки"
Cohesion: 0.40
Nodes (5): 4.1. Шаги по коду, 4.2. Sequence diagram, 4.3. Где здесь Pydantic, 4.4. Как проходит запрос карточки товара, 4. Как проходит один реальный запрос

### Community 42 - "1. Что это за система"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как генерировать SEO для товарных семейств дымоходов?, Source Nodes

### Community 43 - "9. API и Pydantic-схемы"
Cohesion: 0.50
Nodes (4): 15. Нефункциональные требования, SEO, Безопасность, Производительность

### Community 44 - "layout.tsx"
Cohesion: 0.50
Nodes (4): 12.1. Изображения и документы товара, 12.2. Telegram и OpenAI, 12.3. Другие интеграции, 12. Изображения, документы и внешние интеграции

### Community 45 - "ScenarioCard.tsx"
Cohesion: 0.50
Nodes (4): 14.1. Тесты, 14.2. Логи, 14.3. Обработка ошибок, 14. Тесты, логи и ошибки

### Community 46 - "202607160001_initial_catalog.py"
Cohesion: 0.50
Nodes (4): 1.1. Назначение, 1.2. Основные пользовательские сценарии, 1.3. Что важно не перепутать, 1. Что это за система

### Community 47 - "202607170001_product_import_fields.py"
Cohesion: 0.50
Nodes (4): 9.1. Реализованные endpoint-ы, 9.2. Не реализовано, 9.3. Риск схем правил, 9. API и Pydantic-схемы

### Community 48 - "202607200002_sku_variant_fields.py"
Cohesion: 0.07
Nodes (31): CatalogPage(), CategoryCard(), compactList(), leafCategories(), publicMediaUrl(), metadata, viewport, absoluteUrl() (+23 more)

### Community 55 - "5. Frontend: Next.js"
Cohesion: 0.67
Nodes (3): 12.1 Поиск должен понимать, 12.2 Индекс поиска, 12. Поиск и фильтрация

### Community 56 - "9. API дизайн"
Cohesion: 0.67
Nodes (3): 13.1 Типы заявок, 13.2 leads, 13. Лиды и CRM

### Community 57 - "next.config.ts"
Cohesion: 0.67
Nodes (3): 16. MVP scope, В MVP входит, В MVP не входит

### Community 58 - "next-env.d.ts"
Cohesion: 0.67
Nodes (3): 4.1 Основные технологии, 4.2 Модули backend, 4. Backend: FastAPI

### Community 59 - "codex-launcher.sh"
Cohesion: 0.67
Nodes (3): 5.1 Основные технологии, 5.2 Структура frontend, 5. Frontend: Next.js

### Community 60 - "codex_telegram_bot/__init__.py"
Cohesion: 0.67
Nodes (3): 9.1 Public API, 9.2 Admin API, 9. API дизайн

### Community 66 - "admin/__init__.py"
Cohesion: 0.12
Nodes (54): AdminProductListItem, create_admin_sku(), delete_admin_category_cover(), delete_admin_product_photo(), delete_admin_sku(), delete_admin_sku_photo(), generate_admin_product_seo(), AdminMediaItem (+46 more)

### Community 67 - "catalog/__init__.py"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Карточки открываются очень долго. Это из за js ? Может на ходовые товары делать статику?, Source Nodes

### Community 74 - "AdminMediaItem"
Cohesion: 0.50
Nodes (3): Answer, Outcome, Q: Как ускорить открытие карточек товаров с большими семействами SKU и использовать индексы?

### Community 75 - "AsyncSession"
Cohesion: 0.11
Nodes (30): category_id(), downgrade(), ensure_fastener_category(), normalize_power_clamp(), Connection, UUID, Add passage assemblies, flanges, consoles, and verified price variants.  Revisio, stable_id() (+22 more)

### Community 77 - "SKU"
Cohesion: 0.22
Nodes (23): absoluteUrl(), applySeoTemplate(), diameterLabel(), generateMetadata(), isLegacySkuSpecificSeo(), metadataDescription(), metadataTitle(), productImage() (+15 more)

### Community 78 - "UUID"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему при установке из админки открывался сайт и как разделены PWA?, Source Nodes

### Community 79 - "products/router.py"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как добавлены логотип и кнопка установки веб-приложения?, Source Nodes

### Community 85 - "SKU"
Cohesion: 0.15
Nodes (7): discover_openai_keys(), main(), parse_allowed_users(), Find OPENAI_API_KEY, OPENAI_API_KEY_2, ... without exposing their values., Split long text on line boundaries while respecting Telegram's limit., split_message(), TelegramAPI

### Community 86 - "catalog/page.tsx"
Cohesion: 0.19
Nodes (13): get_db(), AsyncSession, AsyncSession, read_catalog_tree(), CatalogMediaItem, CatalogTreeResponse, CategoryTreeNode, BaseModel (+5 more)

### Community 87 - "catalog/router.py"
Cohesion: 0.25
Nodes (7): Каталог и карточка товара, Материал и варианты SKU, Проверки контрольной точки, Прогресс Dimohod Trade на 2026-08-03, Следующий практический шаг, Совместимые изделия, Фотографии семейства и SKU

### Community 88 - "Объяснимый цифровой инженер-комплектовщик"
Cohesion: 0.25
Nodes (8): Объяснимый цифровой инженер-комплектовщик, Граница MVP продукта 9/10, Следующий уровень продукта 10/10, Dimohod Trade — продуктовое направление 9/10, PDF-смета и передача расчёта специалисту, Подбор от источника тепла и сценария, Целевое обещание Dimohod Trade, 1. Главная идея продукта

### Community 89 - "Real SKU BOM Contract"
Cohesion: 0.33
Nodes (7): Backend Owns Compatibility Decisions, Real SKU BOM Contract, Контракт результата конфигуратора, Граница достоверности автоматического расчёта, Причины выбора и подтверждённые предупреждения, Статусы automatic_draft, needs_review и verified, Серверный BOM из реальных SKU

### Community 91 - "SVG Connection Ports"
Cohesion: 0.29
Nodes (7): ConfiguratorPart Component, SVG Connection Ports, Initial Seventeen Geometry Roles, Shared Geometry Registry, Parametric SVG Implementation Plan, SVG Configurator Scene Composer, SVG Connection Coordinate Invariants

### Community 92 - "Canonical Parametric SVG"
Cohesion: 0.22
Nodes (8): Canonical, JSON-LD, robots и sitemap, Аудит URL-схемы карточек товара — 2026-08-06, Генерация и миграция slug, Примеры до и после, Принятая публичная схема, Проверка индексации, Проверки, Что было до исправления

### Community 93 - "5. Что уже сделано"
Cohesion: 0.50
Nodes (4): 5. Что уже сделано, Backend, Frontend, Media

### Community 94 - "9. Правила парсинга каталога"
Cohesion: 0.50
Nodes (4): 9. Правила парсинга каталога, Диаметр, Назначение, Сталь

### Community 95 - "configuratorDraft.ts"
Cohesion: 0.35
Nodes (13): ArgumentParser, apply_database_references(), Conversion, conversion_for_file(), convert_catalog(), main(), media_path(), parser() (+5 more)

### Community 96 - "steel_selection_profiles.py"
Cohesion: 0.47
Nodes (4): normalized_slug(), Normalize family slugs used by public diameter URLs.  Revision ID: 202608060001, slugify(), upgrade()

### Community 97 - "Product"
Cohesion: 0.42
Nodes (7): find_canonical_product_id(), marked_attributes(), Connection, UUID, Remove the synthetic demo sandwich pipe from the real catalog.  Revision ID: 202, rewrite_compatible_product_ids(), upgrade()

### Community 98 - "AdminMediaItem"
Cohesion: 0.22
Nodes (8): Выбор SKU и совместимые семейства, Данные и миграции, Мобильная карточка и бейджи, Модель каталога и источник истины, Подтверждённая матрица внутренней оцинковки, Проверки контрольной точки, Прогресс Dimohod Trade на 2026-08-05, Фильтры категории и карточки

### Community 99 - "AdminMediaItem"
Cohesion: 0.39
Nodes (6): combined_price_family(), marked_attributes(), Split the shared cleanout/skirt price row into two sellable families.  Revision, split_article(), split_sku_name(), upgrade()

### Community 100 - "Any"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какой прогресс выполнен в каталоге Dimohod Trade к 2026-08-01 и чем устранена ошибка медленного открытия карточек?, Source Nodes

### Community 102 - "ProductMediaItem"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как продублировать SVG-схему в блоке выбора исполнения карточки товара?, Source Nodes

### Community 103 - "products/router.py"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как изменить SVG-схему в блоке выбора исполнения после проверки мобильного макета?, Source Nodes

### Community 104 - "SKU"
Cohesion: 0.12
Nodes (36): AdminSKUListItem, Base, TimestampMixin, main(), seed_compatibility_rules(), seed(), list_admin_categories(), list_admin_skus() (+28 more)

### Community 105 - "compatible_items_for_sku"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Где должна располагаться информационная плашка материала на параметрических SVG-схемах?, Source Nodes

### Community 106 - "202608040001_passage_catalog.py"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему повторно добавленный одноконтурный хомут не отображался среди совместимых изделий и куда перенесена цена?, Source Nodes

### Community 107 - "CompatibleProductItem"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какой диаметр хомута совместим с сэндвич-изделием 250/350?, Source Nodes

### Community 108 - "AsyncSession"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как оформлен блок Расчёт комплекта в карточке товара и какое правило диаметра хомута зафиксировано?, Source Nodes

### Community 109 - "ProductMediaItem"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как ускорена выдача совместимых SKU без cookies?, Source Nodes

### Community 110 - "primary_product_image"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему карточка трубы оставалась пустой около трёх секунд и что оптимизировано?, Source Nodes

### Community 111 - "AdminProductUpdate"
Cohesion: 0.50
Nodes (4): 10.1. Импорт, 10.2. Legacy-группировка, 10.3. Фильтры вариантов и наружный кожух, 10. Каталог, импорт и модель Product → SKU

### Community 114 - "resolve_product_media"
Cohesion: 0.13
Nodes (31): AdminSEOProductKnowledge, build_product_seo_prompt(), collect_product_seo_facts(), extract_openai_output_text(), generate_product_seo(), inherit_legacy_product_content(), normalize_seo_knowledge(), parameterize_sku_meta() (+23 more)

### Community 115 - "Q: Почему категория Хомуты и крепеж показывала только опорную площадку?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему категория Хомуты и крепеж показывала только опорную площадку?, Source Nodes

### Community 116 - "compatibility/service.py"
Cohesion: 0.11
Nodes (15): metadata, GuidePageProps, GuideArticlePage(), GuideArticlePageProps, fireRegimeSource, GuideArticle, guideArticleBySlug, guideArticles (+7 more)

### Community 119 - "CatalogProductCard.tsx"
Cohesion: 0.27
Nodes (5): Settings, create_app(), test_private_lead_files_are_not_public(), BaseSettings, FastAPI

### Community 120 - "catalog/page.tsx"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему админка показывала несколько одинаковых семейных фото после перехода на media_id?, Source Nodes

### Community 121 - "steelSelection.ts"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как устроена и исправлена публичная URL-схема карточек товара?, Source Nodes

### Community 122 - "AsyncSession"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему уже загруженное фото было видно на сайте, но не отображалось в админке?, Source Nodes

### Community 123 - "Decimal"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как исправлены роли фотографий, удаление вкладок и метровая труба по умолчанию в категории?, Source Nodes

### Community 125 - "Q: Почему тройник из категории открывался как AISI 304 с неожиданной наружной оцинковкой и нужен ли has_diameter?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему тройник из категории открывался как AISI 304 с неожиданной наружной оцинковкой и нужен ли has_diameter?, Source Nodes

### Community 127 - "DimensionScheme.tsx"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему облегчённый шрифт и Lucide-иконки не появились в карточках каталога?, Source Nodes

### Community 128 - "visible_category_ids"
Cohesion: 0.18
Nodes (9): Acceptance checks, Chimney components, Dimensions and labels, Drafting conventions, Line hierarchy, Sheet and units, Technical SVG Drawing, Tool discipline (+1 more)

### Community 129 - "Привязка фотографий SKU по диаметру и длинам — 2026-08-08"
Cohesion: 0.20
Nodes (9): Задача, Карточки совместимых товаров, Метровая труба в категории, Области применения фотографий семейства и SKU — 2026-08-08, Отображение уже загруженных фото в админке, Правила применения, Проверки, Строгие роли и удаление (+1 more)

### Community 130 - "Q: Как привязать одну фотографию SKU к выбранному диаметру и нескольким длинам?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как привязать одну фотографию SKU к выбранному диаметру и нескольким длинам?, Source Nodes

### Community 132 - "primary_visual_sku_image"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Что показывается вместо артикула и раздельных стальных бейджей в карточке совместимого товара?, Source Nodes

### Community 133 - "sitemap.ts"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Где задавать диаметр и длину фотографии семейства и как привязать фото к одной модели SKU?, Source Nodes

### Community 135 - "Any"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как используется присланный фирменный логотип Дымоход-Трейд?, Source Nodes

### Community 136 - "ScenarioPageTemplate.tsx"
Cohesion: 0.08
Nodes (26): assetUrl(), catalogGroups, checks, compatibleDiameter(), compatiblePrice(), compatibleSteel(), faq, featuredProductCard (+18 more)

### Community 137 - "Response"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как отображается назначение совместимого товара?, Source Nodes

### Community 138 - "SKU"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему фото семейства для одной длины заменяло фото других длин и как это исправлено?, Source Nodes

### Community 139 - "Product"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как разделены базовые фотографии семейства, фото по диаметру и длине и точные фото SKU?, Source Nodes

### Community 140 - "InstallAppButton.tsx"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как уплотнён мобильный первый экран и добавлен тёплый favicon админки?, Source Nodes

### Community 141 - "compatibleProductScore"
Cohesion: 0.25
Nodes (7): Дымоход Трейд — аудит главной и план исправлений, Источник, Новый заголовок (H1), Что уже соответствует ТЗ (исследованию рынка), Этап 1 — Срочно (P0, влияет на конверсию сразу), Этап 2 — Быстро (P1, доверие и качество лида), Этап 3 — Можно позже (P2)

### Community 142 - "steelSelection.ts"
Cohesion: 0.40
Nodes (6): DimensionScheme Component, Geometry Family, Canonical Parametric SVG, SKU SEO and JSON-LD, Shared Product Family Media, Parametric SKU Product Card

### Community 146 - "app/page.tsx"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Почему кнопка установки показывала инструкцию через меню вместо системного окна PWA?, Source Nodes

### Community 147 - "steel_selection_profiles.py"
Cohesion: 0.08
Nodes (48): upgrade(), upgrade(), upgrade(), upgrade(), angle_deg(), decimal_attr(), group_products_into_variants(), insulation_mm_from_attrs() (+40 more)

### Community 148 - "catalog/service.py"
Cohesion: 0.40
Nodes (4): Обязательно проверить владельцу до публикации, Персональные данные: действия владельца сайта, Что нельзя закрыть одной публикацией Политики, Что реализовано в коде

### Community 149 - "read_products"
Cohesion: 0.07
Nodes (69): is_retired_single_wall_placement_sentence(), is_single_wall_contour(), Any, Remove the retired indoor-only/outdoor-ban copy without changing other facts., remove_single_wall_placement_rule(), sanitize_seo_knowledge_dict(), sanitize_sku_seo_dict(), compatible_items_for_sku() (+61 more)

### Community 150 - "Q: Как карточки категорий показывают изделия, стандартные длины и марки стали?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как карточки категорий показывают изделия, стандартные длины и марки стали?, Source Nodes

### Community 151 - "catalog/service.py"
Cohesion: 0.14
Nodes (9): Any, Path, Send a persisted lead to the configured mailbox.      Returning False means deli, send_lead_email(), create_lead(), FakeSMTP, Path, test_sends_lead_with_attachment() (+1 more)

### Community 152 - "primary_product_image"
Cohesion: 0.60
Nodes (3): do_run_migrations(), run_async_migrations(), run_migrations_online()

### Community 153 - "SiteHeader.tsx"
Cohesion: 0.40
Nodes (4): PublicMediaFiles, Response, Serve catalog media without exposing private lead attachments., StaticFiles

### Community 154 - "Q: Как перестроен первый экран после блока с цифрами и облегчена типографика?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как перестроен первый экран после блока с цифрами и облегчена типографика?, Source Nodes

### Community 155 - "Q: Как исправлено обрезание изображений и перегруженность карточек категорий?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как исправлено обрезание изображений и перегруженность карточек категорий?, Source Nodes

### Community 157 - "steelSelection.ts"
Cohesion: 0.12
Nodes (16): 1. Задача, 2. Классификация, 3. URL первой версии, 4. Единый состав страницы, 5. Контентный контракт, 6. Различия страниц, 7. Что нужно исправить при подключении страниц, 8. Этапы реализации (+8 more)

### Community 158 - "compatibleProductScore"
Cohesion: 0.36
Nodes (10): CategoryNode, has_public_category_cover(), Keep publication-ready categories and every ancestor needed for navigation., visible_category_ids(), category(), test_blank_cover_url_is_not_public(), test_category_reappears_when_it_gets_a_public_product(), test_category_with_products_but_without_cover_stays_hidden() (+2 more)

### Community 159 - "visible_category_ids"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как увеличен и смещён логотип в мобильном хедере?, Source Nodes

### Community 160 - "ScenarioPageTemplate.tsx"
Cohesion: 0.08
Nodes (30): metadata, metadata, metadata, metadata, metadata, metadata, iconByName, ScenarioPageTemplate() (+22 more)

### Community 162 - "Q: Как устроено мобильное бургер-меню и новый хедер?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Как устроено мобильное бургер-меню и новый хедер?, Source Nodes

### Community 164 - "test_svg_route_generation_rules.py"
Cohesion: 0.25
Nodes (15): load_configurator_rules(), load_rules(), load_scene_graph_rules(), test_engineering_svg_contract_keeps_critical_geometry_invariants(), test_master_flash_and_upk_are_default_independently_removable_bom_lines(), test_passage_components_and_manual_wool_stay_separate(), test_ridge_height_uses_inner_lower_edge_as_measured_datum(), test_roof_passage_geometry_is_derived_from_ridge_distance_and_angle() (+7 more)

### Community 167 - "app/page.tsx"
Cohesion: 0.20
Nodes (7): metadata, metadata, metadata, metadata, LegalPage(), LegalPageProps, operator

### Community 170 - "read_products"
Cohesion: 0.07
Nodes (62): Backward-compatible name for removal of the retired placement rule., remove_single_wall_outdoor_seo_rule(), select_active_sku(), compatibility_filter_expression(), compatible_console_matches(), compatible_fastener_matches(), compatible_product_matches(), compatible_support_platform_matches() (+54 more)

### Community 174 - "CatalogProductCard.tsx"
Cohesion: 0.12
Nodes (23): CatalogProductCard(), catalogSpecs(), decimalLabel(), formatPrice(), publicMediaUrl(), stockLabel(), textAttribute(), ProductGalleryPreview() (+15 more)

### Community 175 - "calculationProfiles.ts"
Cohesion: 0.13
Nodes (24): MeasurementsPageProps, metadata, objectTypes, MeasurementsWorkspace(), MeasurementsWorkspaceProps, objectLabels, routeLabels, CalculationProfile (+16 more)

### Community 177 - "202608110002_remove_single_wall_indoor_copy.py"
Cohesion: 0.38
Nodes (8): _clean_knowledge(), _clean_list(), _clean_text(), _is_retired_sentence(), _is_single_wall(), Any, Remove indoor-only copy from single-wall product cards.  Revision ID: 2026081100, upgrade()

### Community 178 - "202608110001_remove_single_wall_outdoor_seo.py"
Cohesion: 0.42
Nodes (7): _clean_knowledge(), _clean_sku_seo(), _clean_text(), _is_retired_rule_sentence(), Any, Remove the retired single-wall outdoor rule from SEO copy.  Revision ID: 2026081, upgrade()

### Community 180 - "solutions/page.tsx"
Cohesion: 0.25
Nodes (6): houseGalleryImages, metadata, scenarioOrder, GalleryImage, SolutionHouseGallery(), SolutionHouseGalleryProps

### Community 196 - "compatibility/service.py"
Cohesion: 0.83
Nodes (3): load_rules(), test_estimate_pdf_keeps_customer_dimensions_and_review_state(), test_estimate_uses_only_selected_bom_and_real_catalog_prices()

### Community 197 - "BanyaIntakeFlow.tsx"
Cohesion: 0.15
Nodes (22): addRouteNodes(), bomForVariant(), calculateChimney(), CalculationInput, ceilingForbiddenZones(), ChimneyCalculation, ChimneyRouteKind, effectiveComponentHeight() (+14 more)

### Community 198 - "chimneyEstimate.ts"
Cohesion: 0.18
Nodes (15): ProductListItem, ChimneyBomLine, buildChimneyEstimate(), CatalogEstimateMatch, ChimneyEstimate, ChimneyEstimateLine, EstimateMeasurement, formatRub() (+7 more)

### Community 201 - "wallRouteLayout.ts"
Cohesion: 0.50
Nodes (7): DynamicWallTopScheme(), wallRearRouteConsoleQuantity(), wallRearRoutePipePlan, wallRouteConsoleQuantity(), wallRouteFacadeConsolePositions(), wallTopRouteFacadeConsolePositions(), wallTopRouteFacadeConsoleQuantity()

### Community 202 - "solutions/page.tsx"
Cohesion: 0.33
Nodes (5): calculateMinimumTerminationHeight(), RoofTerminationRule, TerminationHeightInput, TerminationHeightResult, base

### Community 203 - "ChimneyConfigurator.tsx"
Cohesion: 0.10
Nodes (17): catalogMaterialLabel(), catalogMediaUrl(), ChimneyConfigurator(), ChimneyConfiguratorProps, configuratorStudioProductImage(), FLOOR_OPTIONS, formatCatalogPrice(), OUTLET_OPTIONS (+9 more)

### Community 204 - "roofGeometry.ts"
Cohesion: 0.50
Nodes (3): calculatePitchedRoofPassage(), PitchedRoofPassage, PitchedRoofPassageInput

### Community 206 - "compatibility/service.py"
Cohesion: 0.11
Nodes (19): buildExternalWallSceneGraph(), catalogIdentity(), EngineeringGeometryFamily, EngineeringSceneBranch, EngineeringSceneGraph, EngineeringSceneNode, EngineeringSceneOrientation, EngineeringSceneZone (+11 more)

### Community 211 - "202608040004_normalize_four_way_angles.py"
Cohesion: 0.06
Nodes (80): category_id(), downgrade(), marked_attributes(), merge_tee_category(), normalized_tee_sku_name(), Connection, UUID, Merge tee families split by missing angle units.  Revision ID: 202608040003 Revi (+72 more)

## Knowledge Gaps
- **606 isolated node(s):** `metadata`, `metadata`, `CategoryPageProps`, `metadata`, `metadata` (+601 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `ProductExperience()` (6× useful, score=3.715260151)
- `DimensionScheme()` (3× useful, score=1.857044791)
- `products/router.py` (2× useful, score=1.298897013)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `extract_openai_output_text()` connect `resolve_product_media` to `read_products`, `BotUtilitiesTest`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `import_price_list()` connect `202608040004_normalize_four_way_angles.py` to `SKU`, `steel_selection_profiles.py`, `BotUtilitiesTest`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `CatalogImageError` connect `group_products_into_variants.py` to `resolve_product_media`, `BotUtilitiesTest`, `configuratorDraft.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `BotUtilitiesTest` (e.g. with `BotApplication` and `CodexRunner`) actually correct?**
  _`BotUtilitiesTest` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `import_price_list()` (e.g. with `NeedsReview` and `ValueError`) actually correct?**
  _`import_price_list()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `metadata`, `metadata`, `CategoryPageProps` to the rest of the system?**
  _606 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compatibility/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10795454545454546 - nodes in this community are weakly interconnected._