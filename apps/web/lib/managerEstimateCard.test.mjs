import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const componentSource = fs.readFileSync(
  path.join(here, "../components/ManagerEstimateCard.tsx"),
  "utf8",
);
const pageSource = fs.readFileSync(
  path.join(here, "../app/admin/estimates/[leadId]/page.tsx"),
  "utf8",
);

test("manager card exchanges a fragment token through a private header", () => {
  assert.match(componentSource, /window\.location\.hash/);
  assert.match(componentSource, /X-Lead-Manager-Token/);
  assert.match(componentSource, /history\.replaceState/);
  assert.match(componentSource, /cache: "no-store"/);
  assert.match(componentSource, /credentials: "include"/);
  assert.match(componentSource, /usesAdminSession/);
  assert.match(componentSource, /hashParams\.get\("admin"\) === "1"/);
});

test("manager card renders customer measurements and BOM", () => {
  assert.match(componentSource, /Клиент/);
  assert.match(componentSource, /Замеры/);
  assert.match(componentSource, /Состав комплекта/);
  assert.match(componentSource, /payload\.estimate\.lines\.map/);
});

test("manager card exposes accessible CRUD controls and catalog search", () => {
  assert.match(componentSource, /Редактировать \$\{line\.label\}/);
  assert.match(componentSource, /Заменить SKU для \$\{line\.label\}/);
  assert.match(componentSource, /Удалить \$\{line\.label\}/);
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /manager-sku-search/);
  assert.match(componentSource, /\/items\/\$\{line\.id\}/);
  assert.match(componentSource, /\/restore/);
});

test("manager page is excluded from search indexing", () => {
  assert.match(pageSource, /robots: \{ index: false, follow: false \}/);
});
