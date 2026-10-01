import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(
  new URL("../app/promyshlennye-dymohody/page.tsx", import.meta.url),
  "utf8",
);
const sitemapSource = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
const headerSource = await readFile(
  new URL("../components/SiteHeader.tsx", import.meta.url),
  "utf8",
);

test("industrial landing has verified limits and complete metadata", () => {
  assert.match(pageSource, /до 1000 мм/u);
  assert.match(pageSource, /до 1,25 мм/u);
  assert.match(pageSource, /alternates: \{ canonical: pagePath \}/u);
  assert.match(pageSource, /openGraph:/u);
  assert.match(pageSource, /"@type": "FAQPage"/u);
  assert.match(pageSource, /Изготовление и монтаж промышленных дымоходов/u);
  assert.doesNotMatch(pageSource, /[—–]/u);
});

test("industrial landing uses the published industrial work and no calculator", () => {
  assert.match(pageSource, /HomeWorksShowcase objectIds=\{\[8\]\}/u);
  assert.match(pageSource, /Промышленный дымоход для пожарной части/u);
  assert.doesNotMatch(pageSource, /Configurator|калькулятор/ui);
});

test("industrial landing is discoverable from navigation and sitemap", () => {
  assert.match(sitemapSource, /promyshlennye-dymohody/u);
  assert.match(headerSource, /href="\/promyshlennye-dymohody"/u);
});

test("all supplied project photographs are stored as optimized assets", async () => {
  const assets = [
    "support-towers.webp",
    "facade-connection-stage.webp",
    "twin-outlets.webp",
    "roof-level-detail.webp",
    "facade-installation-lift.webp",
    "twin-facade-system.webp",
    "connection-installation.webp",
  ];
  await Promise.all(assets.map((asset) => access(new URL(`../public/images/industrial-chimneys/${asset}`, import.meta.url))));
});
