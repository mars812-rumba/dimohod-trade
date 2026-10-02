import pytest
from pydantic import ValidationError

from app.modules.admin.schemas import AdminProductFAQItem, AdminProductUpdate
from app.modules.admin.service import sanitize_product_faq_items


def test_faq_item_requires_evidence() -> None:
    with pytest.raises(ValidationError):
        AdminProductFAQItem(question="Для чего?", answer="Подтверждённый ответ.", evidence=[])


def test_faq_sanitizer_trims_and_deduplicates_questions_and_evidence() -> None:
    items = [
        AdminProductFAQItem(
            question="  Какие варианты есть?  ",
            answer="  Варианты перечислены в активных SKU.  ",
            evidence=[" Active SKU ", "Active SKU"],
        ),
        AdminProductFAQItem(
            question="какие варианты есть?",
            answer="Дубликат.",
            evidence=["Active SKU"],
        ),
    ]

    assert sanitize_product_faq_items(items) == [
        {
            "question": "Какие варианты есть?",
            "answer": "Варианты перечислены в активных SKU.",
            "evidence": ["Active SKU"],
        }
    ]


def test_product_update_accepts_explicit_faq_workflow_aliases() -> None:
    payload = AdminProductUpdate.model_validate(
        {
            "faqDraft": [
                {
                    "question": "Какие варианты есть?",
                    "answer": "Они перечислены в карточке.",
                    "evidence": ["Active SKU"],
                }
            ],
            "publishFaq": True,
        }
    )

    assert payload.publish_faq is True
    assert payload.unpublish_faq is False
    assert payload.faq_draft and payload.faq_draft[0].evidence == ["Active SKU"]
