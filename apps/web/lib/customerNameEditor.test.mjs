import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor = readFileSync(new URL("../components/CustomerNameEditor.tsx", import.meta.url), "utf8");
const manager = readFileSync(new URL("../components/AdminCustomerManager.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/AdminCustomerManager.module.css", import.meta.url), "utf8");

test("customer cards offer add/edit name without modifying contact or estimate data", () => {
  assert.match(manager, /<CustomerNameEditor customerId=\{customer.id\}/);
  assert.match(manager, /\{ \.\.\.customer, name, updated_at: updatedAt \}/);
  assert.match(editor, /name \|\| "Без имени"/);
  assert.match(editor, /Добавить имя клиента/);
  assert.match(editor, /Редактировать имя клиента/);
  assert.doesNotMatch(editor, /dangerouslySetInnerHTML/);
});

test("name saves require an authenticated no-cache PATCH and the original name", () => {
  assert.match(editor, /\/api\/v1\/admin\/customers\/\$\{customerId\}\/name/);
  assert.match(editor, /method: "PATCH", credentials: "include", cache: "no-store"/);
  assert.match(editor, /expected_name: expectedName/);
  assert.match(editor, /setExpectedName\(name\)/);
  assert.match(editor, /if \(sending.current\) return/);
});

test("name form supports clearing, cancellation, accessible errors and mobile input", () => {
  assert.match(editor, /maxLength=\{100\}/);
  assert.match(editor, /draft.trim\(\)/);
  assert.match(editor, /Пустое поле уберёт имя/);
  assert.match(editor, /event.key === "Escape"/);
  assert.match(editor, /role="alert"/);
  assert.match(editor, /role="status"/);
  assert.match(editor, /Сессия истекла/);
  assert.match(css, /\.customerNameEditor input \{[^}]*font-size: 16px/);
});
