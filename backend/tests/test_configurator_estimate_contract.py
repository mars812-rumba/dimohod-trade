import json
from pathlib import Path


RULES_PATH = Path(__file__).resolve().parents[1] / "configurator" / "configurator-rules.v1.json"


def load_rules() -> dict:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def test_estimate_uses_only_selected_bom_and_real_catalog_prices() -> None:
    contract = load_rules()["estimate_pdf_contract"]

    assert contract["scope"] == "current_selected_bom_only"
    assert contract["removed_lines"] == "exclude_from_totals_and_list_separately"
    assert contract["line_total_formula"] == "quantity * current_catalog_sku_price_rub"
    assert "never_invent" in contract["missing_price_policy"]


def test_estimate_pdf_keeps_customer_dimensions_and_review_state() -> None:
    contract = load_rules()["estimate_pdf_contract"]
    required = set(contract["required_sections"])

    assert {"customer_measurements", "bom_with_sku_characteristics", "known_price_subtotal"} <= required
    assert {"review_items_and_calculation_errors", "generation_timestamp"} <= required
    assert contract["document_status"] == "preliminary_estimate_requires_confirmation"
    assert contract["pricing_tiers"]["status"] == "deferred"
