import mimetypes
import re
import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid, parseaddr
from html import escape
from pathlib import Path
from typing import Any

from app.core.config import settings

CONTACT_METHOD_LABELS = {
    "phone": "Телефон",
    "whatsapp": "WhatsApp",
    "telegram": "Telegram",
    "email": "Email",
}

MATERIAL_VALUE_PATTERN = re.compile(r"^\d+(?:[.,]\d+)?(?:\s*мм)?$", re.IGNORECASE)
STEEL_GRADE_PATTERN = re.compile(r"\bAISI\s*\d+\b", re.IGNORECASE)


def format_rub(value: object) -> str:
    if not isinstance(value, (int, float)):
        return "По запросу"
    return f"{value:,.0f}".replace(",", "\u00a0") + " ₽"


def material_values(value: str) -> tuple[str, str]:
    parts = [part.strip() for part in value.split("·") if part.strip()]
    grade = next(
        (
            match.group(0).upper().replace("AISI", "AISI ").replace("  ", " ")
            for part in parts
            if (match := STEEL_GRADE_PATTERN.search(part))
        ),
        None,
    )
    thickness = next(
        (part for part in reversed(parts) if MATERIAL_VALUE_PATTERN.fullmatch(part)),
        None,
    )
    material = next(
        (
            part
            for part in parts
            if not STEEL_GRADE_PATTERN.search(part) and not MATERIAL_VALUE_PATTERN.fullmatch(part)
        ),
        None,
    )
    normalized_thickness = (
        re.sub(r"\s*мм$", "", thickness, flags=re.IGNORECASE).replace(".", ",")
        if thickness
        else "—"
    )
    return grade or material or "—", normalized_thickness


