import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const componentSource = fs.readFileSync(
  path.join(here, "../components/ScenarioPageTemplate.tsx"),
  "utf8",
);
const stylesSource = fs.readFileSync(
  path.join(here, "../components/ScenarioPageTemplate.module.css"),
  "utf8",
);

test("the banya route chooser uses the equal-card grid only for that scenario", () => {
  assert.match(componentSource, /content\.slug === "banya" \? styles\.routeGridEqual/);
});

test("the equal-card layout uses three, two and one responsive columns", () => {
  assert.match(
    stylesSource,
    /\.routeGridEqual\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s,
  );
  assert.match(
    stylesSource,
    /@media \(max-width: 980px\)[\s\S]*?\.routeGridEqual\s*\{[^}]*repeat\(2,/,
  );
  assert.match(
    stylesSource,
    /@media \(max-width: 620px\)[\s\S]*?\.routeGrid,[\s\S]*?grid-template-columns:\s*1fr;/,
  );
});

test("card bodies stretch so their actions stay aligned", () => {
  assert.match(stylesSource, /\.routeGridEqual \.routeOption > div:last-child/);
  assert.match(stylesSource, /\.routeGridEqual \.routeOptionAction\s*\{[^}]*margin-top:\s*auto;/s);
});
