import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("header reserves action widths and offers installation in the compact desktop menu", () => {
  const css = read("../app/globals.css");
  const header = read("../components/SiteHeader.tsx");
  assert.match(css, /min-width: 1025px\) and \(max-width: 1640px/);
  assert.match(css, /\.header-right\s*\{[^}]*flex-shrink: 0;[^}]*white-space: nowrap;/);
  assert.match(header, /className="desktop-menu-install"><InstallAppButton/);
  for (const text of ['href="tel:+79650756555"', '<CartHeaderLink', 'href="/raschet"', 'href="/catalog"']) assert.ok(header.includes(text), text);
});

test("public copy names products and schemes without changing data identifiers", () => {
  const home = read("../app/page.tsx");
  assert.doesNotMatch(home, /типовой» диаметр|SVG-схем|выбранные SKU|Иллюстрации ниже — временные/);
  assert.match(home, /быстрый расчёт использует допущения/);
  assert.match(home, /визуализации, а не фотографии выполненных объектов/);
  assert.doesNotMatch(read("../components/HomeScenarioLanding.tsx"), /предварительные BOM/);
  const product = read("../components/ProductExperience.tsx");
  assert.match(product, /Комплектующие, подобранные для выбранного исполнения/);
  assert.match(product, /title === "Характеристики выбранного SKU" \? "Характеристики выбранного исполнения"/);
  assert.doesNotMatch(product, /выбранных в админке семейств/);
  assert.doesNotMatch(read("../components/HomeQuickEstimate.tsx"), /Подбираем реальные SKU|BOM уже рассчитан/);
});

test("all guides reuse the existing optional-attachment lead form with article context", () => {
  const view = read("../components/GuideArticlePage.tsx");
  assert.match(view, /import \{ LeadForm \} from "\.\/LeadForm"/);
  assert.match(view, /<summary[^>]*>Помочь с подбором<\/summary>/);
  assert.match(view, /source=\{`guide-selection:\$\{article.slug\}`\}/);
  assert.match(view, /configuration=\{`Подбор комплекта\. Статья: \$\{article.title\}`\}/);
  assert.match(view, /href=\{guideConfiguratorHref\}>Рассчитать самостоятельно/);
  assert.doesNotMatch(view, /Проверяемая основа|Граница предварительного расчёта/);
  assert.match(view, /Он не заменяет\s+паспорт отопителя, проект, документацию производителя/);
  const form = read("../components/LeadForm.tsx");
  assert.match(form, /\/api\/v1\/leads/);
  assert.doesNotMatch(form, /type="file"[^>]*required/);
});

test("route examples remain hypothetical without the editorial instruction", () => {
  const articles = read("./guideArticles.ts");
  assert.doesNotMatch(articles, /нельзя приписывать Лампово/);
  assert.match(articles, /Эти примеры объясняют порядок сравнения, а не описывают наши выполненные объекты/);
});
