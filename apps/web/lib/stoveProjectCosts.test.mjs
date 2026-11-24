import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { stoveProjectCosts } from "./stoveProjectCosts.ts";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("real project breakdowns retain the owner's amounts and match the published cases", () => {
  const cases = read("../components/HomeWorksShowcase.tsx");
  for (const project of stoveProjectCosts) {
    assert.equal(project.lines.reduce((sum, line) => sum + line.amount, 0), project.total);
    const start = cases.indexOf(`id: ${project.id},`);
    const block = cases.slice(start, cases.indexOf("\n    id:", start + 1));
    const values = [...block.matchAll(/value: "([\d ]+) ₽"/g)].map(match => Number(match[1].replaceAll(" ", "")));
    assert.deepEqual(values, [...project.lines.map(line => line.amount), project.total]);
  }
  assert.deepEqual(stoveProjectCosts.map(project => project.total), [96000, 213880]);
});

test("cost explanation stays scoped to the stove article with pickup and accessible tables", () => {
  const view = read("../components/GuideArticlePage.tsx");
  assert.match(view, /article\.slug === "komplekt-dymohoda-dlya-pechi" \? <GuideProjectCosts/);
  const component = read("../components/GuideProjectCosts.tsx");
  for (const text of ['scope="row"', 'scope="col"']) assert.ok(component.includes(text), text);
  assert.ok(stoveProjectCosts.find(project => project.id === 11).context.includes("самовывозом"));
  const actions = read("../components/GuideStoveActions.tsx");
  for (const href of ["/catalog/sendvich-truby", "/komplekty"]) assert.ok(actions.includes(href), href);
  assert.doesNotMatch(component, /use client|<form|AISI/);
});
