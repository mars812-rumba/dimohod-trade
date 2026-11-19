import fcntl
import json
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.modules.products.models import SKU
from app.modules.ready_kits.schemas import KitDefinition, KitLine, KitUpdate

ROUTES = {"roof": "через перекрытие", "wall": "через стену"}
LIMITATIONS = [
    "Иллюстрация показывает маршрут, а не точное количество и исполнение изделий. Состав указан в спецификации.",
    "До заказа нужно сверить подключение к отопителю, размеры проходов и условия конкретного объекта со специалистом.",
    "Монтаж и доставка не входят в стоимость изделий. Их условия согласовываются отдельно.",
    "Обозначение высоты комплекта не заменяет замеры объекта. Длины отдельных труб приведены в спецификации.",
]


def kit_name(kit: KitDefinition) -> str:
    return f"Комплект дымохода {ROUTES[kit.route]}, {kit.height_m} м, Ø{kit.diameter_mm} мм"


def definitions() -> dict[str, KitDefinition]:
    """Seed contains only sanitized owner-approved snapshots, never live CRM records."""
    seeds = json.loads(Path(__file__).with_name("approved.json").read_text(encoding="utf-8"))
    result = {}
    for route, heights in (("roof", (4, 6)), ("wall", (3, 6))):
        for height in heights:
            for diameter in (115, 120, 150):
                scheme = f"{route}-{height}"
                slug = f"cherez-{'perekrytie' if route == 'roof' else 'stenu'}-{height}m-d{diameter}"
                seed = seeds.get(scheme) if diameter == 115 else None
                kit = KitDefinition(
                    slug=slug, route=route, height_m=height, diameter_mm=diameter,
                    status="approved" if seed else "draft", published=bool(seed),
                    lines=[KitLine.model_validate(line) for line in seed["lines"]] if seed else [],
                    description=(
                        f"Готовый комплект для маршрута {ROUTES[route]}. "
                        "Ниже приведены конкретные исполнения изделий и их количества. "
                        "Стоимость рассчитывается по текущим ценам каталога; "
                        "параметры подключения и проходов проверяются для вашего объекта."
                    ),
                    limitations=LIMITATIONS,
                    source_revision=7 if seed else None,
                    source_sha256=seed["sha256"] if seed else None,
                    approved_at="2026-11-19" if seed else None,
                )
                path = Path(settings.media_storage_dir) / "ready-kits" / f"{slug}.json"
                if path.exists():
                    try:
                        stored = KitDefinition.model_validate_json(path.read_text(encoding="utf-8"))
                        if (stored.slug, stored.route, stored.height_m, stored.diameter_mm) != (
                            kit.slug, kit.route, kit.height_m, kit.diameter_mm
                        ):
                            raise ValueError("Variant identity changed")
                        kit = stored
                    except (ValueError, OSError, ValidationError) as exc:
                        # Never fall back to a published seed after an unreadable unpublish/edit.
                        raise HTTPException(503, "Не удалось прочитать спецификацию комплекта") from exc
                result[slug] = kit
    return result


def get_definition(slug: str) -> KitDefinition:
    kit = definitions().get(slug)
    if kit is None:
        raise HTTPException(404, "Комплект не найден")
    return kit


async def load_skus(session: AsyncSession, kits: list[KitDefinition]) -> dict[str, SKU]:
    ids = {line.sku_id for kit in kits for line in kit.lines}
    if not ids:
        return {}
    rows = await session.execute(
        select(SKU).where(SKU.id.in_(ids)).options(joinedload(SKU.product))
    )
    return {str(sku.id): sku for sku in rows.scalars().unique()}


def problems(kit: KitDefinition, skus: dict[str, SKU]) -> list[str]:
    errors = []
    if not kit.lines:
        errors.append("Спецификация не заполнена")
    for line in kit.lines:
        sku = skus.get(str(line.sku_id))
        if sku is None or not sku.is_active or not sku.product.is_active:
            errors.append(f"Нет активного SKU: {line.sku_id}")
        elif sku.article.startswith("RECOVERY-TEMP-"):
            errors.append(f"Тестовый SKU запрещён: {sku.article}")
        elif sku.product.product_kind in {"труба", "отвод", "шибер", "тройник", "заглушка", "оголовок"} and sku.diameter_mm != kit.diameter_mm:
            errors.append(f"Диаметр SKU не совпадает с комплектом: {sku.article}")
    return errors


