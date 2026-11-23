import fcntl
import json
import re
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any

from app.modules.leads.notes import read_notes


def canonical_contact(method: str, contact: str) -> str:
    if method in {"phone", "max", "whatsapp"}:
        digits = re.sub(r"\D", "", contact)
        if len(digits) == 11 and digits.startswith("8"):
            digits = "7" + digits[1:]
        return f"phone:{digits}"
    if method == "telegram":
        return f"telegram:{contact.lstrip('@').lower()}"
    return f"email:{contact.lower()}"


def customer_id_for(method: str, contact: str) -> str:
    return sha256(canonical_contact(method, contact).encode("utf-8")).hexdigest()[:32]


def customers_dir(storage_root: str | Path) -> Path:
    directory = Path(storage_root) / "customers"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def write_customer(path: Path, customer: dict[str, Any]) -> None:
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(customer, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


@contextmanager
def customer_lock(storage_root: str | Path, customer_id: str) -> Iterator[Path]:
    if not re.fullmatch(r"[a-f0-9]{32}", customer_id):
        raise ValueError("Invalid customer ID")
    directory = customers_dir(storage_root)
    with (directory / f".{customer_id}.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield directory / f"{customer_id}.json"


class CustomerNameConflictError(Exception):
    pass


def update_customer_name(
    storage_root: str | Path, customer_id: str, name: str, expected_name: str,
) -> dict[str, str]:
    name = name.strip()
    if len(name) > 100:
        raise ValueError("Name exceeds 100 characters")
    with customer_lock(storage_root, customer_id) as path:
        customer = json.loads(path.read_text(encoding="utf-8"))
        if (customer.get("name") or "") != expected_name:
            raise CustomerNameConflictError("Customer name changed in another session")
        now = datetime.now(UTC).isoformat()
        changes = {"name": name, "name_source": "manual", "name_updated_at": now, "updated_at": now}
        customer.update(changes)
        write_customer(path, customer)
    return changes


def estimate_summary(lead_id: str, created_at: str, envelope: dict[str, Any]) -> dict[str, Any]:
    estimate = envelope["estimate"]
    return {
        "lead_id": lead_id,
        "quotation_number": envelope.get("quotation_number", ""),
        "profile_name": estimate.get("profile_name") or "Без названия",
        "status": envelope.get("status", "submitted"),
        "callback_requested_at": envelope.get("callback_requested_at"),
        "created_at": created_at,
        "updated_at": datetime.now(UTC).isoformat(),
        "known_total_rub": estimate.get("total_after_discount_rub", estimate.get("known_subtotal_rub", 0)),
        "item_count": len(estimate.get("lines", [])),
        "total_units": estimate.get("total_units", 0),
    }


def upsert_customer(
    storage_root: str | Path,
    *,
    lead_id: str,
    name: str,
    contact_method: str,
    contact: str,
    created_at: str,
    envelope: dict[str, Any],
) -> str:
    customer_id = customer_id_for(contact_method, contact)
    with customer_lock(storage_root, customer_id) as path:
        _upsert_customer(path, customer_id, lead_id, name, contact_method, contact, created_at, envelope)
    return customer_id


def _upsert_customer(
    path: Path, customer_id: str, lead_id: str, name: str, contact_method: str,
    contact: str, created_at: str, envelope: dict[str, Any] | None,
    inquiry: dict[str, Any] | None = None,
) -> None:
    now = datetime.now(UTC).isoformat()
    if path.is_file():
        try:
            customer = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            customer = {}
    else:
        customer = {}
    customer.setdefault("schema_version", 1)
    customer.setdefault("id", customer_id)
    customer.setdefault("created_at", created_at)
    customer.setdefault("contacts", [])
    customer.setdefault("estimates", [])
    if inquiry is not None:
        customer.setdefault("inquiries", [])
        if any(item.get("lead_id") == lead_id for item in customer["estimates"] + customer["inquiries"]):
            return
    current_name = envelope is not None or created_at >= customer.get("updated_at", "")
    if customer.get("name_source") != "manual" and (name or not customer.get("name")) and current_name:
        customer["name"] = name
        customer["name_source"] = "auto"
    customer["updated_at"] = now if envelope is not None else max(customer.get("updated_at", ""), created_at)
    if not any(
        item.get("method") == contact_method and item.get("value") == contact
        for item in customer["contacts"]
    ):
        customer["contacts"].append({"method": contact_method, "value": contact})
    if envelope is not None:
        summary = estimate_summary(lead_id, created_at, envelope)
        customer["estimates"] = [
            item for item in customer["estimates"] if item.get("lead_id") != lead_id
        ]
        customer["estimates"].append(summary)
        customer["estimates"].sort(key=lambda item: item.get("updated_at", ""), reverse=True)
    elif inquiry is not None:
        customer["inquiries"].append(inquiry)
        customer["inquiries"].sort(key=lambda item: item.get("created_at", ""), reverse=True)
    write_customer(path, customer)


def index_customer_inquiry(storage_root: str | Path, lead_id: str) -> str | None:
    """Index a saved plain lead. Legacy lead files remain unchanged; no mail is sent."""
    if not re.fullmatch(r"[a-f0-9]{32}", lead_id):
        return None
    directory = Path(storage_root) / "leads" / lead_id

    def read_plain_lead() -> dict[str, Any] | None:
        try:
            if directory.is_symlink() or (directory / "lead.json").is_symlink():
                return None
            record = json.loads((directory / "lead.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        if (not isinstance(record, dict) or record.get("id") != lead_id or record.get("estimate")
                or (directory / "estimate.json").exists()):
            return None
        method = record.get("contact_method", "phone")
        contact = record.get("contact") or record.get("phone")
        if (method not in {"phone", "max", "whatsapp", "telegram", "email"}
                or not isinstance(contact, str) or not contact.strip()
                or not isinstance(record.get("created_at"), str)):
            return None
        return {**record, "contact_method": method, "contact": contact}

    record = read_plain_lead()
    if record is None:
        return None
    customer_id = customer_id_for(record["contact_method"], record["contact"])
    if record.get("customer_id") not in (None, customer_id):
        return None
    with customer_lock(storage_root, customer_id) as path:
        # Deletion holds the same lock and moves the lead directory. Re-read so
        # an in-flight list request cannot recreate a deleted customer.
        current = read_plain_lead()
        if current != record:
            return None
        inquiry = {
            "lead_id": lead_id, "created_at": record["created_at"],
            "source": record.get("source", ""), "comment": record.get("comment", ""),
            "configuration": record.get("configuration", ""),
            "has_attachment": bool(record.get("attachment")),
        }
        _upsert_customer(path, customer_id, lead_id, record.get("name", ""),
                         record["contact_method"], record["contact"], record["created_at"], None, inquiry)
    return customer_id


def sync_customer_estimate(
    storage_root: str | Path, lead_record: dict[str, Any], envelope: dict[str, Any]
) -> None:
    customer_id = lead_record.get("customer_id")
    if not isinstance(customer_id, str) or not re.fullmatch(r"[a-f0-9]{32}", customer_id):
        return
    with customer_lock(storage_root, customer_id) as path:
        _sync_customer_estimate(path, lead_record, envelope)


def _sync_customer_estimate(
    path: Path, lead_record: dict[str, Any], envelope: dict[str, Any],
) -> None:
    if not path.is_file():
        return
    customer = json.loads(path.read_text(encoding="utf-8"))
    # A late in-flight update must not reattach a deleted lead to a newly
    # created customer with the same contact-derived ID.
    if not any(item.get("lead_id") == lead_record["id"] for item in customer.get("estimates", [])):
        return
    summary = estimate_summary(lead_record["id"], lead_record["created_at"], envelope)
    customer["estimates"] = [
        item for item in customer.get("estimates", []) if item.get("lead_id") != lead_record["id"]
    ] + [summary]
    customer["estimates"].sort(key=lambda item: item.get("updated_at", ""), reverse=True)
    customer["updated_at"] = datetime.now(UTC).isoformat()
    write_customer(path, customer)


def list_customers(storage_root: str | Path, search: str | None = None) -> list[dict[str, Any]]:
    query = (search or "").strip().lower()
    root = Path(storage_root)
    # Also discover pre-release plain leads; direct children exclude the private
    # trash. Registration is locked and idempotent and never rewrites lead.json.
    for path in (root / "leads").glob("*/lead.json"):
        index_customer_inquiry(root, path.parent.name)
    result = []
    for path in customers_dir(root).glob("*.json"):
        try:
            customer = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for inquiry in customer.get("inquiries", []):
            inquiry["notes"] = read_notes(root, inquiry["lead_id"])
        for estimate in customer.get("estimates", []):
            lead_id = str(estimate.get("lead_id", ""))
            estimate["notes"] = read_notes(root, lead_id)
            if "quotation_number" not in estimate and re.fullmatch(r"[a-f0-9]{32}", lead_id):
                estimate_path = root / "leads" / lead_id / "estimate.json"
                try:
                    envelope = json.loads(estimate_path.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    envelope = {}
                number = envelope.get("quotation_number")
                if isinstance(number, str):
                    estimate["quotation_number"] = number
        haystack = " ".join(
            [
                str(customer.get("name", "")),
                *(str(item.get("value", "")) for item in customer.get("contacts", [])),
                *(str(item.get("profile_name", "")) for item in customer.get("estimates", [])),
                *(str(item.get("quotation_number", "")) for item in customer.get("estimates", [])),
                *(str(item.get("lead_id", "")) for item in customer.get("estimates", [])),
                *(" ".join(str(item.get(key, "")) for key in ("lead_id", "source", "comment", "configuration"))
                  for item in customer.get("inquiries", [])),
            ]
        ).lower()
        if not query or query in haystack:
            result.append(customer)
    return sorted(result, key=lambda item: item.get("updated_at", ""), reverse=True)
