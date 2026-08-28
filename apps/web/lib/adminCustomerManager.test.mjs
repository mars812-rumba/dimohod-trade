import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const componentSource = fs.readFileSync(
  path.join(here, "../components/AdminCustomerManager.tsx"),
  "utf8",
);
const pageSource = fs.readFileSync(
  path.join(here, "../app/admin/customers/page.tsx"),
  "utf8",
);

test("customer manager uses the protected admin session", () => {
  assert.match(componentSource, /credentials: "include"/);
  assert.match(componentSource, /\/api\/v1\/admin\/auth\/logout/);
  assert.match(componentSource, /\/admin\/login\?next=\/admin\/customers/);
  assert.match(componentSource, /cache: "no-store"/);
});

test("customer manager supports search and links to editable estimates", () => {
  assert.match(componentSource, /role="search"/);
  assert.match(componentSource, /Поиск клиента или замера/);
  assert.match(componentSource, /\/admin\/estimates\/\$\{estimate\.lead_id\}#admin=1/);
  assert.match(componentSource, /customer\.estimates\.map/);
});

test("customer manager exposes status feedback", () => {
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /Загружаем клиентов/);
});

test("customer database is excluded from search indexing", () => {
  assert.match(pageSource, /robots: \{ index: false, follow: false \}/);
});
