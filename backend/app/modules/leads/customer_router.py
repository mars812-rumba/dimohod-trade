
import json
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings
from app.modules.boms.dependencies import require_bom_admin
from app.modules.leads.customers import list_customers
from app.modules.leads.notes import NotesConflictError, write_notes

router = APIRouter(dependencies=[Depends(require_bom_admin)])


class CustomerNotesUpdate(BaseModel):
    notes: str = Field(max_length=5000)
    expected_notes: str = Field(max_length=5000)
    model_config = ConfigDict(extra="forbid")


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
    if not any(item.get("lead_id") == lead_id for item in customer.get("estimates", [])):
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    try:
        notes = write_notes(root, lead_id, payload.notes, payload.expected_notes)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Заявка не найдена") from exc
    except NotesConflictError as exc:
        raise HTTPException(status_code=409, detail="Заметка уже изменена. Обновите страницу.") from exc
    response.headers["Cache-Control"] = "no-store"
    return {"notes": notes}


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
