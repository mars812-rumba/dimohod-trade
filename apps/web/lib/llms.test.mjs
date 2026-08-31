import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(here, "../app");
const llmsSource = fs.readFileSync(path.join(here, "llms.ts"), "utf8");
const routeSource = fs.readFileSync(path.join(appRoot, "llms.txt/route.ts"), "utf8");
const scenarioSource = fs.readFileSync(path.join(here, "scenarioPages.ts"), "utf8");
const guideSource = fs.readFileSync(path.join(here, "guideArticles.ts"), "utf8");

const canonicalPathBlock = llmsSource.match(/export const llmsCanonicalPaths = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
const paths = [...canonicalPathBlock.matchAll(/"(\/[^\"]*)"/g)].map((match) => match[1]);

test("llms.txt is a cached UTF-8 plain-text route", () => {
  assert.match(routeSource, /status:\s*200/);
  assert.match(routeSource, /text\/plain; charset=utf-8/);
  assert.match(routeSource, /Cache-Control/);
  assert.match(routeSource, /renderLlmsTxt\(\)/);
});

test("llms.txt whitelist has unique canonical paths", () => {
  assert.ok(paths.length > 0);
  assert.equal(new Set(paths).size, paths.length);
  for (const urlPath of paths) {
    assert.ok(urlPath.startsWith("/"));
    assert.equal(urlPath.includes("?"), false);
    assert.equal(urlPath.includes("#"), false);
  }
});

test("llms.txt excludes private, legal, cart and SKU routes", () => {
  for (const urlPath of paths) {
    assert.doesNotMatch(urlPath, /^\/(admin|cart|product|privacy|cookie-policy|consent-personal-data|user-agreement)(\/|$)/);
  }
});

test("llms.txt static, scenario and guide routes exist in project sources", () => {
  const staticPages = new Set([
    "/",
    "/raschet",
    "/bystryy-raschet",
    "/zamery",
    "/configurator",
    "/catalog",
    "/solutions",
    "/pechi",
    "/guides",
    "/delivery",
    "/solutions/banya/zamery",
  ]);

  for (const urlPath of paths) {
    if (staticPages.has(urlPath)) {
      const pagePath = urlPath === "/"
        ? path.join(appRoot, "page.tsx")
        : path.join(appRoot, urlPath.slice(1), "page.tsx");
      assert.equal(fs.existsSync(pagePath), true, `Missing page for ${urlPath}`);
      continue;
    }

    if (urlPath.startsWith("/solutions/")) {
      const slug = urlPath.slice("/solutions/".length);
      assert.match(scenarioSource, new RegExp(`slug: ["']${slug}["']`));
      continue;
    }

    if (urlPath.startsWith("/guides/")) {
      const slug = urlPath.slice("/guides/".length);
      assert.match(guideSource, new RegExp(`slug: ["']${slug}["']`));
      continue;
    }

    assert.match(urlPath, /^\/catalog\/[a-z0-9-]+$/);
  }
});

test("llms.txt leads with task-based selection and describes real configurator output", () => {
  assert.match(llmsSource, /# Дымоход Трейд/);
  assert.match(llmsSource, /начать со своей задачи/);
  assert.match(llmsSource, /## Two calculation paths/);
  assert.match(llmsSource, /Быстрый предварительный расчёт/);
  assert.match(llmsSource, /Глубокий расчёт по полным замерам/);
  assert.match(llmsSource, /точная смета для заказа появляется после проверки менеджером/);
  assert.match(llmsSource, /возможным отклонением ±30%/);
  assert.match(llmsSource, /Bill of Materials \(BOM\)/);
  assert.match(llmsSource, /расчётная SVG-схема/);
  assert.match(llmsSource, /PDF-смет/);
  assert.match(llmsSource, /не заменяет инженерную проверку проекта перед монтажом/);
  assert.match(llmsSource, /## Chimney configurator/);
  assert.match(llmsSource, /## Product catalog/);
  assert.match(llmsSource, /## Measurement guides/);
  assert.match(llmsSource, /validateLlmsPaths/);
});
