import json
from pathlib import Path


RULES_PATH = Path(__file__).parents[1] / "configurator" / "svg-route-generation-rules.v1.json"
CONFIGURATOR_RULES_PATH = Path(__file__).parents[1] / "configurator" / "configurator-rules.v1.json"


def load_rules() -> dict:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def load_configurator_rules() -> dict:
    return json.loads(CONFIGURATOR_RULES_PATH.read_text(encoding="utf-8"))


def test_engineering_svg_contract_keeps_critical_geometry_invariants() -> None:
    rules = load_rules()

    assert rules["global_rules"]["svg_only"] is True
    assert rules["global_rules"]["single_mm_to_px_scale_per_scene"] is True
    assert rules["global_rules"]["preserve_bom_and_sku_selection"] is True
    assert rules["connection_rules"]["joint_overlap_mm"] == 50
    assert rules["diameter_rules"]["mandatory_relation"] == "D_SINGLE = D_DAMPER < D_SANDWICH"
    assert rules["support_cap_transition"]["shape"] == "trapezoid_transition"
    assert rules["floor_clamp"]["layering"]["z_order"] == "clamp above pipe"
    assert rules["roof_passage"]["diameter_relation"] == "D_ROOF_PASSAGE_OPENING = D_SANDWICH"
    assert rules["failure_policy"]["rule"].startswith("If any validation rule fails")


def test_ridge_height_uses_inner_lower_edge_as_measured_datum() -> None:
    ridge = load_rules()["building_measurements"]["ridge_height"]

    assert "INNER LOWER EDGE" in ridge["definition"]
    assert "finished floor level" in ridge["svg_rule"]
    assert "attic height" in ridge["not_the_same_as"]


def test_roof_passage_geometry_is_derived_from_ridge_distance_and_angle() -> None:
    roof = load_rules()["building_measurements"]["roof_build_up"]

    assert "tan(roof_angle_deg)" in roof["pitched_roof_geometry"]["inner_surface_at_chimney_mm"]
    assert roof["pitched_roof_geometry"]["outer_surface_at_chimney_mm"].endswith("+ roof_build_up_mm")


def test_termination_height_rules_include_all_ridge_distance_branches() -> None:
    rules = load_rules()["termination_height_rules"]

    assert rules["minimum_from_grate_mm"] == 5000
    assert rules["pitched_roof"][0]["maximum_horizontal_distance_mm"] == 1500
    assert rules["pitched_roof"][1]["maximum_horizontal_distance_mm"] == 3000
    assert "tan(10deg)" in rules["pitched_roof"][2]["minimum_mouth_height"]
    assert "max(" in rules["final_formula"]
    assert rules["explanation_contract"]["show_controlling_requirement"] is True


def test_passage_components_and_manual_wool_stay_separate() -> None:
    rules = load_rules()

    floor_bom = rules["floor_passage_bom"]
    assert floor_bom["separate_sellable_lines"] == [
        "Хомут в перекрытие",
        "Проходной стакан",
        "Комплект ваты",
        "Декоративная юбка — сверху перекрытия",
        "Декоративная юбка — снизу перекрытия",
    ]
    assert floor_bom["wool_quantity"]["mode"] == "manual"
    assert floor_bom["decorative_skirts"]["positions"] == [
        "upper_floor_face",
        "lower_ceiling_face",
    ]
    assert floor_bom["decorative_skirts"]["independently_removable"] is True
    assert rules["wall_passage_bom"]["decorative_skirts"]["positions"] == [
        "interior_wall_face",
        "exterior_wall_face",
    ]
    assert rules["wall_passage_bom"]["decorative_skirts"]["independently_removable"] is True
    assert rules["roof_passage"]["inside_element"]["separate_from_upk"] is True
    assert rules["roof_passage"]["decorative_skirt"]["pitched_roof"] == "forbidden"
    assert "foreground" in rules["roof_passage"]["outside_element"]["layering"]
    assert rules["roof_passage"]["catalog_identity"]["required_article_prefix"] == "DT-UPK-"
    assert "DT-MASTER-FLASH-2" in rules["roof_passage"]["catalog_identity"]["explicitly_not_upk"]


