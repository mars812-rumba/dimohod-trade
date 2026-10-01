import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const layoutSource = fs.readFileSync(path.join(here, "../app/layout.tsx"), "utf8");
const footerSource = fs.readFileSync(path.join(here, "../components/SiteFooter.tsx"), "utf8");
const homeSource = fs.readFileSync(path.join(here, "../app/page.tsx"), "utf8");
const industrialSource = fs.readFileSync(path.join(here, "../app/promyshlennye-dymohody/page.tsx"), "utf8");

test("root layout renders one shared public footer", () => {
  assert.match(layoutSource, /<SiteFooter \/>/);
  assert.match(footerSource, /pathname\.startsWith\("\/admin"\)/);
  assert.doesNotMatch(homeSource, /<footer/);
  assert.doesNotMatch(industrialSource, /<footer/);
});

test("shared footer credits the site developer with a direct Telegram link", () => {
  assert.match(footerSource, /href="https:\/\/t\.me\/marseloid"/);
  assert.match(footerSource, /Сайт разработан: @marseloid/);
  assert.match(footerSource, /IconBrandTelegram/);
});
