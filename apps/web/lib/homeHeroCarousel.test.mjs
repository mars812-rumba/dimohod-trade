import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("../components/HomeHeroCarousel.tsx", import.meta.url);
const stylesUrl = new URL("../components/HomeHeroCarousel.module.css", import.meta.url);
const globalStylesUrl = new URL("../app/globals.css", import.meta.url);
const componentSource = await readFile(componentUrl, "utf8");
const stylesSource = await readFile(stylesUrl, "utf8");
const globalStylesSource = await readFile(globalStylesUrl, "utf8");

test("hero carousel references existing responsive image assets", async () => {
  assert.doesNotMatch(componentSource, /\.mobile\.webp/);
  assert.match(componentSource, /<source src=\{`\$\{assetBasePath\}\/videos\/home\/0826\.mp4`\}/);

  const fileNames = [...componentSource.matchAll(/\["([^"]+\.webp)",/g)]
    .map((match) => match[1]);
  assert.ok(fileNames.length > 0);

  await Promise.all(fileNames.map((fileName) => access(new URL(
    `../public/images/home/hero-projects/${fileName}`,
    import.meta.url,
  ))));
  await access(new URL("../public/videos/home/0826.mp4", import.meta.url));
});

test("mobile hero explains production and exposes a secondary catalog action", () => {
  assert.match(componentSource, /Дымоходы высокого качества на точном оборудовании/u);
  assert.match(componentSource, /className=\{styles\.catalogCta\} href="\/catalog"/);
  assert.match(componentSource, /Открыть каталог/u);
  assert.match(stylesSource, /background: rgba\(16, 33, 39, 0\.58\)/);
});

test("mobile hero reserves orange for the primary action and keeps the production cue borderless", () => {
  assert.match(stylesSource, /\.cta \{[\s\S]*?background: #ed5b2a;/u);
  assert.match(stylesSource, /\.mobileCueSlot \{[\s\S]*?background: #2f7890;/u);
  assert.match(stylesSource, /\.videoCueIcon \{[\s\S]*?background: transparent;/u);
  assert.doesNotMatch(stylesSource.match(/\.videoCueIcon \{[\s\S]*?\}/u)?.[0] ?? "", /border:/u);
  assert.match(globalStylesSource, /\.mobile-menu-trigger \{[\s\S]*?border: 0;[\s\S]*?background: transparent;/u);
  assert.match(globalStylesSource, /\.header-phone \{[\s\S]*?border: 0;[\s\S]*?background: transparent;/u);
});

test("hero carousel keeps a vh fallback for browsers without small viewport units", () => {
  const desktopFallback = stylesSource.indexOf("height: calc(100vh - 68px)");
  const desktopPreferred = stylesSource.indexOf("height: calc(100svh - 68px)");
  const mobileFallback = stylesSource.indexOf("height: calc(100vh - 72px)");
  const mobilePreferred = stylesSource.indexOf("height: calc(100svh - 72px)");

  assert.ok(desktopFallback >= 0 && desktopFallback < desktopPreferred);
  assert.ok(mobileFallback >= 0 && mobileFallback < mobilePreferred);
});