def estimate_rows(estimate: dict[str, Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for line in estimate.get("lines", []):
        if not isinstance(line, dict):
            continue
        characteristics = [
            value for value in line.get("characteristics", []) if isinstance(value, str)
        ]
        outer_value = next(
            (
                value.split(":", 1)[1].strip()
                for value in characteristics
                if value.lower().startswith("наружный кожух:")
            ),
            "",
        )
        inner_value = next(
            (
                value
                for value in characteristics
                if not value.lower().startswith("наружный кожух:")
                and (STEEL_GRADE_PATTERN.search(value) or "сталь" in value.lower())
            ),
            "",
        )
        inner_grade, inner_thickness = material_values(inner_value)
        outer_grade, outer_thickness = material_values(outer_value)
        thickness = (
            " / ".join(value for value in (inner_thickness, outer_thickness) if value != "—") or "—"
        )
        quantity = line.get("quantity")
        rows.append(
            {
                "name": str(line.get("label") or "—"),
                "inner_grade": inner_grade,
                "outer_grade": outer_grade,
                "thickness": thickness,
                "quantity": f"{quantity} шт." if isinstance(quantity, int) else "—",
                "price": format_rub(line.get("line_total_rub")),
            }
        )
    return rows


def estimate_text(estimate: dict[str, Any]) -> str:
    rows = estimate_rows(estimate)
    summary = [
        f"Итого по известным ценам: {format_rub(estimate.get('known_subtotal_rub'))}",
        f"Позиций: {len(rows)}",
        f"Количество: {estimate.get('total_units', 0)} шт.",
    ]
    unpriced = estimate.get("unpriced_line_count")
    if isinstance(unpriced, int) and unpriced:
        summary.append(f"Без цены: {unpriced} поз.")
    summary.extend(
        [
            "",
            "Название | Марка внутр. | Марка наруж. | Толщина, мм | Кол-во | Цена",
            *(
                " | ".join(
                    (
                        row["name"],
                        row["inner_grade"],
                        row["outer_grade"],
                        row["thickness"],
                        row["quantity"],
                        row["price"],
                    )
                )
                for row in rows
            ),
        ]
    )
    return "\n".join(summary)


def estimate_html(estimate: dict[str, Any]) -> str:
    rows = estimate_rows(estimate)
    unpriced = estimate.get("unpriced_line_count")
    unpriced_html = (
        f'<span style="white-space:nowrap">Без цены: <strong>{unpriced} поз.</strong></span>'
        if isinstance(unpriced, int) and unpriced
        else ""
    )
    body_rows = "".join(
        f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827">{escape(row["name"])}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center">{escape(row["inner_grade"])}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center">{escape(row["outer_grade"])}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;white-space:nowrap">{escape(row["thickness"])}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;white-space:nowrap">{escape(row["quantity"])}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-weight:600">{escape(row["price"])}</td>
        </tr>
        """
        for row in rows
    )
    return f"""
    <div style="margin-top:24px;font-family:Arial,sans-serif;color:#374151">
      <h2 style="margin:0 0 12px;font-size:18px;line-height:1.3;color:#111827">Комплект дымохода</h2>
      <div style="margin:0 0 16px;padding:14px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;line-height:1.6">
        <strong style="display:block;font-size:17px;color:#111827">Итого по известным ценам: {escape(format_rub(estimate.get("known_subtotal_rub")))}</strong>
        <span style="white-space:nowrap">Позиций: <strong>{len(rows)}</strong></span>&nbsp;&nbsp;
        <span style="white-space:nowrap">Количество: <strong>{escape(str(estimate.get("total_units", 0)))} шт.</strong></span>&nbsp;&nbsp;
        {unpriced_html}
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:12px;line-height:1.35;font-variant-numeric:tabular-nums" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="background:#f3f4f6;color:#374151">
            <th scope="col" style="padding:9px 8px;text-align:left">Название</th>
            <th scope="col" style="padding:9px 8px;text-align:center">Марка<br>внутр.</th>
            <th scope="col" style="padding:9px 8px;text-align:center">Марка<br>наруж.</th>
            <th scope="col" style="padding:9px 8px;text-align:center">Толщина,<br>мм</th>
            <th scope="col" style="padding:9px 8px;text-align:center">Кол-во</th>
            <th scope="col" style="padding:9px 8px;text-align:right">Цена</th>
          </tr>
        </thead>
        <tbody>{body_rows}</tbody>
      </table>
    </div>
    """


def attach_file(message: EmailMessage, attachment_path: Path | None, filename: str | None) -> None:
    if not attachment_path or not attachment_path.is_file():
        return
    content_type, _ = mimetypes.guess_type(attachment_path.name)
    maintype, subtype = (content_type or "application/octet-stream").split("/", 1)
    message.add_attachment(
        attachment_path.read_bytes(),
        maintype=maintype,
        subtype=subtype,
        filename=filename or attachment_path.name,
    )


def deliver_message(message: EmailMessage) -> None:
    if "Date" not in message:
        message["Date"] = formatdate(localtime=True)
    if "Message-ID" not in message:
        sender_address = parseaddr(str(message.get("From", "")))[1]
        sender_domain = sender_address.rpartition("@")[2] or None
        message["Message-ID"] = make_msgid(domain=sender_domain)
    smtp_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    with smtp_class(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def send_lead_email(
    record: dict[str, Any],
    attachment_path: Path | None = None,
    manager_url: str | None = None,
) -> bool:
    """Send a persisted lead to the configured mailbox.

    Returning False means delivery is not configured. SMTP errors are allowed to
    propagate so the caller can record the failure without losing the lead.
    """
    if not settings.smtp_host:
        return False

    message = EmailMessage()
    message["Subject"] = f"Новая заявка с сайта — {record['name']}"
    message["From"] = settings.lead_from_email
    message["To"] = settings.lead_recipient_email
    contact_method = record.get("contact_method", "phone")
    contact = record.get("contact") or record.get("phone") or "—"
    estimate = record.get("_estimate")
    if not isinstance(estimate, dict):
        estimate = None
    header_lines = (
        f"Заявка: {record['id']}",
        f"Дата: {record['created_at']}",
        f"Источник: {record['source']}",
        f"Имя: {record['name']}",
        f"Способ связи: {CONTACT_METHOD_LABELS.get(contact_method, contact_method)}",
        f"Контакт: {contact}",
        "",
        "Комментарий:",
        record["comment"] or "—",
    )
    configuration_text = estimate_text(estimate) if estimate else record["configuration"] or "—"
    message.set_content(
        "\n".join(
            (
                *header_lines,
                "",
                "Конфигурация:",
                configuration_text,
                *(("", "Открыть клиента и BOM:", manager_url) if manager_url else ()),
            )
        )
    )
    if estimate:
        manager_link = (
            f'<p style="margin:20px 0 0"><a href="{escape(manager_url, quote=True)}" style="color:#c85a12;font-weight:600">Открыть клиента и BOM</a></p>'
            if manager_url
            else ""
        )
        message.add_alternative(
            f"""
            <!doctype html>
            <html lang="ru"><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,sans-serif;color:#374151">
              <main style="max-width:920px;margin:0 auto">
                <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#111827">Новая заявка — {escape(str(record["name"]))}</h1>
                <table role="presentation" style="font-size:14px;line-height:1.65;border-collapse:collapse">
                  <tr><td style="padding-right:16px;color:#6b7280">Контакт</td><td><strong>{escape(str(contact))}</strong></td></tr>
                  <tr><td style="padding-right:16px;color:#6b7280">Способ связи</td><td>{escape(CONTACT_METHOD_LABELS.get(contact_method, contact_method))}</td></tr>
                  <tr><td style="padding-right:16px;color:#6b7280">Комментарий</td><td>{escape(str(record["comment"] or "—"))}</td></tr>
                </table>
                {estimate_html(estimate)}
                {manager_link}
              </main>
            </body></html>
            """,
            subtype="html",
        )

    attach_file(message, attachment_path, record.get("attachment"))
    deliver_message(message)
    return True


def send_customer_confirmation_email(
    record: dict[str, Any], attachment_path: Path | None = None
) -> bool:
    """Confirm an estimate request when the customer selected email."""
    if not settings.smtp_host or record.get("contact_method") != "email":
        return False

    message = EmailMessage()
    message["Subject"] = "Ваш расчёт получен — Дымоход Трейд"
    message["From"] = settings.lead_from_email
    message["To"] = record["contact"]
    message.set_content(
        "\n".join(
            (
                f"Здравствуйте, {record['name']}!",
                "",
                "Мы получили ваш расчёт дымохода.",
                "Менеджер свяжется с вами в течение 30 минут по указанному способу связи.",
                "",
                "Предварительная PDF-смета приложена к письму.",
                "",
                "Дымоход Трейд",
                "+7 (965) 075-65-55",
            )
        )
    )
    attach_file(message, attachment_path, record.get("attachment"))
    deliver_message(message)
    return True
