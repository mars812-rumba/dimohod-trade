"""Build the public stove catalog from the locally prepared XML export."""

from __future__ import annotations

import json
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "docs" / "pechi"
SOURCE_XML = SOURCE_ROOT / "pechdvor_bath_stoves_local.xml"
PUBLIC_IMAGES = PROJECT_ROOT / "apps" / "web" / "public" / "images" / "stoves"
OUTPUT_DATA = PROJECT_ROOT / "apps" / "web" / "lib" / "stoves.generated.json"


def catalog_entries() -> list[dict[str, str | int]]:
    root = ET.parse(SOURCE_XML).getroot()
    expected_images = int(root.findtext("downloaded_images", default="0"))
    entries: list[dict[str, str | int]] = []
    seen_images: set[str] = set()

    for stove in root.findall("./stoves/stove"):
        name = (stove.findtext("name") or "").strip()
        local_image = (stove.findtext("local_image") or "").strip()
        if not name or not local_image:
            continue

        source = (SOURCE_ROOT / local_image).resolve()
        if not source.is_relative_to(SOURCE_ROOT.resolve()) or not source.is_file():
            raise FileNotFoundError(f"Missing or unsafe stove image: {local_image}")
        if source.name in seen_images:
            raise ValueError(f"Duplicate stove image name: {source.name}")
        seen_images.add(source.name)

        entries.append(
            {
                "id": int(stove.attrib["id"]),
                "name": name,
                "image": f"/images/stoves/{source.name}",
            }
        )

    if len(entries) != expected_images:
        raise ValueError(
            f"XML declares {expected_images} downloaded images, parsed {len(entries)}"
        )
    return entries


def main() -> None:
    entries = catalog_entries()
    PUBLIC_IMAGES.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        filename = Path(str(entry["image"])).name
        source = SOURCE_ROOT / "pechdvor_images" / filename
        shutil.copy2(source, PUBLIC_IMAGES / filename)

    OUTPUT_DATA.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Imported {len(entries)} stove cards into {OUTPUT_DATA}")


if __name__ == "__main__":
    main()
