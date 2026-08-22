import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configuratorSource = await readFile(
  new URL("../components/ChimneyConfigurator.tsx", import.meta.url),
  "utf8",
);

function componentSource(name, nextName) {
  const start = configuratorSource.indexOf(`function ${name}`);
  const end = configuratorSource.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${nextName} must follow ${name}`);
  return configuratorSource.slice(start, end);
}

test("wall-top configurator scene is a real inline SVG without a raster backdrop", () => {
  const source = componentSource("DynamicWallTopScheme", "EngineeringSceneProduct");

  assert.match(source, /<svg\b/);
  assert.match(source, /расчётная SVG-схема/);
  assert.doesNotMatch(source, /<image\b/);
  assert.doesNotMatch(source, /banya-route-through-wall-top-elbow\.png/);
});

test("direct wall route uses separate deterministic SVG panels and resolved SKU labels", () => {
  const source = componentSource("DynamicWallRearScheme", "scenarioDraftSummary");

  assert.match(source, /data-panel="horizontal-detail"/);
  assert.match(source, /data-panel="vertical-overview"/);
  assert.match(source, /horizontalScale = 520 \/ horizontalMaximumMm/);
  assert.match(source, /verticalScale = 280 \/ verticalMaximumMm/);
  assert.match(source, /node\.sku \?\? "SKU не найден"/);
  assert.match(source, /Опорная заглушка показана только/);
  assert.doesNotMatch(source, /<image\b/);
});
