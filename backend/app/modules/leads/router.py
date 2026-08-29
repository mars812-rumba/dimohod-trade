import json
import re
import secrets
import shutil
import uuid
from asyncio import to_thread
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.modules.admin.auth import ADMIN_SESSION_COOKIE, valid_admin_session
from app.modules.leads.customers import sync_customer_estimate, upsert_customer
from app.modules.leads.email import send_customer_confirmation_email, send_lead_email
from app.modules.leads.schemas import (
    LeadEstimate,
    ManagerCatalogMetadataRequest,
    ManagerCatalogSelection,
    ManagerLineCreate,
    ManagerLineUpdate,
    ManagerRevision,
)
from app.modules.products.models import SKU, Product
from app.modules.products.router import primary_product_image, primary_visual_sku_image

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024
CURRENT_CONSENT_VERSION = "2026-08-11"
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}
CONTACT_METHODS = {"phone", "whatsapp", "telegram", "email"}
LEAD_ID_PATTERN = re.compile(r"^[a-f0-9]{32}$")


def manager_access_error() -> HTTPException:
    return HTTPException(status_code=404, detail="Заявка не найдена или ссылка недействительна")


def read_private_lead(lead_id: str) -> tuple[Path, dict[str, object]]:
    if not LEAD_ID_PATTERN.fullmatch(lead_id):
        raise manager_access_error()
    lead_dir = Path(settings.media_storage_dir) / "leads" / lead_id
    record_path = lead_dir / "lead.json"
    if not record_path.is_file():
        raise manager_access_error()
    try:
        record = json.loads(record_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise manager_access_error() from error
    if not isinstance(record, dict):
        raise manager_access_error()
    return lead_dir, record


def authorized_manager_lead(
    lead_id: str,
    manager_token: str | None,
    admin_token: str | None = None,
    admin_session: str | None = None,
) -> tuple[Path, dict[str, object]]:
    lead_dir, record = read_private_lead(lead_id)
    if valid_admin_session(admin_session):
        return lead_dir, record
    if (
        settings.bom_admin_token
        and admin_token
        and secrets.compare_digest(settings.bom_admin_token, admin_token)
    ):
        return lead_dir, record
    manager_access = record.get("manager_access")
    expected_hash = (
        manager_access.get("token_sha256") if isinstance(manager_access, dict) else None
    )
    supplied_hash = sha256((manager_token or "").encode("utf-8")).hexdigest()
    if not isinstance(expected_hash, str) or not secrets.compare_digest(expected_hash, supplied_hash):
        raise manager_access_error()
    return lead_dir, record


def read_estimate_record(lead_dir: Path, record: dict[str, object]) -> dict[str, object]:
    estimate_path = lead_dir / "estimate.json"
    if record.get("estimate") != "estimate.json" or not estimate_path.is_file():
        raise manager_access_error()
    try:
        estimate = json.loads(estimate_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise manager_access_error() from error
    if not isinstance(estimate, dict) or not isinstance(estimate.get("estimate"), dict):
        raise manager_access_error()
    changed = False
    if "revision" not in estimate:
        estimate["revision"] = 1
        changed = True
    if "removed_lines" not in estimate:
        estimate["removed_lines"] = []
        changed = True
    lines = estimate["estimate"].get("lines")
    if not isinstance(lines, list):
        raise manager_access_error()
    for line in lines:
        if isinstance(line, dict) and "id" not in line:
            line["id"] = uuid.uuid4().hex
            changed = True
    if changed:
        write_estimate_record(lead_dir, estimate)
    return estimate


def recalculate_estimate(estimate_record: dict[str, object]) -> None:
    estimate = estimate_record["estimate"]
    if not isinstance(estimate, dict):
        raise manager_access_error()
    lines = estimate.get("lines")
    if not isinstance(lines, list):
        raise manager_access_error()
    known_total = 0.0
    priced = 0
    units = 0
    for line in lines:
        if not isinstance(line, dict):
            continue
        quantity = int(line.get("quantity", 0))
        unit_price = line.get("unit_price_rub")
        line["line_total_rub"] = None if unit_price is None else float(unit_price) * quantity
        if line["line_total_rub"] is not None:
            known_total += line["line_total_rub"]
            priced += 1
        units += quantity
    estimate["known_subtotal_rub"] = known_total
    estimate["priced_line_count"] = priced
    estimate["unpriced_line_count"] = len(lines) - priced
    estimate["total_units"] = units


def write_estimate_record(lead_dir: Path, estimate: dict[str, object]) -> None:
    estimate_path = lead_dir / "estimate.json"
    original_path = lead_dir / "original.json"
    if not original_path.exists():
        shutil.copyfile(estimate_path, original_path)
    temporary_path = lead_dir / "estimate.json.tmp"
    temporary_path.write_text(
        json.dumps(estimate, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    temporary_path.replace(estimate_path)


def save_manager_estimate(
    lead_dir: Path, lead_record: dict[str, object], estimate: dict[str, object]
) -> None:
    write_estimate_record(lead_dir, estimate)
    sync_customer_estimate(settings.media_storage_dir, lead_record, estimate)


def check_revision(estimate: dict[str, object], supplied: int) -> None:
    current = estimate.get("revision", 1)
    if current != supplied:
        raise HTTPException(
            status_code=409,
            detail="Смета уже изменена в другой вкладке. Обновите страницу.",
        )


def find_line(lines: list[object], item_id: str) -> dict[str, object]:
    line = next(
        (candidate for candidate in lines if isinstance(candidate, dict) and candidate.get("id") == item_id),
        None,
    )
    if line is None:
        raise HTTPException(status_code=404, detail="Позиция BOM не найдена")
    return line


async def catalog_skus(session: AsyncSession, sku_ids: list[uuid.UUID]) -> dict[str, SKU]:
    if not sku_ids:
        return {}
    result = await session.execute(
        select(SKU)
        .join(SKU.product)
        .options(
            selectinload(SKU.product).selectinload(Product.category),
            selectinload(SKU.product).selectinload(Product.skus),
        )
        .where(SKU.id.in_(sku_ids), SKU.is_active.is_(True), Product.is_active.is_(True))
    )
    return {str(sku.id): sku for sku in result.scalars().unique()}


def catalog_sku_metadata(sku: SKU) -> dict[str, object]:
    product = sku.product
    image = primary_visual_sku_image(sku, product.skus) or primary_product_image(
        product.extra_attributes, sku
    )
    return {
        "sku_id": str(sku.id),
        "product_id": str(product.id),
        "product_slug": product.slug,
        "product_name": product.name,
        "category_id": str(product.category.id),
        "category_slug": product.category.slug,
        "category_name": product.category.name,
        "article": sku.article,
        "sku_name": sku.name,
        "steel_grade": sku.steel_grade,
        "wall_thickness_mm": float(sku.wall_thickness_mm)
        if sku.wall_thickness_mm is not None
        else None,
        "diameter_mm": sku.diameter_mm,
        "outer_diameter_mm": sku.outer_diameter_mm,
        "length_mm": sku.length_mm,
        "unit_price_rub": float(sku.price_rub) if sku.price_rub is not None else None,
        "image": image.model_dump(mode="json") if image is not None else None,
    }


def catalog_line(sku: SKU, *, quantity: int, note: str, line_id: str | None = None) -> dict[str, object]:
    metadata = catalog_sku_metadata(sku)
    characteristics = []
    if sku.diameter_mm is not None:
        diameter = str(sku.diameter_mm)
        if sku.outer_diameter_mm is not None:
            diameter += f"/{sku.outer_diameter_mm}"
        characteristics.append(f"Ø {diameter} мм")
    if sku.steel_grade:
        characteristics.append(sku.steel_grade)
    if sku.wall_thickness_mm is not None:
        characteristics.append(f"{sku.wall_thickness_mm.normalize()} мм")
    if sku.length_mm is not None:
        characteristics.append(f"L {sku.length_mm} мм")
    return {
        "id": line_id or uuid.uuid4().hex,
        "key": f"catalog-{sku.id}",
        "sku_id": str(sku.id),
        "label": sku.product.name,
        "article": sku.article,
        "sku_name": sku.name,
        "quantity": quantity,
        "unit_price_rub": metadata["unit_price_rub"],
        "line_total_rub": None,
        "characteristics": characteristics,
        "note": note,
        "match_status": "exact",
        **{key: value for key, value in metadata.items() if key not in {"sku_id", "article", "sku_name", "unit_price_rub"}},
    }


@router.get("/{lead_id}/manager")
async def read_manager_lead(
    lead_id: str,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(
        lead_id, manager_token, admin_token, admin_session
    )
    estimate = read_estimate_record(lead_dir, record)

    response.headers["Cache-Control"] = "no-store"
    return estimate


@router.post("/{lead_id}/manager/catalog/metadata")
async def read_manager_catalog_metadata(
    lead_id: str,
    payload: ManagerCatalogMetadataRequest,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
    session: AsyncSession = Depends(get_db),  # noqa: B008 - FastAPI dependency declaration.
) -> dict[str, object]:
    authorized_manager_lead(lead_id, manager_token, admin_token, admin_session)
    unique_ids = list(dict.fromkeys(payload.sku_ids))
    found = await catalog_skus(session, unique_ids)
    response.headers["Cache-Control"] = "no-store"
    return {"items": [catalog_sku_metadata(found[str(sku_id)]) for sku_id in unique_ids if str(sku_id) in found]}


@router.post(
    "/{lead_id}/manager/catalog/items",
    status_code=status.HTTP_201_CREATED,
)
async def create_manager_catalog_line(
    lead_id: str,
    payload: ManagerCatalogSelection,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
    session: AsyncSession = Depends(get_db),  # noqa: B008 - FastAPI dependency declaration.
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(
        lead_id, manager_token, admin_token, admin_session
    )
    estimate = read_estimate_record(lead_dir, record)
    check_revision(estimate, payload.revision)
    sku = (await catalog_skus(session, [payload.sku_id])).get(str(payload.sku_id))
    if sku is None:
        raise HTTPException(status_code=404, detail="Активный SKU не найден в каталоге")
    estimate["estimate"]["lines"].append(
        catalog_line(sku, quantity=payload.quantity, note=payload.note)
    )
    estimate["revision"] = payload.revision + 1
    recalculate_estimate(estimate)
    save_manager_estimate(lead_dir, record, estimate)
    response.headers["Cache-Control"] = "no-store"
    return estimate


@router.patch("/{lead_id}/manager/catalog/items/{item_id}")
async def replace_manager_catalog_line(
    lead_id: str,
    item_id: str,
    payload: ManagerCatalogSelection,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
    session: AsyncSession = Depends(get_db),  # noqa: B008 - FastAPI dependency declaration.
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(
        lead_id, manager_token, admin_token, admin_session
    )
    estimate = read_estimate_record(lead_dir, record)
    check_revision(estimate, payload.revision)
    lines = estimate["estimate"]["lines"]
    current_line = find_line(lines, item_id)
    current_sku_id = current_line.get("sku_id")
    lookup_ids = [payload.sku_id]
    try:
        if current_sku_id:
            lookup_ids.append(uuid.UUID(str(current_sku_id)))
    except ValueError as error:
        raise HTTPException(status_code=409, detail="Исходный SKU отсутствует в каталоге") from error
    found = await catalog_skus(session, lookup_ids)
    replacement = found.get(str(payload.sku_id))
    current = found.get(str(current_sku_id)) if current_sku_id else None
    if replacement is None:
        raise HTTPException(status_code=404, detail="Активный SKU не найден в каталоге")
    if current is None:
        raise HTTPException(status_code=409, detail="Ручную позицию нельзя заменить как каталожную")
    if replacement.product.category_id != current.product.category_id:
        raise HTTPException(status_code=422, detail="Замену можно выбрать только из той же категории")
    index = lines.index(current_line)
    lines[index] = catalog_line(
        replacement,
        quantity=payload.quantity,
        note=payload.note,
        line_id=item_id,
    )
    estimate["revision"] = payload.revision + 1
    recalculate_estimate(estimate)
    save_manager_estimate(lead_dir, record, estimate)
    response.headers["Cache-Control"] = "no-store"
    return estimate


@router.post("/{lead_id}/manager/items", status_code=status.HTTP_201_CREATED)
async def create_manager_line(
    lead_id: str,
    payload: ManagerLineCreate,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(
        lead_id, manager_token, admin_token, admin_session
    )
    estimate = read_estimate_record(lead_dir, record)
    check_revision(estimate, payload.revision)
    estimate_body = estimate["estimate"]
    lines = estimate_body["lines"]
    line = payload.model_dump(mode="json", exclude={"revision"})
    line.update(
        id=uuid.uuid4().hex,
        key=f"manager-{uuid.uuid4().hex}",
        line_total_rub=None,
    )
    lines.append(line)
    estimate["revision"] = payload.revision + 1
    recalculate_estimate(estimate)
    save_manager_estimate(lead_dir, record, estimate)
    response.headers["Cache-Control"] = "no-store"
    return estimate


@router.patch("/{lead_id}/manager/items/{item_id}")
async def update_manager_line(
    lead_id: str,
    item_id: str,
    payload: ManagerLineUpdate,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(
        lead_id, manager_token, admin_token, admin_session
    )
    estimate = read_estimate_record(lead_dir, record)
    check_revision(estimate, payload.revision)
    lines = estimate["estimate"]["lines"]
    line = find_line(lines, item_id)
    for field, value in payload.model_dump(
        mode="json", exclude={"revision"}, exclude_unset=True
    ).items():
        line[field] = value
    estimate["revision"] = payload.revision + 1
    recalculate_estimate(estimate)
    save_manager_estimate(lead_dir, record, estimate)
    response.headers["Cache-Control"] = "no-store"
    return estimate


@router.delete("/{lead_id}/manager/items/{item_id}")
async def delete_manager_line(
    lead_id: str,
    payload: ManagerRevision,
    item_id: str,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(
        lead_id, manager_token, admin_token, admin_session
    )
    estimate = read_estimate_record(lead_dir, record)
    check_revision(estimate, payload.revision)
    lines = estimate["estimate"]["lines"]
    line = find_line(lines, item_id)
    lines.remove(line)
    line["removed_at"] = datetime.now(UTC).isoformat()
    estimate["removed_lines"].append(line)
    estimate["revision"] = payload.revision + 1
    recalculate_estimate(estimate)
    save_manager_estimate(lead_dir, record, estimate)
    response.headers["Cache-Control"] = "no-store"
    return estimate


@router.post("/{lead_id}/manager/items/{item_id}/restore")
async def restore_manager_line(
    lead_id: str,
    item_id: str,
    payload: ManagerRevision,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(
        lead_id, manager_token, admin_token, admin_session
    )
    estimate = read_estimate_record(lead_dir, record)
    check_revision(estimate, payload.revision)
    removed = estimate["removed_lines"]
    line = find_line(removed, item_id)
    removed.remove(line)
    line.pop("removed_at", None)
    estimate["estimate"]["lines"].append(line)
    estimate["revision"] = payload.revision + 1
    recalculate_estimate(estimate)
    save_manager_estimate(lead_dir, record, estimate)
    response.headers["Cache-Control"] = "no-store"
    return estimate


def validate_contact(method: str, contact: str) -> str:
    normalized = contact.strip()
    if method in {"phone", "whatsapp"}:
        if not re.fullmatch(r"[+\d\s()\-]{7,40}", normalized):
            raise HTTPException(status_code=422, detail="Проверьте номер телефона")
    elif method == "telegram":
        if not re.fullmatch(r"@?[A-Za-z0-9_]{5,32}", normalized):
            raise HTTPException(status_code=422, detail="Укажите Telegram в формате @username")
    elif method == "email":
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized) or len(normalized) > 160:
            raise HTTPException(status_code=422, detail="Проверьте адрес электронной почты")
        normalized = normalized.lower()
    return normalized


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_lead(
    name: str = Form(..., min_length=2, max_length=100),
    phone: str = Form("", max_length=40),
    contact_method: str = Form("phone", max_length=20),
    contact: str = Form("", max_length=160),
    comment: str = Form("", max_length=2000),
    source: str = Form("homepage", max_length=80),
    configuration: str = Form("", max_length=12000),
    estimate_json: str = Form("", max_length=120000),
    personal_data_consent: bool = Form(...),
    consent_version: str = Form(..., max_length=20),
    website: str = Form("", max_length=200),
    attachment: UploadFile | None = File(None),  # noqa: B008 - FastAPI dependency declaration.
) -> dict[str, str]:
    if website.strip():
        return {"id": "", "status": "accepted", "email_status": "filtered"}
    normalized_method = contact_method.strip().lower()
    if normalized_method not in CONTACT_METHODS:
        raise HTTPException(status_code=422, detail="Выберите способ связи")
    normalized_contact = validate_contact(normalized_method, contact or phone)
    if not personal_data_consent:
        raise HTTPException(status_code=422, detail="Необходимо согласие на обработку персональных данных")
    if consent_version != CURRENT_CONSENT_VERSION:
        raise HTTPException(status_code=422, detail="Обновите страницу и подтвердите актуальную версию согласия")

    estimate: LeadEstimate | None = None
    if estimate_json:
        try:
            estimate = LeadEstimate.model_validate_json(estimate_json)
        except ValidationError as error:
            raise HTTPException(status_code=422, detail="Некорректная структура BOM") from error

    lead_id = uuid.uuid4().hex
    manager_token = secrets.token_urlsafe(32) if estimate else None
    manager_url = (
        f"{settings.lead_manager_base_url.rstrip('/')}/{lead_id}"
        f"#token={quote(manager_token)}"
        if manager_token
        else None
    )

    lead_dir = Path(settings.media_storage_dir) / "leads" / lead_id
    lead_dir.mkdir(parents=True, exist_ok=False)
    attachment_name = None

    if attachment and attachment.filename:
        if attachment.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=415, detail="Поддерживаются PDF, JPG, PNG и WebP")
        content = await attachment.read(MAX_FILE_SIZE + 1)
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="Файл должен быть не больше 10 МБ")
        suffix = Path(attachment.filename).suffix.lower()
        attachment_name = f"attachment{suffix}"
        (lead_dir / attachment_name).write_bytes(content)

    record = {
        "id": lead_id,
        "created_at": datetime.now(UTC).isoformat(),
        "name": name.strip(),
        "phone": normalized_contact if normalized_method in {"phone", "whatsapp"} else "",
        "contact_method": normalized_method,
        "contact": normalized_contact,
        "comment": comment.strip(),
        "source": source,
        "configuration": configuration,
        "estimate": "estimate.json" if estimate else None,
        "manager_access": {
            "token_sha256": sha256(manager_token.encode("utf-8")).hexdigest(),
            "created_at": datetime.now(UTC).isoformat(),
        }
        if manager_token
        else None,
        "attachment": attachment_name,
        "personal_data_consent": True,
        "consent_version": consent_version,
        "consented_at": datetime.now(UTC).isoformat(),
    }
    record_path = lead_dir / "lead.json"
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    if estimate:
        estimate_record = {
            "schema_version": 1,
            "lead_id": lead_id,
            "status": "submitted",
            "revision": 1,
            "removed_lines": [],
            "customer": {
                "name": record["name"],
                "contact_method": record["contact_method"],
                "contact": record["contact"],
            },
            "estimate": estimate.model_dump(mode="json"),
        }
        for line in estimate_record["estimate"]["lines"]:
            line["id"] = uuid.uuid4().hex
        customer_id = upsert_customer(
            settings.media_storage_dir,
            lead_id=lead_id,
            name=record["name"],
            contact_method=record["contact_method"],
            contact=record["contact"],
            created_at=record["created_at"],
            envelope=estimate_record,
        )
        record["customer_id"] = customer_id
        estimate_record["customer"]["id"] = customer_id
        (lead_dir / "estimate.json").write_text(
            json.dumps(estimate_record, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

    email_status = "pending"
    try:
        email_record = (
            {**record, "_estimate": estimate.model_dump(mode="json")}
            if estimate
            else record
        )
        sent = await to_thread(
            send_lead_email,
            email_record,
            lead_dir / attachment_name if attachment_name else None,
            manager_url,
        )
        email_status = "sent" if sent else "not_configured"
    except Exception as error:  # noqa: BLE001 - saved lead survives any SMTP failure.
        email_status = "failed"
        record["email_error"] = type(error).__name__

    customer_email_status = "not_requested"
    if normalized_method == "email" and email_status == "sent":
        try:
            confirmed = await to_thread(
                send_customer_confirmation_email,
                record,
                lead_dir / attachment_name if attachment_name else None,
            )
            customer_email_status = "sent" if confirmed else "not_configured"
        except Exception as error:  # noqa: BLE001 - saved lead survives any SMTP failure.
            customer_email_status = "failed"
            record["customer_email_error"] = type(error).__name__

    record["email_recipient"] = settings.lead_recipient_email
    record["email_status"] = email_status
    record["customer_email_status"] = customer_email_status
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "id": lead_id,
        "status": "accepted",
        "email_status": email_status,
        "customer_email_status": customer_email_status,
    }
