import assert from "node:assert/strict";
import test from "node:test";

import { buildExternalWallSceneGraph } from "./chimneySceneGraph.ts";

const bom = [
  ["single-layout-pipe-1000", "труба", "Одностенная труба", 1, 1000, "одностенный", "wall/outdoor"],
  ["sandwich-pipe-500", "труба", "Сэндвич-труба 500", 1, 500, "сэндвич", "wall/outdoor"],
  ["sandwich-pipe-1000", "труба", "Сэндвич-труба 1000", 2, 1000, "сэндвич", "wall/outdoor"],
  ["rear-connection-rotary-damper", "шибер", "Шибер поворотный", 1, undefined, "одностенный", "transition"],
  ["wall-passage", "проходной_узел", "Проход стены", 1, undefined, undefined, "wall_or_ceiling_pass"],
  ["outside-tee", "тройник", "Тройник 90°", 1, undefined, "сэндвич", "wall/outdoor"],
  ["tee-lower-support-plug", "заглушка", "Опорная заглушка", 1, undefined, "сэндвич", "outdoor/lower_branch"],
  ["tee-support-console", "консоль", "Консоль под тройник", 1, undefined, undefined, "outdoor/support"],
  ["outside-support-consoles", "консоль", "Фасадная консоль", 1, undefined, undefined, "outdoor/support"],
  ["outside-console-power-clamps", "крепеж", "Силовой хомут", 1, undefined, undefined, "outdoor/support"],
  ["termination", "оголовок", "Оголовок", 1, undefined, "сэндвич", "termination"],
].map(([key, productKind, label, quantity, nominalLengthMm, contour, zone]) => ({
  key, productKind, label, quantity, nominalLengthMm, contour, zone, requiresSku: true,
}));

const catalogMatches = Object.fromEntries(bom.map((line) => [line.key, {
  exactByFields: true,
  item: {
    id: `product-${line.key}`,
    selected_sku: `sku-${line.key}`,
    article: `article-${line.key}`,
    name: line.label,
    length_mm: line.nominalLengthMm ?? (line.key.includes("damper") ? 180 : line.key.includes("transition") ? 70 : null),
    primary_image: { url: `/media/${line.key}.webp` },
  },
}]));

function validInput() {
  return {
    calculation: {
      routeKind: "wall-rear",
      fixedParts: [
        { id: "rotary_damper", axis: "horizontal", nominalLengthMm: 180, effectiveMm: 130, startMm: 950, endMm: 1080 },
      ],
      forbiddenZones: [{ kind: "wall", startMm: 1200, endMm: 1400 }],
      facadeConsolePositionsMm: [1900],
    },
    variant: {
      pipes: [
        { id: "single-1", axis: "horizontal", nominalMm: 1000, effectiveMm: 950, startMm: 0, endMm: 950, contour: "одностенный" },
        { id: "horizontal-sandwich-1", axis: "horizontal", nominalMm: 500, effectiveMm: 450, startMm: 1080, endMm: 1530, contour: "сэндвич" },
        { id: "vertical-1", axis: "vertical", nominalMm: 1000, effectiveMm: 950, startMm: 0, endMm: 950, contour: "сэндвич" },
        { id: "vertical-2", axis: "vertical", nominalMm: 1000, effectiveMm: 950, startMm: 950, endMm: 1900, contour: "сэндвич" },
      ],
    },
    bom,
    catalogMatches,
  };
}

test("builds a validated scene graph from calculation, BOM and catalog references", () => {
  const scene = buildExternalWallSceneGraph(validInput());

  assert.deepEqual(scene.errors, []);
  assert.equal(scene.horizontalRunMm, 1530);
  assert.equal(scene.verticalHeightMm, 1900);
  assert.equal(scene.nodes.filter((node) => node.geometryFamily === "wall_console").length, 1);
  assert.equal(scene.nodes.filter((node) => node.geometryFamily === "power_clamp").length, 1);
  const tee = scene.nodes.find((node) => node.geometryFamily === "tee_90");
  const plug = scene.nodes.find((node) => node.geometryFamily === "support_plug");
  assert.equal(plug.parentNode, tee.id);
  assert.equal(plug.xMm, tee.xMm);
  assert.ok(plug.yMm < tee.yMm);
});

test("rejects a pipe joint inside the protected wall passage", () => {
  const input = validInput();
  input.variant.pipes[1].endMm = 1300;
  const scene = buildExternalWallSceneGraph(input);

  assert.ok(scene.errors.some((error) => error.includes("внутри стены")));
});

test("requires one continuous sandwich component across the complete wall passage", () => {
  const input = validInput();
  input.variant.pipes[1].startMm = 1400;
  input.variant.pipes[1].endMm = 1850;
  const scene = buildExternalWallSceneGraph(input);

  assert.ok(scene.errors.some((error) => error.includes("одна цельная сэндвич-труба")));
});

test("keeps calculated geometry when a catalog image is missing", () => {
  const input = validInput();
  input.catalogMatches["outside-tee"] = {
    ...input.catalogMatches["outside-tee"],
    item: { ...input.catalogMatches["outside-tee"].item, primary_image: null },
  };
  const scene = buildExternalWallSceneGraph(input);

  assert.deepEqual(scene.errors, []);
  assert.ok(scene.warnings.some((warning) => warning.includes("используется расчётная SVG-геометрия")));
  assert.equal(scene.nodes.some((node) => node.geometryFamily === "tee_90"), true);
});

test("keeps calculated geometry when a BOM line has no catalog match", () => {
  const input = validInput();
  delete input.catalogMatches["rear-connection-rotary-damper"];
  const scene = buildExternalWallSceneGraph(input);

  assert.deepEqual(scene.errors, []);
  assert.ok(scene.warnings.some((warning) => warning.includes("Нет каталожной привязки")));
  const damper = scene.nodes.find((node) => node.geometryFamily === "rotary_damper");
  assert.equal(damper.catalogReferenceStatus, "missing");
  assert.equal(damper.productId, null);
});

test("stops rendering when scene quantity differs from BOM quantity", () => {
  const input = validInput();
  input.bom = input.bom.map((line) => (
    line.key === "outside-support-consoles" ? { ...line, quantity: 2 } : line
  ));
  const scene = buildExternalWallSceneGraph(input);

  assert.ok(scene.errors.some((error) => error.includes("BOM 2, scene graph 1")));
});
