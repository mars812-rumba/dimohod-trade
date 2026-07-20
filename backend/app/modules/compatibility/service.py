from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.modules.catalog.models import Category  # noqa: F401
from app.modules.compatibility.models import CompatibilityRule
from app.modules.compatibility.schemas import CompatibilityCheckRequest, CompatibilityMessage
from app.modules.products.models import Product, SKU

SEVERITY_ORDER = {
    "error": 10,
    "warning": 20,
    "info": 30,
}


async def list_active_rules(session: AsyncSession) -> list[CompatibilityRule]:
    result = await session.execute(
        select(CompatibilityRule)
        .where(CompatibilityRule.is_active.is_(True))
        .order_by(CompatibilityRule.severity.asc(), CompatibilityRule.code.asc())
    )
    return list(result.scalars())


async def get_sku_context(session: AsyncSession, sku_id: UUID) -> dict[str, Any] | None:
    result = await session.execute(
        select(SKU)
        .where(SKU.id == sku_id, SKU.is_active.is_(True))
        .options(joinedload(SKU.product))
    )
    sku = result.scalar_one_or_none()
    if sku is None:
        return None
    return context_from_product_sku(sku.product, sku)


def decimal_to_str(value: Decimal | None) -> str | None:
    return str(value) if value is not None else None


def context_from_product_sku(product: Product, sku: SKU) -> dict[str, Any]:
    return {
        "product_id": str(product.id),
        "product_slug": product.slug,
        "sku_id": str(sku.id),
        "sku_slug": sku.slug,
        "article": sku.article,
        "product_kind": product.product_kind,
        "diameter_mm": sku.diameter_mm or product.diameter_mm,
        "outer_diameter_mm": sku.outer_diameter_mm,
        "contour": sku.contour or product.contour,
        "insulation_mm": sku.insulation_mm or product.insulation_mm,
        "length_mm": sku.length_mm,
        "angle_deg": sku.angle_deg,
        "material": sku.material or product.material,
        "steel_grade": sku.steel_grade or product.steel_grade,
        "wall_thickness_mm": decimal_to_str(sku.wall_thickness_mm or product.wall_thickness_mm),
        "stock_status": sku.stock_status,
    }


def context_from_request(request: CompatibilityCheckRequest) -> dict[str, Any]:
    context = {
        "product_kind": request.product_kind,
        "zone": request.zone,
        "source_type": request.source_type,
        "required_diameter_mm": request.required_diameter_mm,
        "diameter_mm": request.diameter_mm,
        "outer_diameter_mm": request.outer_diameter_mm,
        "contour": request.contour,
        "insulation_mm": request.insulation_mm,
        "length_mm": request.length_mm,
        "angle_deg": request.angle_deg,
        "material": request.material,
        "steel_grade": request.steel_grade,
        "wall_thickness_mm": decimal_to_str(request.wall_thickness_mm),
    }
    return {**context, **request.extra_context}


def matches_expected(actual: Any, expected: Any) -> bool:
    if isinstance(expected, dict):
        if "eq" in expected and actual != expected["eq"]:
            return False
        if "neq" in expected and actual == expected["neq"]:
            return False
        if "in" in expected and actual not in expected["in"]:
            return False
        if "not_in" in expected and actual in expected["not_in"]:
            return False
        if "is_null" in expected:
            is_null = actual is None
            if bool(expected["is_null"]) != is_null:
                return False
        if "is_not_null" in expected:
            is_not_null = actual is not None
            if bool(expected["is_not_null"]) != is_not_null:
                return False
        if "eq_field" in expected and actual != expected.get("_context", {}).get(expected["eq_field"]):
            return False
        if "neq_field" in expected and actual == expected.get("_context", {}).get(expected["neq_field"]):
            return False
        return True

    return actual == expected


def rule_matches(rule: CompatibilityRule, context: dict[str, Any]) -> bool:
    if rule.applies_to_product_kind and context.get("product_kind") != rule.applies_to_product_kind:
        return False

    for key, expected in (rule.conditions or {}).items():
        if isinstance(expected, dict):
            expected = {**expected, "_context": context}
        if not matches_expected(context.get(key), expected):
            return False
    return True


def evaluate_rules(rules: list[CompatibilityRule], context: dict[str, Any]) -> list[CompatibilityMessage]:
    messages = [
        CompatibilityMessage(
            code=rule.code,
            severity=rule.severity,
            message=rule.message,
            rule_type=rule.rule_type,
        )
        for rule in rules
        if rule_matches(rule, context)
    ]
    return sorted(messages, key=lambda item: (SEVERITY_ORDER.get(item.severity, 999), item.code))
