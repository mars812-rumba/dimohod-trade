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

from fastapi import APIRouter, File, Form, Header, HTTPException, Response, UploadFile, status
from pydantic import ValidationError

from app.core.config import settings
from app.modules.leads.customers import sync_customer_estimate, upsert_customer
from app.modules.leads.email import send_customer_confirmation_email, send_lead_email
from app.modules.leads.schemas import (
    LeadEstimate,
    ManagerLineCreate,
    ManagerLineUpdate,
    ManagerRevision,
)

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
    lead_id: str, manager_token: str | None, admin_token: str | None = None
) -> tuple[Path, dict[str, object]]:
    lead_dir, record = read_private_lead(lead_id)
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


@router.get("/{lead_id}/manager")
async def read_manager_lead(
    lead_id: str,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(lead_id, manager_token, admin_token)
    estimate = read_estimate_record(lead_dir, record)

    response.headers["Cache-Control"] = "no-store"
    return estimate


@router.post("/{lead_id}/manager/items", status_code=status.HTTP_201_CREATED)
async def create_manager_line(
    lead_id: str,
    payload: ManagerLineCreate,
    response: Response,
    manager_token: str | None = Header(default=None, alias="X-Lead-Manager-Token"),
    admin_token: str | None = Header(default=None, alias="X-BOM-Admin-Token"),
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(lead_id, manager_token, admin_token)
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
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(lead_id, manager_token, admin_token)
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
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(lead_id, manager_token, admin_token)
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
) -> dict[str, object]:
    lead_dir, record = authorized_manager_lead(lead_id, manager_token, admin_token)
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
        sent = await to_thread(
            send_lead_email,
            record,
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
