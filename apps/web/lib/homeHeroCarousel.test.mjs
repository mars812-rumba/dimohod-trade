import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("../components/HomeHeroCarousel.tsx", import.meta.url);
const stylesUrl = new URL("../components/HomeHeroCarousel.module.css", import.meta.url);
const componentSource = await readFile(componentUrl, "utf8");
const stylesSource = await readFile(stylesUrl, "utf8");

test("hero carousel references existing responsive image assets", async () => {
  assert.doesNotMatch(componentSource, /\.mobile\.webp/);
  assert.doesNotMatch(componentSource, /<source\b/);

  const fileNames = [...componentSource.matchAll(/\["([^"]+\.webp)",/g)]
    .map((match) => match[1]);
  assert.ok(fileNames.length > 0);

  await Promise.all(fileNames.map((fileName) => access(new URL(
    `../public/images/home/hero-projects/${fileName}`,
    import.meta.url,
  ))));
});

test("hero carousel keeps a vh fallback for browsers without small viewport units", () => {
  const desktopFallback = stylesSource.indexOf("height: calc(100vh - 68px)");
  const desktopPreferred = stylesSource.indexOf("height: calc(100svh - 68px)");
  const mobileFallback = stylesSource.indexOf("height: calc(100vh - 72px)");
  const mobilePreferred = stylesSource.indexOf("height: calc(100svh - 72px)");

  assert.ok(desktopFallback >= 0 && desktopFallback < desktopPreferred);
  assert.ok(mobileFallback >= 0 && mobileFallback < mobilePreferred);
});
