import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../components/PhoneMockup3D.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/PhoneMockup3D.module.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("homepage uses the interactive phone instead of the static configurator screenshot", () => {
  assert.match(page, /<PhoneMockup3D assetBasePath=\{basePath\}/);
  assert.doesNotMatch(page, /configurator-mobile\.webp/);
  assert.doesNotMatch(page, /configurator-desktop\.webp/);
});

test("phone mockup uses four external compressed screenshots", () => {
  for (const index of [1, 2, 3, 4]) {
    assert.match(component, new RegExp(`phone-mockup/screen-${index}\\.webp`));
  }
  assert.doesNotMatch(component, /data:image/);
});

test("continuous motion pauses offscreen and respects reduced motion", () => {
  assert.match(component, /IntersectionObserver/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /cancelAnimationFrame/);
  assert.match(component, /visibilitychange/);
});

test("slide controls have accessible names", () => {
  assert.match(component, /aria-label="Предыдущий экран"/);
  assert.match(component, /aria-label="Следующий экран"/);
  assert.match(component, /aria-pressed=\{index === activeSlide\}/);
});

test("phone presentation is enlarged without a translucent outer panel", () => {
  assert.match(styles, /\.scaleFrame[\s\S]*transform: scale\(1\.23\)/);
  assert.match(styles, /\.stage[\s\S]*background: transparent/);
  assert.match(styles, /\.arrow[\s\S]*border: 0/);
  assert.doesNotMatch(component, /styles\.(?:edge|sideEdge|topEdge|bottomEdge|leftEdge|rightEdge)/);
});
