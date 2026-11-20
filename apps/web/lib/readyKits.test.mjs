import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./readyKits.ts", import.meta.url), "utf8");
const executable = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/\bexport\s+/g, "");
const { kitMetadata, kitPath, kitRub, readyKitEstimate } = new Function(`${executable}; return {kitMetadata,kitPath,kitRub,readyKitEstimate};`)();

test("all twelve variants have distinct human-readable canonical, title and description", () => {
  const titles = new Set(), descriptions = new Set(), canonicals = new Set();
  for (const [route, heights] of [["roof", [4, 6]], ["wall", [3, 6]]]) {
    for (const height of heights) for (const diameter of [115, 120, 150]) {
      const direction = route === "roof" ? "perekrytie" : "stenu";
      const routeText = route === "roof" ? "через перекрытие" : "через стену";
      const kit = { slug: `cherez-${direction}-${height}m-d${diameter}`, route, height_m: height, diameter_mm: diameter,
        name: `Комплект дымохода ${routeText}, ${height} м, Ø${diameter} мм` };
      const meta = kitMetadata(kit);
      assert.ok(meta.title.includes(`${diameter} мм`));
      assert.equal(meta.alternates.canonical, kitPath(kit.slug));
      assert.ok(!meta.alternates.canonical.includes("?"));
      titles.add(meta.title); descriptions.add(meta.description); canonicals.add(meta.alternates.canonical);
    }
  }
  assert.equal(titles.size, 12); assert.equal(descriptions.size, 12); assert.equal(canonicals.size, 12);
});

test("missing price is not formatted as free and kopecks are retained", () => {
  assert.equal(kitRub(null), "Цена уточняется");
  assert.match(kitRub("1234.56"), /1\D234,56/);
});

test("editable kit SEO overrides legacy description without changing title or canonical", () => {
  const kit = { slug: "cherez-perekrytie-4m-d120", route: "roof", height_m: 4, diameter_mm: 120,
    name: "Комплект дымохода через перекрытие, 4 м, Ø120 мм" };
  const original = kitMetadata(kit);
  const edited = kitMetadata({ ...kit, content: { seo_description: "Новое описание Ø120 мм" } });
  assert.equal(edited.description, "Новое описание Ø120 мм");
  assert.equal(edited.title, original.title);
  assert.deepEqual(edited.alternates, original.alternates);
  assert.equal(kitMetadata({ ...kit, content: { seo_description: "  " } }).description, original.description);
});

