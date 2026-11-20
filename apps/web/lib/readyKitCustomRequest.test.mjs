import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(new URL("../components/ReadyKitCustomRequest.tsx", import.meta.url), "utf8");
const page = await readFile(new URL("../app/komplekty/page.tsx", import.meta.url), "utf8");

test("custom-kit CTA occurs once immediately after the four grouped cards", () => {
  assert.equal((page.match(/<ReadyKitCustomRequest \/>/g) || []).length, 1);
  assert.match(page, /<ReadyKitCustomRequest \/>\s*<p><Link href="\/catalog"/);
  assert.ok(page.indexOf("<ReadyKitCustomRequest />") > page.indexOf("<ReadyKitGroupCard"));
  for (const text of ["Нужен другой диаметр, высота или маршрут?", "Рассчитайте комплект под свою печь или передайте размеры специалисту",
    "Рассчитать в калькуляторе", "Заказать индивидуальный расчёт"]) assert.ok(component.includes(text));
});

test("calculator and specialist request have distinct existing workflows and retain lead source", async () => {
  assert.match(component, /href="\/bystryy-raschet"/);
  assert.match(component, /dialog\.current\?\.showModal\(\)/);
  assert.match(component, /<LeadForm source="Готовые комплекты"/);
  assert.match(component, /aria-haspopup="dialog"/);
  assert.match(component, /aria-labelledby=\{`\$\{id\}-form-title`\}/);
  assert.match(component, /dialog\.current\?\.close\(\)/);
  assert.ok(!component.includes("fetch("), "Reuse existing submission and analytics, no new endpoint");
  const form = await readFile(new URL("../components/LeadForm.tsx", import.meta.url), "utf8");
  assert.match(form, /data\.set\("source", source\)/);
  assert.match(form, /reachMetrikaGoal\(METRIKA_GOALS\.leadSubmitted/);
});
