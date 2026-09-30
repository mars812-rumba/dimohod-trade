import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/HomeWorksShowcase.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/HomeWorksShowcase.module.css", import.meta.url), "utf8");

test("completed object 1 shows the confirmed project details and separate prices", () => {
  assert.match(source, /scenario: "Дымоход для дома"/);
  assert.match(source, /activeObject\.scenario \?\? `Объект \$\{activeObject\.id\}`/);
  assert.match(source, /СНТ «Дунай»/);
  assert.match(source, /Dacha 2/);
  assert.match(source, /каркасном доме/);
  assert.match(source, /порошковой покраской/);
  assert.match(source, /120\/220 мм/);
  assert.match(source, /AISI 304/);
  assert.match(source, /0,8 мм/);
  assert.match(source, /97 500 ₽/);
  assert.match(source, /35 000 ₽/);
  assert.doesNotMatch(source, /132 500 ₽/);
});

test("completed object details have a dedicated responsive layout", () => {
  assert.match(source, /styles\.objectDetails/);
  assert.match(styles, /\.objectDetails/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(styles, /font-variant-numeric: tabular-nums/);
});
