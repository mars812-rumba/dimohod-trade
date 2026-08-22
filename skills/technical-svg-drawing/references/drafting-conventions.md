# Drafting conventions

Use these defaults only when the user or an existing drawing standard does not specify alternatives.

## Sheet and units

- Work in millimetres and retain a correct SVG `viewBox`.
- Prefer A4 landscape for a single component; choose a larger sheet only when readability requires it.
- Include a compact title block with drawing name, units, scale, revision/date, and a visible `REFERENCE — NOT FOR FABRICATION` note when dimensions are incomplete or inferred.

## Line hierarchy

- Visible outlines: solid, approximately 0.5–0.7 mm on the printed sheet.
- Dimensions, extension lines, leaders, and hatching: solid, approximately 0.25–0.35 mm.
- Hidden geometry: thin dashed line.
- Axes and centerlines: thin dash-dot line extending slightly beyond the feature.
- Do not encode meaning by colour alone. A restrained colour may distinguish dimensions in an on-screen preview, but the drawing must remain legible in monochrome.

## Dimensions and labels

- Display real geometry-derived values; do not type a dimension that disagrees with the measured model.
- Use `Ø` for diameter and `R` for radius. State wall thickness explicitly when known.
- Place dimensions outside the part where possible. Keep extension lines off visible outlines and leave a small gap at the feature.
- Avoid duplicate dimensions and closed dimension chains. Dimension from functional datums when they are known.
- Keep text upright and readable. Use a widely available sans-serif font such as DejaVu Sans.
- Use leaders for material, seam, insulation, joint, or finish notes. Do not let leader lines cross their labels.

## Chimney components

- Distinguish inner pipe, insulation, and outer shell in sections.
- Show inner and outer diameters separately, for example `Ø115 / Ø200`, only when verified.
- Mark insertion depth, socket direction, overall length, material, steel thickness, and insulation thickness only when supplied or verified from project data.
- Use sectional hatching sparingly and keep it separate from outlines and text.

## Acceptance checks

- All displayed dimensions match measured geometry.
- No text, arrowhead, or line is clipped or overlapping.
- Units and scale are explicit.
- Layers and important elements have stable IDs.
- SVG validates and renders through both the MCP preview path and Inkscape CLI.
- Unknown or inferred dimensions are visibly identified; fabrication suitability is never implied without authoritative data.
