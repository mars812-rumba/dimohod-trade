import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/page.module.css", import.meta.url), "utf8");

test("homepage explains nationwide delivery without inventing a fixed price", () => {
  assert.match(page, /Доставка по всей России\./);
  assert.match(page, /Стоимость и способ доставки рассчитываем индивидуально для каждого заказа/);
  assert.match(page, /Уточнить доставку/);
  assert.match(page, /className=\{styles\.deliveryAction\} href="tel:\+79650756555"/);
});

test("delivery sits between the contact form and the physical store map", () => {
  assert.match(
    page,
    /className=\{styles\.contactSection\}[\s\S]*className=\{styles\.deliverySection\}[\s\S]*className=\{styles\.mapSection\}/,
  );
  assert.match(styles, /\.deliveryBand[\s\S]*grid-template-columns: 72px minmax\(0, 1fr\) auto/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.deliveryAction[\s\S]*grid-column: 1 \/ -1/);
});
