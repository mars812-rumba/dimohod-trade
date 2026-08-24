import mimetypes
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any

from app.core.config import settings


CONTACT_METHOD_LABELS = {
    "phone": "Телефон",
    "whatsapp": "WhatsApp",
    "telegram": "Telegram",
    "email": "Email",
}


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
    smtp_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    with smtp_class(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def send_lead_email(record: dict[str, Any], attachment_path: Path | None = None) -> bool:
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
    message.set_content(
        "\n".join(
            (
                f"Заявка: {record['id']}",
                f"Дата: {record['created_at']}",
                f"Источник: {record['source']}",
                f"Имя: {record['name']}",
                f"Способ связи: {CONTACT_METHOD_LABELS.get(contact_method, contact_method)}",
                f"Контакт: {contact}",
                "",
                "Комментарий:",
                record["comment"] or "—",
                "",
                "Конфигурация:",
                record["configuration"] or "—",
            )
        )
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
