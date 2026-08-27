import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const intakeSource = readFileSync(new URL("../components/BanyaIntakeFlow.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../components/ScenarioPageTemplate.module.css", import.meta.url), "utf8");

test("measurement choice icons share one normalized frame", () => {
  assert.match(intakeSource, /function ChoiceIcon/u);
  assert.equal(intakeSource.match(/<ChoiceIcon src=/gu)?.length, 4);
  assert.match(stylesSource, /\.choiceIconFrame\s*\{[\s\S]*?width:\s*64px;[\s\S]*?height:\s*64px;/u);
  assert.match(stylesSource, /\.choiceIcon\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*contain;/u);
});

test("measurement illustrations use calibrated visual scales", () => {
  for (const icon of [
    "object-bathhouse.webp",
    "object-house.webp",
    "heater-sauna.webp",
    "heater-stove.webp",
    "heater-solid-fuel.webp",
    "heater-gas.webp",
    "heater-diesel.webp",
    "outlet-top.webp",
    "outlet-rear.webp",
  ]) {
    assert.match(intakeSource, new RegExp(`${icon.replace(".", "\\.")}\": 1\\.`, "u"));
  }
});
