import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const files = ["../app/page.tsx", "../components/SiteHeader.tsx", "../components/ProductGalleryPreview.tsx",
  "../components/ProductExperience.tsx", "../components/CatalogProductCard.tsx", "../components/HomeWorksShowcase.tsx",
  "../components/HomeQuickEstimate.tsx", "../components/HomeScenarioLanding.tsx", "../components/BanyaScenarioLanding.tsx"];

test("metadata is blocking for all clients, not just known bot names", () => {
  const source = read("../next.config.ts");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    .replace("export default nextConfig;", "return nextConfig;");
  const config = new Function("process", js)({ env: {} });
  for (const ua of ["", "Mozilla/5.0 Chrome/130", "Googlebot", "YandexBot", "Validator.nu/LV", "Twitterbot"]) {
    assert.equal(config.htmlLimitedBots.test(ua), true, ua);
  }
});

test("reported generic div labels have an explicit meaningful role", () => {
  for (const name of files) {
    const source = ts.createSourceFile(name, read(name), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === "div") {
        const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
        if (attrs.some(a => a.name.getText(source) === "aria-label")) {
          const role = attrs.find(a => a.name.getText(source) === "role");
          assert.ok(role?.initializer && ts.isStringLiteral(role.initializer), `${name}: ${node.getText(source)}`);
          assert.ok(["group", "region", "img", "status", "dialog"].includes(role.initializer.text), name);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test("review articles have author headings with the previous visual treatment", () => {
  const page = read("../app/page.tsx");
  const css = read("../app/page.module.css");
  assert.match(page, /<h3 className=\{styles.reviewAuthor\}>\{review.author\}<\/h3>/);
  assert.match(css, /\.reviewAuthor \{\s*margin: 0;[\s\S]*?font-size: 15px;[\s\S]*?font-weight: 700;/);
});

test("named carousel section uses its native region semantics", () => {
  const source = read("../components/HomeHeroCarousel.tsx");
  assert.match(source, /aria-roledescription="карусель"/);
  assert.match(source, /aria-label="Визуализации вариантов дымоходных систем"/);
  assert.doesNotMatch(source, /role="region"/);
});

test("route cards do not nest block headings in spans and trust articles have headings", () => {
  const page = read("../app/page.tsx");
  assert.match(page, /<div className=\{styles.routeExampleBody\}>\s*<h3>/);
  assert.doesNotMatch(page, /<span className=\{styles.routeExampleBody\}>/);
  for (const heading of ["Конкретные позиции", "Без неподтверждённых обещаний", "Инженерная проверка"]) {
    assert.ok(page.includes(`<h3>${heading}</h3>`));
  }
  const badge = read("../components/YandexRatingBadge.tsx");
  assert.match(badge, /role="group"/);
});
