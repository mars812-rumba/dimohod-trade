"""Recoverable, administrator-only customer cascade in the private file storage."""
import json
import re
import uuid
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path

from app.modules.leads.customers import customer_lock

ID = re.compile(r"[a-f0-9]{32}\Z")


class CustomerDeletionConflict(Exception):
    pass


def _roots(storage_root: str | Path) -> tuple[Path, Path]:
    root = Path(storage_root).resolve()
    for name in ("customers", "leads"):
        directory = root / name
        if directory.is_symlink():
            raise CustomerDeletionConflict("Storage directory must not be a symlink")
    return root / "customers", root / "leads"


def _record(path: Path) -> dict:
    if path.is_symlink():
        raise CustomerDeletionConflict("Symlink is not a customer record")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise CustomerDeletionConflict("Invalid JSON record") from exc
    if not isinstance(value, dict):
        raise CustomerDeletionConflict("Invalid customer record")
    return value


def _lead_ids(customer: dict) -> set[str]:
    estimates = customer.get("estimates", [])
    inquiries = customer.get("inquiries", [])
    if (not isinstance(estimates, list) or not isinstance(inquiries, list)
            or any(not isinstance(item, dict) for item in estimates + inquiries)):
        raise CustomerDeletionConflict("Invalid lead index")
    ids = [item.get("lead_id") for item in estimates + inquiries]
    if any(not isinstance(value, str) or not ID.fullmatch(value) for value in ids):
        raise CustomerDeletionConflict("Invalid lead reference")
    return set(ids)


def _snapshot(storage_root: str | Path, customer_id: str) -> tuple[dict, list[Path], str]:
    customers, leads = _roots(storage_root)
    customer_path = customers / f"{customer_id}.json"
    customer = _record(customer_path)
    if customer.get("id") != customer_id:
        raise CustomerDeletionConflict("Customer ID mismatch")
    ids = _lead_ids(customer)
    # Also collect owned records omitted from an old/partially written index.
    for directory in leads.glob("*"):
        if ID.fullmatch(directory.name) and not directory.is_symlink() and (directory / "lead.json").is_file():
            if _record(directory / "lead.json").get("customer_id") == customer_id:
                ids.add(directory.name)
    # Never delete another customer's records, even if a legacy index is corrupt.
    for other in customers.glob("*.json"):
        if other != customer_path:
            other_ids = _lead_ids(_record(other))
            if ids & other_ids:
                raise CustomerDeletionConflict("A lead is referenced by another customer")
    directories, stamps = [], []
    for lead_id in sorted(ids):
        directory = leads / lead_id
        if directory.is_symlink():
            raise CustomerDeletionConflict("Lead directory is a symlink")
        if not directory.exists():
            stamps.append((lead_id, None))
            continue
        if not directory.is_dir():
            raise CustomerDeletionConflict("Invalid lead directory")
        record = _record(directory / "lead.json")
        if record.get("customer_id") not in (None, customer_id):
            raise CustomerDeletionConflict("Lead belongs to another customer")
        files = []
        for path in sorted(directory.rglob("*")):
            if path.is_symlink():
                raise CustomerDeletionConflict("Lead contains a symlink")
            if path.is_file():
                stat = path.stat()
                files.append((str(path.relative_to(directory)), stat.st_size, stat.st_mtime_ns))
        directories.append(directory)
        stamps.append((lead_id, files))
    version = sha256(json.dumps([sha256(customer_path.read_bytes()).hexdigest(), stamps], sort_keys=True).encode()).hexdigest()
    return customer, directories, version


def deletion_preview(storage_root: str | Path, customer_id: str) -> dict:
    if not ID.fullmatch(customer_id):
        raise FileNotFoundError
    _roots(storage_root)
    with customer_lock(storage_root, customer_id):
        customer, directories, version = _snapshot(storage_root, customer_id)
        return {"customer_id": customer_id, "version": version, "lead_count": len(directories),
                "estimate_count": sum((path / "estimate.json").is_file() for path in directories)}


def _write_manifest(archive: Path, manifest: dict) -> None:
    temporary = archive / "manifest.json.tmp"
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(archive / "manifest.json")


