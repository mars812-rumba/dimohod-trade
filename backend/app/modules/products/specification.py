"""Presentation-only SKU facts shared by kit specifications and estimate PDFs."""
from decimal import Decimal, InvalidOperation

from app.db.price_section_attributes import outer_pipe_attributes
from app.modules.products.models import SKU
from app.modules.products.service import contour_group


def metric(value: object, unit: str = "мм") -> str | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = Decimal(str(value).replace(",", "."))
        if not number.is_finite() or number <= 0:
            return None
        return f"{format(number.normalize(), 'f').replace('.', ',')} {unit}".strip()
    except (InvalidOperation, ValueError, TypeError):
        return None


def specification_groups(sku: SKU) -> list[dict]:
    """Never derive steel, insulation, dimensions or material from a name/photo."""
    attrs = sku.attributes or {}
    outer = outer_pipe_attributes(attrs)
    multilayer = contour_group(getattr(sku, "contour", None)) == "sandwich" or any(
        outer.get(key) is not None for key in ("outer_material", "outer_steel_grade", "outer_wall_thickness_mm")
    )
    groups = []

    def group(kind, title, values):
        fields = [{"key": key, "label": label, "value": str(value).strip()}
                  for key, label, value in values
                  if value is not None and not isinstance(value, bool)
                  and isinstance(value, (str, int, float)) and str(value).strip()]
        if fields:
            groups.append({"kind": kind, "title": title, "fields": fields})

    inner = [
        ("diameter", "Диаметр", metric(sku.diameter_mm)),
        ("material", "Материал", getattr(sku, "material", None)),
        ("steel", "Сталь", sku.steel_grade),
        ("thickness", "Толщина", metric(sku.wall_thickness_mm)),
    ]
    general = [] if multilayer else inner
    general += [("length", "Длина", metric(sku.length_mm)),
                ("angle", "Угол", metric(getattr(sku, "angle_deg", None), "°"))]
    general += [(key, label, attrs.get(key)) for key, label in (
        ("base_size", "Основание"), ("diameter_range", "Диапазон"), ("execution", "Исполнение"),
    )]
    group("general", "Параметры", general)
    if multilayer:
        group("inner", "Внутренняя труба", inner)
        group("insulation", "Изоляция", [("insulation", "Толщина", metric(sku.insulation_mm))])
        group("outer", "Наружная оболочка", [
            ("diameter", "Диаметр", metric(sku.outer_diameter_mm)),
            ("material", "Материал", outer.get("outer_material")),
            ("steel", "Сталь", outer.get("outer_steel_grade")),
            ("thickness", "Толщина", metric(outer.get("outer_wall_thickness_mm"))),
        ])
    return groups
