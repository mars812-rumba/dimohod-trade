import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configuratorSource = await readFile(
  new URL("../components/ChimneyConfigurator.tsx", import.meta.url),
  "utf8",
);
const globalStyles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

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

test("direct wall route is one continuous deterministic SVG with readable callouts", () => {
  const source = componentSource("DynamicWallRearScheme", "scenarioDraftSummary");

  assert.match(source, /data-scene="continuous-wall-route"/);
  assert.match(source, /configurator-engineering-route-svg/);
  assert.match(source, /horizontalScale = 350 \/ horizontalMaximumMm/);
  assert.match(source, /verticalScale = 430 \/ verticalMaximumMm/);
  assert.match(source, /Поворотный шибер/);
  assert.match(source, /одна труба, без стыка/);
  assert.match(source, /только нижняя ветвь/);
  assert.doesNotMatch(source, /data-panel=/);
  assert.doesNotMatch(source, /fontFamily="ui-monospace/);
  assert.doesNotMatch(source, /<image\b/);

  assert.match(globalStyles, /\.configurator-generated-svg:not\(\.configurator-engineering-route-svg\) text/);
  const routeTextRule = globalStyles.match(/\.configurator-engineering-route-svg text\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(routeTextRule, /font-size|font-weight|fill/);
  assert.match(globalStyles, /\.configurator-wall-route-scheme\s*\{[^}]*560px/s);
});
