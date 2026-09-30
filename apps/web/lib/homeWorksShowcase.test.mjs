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

test("completed objects 3 and 5 show confirmed scenarios, specifications and prices", () => {
  assert.match(source, /scenario: "Дымоход для ТТ-котла"/);
  assert.match(source, /Медное озеро/);
  assert.match(source, /200\/300 мм/);
  assert.match(source, /AISI 321/);
  assert.match(source, /87 000 ₽/);
  assert.match(source, /60 000 ₽/);

  assert.match(source, /scenario: "Дымоход для деревянного дома"/);
  assert.match(source, /Остров Большой Берёзовый/);
  assert.match(source, /Everest T6/);
  assert.match(source, /65 000 ₽/);
  assert.match(source, /62 500 ₽/);
  assert.match(source, /42 000 ₽/);
  assert.doesNotMatch(source, /object-5\/01\.webp/);
  assert.match(source, /object-5\/02\.webp/);
});

test("unfinished objects 2 and 4 stay in source but are hidden from publication", () => {
  assert.match(source, /id: 2,\s+published: false/);
  assert.match(source, /id: 4,\s+published: false/);
  assert.match(source, /workObject\.published !== false/);
});

test("completed object details have a dedicated responsive layout", () => {
  assert.match(source, /styles\.objectDetails/);
  assert.match(styles, /\.objectDetails/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(styles, /font-variant-numeric: tabular-nums/);
});
