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

    manager_url = "https://dimohod-trade.pro/admin/estimates/lead-1#token=secret"
    assert send_lead_email(record, attachment, manager_url) is True
    assert FakeSMTP.message["To"] == "office@dimohod-trade.pro"
    body = FakeSMTP.message.get_body().get_content()
    assert "Иван" in body
    assert manager_url in body
    assert next(FakeSMTP.message.iter_attachments()).get_filename() == "plan.pdf"


def test_sends_estimate_as_compact_html_table(monkeypatch) -> None:
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_host", "smtp.example.test")
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_port", 587)
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_username", "sender")
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_password", "secret")
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_use_tls", True)
    monkeypatch.setattr("app.modules.leads.email.settings.smtp_use_ssl", False)
    monkeypatch.setattr("app.modules.leads.email.smtplib.SMTP", FakeSMTP)
    record = {
        "id": "lead-2",
        "created_at": "2026-08-29T00:00:00+00:00",
        "source": "quick-estimate",
        "name": "Иван",
        "contact_method": "phone",
        "contact": "+79991234567",
        "comment": "",
        "configuration": "Старая длинная конфигурация",
        "attachment": None,
    }
    estimate = {
        "known_subtotal_rub": 9361,
        "total_units": 2,
        "unpriced_line_count": 0,
        "lines": [
            {
                "label": "Сэндвич-труба 1000 мм",
                "quantity": 2,
                "line_total_rub": 9361,
                "characteristics": [
                    "Ø 120/220 мм",
                    "нержавеющая сталь · AISI 304 · 0.80 мм",
                    "наружный кожух: нержавеющая сталь · AISI 430 · 0.5",
                ],
            }
        ],
    }

    record["_estimate"] = estimate
    assert send_lead_email(record) is True
    plain = FakeSMTP.message.get_body(preferencelist=("plain",)).get_content()
    html = FakeSMTP.message.get_body(preferencelist=("html",)).get_content()
    assert "Старая длинная конфигурация" not in plain
    assert "Название | Марка внутр. | Марка наруж." in plain
    assert "AISI 304 | AISI 430 | 0,80 / 0,5 | 2 шт. | 9\xa0361 ₽" in plain
    assert "<table" in html
    assert "Сэндвич-труба 1000 мм" in html
    assert "Марка<br>внутр." in html
    assert "арт." not in html
