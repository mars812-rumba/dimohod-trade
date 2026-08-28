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

test("customer manager keeps its access token in the current tab", () => {
  assert.match(componentSource, /dimohod-trade:bom-admin-token/);
  assert.match(componentSource, /window\.sessionStorage/);
  assert.match(componentSource, /X-BOM-Admin-Token/);
  assert.match(componentSource, /cache: "no-store"/);
});

test("customer manager supports search and links to editable estimates", () => {
  assert.match(componentSource, /role="search"/);
  assert.match(componentSource, /Поиск клиента или замера/);
  assert.match(componentSource, /\/admin\/estimates\/\$\{estimate\.lead_id\}#admin=1/);
  assert.match(componentSource, /customer\.estimates\.map/);
});

test("customer manager exposes accessible login and status feedback", () => {
  assert.match(componentSource, /htmlFor="customer-admin-token"/);
  assert.match(componentSource, /aria-invalid/);
  assert.match(componentSource, /role="alert"/);
  assert.match(componentSource, /aria-live="polite"/);
});

test("customer database is excluded from search indexing", () => {
  assert.match(pageSource, /robots: \{ index: false, follow: false \}/);
});
