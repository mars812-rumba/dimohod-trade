import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("homepage links the industrial chimney scenario to its landing", () => {
  assert.match(home, /slug: "promyshlennye-dymohody"/u);
  assert.match(home, /title: "Промышленные дымоходы"/u);
  assert.match(home, /image: "\/images\/home\/hero-projects\/industrial-facade\.webp"/u);
  assert.match(home, /href: "\/promyshlennye-dymohody"/u);
});
