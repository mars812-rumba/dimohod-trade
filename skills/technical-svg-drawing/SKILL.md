---
name: technical-svg-drawing
description: Convert, reconstruct, or refine SVG artwork, product illustrations, scans, and sketches into dimensioned technical-style drawings. Use for SVG cleanup, precise chimney or mechanical diagrams, orthographic views, sections, centerlines, dimensions, tolerances, leaders, title blocks, SVG/DXF export, or technical-drawing validation with the build123d and Inkscape MCP servers.
---

# Technical SVG Drawing

Produce an editable drawing backed by explicit geometry. Treat the source image as evidence, not as dimensional truth.

## Workflow

1. Preserve the source. Write results to a new descriptive path; never overwrite unless explicitly asked.
2. Inspect the SVG with Inkscape MCP: validate it, list objects/layers, measure bounds, normalize units to mm, and render a PNG preview.
3. Establish dimensional authority in this order: explicit user values, existing dimension labels, verified project product data, then scaled inference. Never present pixel-derived or visually guessed dimensions as exact. Mark unknowns clearly.
4. Choose the construction path:
   - Use build123d MCP for exact geometry, projections, sections, dimensions, tolerances, and DXF/SVG delivery.
   - Use Inkscape MCP for path cleanup, layer organization, text/path work, direct SVG edits, and final format conversion.
   - For a loose illustration, reconstruct critical geometry instead of merely tracing it.
5. Organize semantic layers: border/title block, outlines, hidden lines, centerlines, dimensions, annotations, and optional reference artwork.
6. Apply the conventions in [references/drafting-conventions.md](references/drafting-conventions.md). Do not claim formal GOST/ISO compliance unless the user supplied the governing standard and the output was checked against it.
7. Run a verification loop:
   - inspect and lint the SVG;
   - compare reported geometry with every displayed dimension;
   - render a fresh PNG and visually inspect clipping, overlaps, arrowheads, labels, and line hierarchy;
   - correct defects and repeat validation.
8. Deliver the editable SVG and preview PNG. Also deliver DXF or the build script when useful for future dimensional edits. State inferred values and unresolved uncertainties.

## Tool discipline

- Read build123d MCP workflow guidance or its drafting resource before authoring a new drawing.
- Keep the build123d execution sandbox enabled. Do not use `--no-sandbox` or broad import overrides.
- Keep Inkscape operations inside `/home/dimohod-trade` and prefer built-in operations over unknown extensions.
- Use absolute input/output paths in MCP calls.
- When an MCP operation fails, inspect the smallest relevant object or file and retry once with corrected parameters; do not invent successful output.
