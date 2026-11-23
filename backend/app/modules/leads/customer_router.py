
import json
import re
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings
from app.modules.boms.dependencies import require_bom_admin
from app.modules.leads.customers import (
    CustomerNameConflictError,
    list_customers,
    update_customer_name,
)
from app.modules.leads.notes import NotesConflictError, write_notes
from app.modules.leads.customer_deletion import (
    CustomerDeletionConflict, delete_customer, deletion_preview, restore_customer,
)

router = APIRouter(dependencies=[Depends(require_bom_admin)])


class CustomerNotesUpdate(BaseModel):
    notes: str = Field(max_length=5000)
    expected_notes: str = Field(max_length=5000)
    model_config = ConfigDict(extra="forbid")


class CustomerNameUpdate(BaseModel):
    name: str = Field(max_length=100)
    expected_name: str = Field(max_length=100)
    model_config = ConfigDict(extra="forbid")


class CustomerDeleteRequest(BaseModel):
    expected_version: str = Field(pattern=r"^[a-f0-9]{64}$")
    confirmation: Literal["delete_customer_with_estimates"]
    model_config = ConfigDict(extra="forbid")


def deletion_error(exc: Exception) -> HTTPException:
    if isinstance(exc, FileNotFoundError):
        return HTTPException(status_code=404, detail="Клиент или архив не найден")
    if isinstance(exc, CustomerDeletionConflict):
        return HTTPException(status_code=409, detail="Данные изменились или связаны с другой карточкой. Обновите список и подтвердите действие заново.")
    return HTTPException(status_code=503, detail="Не удалось завершить действие с архивом. Обновите список перед повторной попыткой.")


@router.get("/{customer_id}/deletion-preview")
def preview_customer_deletion(customer_id: str, response: Response) -> dict:
    try:
        result = deletion_preview(settings.media_storage_dir, customer_id)
    except (FileNotFoundError, CustomerDeletionConflict, OSError) as exc:
        raise deletion_error(exc) from exc
    response.headers["Cache-Control"] = "no-store"
    return result


@router.delete("/{customer_id}")
def remove_customer(customer_id: str, payload: CustomerDeleteRequest, response: Response) -> dict:
    try:
        result = delete_customer(settings.media_storage_dir, customer_id, payload.expected_version)
    except (FileNotFoundError, CustomerDeletionConflict, OSError) as exc:
        raise deletion_error(exc) from exc
    response.headers["Cache-Control"] = "no-store"
    return result


@router.post("/trash/{deletion_id}/restore")
def undo_customer_deletion(deletion_id: str, response: Response) -> dict:
    try:
        result = restore_customer(settings.media_storage_dir, deletion_id)
    except (FileNotFoundError, CustomerDeletionConflict, OSError) as exc:
        raise deletion_error(exc) from exc
    response.headers["Cache-Control"] = "no-store"
    return result


@router.patch("/{customer_id}/name")
def rename_customer(
    customer_id: str, payload: CustomerNameUpdate, response: Response,
) -> dict[str, str]:
    if not re.fullmatch(r"[a-f0-9]{32}", customer_id):
        raise HTTPException(status_code=404, detail="Клиент не найден")
    try:
        result = update_customer_name(
            settings.media_storage_dir, customer_id, payload.name, payload.expected_name,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Клиент не найден") from exc
    except CustomerNameConflictError as exc:
        raise HTTPException(
            status_code=409, detail="Имя уже изменено в другой вкладке. Обновите список клиентов.",
        ) from exc
    response.headers["Cache-Control"] = "no-store"
    return result


@router.patch("/{customer_id}/inquiries/{lead_id}/notes")
@router.patch("/{customer_id}/estimates/{lead_id}/notes")
async def update_customer_notes(
    customer_id: str, lead_id: str, payload: CustomerNotesUpdate, response: Response,
) -> dict[str, str]:
    if not all(re.fullmatch(r"[a-f0-9]{32}", value) for value in (customer_id, lead_id)):
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    root = Path(settings.media_storage_dir)
    customer_path = root / "customers" / f"{customer_id}.json"
    if not customer_path.is_file():
        raise HTTPException(status_code=404, detail="Клиент не найден")
    customer = json.loads(customer_path.read_text(encoding="utf-8"))
    if not any(item.get("lead_id") == lead_id for item in customer.get("estimates", []) + customer.get("inquiries", [])):
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    try:
        notes = write_notes(root, lead_id, payload.notes, payload.expected_notes)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Заявка не найдена") from exc
    except NotesConflictError as exc:
        raise HTTPException(status_code=409, detail="Заметка уже изменена. Обновите страницу.") from exc
    response.headers["Cache-Control"] = "no-store"
    return {"notes": notes}


@router.get("/{customer_id}/inquiries/{lead_id}/attachment", response_class=FileResponse)
def read_inquiry_attachment(customer_id: str, lead_id: str) -> FileResponse:
    if not all(re.fullmatch(r"[a-f0-9]{32}", value) for value in (customer_id, lead_id)):
        raise HTTPException(status_code=404, detail="Вложение не найдено")
    root = Path(settings.media_storage_dir)
    try:
        customer = json.loads((root / "customers" / f"{customer_id}.json").read_text(encoding="utf-8"))
        if not any(item.get("lead_id") == lead_id for item in customer.get("inquiries", [])):
            raise FileNotFoundError
        directory = root / "leads" / lead_id
        if directory.is_symlink() or (directory / "lead.json").is_symlink():
            raise FileNotFoundError
        record = json.loads((directory / "lead.json").read_text(encoding="utf-8"))
        filename = record.get("attachment")
        if (not isinstance(filename, str) or not re.fullmatch(r"attachment\.(pdf|png|jpe?g|webp)", filename)
                or record.get("customer_id") not in (None, customer_id)):
            raise FileNotFoundError
        path = directory / filename
        if path.is_symlink() or not path.is_file():
            raise FileNotFoundError
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=404, detail="Вложение не найдено") from exc
    return FileResponse(path, filename=filename, headers={"Cache-Control": "no-store"})


@router.get("")
async def read_customers(
    response: Response,
    q: str | None = Query(default=None, max_length=160),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> dict[str, object]:
    customers = list_customers(settings.media_storage_dir, q)
    response.headers["Cache-Control"] = "no-store"
    return {
        "items": customers[offset : offset + limit],
        "total": len(customers),
        "limit": limit,
        "offset": offset,
    }
