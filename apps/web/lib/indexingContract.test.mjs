import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(here, "../app");
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");

const sitemap = read("sitemap.ts");
const robots = read("robots.txt/route.ts");
const product = read("product/[slug]/page.tsx");
const middleware = fs.readFileSync(path.join(here, "../middleware.ts"), "utf8");
const catalog = read("catalog/page.tsx");
const workspaces = [
  read("zamery/page.tsx"),
  read("solutions/banya/zamery/page.tsx"),
  read("raschet/page.tsx"),
  read("bystryy-raschet/page.tsx"),
];
const legalPages = [
  read("privacy/page.tsx"),
  read("consent-personal-data/page.tsx"),
  read("cookie-policy/page.tsx"),
  read("user-agreement/page.tsx"),
];

test("sitemap contains canonical content only and stable last-modified values", () => {
  assert.match(sitemap, /lastModified/);
  assert.match(sitemap, /category\.updated_at/);
  assert.match(sitemap, /page\.updated_at/);
  assert.match(sitemap, /catalogSeoPages\.filter\(\(page\) => page\.indexable\)/);
  for (const excluded of [
    "/privacy",
    "/consent-personal-data",
    "/cookie-policy",
    "/user-agreement",
    "/zamery",
    "/solutions/banya/zamery",
  ]) {
    assert.doesNotMatch(sitemap, new RegExp(`absoluteUrl\\(\"${excluded.replaceAll("/", "\\/")}\"\\)`));
  }
});

test("robots keeps private admin crawling blocked and consolidates duplicate parameters", () => {
  assert.match(robots, /Disallow:.*\/admin/);
  assert.match(robots, /Clean-param: utm_source&.*yclid/);
  assert.match(robots, /Clean-param: diameter&.*\/catalog\//);
  assert.match(robots, /Clean-param: sku&length.*\/product\//);
  assert.match(robots, /Sitemap:/);
  assert.match(robots, /status: 200/);
});

test("private workspaces and legal documents are noindex but links remain crawlable", () => {
  for (const source of [...workspaces, ...legalPages]) {
    assert.match(source, /robots:\s*\{ index: false, follow: true \}/);
  }
});

test("catalog has self-consistent searchable metadata", () => {
  assert.match(catalog, /alternates:\s*\{ canonical: "\/catalog" \}/);
  assert.match(catalog, /url: "\/catalog"/);
  assert.match(catalog, /const title =/);
  assert.match(catalog, /const description =/);
});

test("product query states are noindex and canonicalize to the clean diameter URL", () => {
  assert.match(product, /initialLengthMm !== null/);
  assert.match(product, /alternates:\s*\{ canonical: absoluteUrl\(canonicalPath\) \}/);
  assert.match(product, /index: false, follow: true/);
});

test("an unknown product fails during metadata generation before streaming begins", () => {
  assert.match(product, /if \(!product\) \{\s*notFound\(\);\s*\}/);
  assert.doesNotMatch(product, /title: "Товар не найден \| Дымоход Трейд"/);
  assert.match(middleware, /NextResponse\.rewrite\(notFoundUrl, \{ status: 404 \}\)/);
  assert.match(middleware, /"\/product\/:path\*"/);
});

test("IndexNow exposes a validated key and only submits explicit same-origin URLs", () => {
  const keyRoute = read("indexnow-key.txt/route.ts");
  const submitter = fs.readFileSync(path.join(here, "../../../tools/submit_indexnow.mjs"), "utf8");
  assert.match(keyRoute, /\^\[A-Za-z0-9-\]\{8,128\}\$/);
  assert.match(keyRoute, /status: 404/);
  assert.match(submitter, /https:\/\/yandex\.com\/indexnow/);
  assert.match(submitter, /new URL\(url\)\.origin !== origin/);
  assert.match(submitter, /urls\.length > 10_000/);
});