def test_roof_rafter_passage_reuses_level_floor_clamp_and_side_wool() -> None:
    rules = load_rules()["roof_passage"]["rafter_passage"]

    assert "each side" in rules["side_fill"]
    assert rules["wool_quantity_source"] == "manual BOM input only"
    assert "Хомут в перекрытие" in rules["floor_clamp_reuse"]
    assert "never rotate" in rules["clamp_orientation"]
    assert "both sides" in rules["ear_mounting"]

    scheme = load_configurator_rules()["assemblies"]["roof_passage"]["scheme"]
    assert scheme["roof_clamp_family"] == "homut-v-perekrytie"
    assert scheme["roof_clamp_body_orientation"] == "level_perpendicular_to_vertical_pipe_not_rotated_to_roof_angle"
    assert scheme["roof_clamp_ear_mounting"] == "left_and_right_ears_fastened_to_rafters"


def test_small_bath_acceptance_example_explains_the_tall_stack() -> None:
    example = load_rules()["acceptance_examples"][0]

    assert example["expected_geometry_mm"]["roof_inner_at_chimney"] == 3023
    assert example["expected_geometry_mm"]["roof_outer_at_chimney"] == 3173
    assert example["expected_termination_mm"]["roof_requirement"] == 3900
    assert example["expected_termination_mm"]["five_metre_requirement"] == 5150
    assert example["expected_termination_mm"]["controlling_requirement"] == "five-meter"


def test_upk_catalog_mapping_explicitly_excludes_master_flash() -> None:
    roof_bom = load_configurator_rules()["assemblies"]["roof_passage"]["bom"]
    upk = next(line for line in roof_bom if line["component_role"] == "upk")

    assert upk["catalog_product_slug"] == "prohodnoy-uzel-krovli-upk-do-45"
    assert upk["catalog_article_prefix"] == "DT-UPK-"
    assert "master-flesh" in upk["excluded_product_slugs"]


def test_master_flash_and_upk_are_default_independently_removable_bom_lines() -> None:
    roof_passage = load_configurator_rules()["assemblies"]["roof_passage"]
    roof_bom = roof_passage["bom"]
    master_flash = next(line for line in roof_bom if line["component_role"] == "master_flash")
    upk = next(line for line in roof_bom if line["component_role"] == "upk")

    assert roof_passage["applies_to_roof_types"] == ["pitched", "flat"]
    assert master_flash["catalog_product_slug"] == "master-flesh"
    assert master_flash["include_by_default"] is True
    assert master_flash["user_removable"] is True
    assert master_flash["applies_to_roof_types"] == ["pitched", "flat"]
    assert upk["include_by_default"] is True
    assert upk["user_removable"] is True
    assert upk["applies_to_roof_types"] == ["pitched", "flat"]

    svg_roof_passage = load_rules()["roof_passage"]
    svg_components = svg_roof_passage["default_bom_components"]
    assert svg_roof_passage["applies_to_roof_types"] == ["pitched", "flat"]
    assert svg_components["master_flash"]["included_by_default"] is True
    assert svg_components["upk"]["included_by_default"] is True
    assert svg_components["master_flash"]["user_removable"] is True
    assert svg_components["upk"]["user_removable"] is True
    assert svg_components["master_flash"]["applies_to_roof_types"] == ["pitched", "flat"]
    assert svg_components["upk"]["applies_to_roof_types"] == ["pitched", "flat"]


def test_warmup_pipe_uses_nearest_real_sku_when_exact_length_is_missing() -> None:
    selection = load_configurator_rules()["routes"]["straight_through_floors"]["warmup_assembly"]["single_wall_pipe_sku_selection"]

    assert selection["first_choice"].startswith("exact catalogue length")
    assert "smallest absolute catalogue-length difference" in selection["fallback_when_exact_length_missing"]
    assert "assembled-height verification" in selection["verification_rule"]


def test_stainless_304_is_default_except_for_hidden_mounting_components() -> None:
    defaults = load_configurator_rules()["material_selection_defaults"]
    visible = defaults["visible_chimney_components"]
    exceptions = defaults["catalog_default_exceptions"]

    assert visible["preferred_material"] == "stainless"
    assert visible["preferred_steel_grade"] == "AISI 304"
    assert visible["sandwich_outer_pipe_preferred_material"] == "stainless"
    assert visible["selection_mode"] == "soft_preference_with_catalog_fallback"
    assert "ceiling-passage" in exceptions["component_keys"]
    assert "крепеж" in exceptions["product_kinds"]