def characteristics(sku: SKU) -> list[str]:
    result = []
    if sku.diameter_mm is not None:
        diameter = str(sku.diameter_mm)
        if sku.outer_diameter_mm is not None:
            diameter += f"/{sku.outer_diameter_mm}"
        result.append(f"Ø {diameter} мм")
    for label, value, unit in (
        ("Длина", sku.length_mm, "мм"), ("Сталь", sku.steel_grade, ""),
        ("Толщина", sku.wall_thickness_mm, "мм"), ("Изоляция", sku.insulation_mm, "мм"),
    ):
        if value is not None:
            result.append(f"{label}: {value} {unit}".strip())
    attrs = sku.attributes or {}
    for key, label in (("base_size", "Основание"), ("diameter_range", "Диапазон"),
                       ("execution", "Исполнение"), ("outer_steel_grade", "Наружная сталь"),
                       ("outer_wall_thickness_mm", "Толщина наружной трубы, мм")):
        if isinstance(attrs.get(key), (str, int, float)):
            result.append(f"{label}: {attrs[key]}")
    return result


def public_view(kit: KitDefinition, skus: dict[str, SKU]) -> dict:
    lines = []
    subtotal = Decimal(0)
    unpriced = 0
    for line in kit.lines:
        sku = skus.get(str(line.sku_id))
        if sku is None:
            unpriced += 1
            continue
        price = sku.price_rub
        if price is not None:
            price = Decimal(str(price))
            if not price.is_finite() or price <= 0:
                price = None
        amount = price * line.quantity if price is not None else None
        if amount is None:
            unpriced += 1
        else:
            subtotal += amount
        lines.append({
            "sku_id": str(sku.id), "label": line.label or sku.product.name,
            "sku_name": sku.name, "article": sku.article, "quantity": line.quantity,
            "product_slug": sku.product.slug, "diameter_mm": sku.diameter_mm,
            "outer_diameter_mm": sku.outer_diameter_mm, "length_mm": sku.length_mm,
            "characteristics": characteristics(sku),
            "unit_price_rub": str(price) if price is not None else None,
            "line_total_rub": str(amount) if amount is not None else None,
        })
    return {
        "slug": kit.slug, "name": kit_name(kit), "route": kit.route,
        "height_m": kit.height_m, "diameter_mm": kit.diameter_mm,
        "image_path": f"/images/ready-kits/{kit.route}-title.webp",
        "description": kit.description, "limitations": kit.limitations,
        "lines": lines, "known_subtotal_rub": str(subtotal),
        "total_rub": None if unpriced or not kit.lines else str(subtotal),
        "unpriced_count": unpriced,
    }


async def public_kits(session: AsyncSession) -> list[dict]:
    kits = [k for k in definitions().values() if k.status == "approved" and k.published]
    skus = await load_skus(session, kits)
    return [public_view(k, skus) for k in kits if not problems(k, skus)]


async def admin_kits(session: AsyncSession) -> list[dict]:
    kits = list(definitions().values())
    skus = await load_skus(session, kits)
    return [{"definition": k.model_dump(mode="json"), "name": kit_name(k),
             "problems": problems(k, skus), "preview": public_view(k, skus)} for k in kits]


async def save_kit(session: AsyncSession, slug: str, payload: KitUpdate) -> dict:
    # Validate immutable identity before constructing any filesystem path.
    current = get_definition(slug)
    updated = current.model_copy(update={
        "lines": payload.lines, "description": payload.description,
        "limitations": payload.limitations, "status": "approved" if payload.approved else "draft",
        "published": payload.published, "revision": payload.revision + 1,
        "approved_at": datetime.now(UTC).isoformat() if payload.approved else None,
        "source_revision": current.source_revision if payload.lines == current.lines else None,
        "source_sha256": current.source_sha256 if payload.lines == current.lines else None,
    })
    if payload.published and not payload.approved:
        raise HTTPException(422, "Для публикации требуется согласование состава")
    skus = await load_skus(session, [updated])
    errors = problems(updated, skus)
    if payload.approved and errors:
        raise HTTPException(422, detail=errors)
    directory = Path(settings.media_storage_dir) / "ready-kits"
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / f".{slug}.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        current = get_definition(slug)
        if current.revision != payload.revision:
            raise HTTPException(409, "Комплект изменён в другой вкладке. Обновите страницу.")
        history = directory / "history" / slug
        history.mkdir(parents=True, exist_ok=True)
        (history / f"revision-{current.revision}.json").write_text(
            current.model_dump_json(indent=2), encoding="utf-8"
        )
        temporary = directory / f".{slug}.json.tmp"
        temporary.write_text(updated.model_dump_json(indent=2), encoding="utf-8")
        temporary.replace(directory / f"{slug}.json")
    return {"definition": updated.model_dump(mode="json"), "name": kit_name(updated),
            "problems": errors, "preview": public_view(updated, skus)}
