import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("working hours use the owner-confirmed time without inventing weekdays", () => {
  const shared = read("./contactLinks.ts");
  assert.match(shared, /workingHoursText = "График работы: 9:00–17:00"/);
  assert.doesNotMatch(shared, /ежедневно|Пн|Пт|Сб|Вс/);
});

test("public contact blocks and estimate PDF use the same working hours", () => {
  for (const path of [
    "../components/SiteHeader.tsx", "../components/SiteFooter.tsx",
    "../components/ProductExperience.tsx", "../app/page.tsx",
    "../app/contacts/page.tsx", "../app/about/page.tsx",
    "../app/delivery/page.tsx", "../app/warranty/page.tsx",
    "../app/promyshlennye-dymohody/page.tsx", "../app/montazh/page.tsx",
    "./chimneyEstimatePdf.ts",
  ]) {
    const source = read(path);
    assert.match(source, /import \{ workingHoursText \}/, path);
    assert.match(source, /\{workingHoursText\}/, path);
  }
  assert.doesNotMatch(read("../app/contacts/page.tsx"), /Уточните часы работы/);
});
