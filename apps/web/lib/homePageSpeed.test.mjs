import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(path, import.meta.url), "utf8");

test("hero preloads one shared first slide without downloading mobile video or its poster", async () => {
  const hero = await source("../components/HomeHeroCarousel.tsx");
  assert.doesNotMatch(hero, /mobileVideoRequested|videoToggle|Посмотреть видео/);
  assert.doesNotMatch(hero, /<video|0826|mobileVideo|<source/);
  assert.match(hero, /<link rel="preload" as="image" href=\{`\$\{assetBasePath\}\/images\/home\/hero-projects\/\$\{slides\[0\]\[0\]\}`\} fetchPriority="high"/);
  assert.match(hero, /loading=\{activeIndex === 0 \? "eager" : "lazy"\}/);
});

test("phone screenshots use responsive optimization and MAX uses its small derivative", async () => {
  assert.doesNotMatch(await source("../components/PhoneMockup3D.tsx"), /\bunoptimized\b/);
  assert.match(await source("../components/MaxContactLink.tsx"), /max-52\.webp/);
  const original = await stat(new URL("../public/brand/max.webp", import.meta.url));
  const optimized = await stat(new URL("../public/brand/max-52.webp", import.meta.url));
  assert.ok(optimized.size < original.size / 2);
});

test("image quality allowlist preserves existing public page requests", async () => {
  const config = await source("../next.config.ts");
  for (const quality of [72, 75, 76, 78, 80, 82, 84, 86, 88]) {
    assert.match(config, new RegExp(`qualities: \\[.*\\b${quality}\\b`));
  }
});

test("small text and white primary button text meet AA contrast", () => {
  const luminance = (hex) => {
    const rgb = hex.match(/../g).map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const [foreground, background] of [["ffffff", "bd3d16"], ["52656c", "f4f6f5"], ["c4d4d8", "102127"]]) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5);
  }
});
