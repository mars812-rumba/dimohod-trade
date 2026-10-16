import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("header calculation link has visible text instead of an icon and keeps its route", () => {
  assert.match(header, /<Link className="header-configurator" href="\/raschet">\s*Расчёт\s*<\/Link>/);
  assert.doesNotMatch(header, /SlidersHorizontal|aria-label="Калькулятор"/);
});

test("compact calculation button reserves room for its label rather than hiding it", () => {
  assert.match(css, /\.header-configurator\s*\{[^}]*width: auto;[^}]*min-width: 68px;/);
  assert.match(css, /\.header-configurator\s*\{[^}]*white-space: nowrap;/);
  assert.doesNotMatch(css, /\.header-configurator span\s*\{\s*display: none/);
});
