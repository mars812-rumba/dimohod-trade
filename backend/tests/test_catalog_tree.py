from types import SimpleNamespace

from app.modules.catalog.visibility import visible_category_ids


def category(identifier: str, parent_id: str | None = None):
    return SimpleNamespace(id=identifier, parent_id=parent_id)


def test_empty_categories_are_hidden_but_populated_ancestors_remain_visible() -> None:
    categories = [
        category("bath"),
        category("sandwich"),
        category("sandwich-pipes", "sandwich"),
        category("sandwich-fasteners", "sandwich"),
    ]

    assert visible_category_ids(categories, {"sandwich-pipes"}) == {
        "sandwich",
        "sandwich-pipes",
    }


def test_category_reappears_when_it_gets_a_public_product() -> None:
    categories = [category("bath"), category("sandwich")]

    assert visible_category_ids(categories, set()) == set()
    assert visible_category_ids(categories, {"bath"}) == {"bath"}
