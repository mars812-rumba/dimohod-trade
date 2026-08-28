import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const loginSource = fs.readFileSync(path.join(here, "../components/AdminLoginForm.tsx"), "utf8");
const middlewareSource = fs.readFileSync(path.join(here, "../middleware.ts"), "utf8");
const adminPageSource = fs.readFileSync(path.join(here, "../app/admin/page.tsx"), "utf8");
const catalogPageSource = fs.readFileSync(path.join(here, "../app/admin/catalog/page.tsx"), "utf8");

test("admin login creates an HttpOnly-backed session through the API", () => {
  assert.match(loginSource, /\/api\/v1\/admin\/auth\/login/);
  assert.match(loginSource, /credentials: "include"/);
  assert.match(loginSource, /router\.replace\(nextPath\)/);
});

test("admin login form has labels, linked errors and busy feedback", () => {
  assert.match(loginSource, /htmlFor="admin-password"/);
  assert.match(loginSource, /aria-describedby/);
  assert.match(loginSource, /aria-invalid/);
  assert.match(loginSource, /role="alert"/);
  assert.match(loginSource, /aria-busy/);
});

test("middleware gates shared admin pages", () => {
  assert.match(middlewareSource, /dimohod_admin_session/);
  assert.match(middlewareSource, /\/admin\/login/);
  assert.match(middlewareSource, /\/admin\/customers\/\:path\*/);
  assert.match(middlewareSource, /\/admin\/catalog\/\:path\*/);
});

test("admin root opens customers while catalog has its own private route", () => {
  assert.match(adminPageSource, /redirect\("\/admin\/customers"\)/);
  assert.match(catalogPageSource, /AdminCatalogManager/);
  assert.match(catalogPageSource, /robots: \{ index: false, follow: false \}/);
});
