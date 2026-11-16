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

test("large square choices adapt to the measured space with an accessible scroll fallback", () => {
  assert.match(css, /\.largeChoices \.choice \{[^}]*aspect-ratio: 1/);
  assert.match(component, /window.visualViewport\?\.height \?\? window.innerHeight/);
  assert.match(component, /new ResizeObserver\(measure\)/);
  assert.match(component, /Math.max\(164, Math.min\(choices.clientWidth/);
  assert.match(component, /observer.disconnect\(\)/);
  assert.match(component, /<span className=\{styles.largeChoiceLabel\}>\{choice.label\}<\/span>/);
});

test("route selection collapses into a reversible summary without discarding answers", () => {
  assert.match(component, /setRoute\(choice.id\); setChoosingRoute\(false\)/);
  assert.match(component, /aria-label="Выбранный маршрут"/);
  assert.match(component, /onClick=\{\(\) => setChoosingRoute\(true\)\}>Изменить/);
  assert.match(component, /!choosingRoute && route === "ceiling"/);
  assert.match(component, /!choosingRoute && route === "wall"/);
  assert.match(component, /Boolean\(route\) && !choosingRoute/);
  assert.match(component, /\[step, route, choosingRoute\]/);
});

test("both selected route assets are PNGs with an alpha channel", () => {
  for (const filename of ["route-through-roof-icon.png", "route-along-facade-icon.png"]) {
    const data = readFileSync(new URL(`../public/images/home/quick-estimate/${filename}`, import.meta.url));
    assert.equal(data.subarray(1, 4).toString(), "PNG");
    assert.equal(data[25], 6, "PNG must use RGBA rather than an opaque JPEG background");
  }
});
