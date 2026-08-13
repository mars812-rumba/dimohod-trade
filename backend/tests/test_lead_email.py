from pathlib import Path

from app.modules.leads.email import send_lead_email


class FakeSMTP:
    message = None

    def __init__(self, host, port, timeout):
        assert (host, port, timeout) == ("smtp.example.test", 587, 20)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return None

    def starttls(self):
        return None

    def login(self, username, password):
        assert (username, password) == ("sender", "secret")

    def send_message(self, message):
        type(self).message = message


def test_sends_lead_with_attachment(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_host", "smtp.example.test")
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_port", 587)
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_username", "sender")
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_password", "secret")
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_use_tls", True)
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_use_ssl", False)
    monkeypatch.setattr(
        "app.modules.leads.email.settings.lead_recipient_email",
        "office@dimohod-trade.pro",
    )
    monkeypatch.setattr("app.modules.leads.email.smtplib.SMTP", FakeSMTP)
    attachment = tmp_path / "attachment.pdf"
    attachment.write_bytes(b"pdf")
    record = {
        "id": "lead-1",
        "created_at": "2026-08-12T00:00:00+00:00",
        "source": "test",
        "name": "Иван",
        "phone": "+79991234567",
        "comment": "Перезвоните",
        "configuration": "Труба 115 мм",
        "attachment": "plan.pdf",
    }

    assert send_lead_email(record, attachment) is True
    assert FakeSMTP.message["To"] == "office@dimohod-trade.pro"
    assert "Иван" in FakeSMTP.message.get_body().get_content()
    assert next(FakeSMTP.message.iter_attachments()).get_filename() == "plan.pdf"
