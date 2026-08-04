"""Verified catalog rows for passage assemblies and related mounting products.

Prices and dimensions are transcribed from ``prices/price_list.json`` and the
attached photographed copy of its ``Фланцы`` sheet. Product roles that are
absent from the price list come only from the owner's confirmed clarifications
in the August 2026 catalog review.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


SOURCE_NAME = "Дымоход Трейд price_list.json"


@dataclass(frozen=True)
class CategorySeed:
    slug: str
    name: str
    parent_slug: str | None
    sort_order: int


@dataclass(frozen=True)
class SKUSeed:
    article: str
    name: str
    slug: str
    price_rub: Decimal
    material: str | None = None
    steel_grade: str | None = None
    wall_thickness_mm: Decimal | None = None
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ProductSeed:
    category_slug: str
    name: str
    slug: str
    product_kind: str
    short_description: str | None
    application_tags: tuple[str, ...]
    extra_attributes: dict[str, Any]
    skus: tuple[SKUSeed, ...]


CATEGORY_SEEDS = (
    CategorySeed("uzly-prohoda", "Узлы прохода", None, 50),
    CategorySeed("uzly-prohoda-krovli", "Узлы прохода кровли", "uzly-prohoda", 10),
    CategorySeed(
        "uzly-prohoda-sten-i-perekrytiy",
        "Узлы прохода стен и перекрытий",
        "uzly-prohoda",
        20,
    ),
    CategorySeed("flantsy", "Фланцы", "uzly-prohoda", 30),
)


UPK_RANGES = (
    (100, 125, "500×500 мм"),
    (130, 155, "600×600 мм"),
    (160, 185, "800×800 мм"),
    (190, 210, "1000×800 мм"),
    (215, 245, "1000×800 мм"),
    (250, 275, "1000×800 мм"),
    (280, 300, "1000×1000 мм"),
    (305, 350, "1000×1000 мм"),
    (350, 400, "1000×1000 мм"),
)

UPK_MATERIALS = (
    (
        "GALV",
        "оцинковка",
        None,
        (2805, 3003, 3465, 4433, 4675, 4950, 5060, 5577, 6050),
    ),
    (
        "304",
        "нержавеющая сталь",
        "AISI 304",
        (4372.5, 5115, 6270, 8030, 9350, 9570, 10560, 11385, 12210),
    ),
    (
        "430",
        "нержавеющая сталь",
        "AISI 430",
        (3465, 4015, 4730, 6050, 6710, 7040, 7920, 8690, 9350),
    ),
)


def upk_skus() -> tuple[SKUSeed, ...]:
    result: list[SKUSeed] = []
    for material_code, material, steel_grade, prices in UPK_MATERIALS:
        for (diameter_min, diameter_max, base_size), price in zip(UPK_RANGES, prices, strict=True):
            diameter_range = f"{diameter_min}–{diameter_max} мм"
            result.append(
                SKUSeed(
                    article=f"DT-UPK-{material_code}-D{diameter_min}-{diameter_max}",
                    name=f"УПК {base_size}, {diameter_range}, {steel_grade or material}",
                    slug=f"{material_code.lower()}-d{diameter_min}-{diameter_max}-{base_size.lower().replace('×', 'x').replace(' мм', '')}",
                    price_rub=Decimal(str(price)),
                    material=material,
                    steel_grade=steel_grade,
                    attributes={
                        "diameter_range": diameter_range,
                        "diameter_min_mm": diameter_min,
                        "diameter_max_mm": diameter_max,
                        "base_size": base_size,
                        "max_roof_angle_deg": 45,
                    },
                )
            )
    return tuple(result)


FLANGE_SIZES = (
    "500×500 мм",
    "500×650 мм",
    "600×600 мм",
    "650×650 мм",
    "600×750 мм",
    "700×700 мм",
    "750×750 мм",
    "800×800 мм",
    "800×850 мм",
    "800×1000 мм",
    "1000×1000 мм",
)

FLANGE_ROWS = (
    ("GALV", "оцинковка", None, "Прямой", (605, 715, 770, 825, 880, 935, 990, 1100, 1210, 1375, 1650)),
    ("GALV", "оцинковка", None, "Под углом", (726, 858, 924, 990, 1056, 1122, 1188, 1320, 1452, 1650, 1980)),
    ("304", "нержавеющая сталь", "AISI 304", "Прямой", (1881, 2090, 2299, 2466.2, 2508, 2717, 2926, 3239.5, 3344, 3866.5, 4702.5)),
    ("304", "нержавеющая сталь", "AISI 304", "Под углом", (2257.2, 2508, 2758.8, 2959, 3009.6, 3260.4, 3511.2, 3887.4, 4012.8, 4639.8, 5643)),
    ("430", "нержавеющая сталь", "AISI 430", "Прямой", (1133, 1496, 1672, 1760, 1870, 1925, 1980, 2035, 2090, 2310, 2475)),
    ("430", "нержавеющая сталь", "AISI 430", "Под углом", (1359.6, 1795.2, 2006.4, 2112, 2244, 2310, 2376, 2442, 2508, 2772, 2970)),
)


def flange_skus() -> tuple[SKUSeed, ...]:
    result: list[SKUSeed] = []
    for material_code, material, steel_grade, execution, prices in FLANGE_ROWS:
        execution_code = "ANGLE" if execution == "Под углом" else "STRAIGHT"
        for size, price in zip(FLANGE_SIZES, prices, strict=True):
            size_code = size.lower().replace("×", "x").replace(" мм", "")
            result.append(
                SKUSeed(
                    article=f"DT-FLANGE-{material_code}-{execution_code}-{size_code.upper()}",
                    name=f"Фланец декоративный {size}, {execution.lower()}, {steel_grade or material}",
                    slug=f"{material_code.lower()}-{execution_code.lower()}-{size_code}",
                    price_rub=Decimal(str(price)),
                    material=material,
                    steel_grade=steel_grade,
                    attributes={
                        "base_size": size,
                        "execution": execution,
                    },
                )
            )
    return tuple(result)


PASSAGE_GLASS_SKUS = (
    SKUSeed(
        "DT-PASSAGE-GLASS-GALV-D210-280",
        "Проходной стакан, Ø 210–280 мм, оцинковка",
        "galv-d210-280",
        Decimal("1760"),
        material="оцинковка",
        attributes={"diameter_range": "210–280 мм", "diameter_min_mm": 210, "diameter_max_mm": 280},
    ),
    SKUSeed(
        "DT-PASSAGE-GLASS-304-D210-280",
        "Проходной стакан, Ø 210–280 мм, AISI 304",
        "aisi304-d210-280",
        Decimal("4125"),
        material="нержавеющая сталь",
        steel_grade="AISI 304",
        attributes={"diameter_range": "210–280 мм", "diameter_min_mm": 210, "diameter_max_mm": 280},
    ),
    SKUSeed(
        "DT-PASSAGE-GLASS-430-D210-280",
        "Проходной стакан, Ø 210–280 мм, AISI 430",
        "aisi430-d210-280",
        Decimal("2816"),
        material="нержавеющая сталь",
        steel_grade="AISI 430",
        attributes={"diameter_range": "210–280 мм", "diameter_min_mm": 210, "diameter_max_mm": 280},
    ),
)


PRODUCT_SEEDS = (
    ProductSeed(
        "uzly-prohoda-krovli",
        "Проходной узел кровли (УПК) до 45°",
        "prohodnoy-uzel-krovli-upk-do-45",
        "проходной_узел",
        "Варианты по диапазону диаметра, размеру основания и материалу. Табличная цена действует для угла кровли до 45°.",
        ("кровля",),
        {"price_source_sheet": "Фланцы", "max_roof_angle_deg": 45},
        upk_skus(),
    ),
    ProductSeed(
        "uzly-prohoda-krovli",
        "Мастер-флеш",
        "master-flesh",
        "проходной_узел",
        None,
        ("кровля",),
        {"price_source_sheet": "комплекты"},
        (
            SKUSeed(
                "DT-MASTER-FLASH-2",
                "Мастер-флеш №2",
                "number-2",
                Decimal("2300"),
                attributes={"model_number": 2, "source_sheet": "комплекты"},
            ),
        ),
    ),
    ProductSeed(
        "uzly-prohoda-sten-i-perekrytiy",
        "Проходной стакан",
        "prohodnoy-stakan",
        "проходной_узел",
        "Варианты по диапазону диаметра и материалу.",
        ("стена", "перекрытие"),
        {"price_source_sheet": "Фланцы"},
        PASSAGE_GLASS_SKUS,
    ),
    ProductSeed(
        "uzly-prohoda-sten-i-perekrytiy",
        "Комплект ваты для проходного стакана",
        "komplekt-vaty-dlya-prohodnogo-stakana",
        "изоляция",
        None,
        ("стена", "перекрытие"),
        {"price_source_sheet": "Фланцы"},
        (
            SKUSeed(
                "DT-PASSAGE-WOOL-KIT",
                "Комплект ваты для проходного стакана",
                "komplekt",
                Decimal("900"),
                attributes={"source_sheet": "Фланцы", "source_kind": "photographed_price_list"},
            ),
        ),
    ),
    ProductSeed(
        "uzly-prohoda-sten-i-perekrytiy",
        "Хомут в перекрытие",
        "homut-v-perekrytie",
        "крепеж",
        None,
        ("перекрытие",),
        {"price_source_sheet": "Фланцы", "diameter_boundary_needs_review": True},
        (
            SKUSeed(
                "DT-FLOOR-CLAMP-UP-TO-D300",
                "Хомут в перекрытие, до D300",
                "do-d300",
                Decimal("1760"),
                attributes={"diameter_range": "до D300", "diameter_max_mm": 300},
            ),
            SKUSeed(
                "DT-FLOOR-CLAMP-FROM-D300",
                "Хомут в перекрытие, от D300",
                "ot-d300",
                Decimal("2200"),
                attributes={"diameter_range": "от D300", "diameter_min_mm": 300},
            ),
        ),
    ),
    ProductSeed(
        "flantsy",
        "Фланец декоративный",
        "flanets-dekorativnyy",
        "фланец",
        "Прямые и угловые исполнения по табличным размерам и материалам.",
        ("кровля", "стена", "перекрытие"),
        {"price_source_sheet": "Фланцы"},
        flange_skus(),
    ),
    ProductSeed(
        "homuty-i-krepezh",
        "Консоль универсальная",
        "konsol-universalnaya",
        "консоль",
        "Настенная консоль. Варианты по размеру и указанному в прайсе предельному диаметру.",
        ("стена",),
        {"price_source_sheet": "Фланцы", "mounting_type": "настенная"},
        (
            SKUSeed(
                "DT-CONSOLE-UNIVERSAL-930-D350",
                "Консоль универсальная до 930 мм, до D350",
                "do-930-d350",
                Decimal("3000"),
                attributes={"size_range": "до 930 мм", "diameter_range": "до D350", "diameter_max_mm": 350},
            ),
            SKUSeed(
                "DT-CONSOLE-UNIVERSAL-1200-D500",
                "Консоль универсальная до 1200 мм, до D500",
                "do-1200-d500",
                Decimal("4000"),
                attributes={"size_range": "до 1200 мм", "diameter_range": "до D500", "diameter_max_mm": 500},
            ),
        ),
    ),
    ProductSeed(
        "homuty-i-krepezh",
        "Консоль телескопическая",
        "konsol-teleskopicheskaya",
        "консоль",
        "Напольная консоль. Варианты по диапазону размеров из прайса.",
        ("пол",),
        {"price_source_sheet": "Фланцы", "mounting_type": "напольная"},
        (
            SKUSeed(
                "DT-CONSOLE-TELESCOPIC-930",
                "Консоль телескопическая до 930 мм",
                "do-930",
                Decimal("1980"),
                attributes={"size_range": "до 930 мм"},
            ),
            SKUSeed(
                "DT-CONSOLE-TELESCOPIC-900-1200",
                "Консоль телескопическая 900–1200 мм",
                "900-1200",
                Decimal("2500"),
                attributes={"size_range": "900–1200 мм"},
            ),
        ),
    ),
)
