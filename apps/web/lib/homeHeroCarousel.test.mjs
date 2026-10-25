import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("../components/HomeHeroCarousel.tsx", import.meta.url);
const stylesUrl = new URL("../components/HomeHeroCarousel.module.css", import.meta.url);
const globalStylesUrl = new URL("../app/globals.css", import.meta.url);
const componentSource = await readFile(componentUrl, "utf8");
const stylesSource = await readFile(stylesUrl, "utf8");
const globalStylesSource = await readFile(globalStylesUrl, "utf8");

test("the owner's fireplace image opens the shared carousel and is preloaded first", () => {
  const images = [...componentSource.matchAll(/\["([^"]+\.webp)",/g)].map(match => match[1]);
  assert.equal(images[0], "designer-fireplace.webp");
  assert.equal(images.length, 10);
  assert.equal(new Set(images).size, 10);
  assert.equal(images[1], "industrial-facade.webp");
  assert.match(componentSource, /useState\(0\)/);
  assert.match(componentSource, /hero-projects\/\$\{slides\[0\]\[0\]\}/);
});

test("hero carousel references existing responsive image assets", async () => {
  assert.doesNotMatch(componentSource, /\.mobile\.webp/);
  assert.doesNotMatch(componentSource, /<video|\/videos\/|mobileVideoPosterPath|<picture/);

  const fileNames = [...componentSource.matchAll(/\["([^"]+\.webp)",/g)]
    .map((match) => match[1]);
  assert.ok(fileNames.length > 0);

  await Promise.all(fileNames.map((fileName) => access(new URL(
    `../public/images/home/hero-projects/${fileName}`,
    import.meta.url,
  ))));
});

test("mobile and desktop share slide rotation and swipes, respecting reduced motion", () => {
  assert.doesNotMatch(componentSource, /isMobile|mobileVideo|setIsMobile/);
  assert.match(componentSource, /if \(reduceMotion\) return;/);
  assert.match(componentSource, /6500/);
  assert.match(componentSource, /onTouchStart=/);
  assert.match(componentSource, /onTouchEnd=/);
  assert.match(componentSource, /showSlide\(activeIndex \+ \(delta < 0 \? 1 : -1\)\)/);
});

test("hero omits the visible disclosure badge and anchors the offer to its former top line", () => {
  assert.doesNotMatch(componentSource, /styles\.renderDisclosure/);
  assert.doesNotMatch(stylesSource, /\.renderDisclosure/);
  assert.match(stylesSource, /padding: 16px 0 64px;/);
  assert.match(stylesSource, /padding: 12px 0 calc\(18px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(stylesSource, /align-items: flex-start;/);
  assert.match(componentSource, /alt=\{`Концептуальная визуализация:/);
});

test("hero keeps a stable offer and sends the primary action to the quick calculation", () => {
  assert.match(componentSource, /Подберём комплект дымохода для вашего дома или бани/u);
  assert.match(componentSource, /Рассчитайте предварительную стоимость/u);
  assert.match(componentSource, /Производство дымоходов · Санкт-Петербург и Ленинградская область/u);
  assert.match(componentSource, /className=\{styles\.cta\} href="\/bystryy-raschet"/);
  assert.match(componentSource, /Рассчитать комплект/u);
});

test("hero preserves a secondary catalog action", () => {
  assert.match(componentSource, /className=\{styles\.catalogCta\} href="\/catalog"/);
  assert.match(componentSource, /Перейти в каталог/u);
  assert.match(stylesSource, /background: rgba\(16, 33, 39, 0\.58\)/);
});

test("desktop hero keeps both actions in one larger row below the offer copy", () => {
  assert.match(
    componentSource,
    /<div className=\{styles\.heroOffer\}>[\s\S]*?<p className=\{styles\.heroOfferText\}>[\s\S]*?<div className=\{styles\.heroActions\}>/u,
  );
  assert.match(stylesSource, /\.heroActions \{[\s\S]*?display: flex;[\s\S]*?gap: 12px;[\s\S]*?margin-top: 30px;/u);
  assert.match(stylesSource, /\.cta \{[\s\S]*?min-width: 260px;[\s\S]*?min-height: 58px;/u);
  assert.match(stylesSource, /\.catalogCta \{[\s\S]*?min-width: 220px;[\s\S]*?min-height: 58px;/u);
  const mobile = stylesSource.slice(stylesSource.indexOf("@media (max-width: 720px)"));
  assert.match(mobile, /\.heroActions \{\s*display: grid;/u);
  assert.doesNotMatch(mobile, /\.heroActions \{[^}]*position: absolute;/u);
});

test("mobile hero reserves orange for the primary action and keeps the offer readable over media", () => {
  assert.match(stylesSource, /\.cta \{[\s\S]*?background: #bd3d16;/u);
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
