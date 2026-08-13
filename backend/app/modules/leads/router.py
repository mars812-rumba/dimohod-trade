import json
import re
import uuid
from asyncio import to_thread
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.modules.leads.email import send_lead_email

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024
CURRENT_CONSENT_VERSION = "2026-08-11"
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_lead(
    name: str = Form(..., min_length=2, max_length=100),
    phone: str = Form(..., min_length=7, max_length=40),
    comment: str = Form("", max_length=2000),
    source: str = Form("homepage", max_length=80),
    configuration: str = Form("", max_length=12000),
    personal_data_consent: bool = Form(...),
    consent_version: str = Form(..., max_length=20),
    attachment: UploadFile | None = File(None),
) -> dict[str, str]:
    if not re.fullmatch(r"[+\d\s()\-]{7,40}", phone):
        raise HTTPException(status_code=422, detail="Проверьте номер телефона")
    if not personal_data_consent:
        raise HTTPException(status_code=422, detail="Необходимо согласие на обработку персональных данных")
    if consent_version != CURRENT_CONSENT_VERSION:
        raise HTTPException(status_code=422, detail="Обновите страницу и подтвердите актуальную версию согласия")

    lead_id = uuid.uuid4().hex
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
        "phone": phone.strip(),
        "comment": comment.strip(),
        "source": source,
        "configuration": configuration,
        "attachment": attachment_name,
        "personal_data_consent": True,
        "consent_version": consent_version,
        "consented_at": datetime.now(UTC).isoformat(),
    }
    record_path = lead_dir / "lead.json"
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

    email_status = "pending"
    try:
        sent = await to_thread(
            send_lead_email,
            record,
            lead_dir / attachment_name if attachment_name else None,
        )
        email_status = "sent" if sent else "not_configured"
    except Exception as error:  # The saved lead remains recoverable if SMTP is unavailable.
        email_status = "failed"
        record["email_error"] = type(error).__name__

    record["email_recipient"] = settings.lead_recipient_email
    record["email_status"] = email_status
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"id": lead_id, "status": "accepted", "email_status": email_status}
