"""Private lead notes, independent of PostgreSQL and outbound mail."""

import fcntl
import json
import os
import re
import tempfile
from pathlib import Path


class NotesConflictError(Exception):
    pass


def lead_directory(storage_root: str | Path, lead_id: str) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", lead_id):
        raise ValueError("Invalid lead ID")
    root = (Path(storage_root) / "leads").resolve()
    directory = (root / lead_id).resolve()
    if directory.parent != root:
        raise ValueError("Invalid lead directory")
    return directory


def read_notes(storage_root: str | Path, lead_id: str) -> str:
    path = lead_directory(storage_root, lead_id) / "notes.json"
    if not path.is_file():
        return ""
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("notes"), str):
        raise ValueError("Invalid notes record")
    return data["notes"]


def write_notes(storage_root: str | Path, lead_id: str, notes: str, expected_notes: str) -> str:
    directory = lead_directory(storage_root, lead_id)
    if not (directory / "lead.json").is_file():
        raise FileNotFoundError("Lead not found")
    if len(notes) > 5000:
        raise ValueError("Notes exceed 5000 characters")
    with (directory / ".notes.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if read_notes(storage_root, lead_id) != expected_notes:
            raise NotesConflictError("Notes changed in another session")
        descriptor, name = tempfile.mkstemp(prefix=".notes-", dir=directory)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
                json.dump({"notes": notes}, temporary, ensure_ascii=False)
            os.replace(name, directory / "notes.json")
        finally:
            Path(name).unlink(missing_ok=True)
    return notes
