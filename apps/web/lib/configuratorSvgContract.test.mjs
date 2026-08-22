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
  assert.match(source, /outlet\?: "top" \| "rear"/);
  assert.doesNotMatch(source, /<image\b/);
  assert.doesNotMatch(source, /banya-route-through-wall-top-elbow\.png/);
});

test("direct rear route reuses the 90-degree SVG template with a lowered part3", () => {
  const source = componentSource("DynamicWallTopScheme", "EngineeringSceneProduct");

  assert.match(source, /const horizontalAxisY = rearOutlet \? 1200 : 1088/);
  assert.match(source, /const routeDeltaY = horizontalAxisY - 1088/);
  assert.match(source, /!rearOutlet \? \(/);
  assert.match(source, /aria-label="Отвод 90 градусов"/);
  assert.match(source, /Поворотный шибер/);
  assert.match(source, /horizontalPipes\.map/);
  assert.match(source, /outdoorPipes\.map/);
  assert.match(source, /consolePositionsMm\.map/);
  assert.doesNotMatch(source, /<image\b/);

  assert.match(configuratorSource, /<DynamicWallTopScheme outlet="rear" variant=\{selectedVariant\} \/>/);
});

test("BOM previews use the matched catalog SKU media instead of missing hardcoded assets", () => {
  assert.match(configuratorSource, /catalogMatch\?\.item\.primary_image/);
  assert.match(configuratorSource, /const productImage = catalogProductImage/);
  assert.doesNotMatch(configuratorSource, /\/images\/configurator\/products/);
  assert.doesNotMatch(configuratorSource, /sandwich-pipe-studio-card/);
  assert.doesNotMatch(configuratorSource, /sandwich-support-cap-studio-card/);
});

test("changing only pipe quantity does not refetch every catalog match", () => {
  const signatureStart = configuratorSource.indexOf("const catalogLookupSignature");
  const sceneStart = configuratorSource.indexOf("const rearSceneGraph", signatureStart);
  assert.notEqual(signatureStart, -1);
  assert.notEqual(sceneStart, -1);

  const signatureSource = configuratorSource.slice(signatureStart, sceneStart);
  assert.match(signatureSource, /line\.nominalLengthMm/);
  assert.match(signatureSource, /line\.contour/);
  assert.doesNotMatch(signatureSource, /line\.quantity/);
  assert.match(
    configuratorSource,
    /\[assetBasePath, calculation\.diameterMm, calculation\.diameterStatus, catalogLookupSignature\]/,
  );
});
