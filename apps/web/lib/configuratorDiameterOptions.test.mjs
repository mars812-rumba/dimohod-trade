import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const draftSource = await readFile(new URL("./configuratorDraft.ts", import.meta.url), "utf8");
const intakeSource = await readFile(new URL("../components/BanyaIntakeFlow.tsx", import.meta.url), "utf8");
const quickEstimateSource = await readFile(
  new URL("../components/HomeQuickEstimate.tsx", import.meta.url),
  "utf8",
);

test("diameter selector uses the thirteen confirmed catalog values", () => {
  assert.match(
    draftSource,
    /CONFIGURATOR_DIAMETERS_MM = \[\s*100, 110, 115, 120, 130, 140, 150, 160, 180, 200, 250, 280, 300,\s*\]/u,
  );
  assert.match(intakeSource, /<select/u);
  assert.match(intakeSource, /CONFIGURATOR_DIAMETERS_MM\.map/u);
  assert.doesNotMatch(intakeSource, /field="diameter" label="Наружный диаметр патрубка"/u);
  assert.match(draftSource, /draft\.diameter = ""/u);
  assert.match(quickEstimateSource, /const diameterOptions = CONFIGURATOR_DIAMETERS_MM/u);
  assert.doesNotMatch(quickEstimateSource, /const diameterOptions = \[/u);
});
