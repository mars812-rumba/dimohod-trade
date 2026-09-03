import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const quick = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");
const intake = readFileSync(new URL("../components/BanyaIntakeFlow.tsx", import.meta.url), "utf8");
const configurator = readFileSync(new URL("../components/ChimneyConfigurator.tsx", import.meta.url), "utf8");

test("bathhouse keeps only the sauna stove in the quick calculation", () => {
  assert.match(quick, /objectType === "banya"[\s\S]*heaterChoices\.filter\(\(choice\) => choice\.id === "bania"\)/u);
  assert.match(quick, /if \(choice\.id === "banya"\) setEquipmentType\("bania"\)/u);
  assert.match(quick, /availableHeaterChoices\.map/u);
});

test("bathhouse normalizes stale heater values and filters the deep measurement flow", () => {
  assert.match(intake, /objectType === "banya" \? "bania" : normalizedEquipmentType/u);
  assert.match(intake, /value === "banya" \? "bania" : current\.equipmentType/u);
  assert.match(intake, /intakeEquipmentChoices\.filter\(\(\[value\]\) => value === "bania"\)/u);
  assert.match(intake, /availableEquipmentChoices\.map/u);
});

test("the final configurator preserves the bathhouse heater constraint", () => {
  assert.match(configurator, /transferredDraft\.objectType === "banya"[\s\S]*\? "bania"/u);
  assert.match(configurator, /STOVE_OPTIONS\.filter\(\(option\) => option\.id === "bania"\)/u);
  assert.match(configurator, /availableStoveOptions\.map/u);
});
