import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("desktop dropdowns close after choosing a navigation link", () => {
  assert.match(header, /function handleDesktopDropdownClick/);
  assert.match(header, /event\.target\.closest\("a"\)/);
  assert.equal(Array.from(header.matchAll(/onClick=\{handleDesktopDropdownClick\}/g)).length, 3);
});

test("desktop dropdowns close after mouse and keyboard focus leave", () => {
  assert.match(header, /function handleDesktopMenuMouseLeave/);
  assert.match(header, /function handleDesktopMenuBlur/);
  assert.equal(Array.from(header.matchAll(/onMouseLeave=\{handleDesktopMenuMouseLeave\}/g)).length, 3);
  assert.equal(Array.from(header.matchAll(/onBlur=\{handleDesktopMenuBlur\}/g)).length, 3);
});

test("desktop dropdowns close with Escape and keep the visual gap traversable", () => {
  assert.match(header, /event\.key !== "Escape"/);
  assert.match(header, /querySelector\("summary"\)\?\.focus\(\)/);
  assert.match(styles, /\.desktop-nav-menu\[open\]::after[\s\S]*height: 10px/);
});
