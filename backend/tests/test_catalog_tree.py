from types import SimpleNamespace

from app.modules.catalog.visibility import has_public_category_cover, visible_category_ids


def category(identifier: str, parent_id: str | None = None, *, has_cover: bool = True):
    return SimpleNamespace(
        id=identifier,
        parent_id=parent_id,
        extra_attributes={
            "category_cover": {"url": f"/media/{identifier}.jpg"}
        } if has_cover else {},
    )


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


def test_category_with_products_but_without_cover_stays_hidden() -> None:
    categories = [
        category("sandwich"),
        category("sandwich-pipes", "sandwich", has_cover=True),
        category("sandwich-dampers", "sandwich", has_cover=False),
    ]

    assert visible_category_ids(
        categories,
        {"sandwich-pipes", "sandwich-dampers"},
    ) == {"sandwich", "sandwich-pipes"}


def test_blank_cover_url_is_not_public() -> None:
    item = category("sandwich-pipes")
    item.extra_attributes["category_cover"]["url"] = "  "

    assert not has_public_category_cover(item)
