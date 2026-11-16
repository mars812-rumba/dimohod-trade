import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/HomeQuickEstimate.module.css", import.meta.url), "utf8");

test("mobile equipment status uses the same state and choices as desktop buttons", () => {
  assert.match(component, /styles\.mobileEquipmentStatus[\s\S]*?<select value=\{equipmentStatus[\s\S]*?setEquipmentStatus\(event\.target\.value as EquipmentStatus\)[\s\S]*?statusChoices\.map/);
  assert.match(css, /\.mobileEquipmentStatus, \.optionalHint \{ display: none; \}/);
  const mobile = css.slice(css.indexOf("@media (max-width: 720px)"));
  assert.match(mobile, /\.mobileEquipmentStatus \{ display: grid; \}/);
  assert.match(mobile, /\.compactChoices \{ display: none; \}/);
});

test("mobile wizard grows beyond a viewport instead of clipping controls or the result", () => {
  assert.match(component, /step !== 4 \|\| !lead \? ` \$\{styles\.mobileStep\}/);
  assert.match(css, /\.mobileStep \{[^}]*min-height: calc\(100dvh - var\(--quick-header-height, 72px\) - 16px\)/);
  assert.doesNotMatch(css, /[;{]\s*max-height:|overflow-y: hidden|position: fixed|position: sticky/);
  assert.match(css, /padding: 14px 12px max\(12px, env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.field select \{ min-height: 44px; font-size: 16px; \}/);
});

test("only step transitions align the mobile wizard below the measured site header", () => {
  assert.match(component, /if \(previousStep\.current === step\) return/);
  assert.match(component, /matchMedia\("\(max-width: 720px\)"\)/);
  assert.match(component, /querySelector\("\.site-header"\)/);
  assert.match(component, /getBoundingClientRect\(\)\.top - headerHeight - 8/);
  assert.match(component, /cancelAnimationFrame\(frame\)/);
});
