import assert from "node:assert/strict";
import test from "node:test";
import { purchaseMetadata } from "./commercialMetadata.ts";

test("saved descriptive titles retain SKU dimensions and gain one purchase action", () => {
  const result = purchaseMetadata(
    "Сэндвич-дефлектор-конус — каталог и цены 115×215 мм | Дымоход Трейд",
    "Утепление 50 мм; артикул DT-SW50-03-15-D115-215. Применимость проверит специалист.",
  );
  assert.equal(result.title, "Сэндвич-дефлектор-конус 115×215 мм — купить | Дымоход Трейд");
  assert.equal(result.description, "Закажите выбранное исполнение. Утепление 50 мм; артикул DT-SW50-03-15-D115-215. Применимость проверит специалист.");
  assert.deepEqual(purchaseMetadata(result.title, result.description), result);
});

test("existing purchase wording survives without duplicate actions or altered brand names", () => {
  for (const action of ["Купить", "Заказать", "Закажите", "Приобрести", "На заказ", "Под заказ"]) {
    const title = `${action} комплект дымохода Ø115 мм | Дымоход Трейд`;
    const description = `${action} комплект. Перед заказом состав проверит специалист.`;
    assert.deepEqual(purchaseMetadata(title, description), { title, description });
  }
});

test("a reference to checks before ordering is not mistaken for an order invitation", () => {
  const description = "Перед заказом проверьте исполнение. AISI 304, 0,5 мм, артикул SKU-115.";
  const result = purchaseMetadata("Конденсатоотвод 115 мм | Дымоход Трейд", description);
  assert.match(result.title, /115 мм — купить/);
  assert.equal(result.description, `Закажите выбранное исполнение. ${description}`);
});

test("complete saved descriptions and kit-specific calls survive without truncating facts", () => {
  const description = `${"Подтверждённое описание. ".repeat(14)}Совместимость нужно проверить для конкретной печи.`;
  const result = purchaseMetadata("Комплект 6 м, Ø115 мм | Дымоход Трейд", description, "Закажите комплект дымохода.");
  assert.equal(result.description, `Закажите комплект дымохода. ${description}`);
  assert.ok(result.description.endsWith("Совместимость нужно проверить для конкретной печи."));
});

test("catalogue wording cleanup preserves dimensions, angles and ordinary subject words", () => {
  for (const subject of ["Отвод 90°", "Шибер — выдвижной", "Консоль универсальная"]) {
    const result = purchaseMetadata(`${subject} — каталог 150 мм — Дымоход Трейд`, "Описание.");
    assert.equal(result.title, `${subject} 150 мм — купить — Дымоход Трейд`);
  }
});