def delete_customer(storage_root: str | Path, customer_id: str, expected_version: str) -> dict:
    if not ID.fullmatch(customer_id):
        raise FileNotFoundError
    customers, leads = _roots(storage_root)
    with customer_lock(storage_root, customer_id) as customer_path:
        _, directories, version = _snapshot(storage_root, customer_id)
        if version != expected_version:
            raise CustomerDeletionConflict("Customer or documents changed since confirmation")
        trash = leads / ".trash"
        if trash.is_symlink():
            raise CustomerDeletionConflict("Trash is a symlink")
        leads.mkdir(exist_ok=True)
        trash.mkdir(mode=0o700, exist_ok=True)
        deletion_id = uuid.uuid4().hex
        archive = trash / deletion_id
        archive.mkdir(mode=0o700)
        (archive / "leads").mkdir(mode=0o700)
        manifest = {"schema_version": 1, "customer_id": customer_id, "deletion_id": deletion_id,
                    "lead_ids": [path.name for path in directories], "status": "pending",
                    "deleted_at": datetime.now(UTC).isoformat()}
        _write_manifest(archive, manifest)
        moved = []
        try:
            for path in directories:
                destination = archive / "leads" / path.name
                path.rename(destination)
                moved.append((path, destination))
            customer_path.rename(archive / "customer.json")
            manifest["status"] = "deleted"
            _write_manifest(archive, manifest)
        except OSError:
            if (archive / "customer.json").exists():
                (archive / "customer.json").rename(customer_path)
            for original, destination in reversed(moved):
                destination.rename(original)
            manifest["status"] = "rolled_back"
            _write_manifest(archive, manifest)
            raise
    return {"status": "deleted", "customer_id": customer_id, "deletion_id": deletion_id,
            "lead_count": len(directories)}


def restore_customer(storage_root: str | Path, deletion_id: str) -> dict:
    if not ID.fullmatch(deletion_id):
        raise FileNotFoundError
    customers, leads = _roots(storage_root)
    archive = leads / ".trash" / deletion_id
    if archive.is_symlink() or (leads / ".trash").is_symlink():
        raise CustomerDeletionConflict("Invalid archive directory")
    manifest = _record(archive / "manifest.json")
    customer_id, lead_ids = manifest.get("customer_id"), manifest.get("lead_ids")
    if (not isinstance(customer_id, str) or not ID.fullmatch(customer_id)
            or not isinstance(lead_ids, list) or any(not isinstance(i, str) or not ID.fullmatch(i) for i in lead_ids)
            or len(set(lead_ids)) != len(lead_ids) or manifest.get("deletion_id") != deletion_id):
        raise CustomerDeletionConflict("Invalid archive references")
    with customer_lock(storage_root, customer_id) as customer_path:
        manifest = _record(archive / "manifest.json")
        if (manifest.get("status") != "deleted" or customer_path.exists() or customer_path.is_symlink()
                or any((leads / i).exists() or (leads / i).is_symlink() for i in lead_ids)):
            raise CustomerDeletionConflict("Restoration would overwrite existing records")
        if (archive / "leads").is_symlink():
            raise CustomerDeletionConflict("Invalid archive leads directory")
        if _record(archive / "customer.json").get("id") != customer_id:
            raise CustomerDeletionConflict("Archived customer mismatch")
        if any((archive / "leads" / i).is_symlink() or not (archive / "leads" / i).is_dir() for i in lead_ids):
            raise CustomerDeletionConflict("Archive is incomplete")
        if any(path.is_symlink() for path in (archive / "leads").rglob("*")):
            raise CustomerDeletionConflict("Archive contains a symlink")
        moved = []
        try:
            for lead_id in lead_ids:
                source, destination = archive / "leads" / lead_id, leads / lead_id
                source.rename(destination)
                moved.append((source, destination))
            (archive / "customer.json").rename(customer_path)
            manifest["status"] = "restored"
            _write_manifest(archive, manifest)
        except OSError:
            if customer_path.exists():
                customer_path.rename(archive / "customer.json")
            for source, destination in reversed(moved):
                destination.rename(source)
            raise
    return {"status": "restored", "customer_id": customer_id}
