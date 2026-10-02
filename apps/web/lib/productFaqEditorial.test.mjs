import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicFaqSource = readFileSync(new URL("./productFaq.ts", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../components/AdminCatalogManager.tsx", import.meta.url), "utf8");

test("public product FAQ never reads an unpublished draft", () => {
  assert.match(publicFaqSource, /product\.extra_attributes\.faq/);
  assert.doesNotMatch(publicFaqSource, /faq_draft/);
});

test("admin provides an evidence-gated draft and explicit publication workflow", () => {
  assert.match(adminSource, /faq_draft/);
  assert.match(adminSource, /Основание ответа/);
  assert.match(adminSource, /Сохранить черновик/);
  assert.match(adminSource, /Опубликовать FAQ/);
  assert.match(adminSource, /Снять с публикации/);
  assert.match(adminSource, /Собрать из подтверждённых данных/);
});
