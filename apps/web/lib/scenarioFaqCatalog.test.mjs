import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import catalog from "./scenarioFaqCatalog.json" with { type: "json" };
import {
  banyaScenario, homeScenario, pechScenario, kaminScenario, mangalScenario,
  solidFuelBoilerScenario, gasBoilerScenario,
} from "./scenarioPages.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const mappings = [
  ["banya", banyaScenario], ["dom", homeScenario], ["pech", pechScenario],
  ["kamin", kaminScenario], ["mangalnaya-zona", mangalScenario],
  ["tverdotoplivny-kotel", solidFuelBoilerScenario], ["gazovyy-kotel", gasBoilerScenario],
];

test("nine separate route sets contain 72 complete, uniquely identified questions", () => {
  assert.equal(Object.keys(catalog).length, 9);
  const ids = new Set();
  for (const set of Object.values(catalog)) {
    assert.equal(set.items.length, 8);
    assert.ok(set.title);
    const questions = new Set();
    for (const item of set.items) {
      assert.ok(!ids.has(item.id));
      ids.add(item.id);
      assert.ok(!questions.has(item.question));
      questions.add(item.question);
      assert.ok(item.answer.length > 100);
      assert.doesNotMatch(item.answer, /R\d{2}|Примечание для Codex|https?:\/\//);
      for (const link of item.links) {
        assert.ok(existsSync(new URL(`../app${link.href}/page.tsx`, import.meta.url)));
        assert.ok(link.label.length > 4);
      }
    }
  }
  assert.equal(ids.size, 72);
});

for (const [slug, content] of mappings) {
  test(`${slug} uses its own route set for rendering and existing JSON-LD`, () => {
    assert.deepEqual(content.faq, catalog[`/solutions/${slug}`].items);
  });
}

test("home and industrial route use the shared bank without adding new structured types", () => {
  const home = read("../app/page.tsx");
  const industrial = read("../app/promyshlennye-dymohody/page.tsx");
  assert.match(home, /scenarioFaqCatalog\["\/"\]\.items/);
  assert.match(industrial, /scenarioFaqCatalog\["\/promyshlennye-dymohody"\]\.items/);
  assert.doesNotMatch(home, /"@type": "(?:FAQPage|QAPage)"/);
  assert.match(industrial, /mainEntity: faq\.map/);
});

test("public text preserves price, service and safety boundaries", () => {
  const byId = Object.fromEntries(Object.values(catalog).flatMap(set => set.items.map(item => [item.id, item])));
  assert.match(byId['HOME-02'].answer, /сумма неполная/);
  assert.match(byId['HOME-06'].answer, /не означает выезд монтажников в любой регион/);
  assert.match(byId['HOME-07'].answer, /документах на конкретный заказ/);
  assert.match(byId['INDUSTRIAL-03'].answer, /не подтверждение любой комбинации/);
  assert.match(byId['BANYA-03'].answer, /Утепление трубы не заменяет/);
  assert.match(byId['GAS-08'].answer, /не заменяет проверку допустимой схемы/);
});
