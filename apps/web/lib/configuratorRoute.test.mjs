import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../app/configurator/page.tsx", import.meta.url), "utf8");
const headerSource = await readFile(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const draftSource = await readFile(new URL("./configuratorDraft.ts", import.meta.url), "utf8");
const profilesSource = await readFile(new URL("./calculationProfiles.ts", import.meta.url), "utf8");
const scenariosSource = await readFile(new URL("./scenarioPages.ts", import.meta.url), "utf8");

test("the full configurator lives on its own canonical route", () => {
  assert.doesNotMatch(homeSource, /import \{ ChimneyConfigurator \}/);
  assert.doesNotMatch(homeSource, /<ChimneyConfigurator/);
  assert.match(routeSource, /alternates: \{ canonical: "\/configurator" \}/);
  assert.match(routeSource, /<ChimneyConfigurator assetBasePath=\{assetBasePath\} \/>/);
});

test("the homepage keeps a compact entry instead of the full workspace", () => {
  assert.match(homeSource, /className=\{styles\.calculatorEntrySection\}/);
  assert.match(homeSource, /Открыть конфигуратор/);
  assert.match(homeSource, /href="\/configurator"/);
});

test("all saved-profile and scenario links target the dedicated route", () => {
  assert.match(headerSource, /header-configurator" href="\/configurator"/);
  assert.match(draftSource, /return `\/configurator\?\$\{params\.toString\(\)\}`/);
  assert.match(profilesSource, /return `\/configurator\?\$\{params\.toString\(\)\}`/);
  assert.match(scenariosSource, /`\/configurator\?\$\{query\}` : "\/configurator"/);
});
