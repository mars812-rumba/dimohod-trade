"""Verified support-platform variants from the ``Фланцы`` price sheet."""

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class SupportPlatformSKUSeed:
    article: str
    name: str
    slug: str
    price_rub: Decimal
    diameter_mm: int
    outer_diameter_mm: int
    steel_grade: str
    wall_thickness_mm: Decimal
    outer_steel_grade: str
    outer_wall_thickness_mm: Decimal

    @property
    def insulation_mm(self) -> int:
        return (self.outer_diameter_mm - self.diameter_mm) // 2


SUPPORT_PLATFORM_DIAMETERS = (
    (100, 200),
    (110, 210),
    (120, 220),
    (130, 230),
    (140, 240),
    (150, 250),
    (160, 260),
    (180, 280),
    (200, 300),
    (250, 350),
    (280, 380),
    (300, 400),
)

SUPPORT_PLATFORM_ROWS = (
    (
        "304",
        "AISI 304",
        Decimal("0.5"),
        "AISI 430",
        Decimal("0.8"),
        (
            2214.3, 2238.5, 2250.6, 2341.35, 2383.7, 2467.19,
            2528.9, 2688.62, 2891.9, 3206.5, 3267, 3395.26,
        ),
    ),
    (
        "321",
        "AISI 321",
        Decimal("0.5"),
        "AISI 430",
        Decimal("0.8"),
        (
            3100.02, 3133.9, 3150.84, 3277.89, 3337.18, 3454.55,
            3540.46, 3764.31, 4048.66, 4489.1, 4573.8, 4752.88,
        ),
    ),
    (
        "316",
        "AISI 316",
        Decimal("0.5"),
        "AISI 430",
        Decimal("0.8"),
        (
            3719.54, 3760.68, 3781.25, 3933.71, 4005.1, 4145.46,
            4248.31, 4516.93, 4858.15, 5386.92, 5488.56, 5703.94,
        ),
    ),
)


def support_platform_skus() -> tuple[SupportPlatformSKUSeed, ...]:
    result: list[SupportPlatformSKUSeed] = []
    for code, steel_grade, thickness, outer_grade, outer_thickness, prices in SUPPORT_PLATFORM_ROWS:
        pairs = zip(SUPPORT_PLATFORM_DIAMETERS, prices, strict=True)
        for (diameter, outer_diameter), price in pairs:
            result.append(
                SupportPlatformSKUSeed(
                    article=f"DT-SUPPORT-PLATFORM-{code}-430-D{diameter}-{outer_diameter}",
                    name=(
                        f"Сэндвич-опорная площадка Ø{diameter}/{outer_diameter}, "
                        f"{steel_grade} {thickness} мм / {outer_grade} {outer_thickness} мм"
                    ),
                    slug=f"aisi{code}-430-d{diameter}-{outer_diameter}",
                    price_rub=Decimal(str(price)),
                    diameter_mm=diameter,
                    outer_diameter_mm=outer_diameter,
                    steel_grade=steel_grade,
                    wall_thickness_mm=thickness,
                    outer_steel_grade=outer_grade,
                    outer_wall_thickness_mm=outer_thickness,
                )
            )
    return tuple(result)


SUPPORT_PLATFORM_SKUS = support_platform_skus()