test("kit content and FAQ stay server-rendered and admin-editable", async () => {
  const page = await readFile(new URL("../app/komplekty/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /content\?\.faq\.length/);
  assert.match(page, /<details[^>]*className=\{styles\.faqItem\}/);
  assert.match(page, /kitApplicationSections\(content\?\.application_description \|\| kit\.description/);
  const admin = await readFile(new URL("../components/AdminReadyKits.tsx", import.meta.url), "utf8");
  for (const field of ["short_description", "application_description", "composition_description", "selection_checklist", "faq", "seo_description"]) {
    assert.ok(admin.includes(field), field);
  }
  assert.match(admin, /Добавить вопрос/);
  assert.match(admin, /Удалить вопрос/);
});

test("BOM and metadata are server-rendered and selectors do not invent unavailable variants", async () => {
  const page = await readFile(new URL("../app/komplekty/[slug]/page.tsx", import.meta.url), "utf8");
  assert.ok(!page.includes('"use client"'));
  assert.match(page, /kit\.lines\.map/);
  assert.match(page, /application\/ld\+json/);
  const selectors = await readFile(new URL("../components/ReadyKitControls.tsx", import.meta.url), "utf8");
  assert.match(selectors, /variants\.filter/);
  assert.ok(!selectors.includes("[115, 120, 150]"));
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /getReadyKits\(\)/);
  assert.match(sitemap, /kitPath\(kit\.slug\)/);
});

test("ready-kit order collects one contact with consent, not a customer name or client-side BOM", async () => {
  const controls = await readFile(new URL("../components/ReadyKitControls.tsx", import.meta.url), "utf8");
  assert.match(controls, /quickEstimateContact\(String\(data\.get\("contact"\)/);
  assert.match(controls, /<PersonalDataConsent\s*\/>/);
  assert.match(controls, /data\.get\("personal_data_consent"\) !== "true"/);
  assert.match(controls, /ready-kits\/\$\{encodeURIComponent\(slug\)\}\/inquiry/);
  assert.match(controls, /sending\.current/);
  assert.ok(!controls.includes('<LeadForm'));
  assert.ok(!controls.includes('name="name"'));
  assert.ok(!controls.includes('estimate_json'));
  assert.ok(!controls.includes('solutionsCalcSubmit'));
});

test("ready kits is a top-level desktop and mobile navigation entry", async () => {
  const header = await readFile(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
  assert.match(header, /<\/details>\s*<Link href="\/komplekty">Готовые комплекты<\/Link>/);
  assert.match(header, /<\/details>\s*<Link href="\/komplekty" onClick=\{closeMenu\}>Готовые комплекты<\/Link>/);
  assert.equal((header.match(/href="\/komplekty"/g) ?? []).length, 2);
});

test("kit PDF retains server prices, images, structured groups and distinct repeated SKU rows", () => {
  const line = { sku_id: "same-sku", label: "Позиция", article: "REAL", sku_name: "Каталог", quantity: 2,
    unit_price_rub: "123.45", line_total_rub: "246.90", characteristics: ["Сохранённый текст"],
    primary_image: { url: "/media/catalog/photo.jpg" },
    characteristic_groups: [{ kind: "inner", title: "Внутренняя труба", fields: [{ key: "steel", label: "Сталь", value: "AISI 304" }] }] };
  const kit = { name: "Комплект", slug: "kit", lines: [line, { ...line, quantity: 1, line_total_rub: "123.45" }],
    known_subtotal_rub: "370.35", unpriced_count: 0, limitations: ["Условия"] };
  const estimate = readyKitEstimate(kit);
  assert.equal(estimate.knownSubtotalRub, 370.35);
  assert.equal(estimate.lines[0].unitPriceRub, 123.45);
  assert.deepEqual(estimate.lines[0].image, line.primary_image);
  assert.deepEqual(estimate.lines[0].characteristicGroups, line.characteristic_groups);
  assert.deepEqual(estimate.lines[0].characteristics, line.characteristics);
  assert.notEqual(estimate.lines[0].key, estimate.lines[1].key);
  assert.equal(estimate.totalUnits, 3);
  const unpriced = readyKitEstimate({ ...kit, unpriced_count: 1, lines: [{ ...line, unit_price_rub: null, line_total_rub: null }] });
  assert.equal(unpriced.lines[0].unitPriceRub, null);
});

test("manager PDF uses layer groups only where canonical catalogue characteristics already applied", async () => {
  const source = await readFile(new URL("../components/ManagerEstimateCard.tsx", import.meta.url), "utf8");
  const fn = source.split("\n").find(line => line.startsWith("function estimateForPdf("));
  assert.ok(fn);
  const code = ts.transpileModule(fn, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const forPdf = new Function(`${code}; return estimateForPdf;`)();
  const line = { key: "line", sku_id: "sku", label: "Позиция", characteristics: ["Правка менеджера"], note: "Примечание", quantity: 1 };
  const payload = { lead_id: "0123456789abcdef", revision: 2, customer: {}, removed_lines: [],
    estimate: { lines: [line], measurements: [], review_items: [], calculation_errors: [] } };
  const groups = [{ kind: "inner", title: "Внутренняя труба", fields: [{ label: "Сталь", value: "AISI 304" }] }];
  const metadata = { sku: { characteristic_groups: groups } };
  assert.equal(forPdf(payload, metadata).lines[0].characteristicGroups, undefined);
  metadata.sku.estimate_characteristics = ["Каноническая внутренняя и наружная труба"];
  const rendered = forPdf(payload, metadata).lines[0];
  assert.deepEqual(rendered.characteristicGroups, groups);
  assert.equal(rendered.note, "Примечание");
});
