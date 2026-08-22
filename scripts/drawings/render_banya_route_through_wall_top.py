#!/usr/bin/env python3
"""Render the editable wall-route SVG to the PNG used by the configurator."""

from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
SVG = ROOT / "apps/web/public/images/home/banya-route-through-wall-top-technical.svg"
PNG = ROOT / "apps/web/public/images/home/banya-route-through-wall-top-technical.png"


def main() -> None:
    ET.parse(SVG)
    subprocess.run(
        [
            "inkscape",
            str(SVG),
            "--export-type=png",
            f"--export-filename={PNG}",
            "--export-width=1024",
            "--export-height=1536",
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
