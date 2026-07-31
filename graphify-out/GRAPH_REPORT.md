# Graph Report - .  (2026-07-31)

## Corpus Check
- 69 files · ~395,379 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 462 nodes · 1027 edges · 37 communities (30 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Database and Alembic
- Homepage and Configurator
- Catalog and Product Pages
- Bot State and Codex Runner
- Web Package Configuration
- TypeScript Configuration
- Bot Messaging and Release
- Variant Grouping Pipeline
- Price Import Pipeline
- Bot Utility Functions
- FastAPI Core and Sessions
- Product API and Schemas
- OpenAI and Host Release
- Telegram API Client
- Parametric SVG and BOM
- Project and File Configuration
- Codex Task Execution
- Monorepo Scripts
- Site Layout
- Scenario Card
- Next.js Configuration
- Next.js Generated Types
- Telegram Bot Package
- Backend Project Metadata

## God Nodes (most connected - your core abstractions)
1. `BotUtilitiesTest` - 34 edges
2. `import_price_list()` - 24 edges
3. `BotApplication` - 22 edges
4. `TelegramAPI` - 20 edges
5. `StateStore` - 20 edges
6. `ReleaseManager` - 18 edges
7. `compilerOptions` - 16 edges
8. `Product` - 16 edges
9. `Category` - 13 edges
10. `CodexRunner` - 13 edges

## Surprising Connections (you probably didn't know these)
- `unique_product_slug()` --indirect_call--> `Product`  [INFERRED]
  backend/app/db/group_products_into_variants.py → backend/app/modules/products/models.py
- `group_products_into_variants()` --indirect_call--> `Product`  [INFERRED]
  backend/app/db/group_products_into_variants.py → backend/app/modules/products/models.py
- `SectionSpec` --uses--> `Category`  [INFERRED]
  backend/app/db/import_price_list.py → backend/app/modules/catalog/models.py
- `import_price_list()` --indirect_call--> `NeedsReview`  [INFERRED]
  backend/app/db/import_price_list.py → backend/app/modules/products/models.py
- `get_catalog_tree()` --indirect_call--> `Category`  [INFERRED]
  backend/app/modules/catalog/service.py → backend/app/modules/catalog/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shared Parametric Geometry System** — docs_parametric_product_media_and_bom_architecture_geometry_family, docs_parametric_product_media_and_bom_architecture_parametric_svg, docs_parametric_product_media_and_bom_architecture_geometry_registry, docs_parametric_product_media_and_bom_architecture_dimension_scheme, docs_parametric_product_media_and_bom_architecture_configurator_part [EXTRACTED 1.00]
- **Safe Configurator Output** — docs_parametric_product_media_and_bom_architecture_sku_dimensions, docs_parametric_product_media_and_bom_architecture_scene_composer, docs_parametric_product_media_and_bom_architecture_real_sku_bom, docs_parametric_product_media_and_bom_architecture_backend_safety_boundary [EXTRACTED 1.00]

## Communities (37 total, 7 thin omitted)

### Community 0 - "Database and Alembic"
Cohesion: 0.12
Nodes (36): do_run_migrations(), run_async_migrations(), run_migrations_online(), Base, TimestampMixin, main(), seed_compatibility_rules(), seed() (+28 more)

### Community 1 - "Homepage and Configurator"
Cohesion: 0.07
Nodes (32): assetUrl(), catalogGroups, checks, HomePage(), metadata, route, scenarios, AssetName (+24 more)

### Community 2 - "Catalog and Product Pages"
Cohesion: 0.10
Nodes (24): CatalogPage(), CatalogPageProps, formatPrice(), ProductCard(), ProductPage(), ProductPageProps, deflectorMedia, docs (+16 more)

### Community 3 - "Bot State and Codex Runner"
Cohesion: 0.11
Nodes (6): CodexRunner, detect_natural_release_intent(), NaturalReleaseIntent, Recognize Russian release commands coming from text or speech transcription., StateStore, BotUtilitiesTest

### Community 4 - "Web Package Configuration"
Cohesion: 0.07
Nodes (26): dependencies, lucide-react, next, react, react-dom, devDependencies, @types/node, @types/react (+18 more)

### Community 5 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 7 - "Variant Grouping Pipeline"
Cohesion: 0.25
Nodes (25): angle_deg(), decimal_attr(), group_products_into_variants(), insulation_mm_from_attrs(), int_attr(), logical_item_name(), logical_key(), logical_name() (+17 more)

### Community 8 - "Price Import Pipeline"
Cohesion: 0.20
Nodes (25): category_meta(), get_or_create_category(), import_code(), import_price_list(), log_review(), logical_item_name(), logical_product_name(), logical_product_slug_source() (+17 more)

### Community 9 - "Bot Utility Functions"
Cohesion: 0.11
Nodes (15): allowed_changed_paths(), commit_message_from_prompt(), detect_natural_confirmation(), extract_file_requests(), extract_openai_output_text(), is_protected_commit_path(), load_dotenv(), natural_image_prompt() (+7 more)

### Community 10 - "FastAPI Core and Sessions"
Cohesion: 0.13
Nodes (14): Settings, get_db(), AsyncSession, create_app(), AsyncSession, read_catalog_tree(), CatalogTreeResponse, CategoryTreeNode (+6 more)

### Community 11 - "Product API and Schemas"
Cohesion: 0.20
Nodes (19): AsyncSession, read_product(), read_product_filters(), read_products(), CategorySummary, ProductFiltersResponse, ProductKindFilter, ProductListItem (+11 more)

### Community 12 - "OpenAI and Host Release"
Cohesion: 0.25
Nodes (7): RuntimeError, analyze_photo(), generate_image(), openai_json_request(), Narrow host-side Git and deploy operations unavailable inside Codex sandbox., ReleaseManager, run_host_command()

### Community 13 - "Telegram API Client"
Cohesion: 0.23
Nodes (5): acquire_instance_lock(), main(), Any, TelegramAPI, TelegramError

### Community 14 - "Parametric SVG and BOM"
Cohesion: 0.15
Nodes (16): Backend Owns Compatibility Decisions, ConfiguratorPart Component, SVG Connection Ports, DimensionScheme Component, Geometry Family, Initial Seventeen Geometry Roles, Shared Geometry Registry, Parametric SVG Implementation Plan (+8 more)

### Community 15 - "Project and File Configuration"
Cohesion: 0.28
Nodes (10): build_project_configs(), encode_multipart(), encode_multipart_payload(), file_fingerprint(), guess_mime_type(), image_data_url(), ProjectConfig, Path (+2 more)

### Community 16 - "Codex Task Execution"
Cohesion: 0.29
Nodes (5): compact_command(), consume_codex_event(), Update a user-facing summary. Returns True when the status materially changed., RunningTask, StatusSummary

### Community 17 - "Monorepo Scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, build:web, dev:web, version, workspaces, apps/web

## Knowledge Gaps
- **83 isolated node(s):** `CatalogPageProps`, `metadata`, `metadata`, `scenarios`, `route` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TelegramAPI` connect `Telegram API Client` to `Bot Utility Functions`, `Bot State and Codex Runner`, `Bot Messaging and Release`, `Project and File Configuration`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `StateStore` connect `Bot State and Codex Runner` to `Bot Messaging and Release`, `Bot Utility Functions`, `Telegram API Client`, `Project and File Configuration`, `Codex Task Execution`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `BotUtilitiesTest` connect `Bot State and Codex Runner` to `Bot Messaging and Release`, `Bot Utility Functions`, `OpenAI and Host Release`, `Telegram API Client`, `Codex Task Execution`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `BotUtilitiesTest` (e.g. with `CodexRunner` and `PendingAction`) actually correct?**
  _`BotUtilitiesTest` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CatalogPageProps`, `metadata`, `metadata` to the rest of the system?**
  _83 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Database and Alembic` be split into smaller, more focused modules?**
  _Cohesion score 0.12145390070921985 - nodes in this community are weakly interconnected._
- **Should `Homepage and Configurator` be split into smaller, more focused modules?**
  _Cohesion score 0.0748663101604278 - nodes in this community are weakly interconnected._