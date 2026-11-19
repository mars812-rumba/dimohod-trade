from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.modules.products.specification import metric, specification_groups


def sku(**changes):
    values = {"contour": "сэндвич", "diameter_mm": 115, "outer_diameter_mm": 215,
              "length_mm": 1000, "angle_deg": None, "material": "нержавеющая сталь",
              "steel_grade": "AISI 304", "wall_thickness_mm": Decimal("0.80"), "insulation_mm": 50,
              "attributes": {"outer_material": "нержавеющая сталь", "outer_steel_grade": "AISI 430",
                             "outer_wall_thickness_mm": "0.5"}}
    values.update(changes)
    return SimpleNamespace(**values)


def values(group):
    return {field["key"]: field["value"] for field in group["fields"]}


def test_both_layers_keep_their_own_diameter_grade_and_thickness():
    groups = {group["kind"]: group for group in specification_groups(sku())}
    assert values(groups["inner"]) == {"diameter": "115 мм", "material": "нержавеющая сталь", "steel": "AISI 304", "thickness": "0,8 мм"}
    assert values(groups["outer"]) == {"diameter": "215 мм", "material": "нержавеющая сталь", "steel": "AISI 430", "thickness": "0,5 мм"}
    assert values(groups["insulation"]) == {"insulation": "50 мм"}
    assert values(groups["general"]) == {"length": "1000 мм"}


def test_single_wall_has_no_empty_or_guessed_layer_groups():
    groups = specification_groups(sku(contour="одностенный", attributes={}, outer_diameter_mm=None, insulation_mm=None))
    assert [group["kind"] for group in groups] == ["general"]
    assert values(groups[0])["steel"] == "AISI 304"


def test_missing_outer_facts_are_not_inferred_from_name_or_inner_steel():
    groups = specification_groups(sku(name="Сталь 430, наружная 0,5 мм", attributes={}, outer_diameter_mm=None, insulation_mm=None))
    assert {group["kind"] for group in groups} == {"general", "inner"}


def test_galvanized_outer_layer_does_not_inherit_inner_grade():
    groups = {group["kind"]: group for group in specification_groups(sku(attributes={"outer_material": "оцинковка"}))}
    assert values(groups["outer"]) == {"diameter": "215 мм", "material": "оцинковка"}


def test_legacy_source_section_corrects_stale_outer_fields_like_catalog():
    attrs = {"outer_steel_grade": "AISI 304", "outer_wall_thickness_mm": "0.8",
             "source_section": "Наружный кожух — AISI 430, толщина 0,5 мм / Сэндвич"}
    outer = next(group for group in specification_groups(sku(attributes=attrs)) if group["kind"] == "outer")
    assert values(outer)["steel"] == "AISI 430" and values(outer)["thickness"] == "0,5 мм"


@pytest.mark.parametrize("value", [None, True, "", "bogus", "NaN", "Infinity", 0, -1])
def test_missing_or_invalid_metrics_are_omitted(value):
    assert metric(value) is None


def test_accessory_sizes_remain_general_and_no_insulation_type_is_invented():
    groups = specification_groups(sku(contour=None, diameter_mm=None, outer_diameter_mm=None,
        material=None, steel_grade=None, wall_thickness_mm=None, length_mm=None, insulation_mm=None,
        attributes={"base_size": "600×600 мм", "execution": "Прямой"}))
    assert len(groups) == 1 and values(groups[0]) == {"base_size": "600×600 мм", "execution": "Прямой"}
