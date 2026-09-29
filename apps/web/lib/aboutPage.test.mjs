import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/about/page.module.css", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");

test("about page publishes the confirmed company story and conversion paths", () => {
  assert.match(page, /2014/);
  assert.match(page, /ROCKWOOL WIRED MAT 105/);
  assert.match(page, /105 кг\/м³/);
  assert.match(page, /до 15 минут/);
  assert.match(page, /окончательн(?:ую|ым) (?:смету|расчёт)/);
  assert.match(page, /\/bystryy-raschet#quick-estimate/);
  assert.match(page, /href="\/catalog"/);
  assert.match(page, /ул\. 2-й Луч, 4, корп\. 2/);
});

test("about page uses real production assets and responsive layout", () => {
  for (const asset of [
    "production-hero.webp",
    "active-workshop.webp",
    "laser-seam-welding.webp",
    "manual-assembly.webp",
    "rockwool-insulation.webp",
    "finished-chimney-components.webp",
  ]) {
    assert.match(page, new RegExp(asset.replace(".", "\\.")));
  }
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /@media \(max-width: 480px\)/);
});

test("about page has canonical metadata, structured data and navigation", () => {
  assert.match(page, /canonical: "\/about"/);
  assert.match(page, /type="application\/ld\+json"/);
  assert.match(page, /"@type": "AboutPage"/);
  assert.match(header, /href="\/about"/);
  assert.match(sitemap, /absoluteUrl\("\/about"\)/);
});

