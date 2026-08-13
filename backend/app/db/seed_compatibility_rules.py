import asyncio
from typing import Any

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.modules.compatibility.models import CompatibilityRule

DEFAULT_RULES: list[dict[str, Any]] = [
    {
        "code": "diameter_required",
        "name": "Диаметр обязателен для подбора",
        "description": "Без внутреннего диаметра вариант нельзя безопасно использовать в автоподборе.",
        "rule_type": "variant",
        "applies_to_product_kind": None,
        "conditions": {"diameter_mm": {"is_null": True}},
        "result": {"autoselect_allowed": False},
        "severity": "error",
        "message": "Для варианта не указан внутренний диаметр. Нужна ручная проверка перед подбором.",
    },
    {
        "code": "selected_diameter_mismatch",
        "name": "Диаметр варианта должен совпадать с выбранным диаметром системы",
        "description": "В одном дымовом канале элементы должны сохранять рабочий внутренний диаметр.",
        "rule_type": "scenario",
        "applies_to_product_kind": None,
        "conditions": {
            "required_diameter_mm": {"is_not_null": True},
            "diameter_mm": {"neq_field": "required_diameter_mm"},
        },
        "result": {"autoselect_allowed": False},
        "severity": "error",
        "message": "Диаметр элемента не совпадает с выбранным диаметром дымохода. Нужен переходник или другой вариант.",
    },
    {
        "code": "outdoor_requires_sandwich",
        "name": "В холодной зоне нужен сэндвич",
        "description": "Улица, чердак и кровля требуют утепленного дымохода.",
        "rule_type": "scenario",
        "applies_to_product_kind": None,
        "conditions": {
            "zone": {"in": ["outdoor", "cold_zone", "attic", "roof"]},
            "contour": {"neq": "сэндвич"},
        },
        "result": {"required": {"contour": "сэндвич"}, "autoselect_allowed": False},
        "severity": "error",
        "message": "На улице, чердаке и в холодных зонах допускается только утепленный сэндвич-дымоход.",
    },
    {
        "code": "outdoor_sandwich_ok",
        "name": "Сэндвич подходит для холодной зоны",
        "description": "Утепленный контур допустим для наружных и холодных участков.",
        "rule_type": "scenario",
        "applies_to_product_kind": None,
        "conditions": {
            "zone": {"in": ["outdoor", "cold_zone", "attic", "roof"]},
            "contour": "сэндвич",
        },
        "result": {"autoselect_allowed": True},
        "severity": "info",
        "message": "Сэндвич-вариант подходит для наружных и холодных участков дымохода.",
    },
    {
        "code": "sandwich_insulation_required",
        "name": "Сэндвич должен иметь толщину утепления",
        "description": "Для сэндвич-варианта нужна структурированная толщина изоляции.",
        "rule_type": "variant",
        "applies_to_product_kind": None,
        "conditions": {"contour": "сэндвич", "insulation_mm": {"is_null": True}},
        "result": {"needs_review": True},
        "severity": "warning",
        "message": "Для сэндвич-варианта не указана толщина утепления. Проверь данные перед автоподбором.",
    },
    {
        "code": "sandwich_50mm_general_ok",
        "name": "Сэндвич 50 мм — базовый наружный контур",
        "description": "Текущее правило для первого загруженного типа сэндвича.",
        "rule_type": "variant",
        "applies_to_product_kind": None,
        "conditions": {"contour": "сэндвич", "insulation_mm": 50},
        "result": {"allowed_zones": ["outdoor", "attic", "roof", "cold_zone"]},
        "severity": "info",
        "message": "Сэндвич 50 мм подходит как базовый вариант для наружных и холодных участков.",
    },
    {
        "code": "fastener_uses_outer_diameter",
        "name": "Крепеж подбирается по наружному диаметру",
        "description": "Для сэндвича хомуты и крепеж должны учитывать наружный диаметр.",
        "rule_type": "variant",
        "applies_to_product_kind": "крепеж",
        "conditions": {},
        "result": {"match_by": "outer_diameter_mm"},
        "severity": "info",
        "message": "Крепеж подбирай по наружному диаметру элемента, особенно для сэндвич-систем.",
    },
    {
        "code": "tee_requires_revision_access",
        "name": "Тройник должен оставлять доступ к ревизии",
        "description": "Тройник в нижней части вертикального участка требует обслуживания.",
        "rule_type": "variant",
        "applies_to_product_kind": "тройник",
        "conditions": {},
        "result": {"requires_access": True},
        "severity": "info",
        "message": "При установке тройника оставь доступ к ревизии/прочистке для обслуживания дымохода.",
    },
    {
        "code": "terminal_only_top",
        "name": "Оголовок ставится сверху системы",
        "description": "Оголовки, зонты и дефлекторы — завершающие элементы дымохода.",
        "rule_type": "variant",
        "applies_to_product_kind": "оголовок",
        "conditions": {},
        "result": {"position": "top"},
        "severity": "info",
        "message": "Оголовок, зонт или дефлектор ставится только как верхний завершающий элемент системы.",
    },
    {
        "code": "gas_boiler_steel_review",
        "name": "Газовый котел требует проверки стали",
        "description": "Для газовых котлов с конденсатом важна кислотостойкость стали.",
        "rule_type": "scenario",
        "applies_to_product_kind": None,
        "conditions": {
            "source_type": "gas_boiler",
            "steel_grade": {"not_in": ["AISI 304", "AISI 316", "AISI 316L", "AISI 321"]},
        },
        "result": {"needs_review": True},
        "severity": "warning",
        "message": "Для газового котла проверь кислотостойкость стали. Не подставляй вариант без инженерной проверки.",
    },
    {
        "code": "aisi_430_inner_pipe_limited",
        "name": "AISI 430 имеет ограниченное применение во внутреннем дымовом канале",
        "description": (
            "Подтвержденный владельцем эконом-вариант без конденсата, который не следует "
            "выбирать автоматически для внутреннего дымового канала сэндвич-элементов."
        ),
        "rule_type": "variant",
        "applies_to_product_kind": None,
        "conditions": {"contour": "сэндвич", "steel_grade": "AISI 430"},
        "result": {"autoselect_allowed": False, "needs_review": True},
        "severity": "warning",
        "message": (
            "AISI 430 — эконом-вариант для внутреннего канала без конденсата. "
            "Для основного подбора рекомендуются другие марки стали; вариант требует "
            "подтверждения специалистом."
        ),
    },
]


async def seed_compatibility_rules() -> dict[str, int]:
    stats = {"created": 0, "updated": 0}

    async with AsyncSessionLocal() as session:
        for item in DEFAULT_RULES:
            rule = await session.scalar(select(CompatibilityRule).where(CompatibilityRule.code == item["code"]))
            if rule is None:
                session.add(CompatibilityRule(**item))
                stats["created"] += 1
                continue

            for key, value in item.items():
                setattr(rule, key, value)
            stats["updated"] += 1

        await session.commit()

    return stats


async def main() -> None:
    stats = await seed_compatibility_rules()
    for key, value in stats.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
