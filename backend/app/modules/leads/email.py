import mimetypes
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any

from app.core.config import settings


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
    message.set_content(
        "\n".join(
            (
                f"Заявка: {record['id']}",
                f"Дата: {record['created_at']}",
                f"Источник: {record['source']}",
                f"Имя: {record['name']}",
                f"Телефон: {record['phone']}",
                "",
                "Комментарий:",
                record["comment"] or "—",
                "",
                "Конфигурация:",
                record["configuration"] or "—",
            )
        )
    )

    if attachment_path and attachment_path.is_file():
        content_type, _ = mimetypes.guess_type(attachment_path.name)
        maintype, subtype = (content_type or "application/octet-stream").split("/", 1)
        message.add_attachment(
            attachment_path.read_bytes(),
            maintype=maintype,
            subtype=subtype,
            filename=record.get("attachment") or attachment_path.name,
        )

    smtp_class = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    with smtp_class(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
    return True
