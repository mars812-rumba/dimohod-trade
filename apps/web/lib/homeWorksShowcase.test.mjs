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

test("fireplace case publishes all six photos and uses the finished view as its cover", () => {
  assert.match(source, /id: 6,\s+scenario: "Камины"/);
  assert.match(source, /coverPhoto: "\/images\/works\/object-6\/06\.webp"/);
  assert.match(source, /КП «Дворянская усадьба»/);
  assert.match(source, /Установка каминной топки под ключ/);
  assert.match(source, /герметизация кровли/);
  assert.match(source, /каркаса декоративного короба/);
  assert.match(source, /силиката кальция SILCA/);
  assert.match(source, /115 300 ₽/);
  assert.match(source, /300 000 ₽/);
  for (let index = 1; index <= 6; index += 1) {
    assert.match(source, new RegExp(`object-6\\/0${index}\\.webp`));
  }
  assert.match(source, /workObject\.coverPhoto \?\? workObject\.photos\[0\]\.src/);
});

test("bathhouse case shows the confirmed materials, work prices and selected cover", () => {
  assert.match(source, /id: 7,\s+scenario: "Дымоход для бани"/);
  assert.match(source, /coverPhoto: "\/images\/works\/object-7\/03\.webp"/);
  assert.match(source, /Дивенская/);
  assert.match(source, /аустенитная нержавеющая сталь AISI 304, 1 мм/);
  assert.match(source, /фиброцементные плиты «Фаспан», 9 мм/);
  assert.match(source, /68 872 ₽/);
  assert.match(source, /33 000 ₽/);
  assert.match(source, /8 000 ₽/);
  for (let index = 1; index <= 4; index += 1) {
    assert.match(source, new RegExp(`object-7\\/0${index}\\.webp`));
  }
});

test("industrial chimney case shows the confirmed project details and all eight photos", () => {
  assert.match(source, /id: 8,\s+scenario: "Промышленные дымоходы"/);
  assert.match(source, /coverPhoto: "\/images\/works\/object-8\/01\.webp"/);
  assert.match(source, /Пожарная часть/);
  assert.match(source, /Диаметр 250\/350 мм/);
  assert.match(source, /Нержавеющая сталь AISI 304/);
  assert.match(source, /Толщина стали 0,8 мм/);
  assert.match(source, /488 200 ₽/);
  assert.match(source, /640 000 ₽/);
  assert.match(source, /365 000 ₽/);
  for (let index = 1; index <= 8; index += 1) {
    assert.match(source, new RegExp(`object-8\\/0${index}\\.webp`));
  }
});

test("barbecue area case publishes all six photos and uses the finished exterior as its cover", () => {
  assert.match(source, /id: 9,\s+scenario: "Дымоходы для мангальных зон"/);
  assert.match(source, /coverPhoto: "\/images\/works\/object-9\/05\.webp"/);
  for (let index = 1; index <= 6; index += 1) {
    assert.match(source, new RegExp(`object-9\\/0${index}\\.webp`));
  }
});

test("completed object details have a dedicated responsive layout", () => {
  assert.match(source, /styles\.objectDetails/);
  assert.match(styles, /\.objectDetails/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(styles, /font-variant-numeric: tabular-nums/);
});
