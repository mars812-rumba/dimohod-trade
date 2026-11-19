# ruff: noqa: B008
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.boms.dependencies import require_bom_admin
from app.modules.leads.router import create_lead
from app.modules.ready_kits.schemas import KitInquiry, KitUpdate
from app.modules.ready_kits.service import admin_kits, inquiry_estimate, public_kits, save_kit

router = APIRouter()
admin_router = APIRouter(dependencies=[Depends(require_bom_admin)])


@router.get("")
async def list_public_kits(response: Response, session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return {"items": await public_kits(session)}


@router.get("/{slug}")
async def read_public_kit(slug: str, response: Response, session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    kits = await public_kits(session)
    kit = next((k for k in kits if k["slug"] == slug), None)
    if kit is None:
        raise HTTPException(404, "Опубликованный комплект не найден")
    return {"kit": kit, "variants": kits}


@admin_router.get("")
async def list_admin_kits(response: Response, session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return {"items": await admin_kits(session)}


@router.post("/{slug}/inquiry", status_code=201)
async def submit_kit_inquiry(slug: str, payload: KitInquiry, response: Response,
                             session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    if payload.website.strip():
        return {"id": "", "status": "accepted", "email_status": "filtered"}
    kits = await public_kits(session)
    kit = next((item for item in kits if item["slug"] == slug), None)
    if kit is None:
        raise HTTPException(404, "Опубликованный комплект не найден")
    if payload.intent == "order" and kit["total_rub"] is None:
        raise HTTPException(409, "Цена комплекта уточняется. Запросите консультацию.")
    estimate = inquiry_estimate(kit)
    action = "Заказ комплекта" if payload.intent == "order" else "Консультация по комплекту"
    # One shared persistence/email/CRM workflow. This is already a request to a manager,
    # not the calculator's intermediate estimate-access step or callback conversion.
    result = await create_lead(
        response=response, name="", phone="", contact_method=payload.contact_method,
        contact=payload.contact, comment=f"{action}: {kit['name']}",
        source=f"ready-kit-{payload.intent}",
        configuration=f"{action}: {kit['name']}\n{estimate.source_url}",
        estimate_json=estimate.model_dump_json(),
        personal_data_consent=payload.personal_data_consent, consent_version=payload.consent_version,
        website="", intent=f"ready_kit_{payload.intent}", attachment=None,
    )
    return {key: result[key] for key in ("id", "status", "email_status")}


@admin_router.put("/{slug}")
async def update_admin_kit(slug: str, payload: KitUpdate, response: Response,
                           session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return await save_kit(session, slug, payload)
