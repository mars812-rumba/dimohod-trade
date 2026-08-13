from decimal import Decimal

from app.db.passage_catalog_data import CATEGORY_SEEDS, PRODUCT_SEEDS


def product(slug: str):
    return next(item for item in PRODUCT_SEEDS if item.slug == slug)


def sku(product_slug: str, article: str):
    return next(item for item in product(product_slug).skus if item.article == article)


def test_passage_category_tree_matches_confirmed_catalog_structure() -> None:
    categories = {item.slug: item for item in CATEGORY_SEEDS}

    assert categories["uzly-prohoda"].parent_slug is None
    assert categories["uzly-prohoda-krovli"].parent_slug == "uzly-prohoda"
    assert categories["uzly-prohoda-sten-i-perekrytiy"].parent_slug == "uzly-prohoda"
    assert categories["flantsy"].parent_slug == "uzly-prohoda"


def test_verified_passage_products_have_expected_variant_counts() -> None:
    assert len(product("prohodnoy-uzel-krovli-upk-do-45").skus) == 27
    assert len(product("flanets-dekorativnyy").skus) == 66
    assert len(product("prohodnoy-stakan").skus) == 3
    assert sum(len(item.skus) for item in PRODUCT_SEEDS) == 104


def test_floor_passage_glass_is_galvanized_only() -> None:
    passage_glass = product("prohodnoy-stakan")

    assert passage_glass.extra_attributes["owner_confirmed_material"] == "оцинковка"
    assert [item.article for item in passage_glass.skus] == [
        "DT-PASSAGE-GLASS-GALV-D100-200",
        "DT-PASSAGE-GLASS-GALV-D210-280",
        "DT-PASSAGE-GLASS-GALV-D300-400",
    ]
    assert all(item.material == "оцинковка" for item in passage_glass.skus)
    assert all(item.steel_grade is None for item in passage_glass.skus)
    assert [item.price_rub for item in passage_glass.skus] == [
        Decimal("1760"),
        Decimal("2090"),
        Decimal("2475"),
    ]
    assert [item.attributes["base_size"] for item in passage_glass.skus] == [
        "500×500 мм",
        "600×600 мм",
        "700×700 мм",
    ]
    assert [item.attributes["sleeve_diameter_mm"] for item in passage_glass.skus] == [
        400,
        400,
        450,
    ]


def test_upk_prices_and_dimensions_are_transcribed_from_json_table() -> None:
    first = sku("prohodnoy-uzel-krovli-upk-do-45", "DT-UPK-GALV-D100-125")
    angled_range = sku("prohodnoy-uzel-krovli-upk-do-45", "DT-UPK-430-D215-245")
    largest = sku("prohodnoy-uzel-krovli-upk-do-45", "DT-UPK-304-D350-400")

    assert first.price_rub == Decimal("2805")
    assert first.attributes["base_size"] == "500×500 мм"
    assert angled_range.price_rub == Decimal("6710")
    assert angled_range.attributes["max_roof_angle_deg"] == 45
    assert largest.price_rub == Decimal("12210")
    assert largest.attributes["base_size"] == "1000×1000 мм"


def test_flange_straight_and_angled_prices_remain_separate_variants() -> None:
    straight = sku("flanets-dekorativnyy", "DT-FLANGE-430-STRAIGHT-700X700")
    angled = sku("flanets-dekorativnyy", "DT-FLANGE-430-ANGLE-700X700")

    assert straight.price_rub == Decimal("1925")
    assert straight.attributes["execution"] == "Прямой"
    assert angled.price_rub == Decimal("2310")
    assert angled.attributes["execution"] == "Под углом"


def test_confirmed_mounting_products_keep_source_prices_and_roles() -> None:
    master_flash = sku("master-flesh", "DT-MASTER-FLASH-2")
    wall_console = sku("konsol-universalnaya", "DT-CONSOLE-UNIVERSAL-930-D350")
    floor_console = sku("konsol-teleskopicheskaya", "DT-CONSOLE-TELESCOPIC-900-1200")
    floor_clamp = product("homut-v-perekrytie")

    assert master_flash.price_rub == Decimal("2300")
    assert wall_console.price_rub == Decimal("3000")
    assert product("konsol-universalnaya").extra_attributes["mounting_type"] == "настенная"
    assert floor_console.price_rub == Decimal("2500")
    assert product("konsol-teleskopicheskaya").extra_attributes["mounting_type"] == "напольная"
    assert floor_clamp.extra_attributes["diameter_boundary_needs_review"] is True
