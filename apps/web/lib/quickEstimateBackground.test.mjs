import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../components/HomeQuickEstimate.module.css");

test("scenario calculators have a warm canvas without recoloring the form or selection", () => {
  assert.match(css, /\.scenarioSection\s*\{[^}]*background: #fff0e6;/);
  assert.match(css, /\.quiz\s*\{[^}]*background: #fff;/);
  assert.match(css, /\.selected\s*\{[^}]*border: 2px solid #ed5b2a;/);
  assert.match(read("../components/HomeQuickEstimate.tsx"), /fixedObjectType \? ` \$\{styles\.scenarioSection\}/);
});

test("all existing scenario calculator implementations use the shared scoped background", () => {
  for (const name of ["Banya", "Pech", "Home", "Boiler"]) {
    assert.match(read(`../components/${name}ScenarioLanding.tsx`), /<HomeQuickEstimate[\s\S]*?fixedObjectType=/);
  }
});
