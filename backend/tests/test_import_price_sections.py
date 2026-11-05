from decimal import Decimal

from app.db.import_price_list import parse_section


def test_without_insulation_heading_remains_single_wall():
    section = parse_section(["Труба без изоляции — Нержавеющая сталь AISI 430 (толщина 0,8 мм)"])
    assert section.contour == "одностенный"
    assert section.insulation_mm is None
    assert section.steel_grade == "AISI 430"
    assert section.wall_thickness_mm == Decimal("0.8")


def test_explicit_insulation_heading_preserves_sandwich_materials():
    section = parse_section([
        "Внутренняя труба — Нержавеющая сталь AISI 304 (толщина 0,8мм)",
        "Наружный кожух — Нержавеющая сталь AISI 430 (толщина 0,5мм)",
        "Изоляция — Rockwool Wired Mat 105 (толщина 50мм)",
    ])
    assert section.contour == "сэндвич"
    assert section.insulation_mm == 50
    assert section.outer_steel_grade == "AISI 430"
    assert section.outer_wall_thickness_mm == Decimal("0.5")
