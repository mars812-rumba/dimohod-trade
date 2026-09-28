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

test("hero keeps a stable offer and sends the primary action to the quick calculation", () => {
  assert.match(componentSource, /Рассчитайте комплект дымохода за 2 минуты/u);
  assert.match(componentSource, /Ответьте на 5 простых вопросов/u);
  assert.match(componentSource, /предварительную смету и состав/u);
  assert.match(componentSource, /className=\{styles\.cta\} href="\/bystryy-raschet"/);
  assert.match(componentSource, /Рассчитать комплект/u);
});

test("hero preserves a secondary catalog action", () => {
  assert.match(componentSource, /className=\{styles\.catalogCta\} href="\/catalog"/);
  assert.match(componentSource, /Открыть каталог/u);
  assert.match(stylesSource, /background: rgba\(16, 33, 39, 0\.58\)/);
});

test("mobile hero reserves orange for the primary action and keeps the offer readable over media", () => {
  assert.match(stylesSource, /\.cta \{[\s\S]*?background: #ed5b2a;/u);
  assert.match(stylesSource, /\.carouselFrame::after \{[\s\S]*?linear-gradient/u);
  assert.match(stylesSource, /\.heroOffer \{[\s\S]*?color: #fff;/u);
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
