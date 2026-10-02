import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/delivery/page.tsx", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");

test("delivery page publishes only the confirmed nationwide terms", () => {
  assert.match(page, /из Санкт-Петербурга/);
  assert.match(page, /«Деловые Линии»/);
  assert.match(page, /рассчитываем индивидуально/);
  assert.match(page, /100% предоплат/);
});

test("delivery page has stable metadata and discovery links", () => {
  assert.match(page, /alternates: \{ canonical: "\/delivery" \}/);
  assert.match(page, /url: "\/delivery"/);
  assert.match(sitemap, /absoluteUrl\("\/delivery"\)/);
  assert.match(header, /href="\/delivery"[^>]*>Доставка/);
});

test("delivery page shows optimized shipment photos with responsive image markup", () => {
  assert.match(page, /\/images\/delivery\/order-loaded\.webp/);
  assert.match(page, /\/images\/delivery\/sandwich-pipes-shipment\.webp/);
  assert.equal(page.match(/loading="lazy"/g)?.length, 2);
  assert.match(page, /sizes="\(max-width: 760px\)/);
});
