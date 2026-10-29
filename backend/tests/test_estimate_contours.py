from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.modules.leads.router import catalog_characteristics, catalog_line, catalog_sku_metadata, estimate_pipe_names


def variant(**overrides):
    values = dict(id=uuid4(), article="DT-SW50-19-00-D300-400", name="Труба L=1000мм",
        diameter_mm=300, outer_diameter_mm=400, steel_grade="AISI 304", material="нержавеющая сталь",
        wall_thickness_mm=Decimal("0.80"), length_mm=1000, angle_deg=None, insulation_mm=50,
        price_rub=Decimal("10879"), attributes={"outer_steel_grade":"AISI 430", "outer_material":"нержавеющая сталь", "outer_wall_thickness_mm":"0.5"})
    values.update(overrides)
    return SimpleNamespace(**values)


def test_catalog_pipe_characteristics_name_both_contours():
    assert catalog_characteristics(variant()) == ["Ø 300/400 мм", "Внутренняя труба: AISI 304 · 0,8 мм", "Наружная труба: AISI 430 · 0,5 мм", "L 1000 мм", "Изоляция 50 мм"]


def test_fitting_uses_its_own_outer_grade_and_angle():
    result = catalog_characteristics(variant(length_mm=None, angle_deg=90,
        attributes={"outer_steel_grade":"AISI 304", "outer_wall_thickness_mm":Decimal("0.50")}))
    assert "Наружная труба: AISI 304 · 0,5 мм" in result
    assert "Угол 90°" in result
    assert not any("430" in text for text in result)


def test_galvanized_outer_material_is_not_replaced_with_inner_grade():
    result = catalog_characteristics(variant(attributes={"outer_material":"оцинкованная сталь", "outer_wall_thickness_mm":0.5}))
    assert "Наружная труба: оцинкованная сталь · 0,5 мм" in result


def test_legacy_price_section_is_resolved_the_same_way_as_catalog_controls():
    result = catalog_characteristics(variant(attributes={
        "outer_steel_grade":"AISI 304", "outer_wall_thickness_mm":"0.8",
        "source_section":"Наружный кожух — AISI 430, толщина 0,5 мм / Сэндвич",
    }))
    assert "Наружная труба: AISI 430 · 0,5 мм" in result


def test_single_wall_and_absent_outer_fields_do_not_invent_outer_grade():
    result = catalog_characteristics(variant(attributes={}, outer_diameter_mm=None))
    assert "AISI 304" in result
    assert not any("Наружная" in text for text in result)


def test_catalog_add_replace_and_pdf_metadata_share_exact_characteristics(monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.primary_visual_sku_image", lambda *args: None)
    monkeypatch.setattr("app.modules.leads.router.primary_product_image", lambda *args: None)
    sku = variant()
    sku.product = SimpleNamespace(id=uuid4(), slug="sendvich-truba", name="Сэндвич-труба", skus=[sku], extra_attributes={}, category=SimpleNamespace(id=uuid4(), slug="sendvich-truby", name="Сэндвич-трубы"))
    metadata = catalog_sku_metadata(sku)
    line = catalog_line(sku, quantity=4, note="Сохранить", line_id="original-line")
    assert line["characteristics"] == metadata["estimate_characteristics"]
    assert line["article"] == sku.article and line["sku_id"] == str(sku.id)
    assert line["quantity"] == 4 and line["unit_price_rub"] == 10879
    assert line["id"] == "original-line" and line["note"] == "Сохранить"
    forced = catalog_line(sku, quantity=4, note="Сохранить", force_add=True)
    assert forced["match_status"] == "candidate"
    assert "Требует проверки" in forced["selection_warning"]
    assert forced["sku_id"] == line["sku_id"] and forced["unit_price_rub"] == line["unit_price_rub"]
    assert forced["note"] == "Сохранить"
    assert line["match_status"] == "exact" and line["selection_warning"] is None


def test_pipe_names_distinguish_insulated_and_single_wall_and_keep_dimensions():
    sku = variant(contour="сэндвич", product=SimpleNamespace(product_kind="труба"))
    result = estimate_pipe_names(sku)
    assert result == {"estimate_label":"Сэндвич-труба", "estimate_sku_name":"Сэндвич-труба L=1000мм"}
    sku.name = "Сэндвич-труба L=500 мм, Ø180/280"
    assert estimate_pipe_names(sku)["estimate_sku_name"] == sku.name
    sku.contour = "одностенный"
    sku.insulation_mm = None
    sku.outer_diameter_mm = None
    assert estimate_pipe_names(sku) == {"estimate_label":"Труба", "estimate_sku_name":"Труба L=500 мм, Ø180/280"}


def test_pipe_names_use_positive_insulation_and_two_diameters_when_contour_is_missing():
    sku = variant(contour=None, product=SimpleNamespace(product_kind="труба"))
    assert estimate_pipe_names(sku)["estimate_label"] == "Сэндвич-труба"
    sku.insulation_mm = None
    assert estimate_pipe_names(sku) == {}
    sku.insulation_mm = 50
    sku.product.product_kind = "тройник"
    assert estimate_pipe_names(sku) == {}
