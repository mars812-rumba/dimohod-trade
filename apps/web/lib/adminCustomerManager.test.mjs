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
  assert.match(componentSource, /previousEstimates\.map/);
  assert.doesNotMatch(componentSource, /href="\/admin\/catalog"/);
  assert.doesNotMatch(componentSource, /Управление каталогом/);
});

test("customer estimates keep the latest visible and collapse previous calculations", () => {
  assert.match(componentSource, /sortedEstimates\(customer\.estimates\)/);
  assert.match(componentSource, /className=\{styles\.customerSummary\}/);
  assert.match(componentSource, /className=\{styles\.estimateOverview\}/);
  assert.match(componentSource, /className=\{styles\.estimateTotal\}/);
  assert.match(componentSource, /className=\{styles\.openEstimate\}/);
  assert.match(componentSource, /<details className=\{styles\.previousEstimates\}>/);
  assert.match(componentSource, /<summary>/);
  assert.match(componentSource, /Предыдущие расчёты/);
  assert.match(componentSource, /previousEstimates\.map/);
  assert.match(componentSource, /Открыть смету/);
});

test("customer manager exposes status feedback", () => {
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /Загружаем клиентов/);
});

test("latest estimate and note buttons share a two-column row with matching heights", () => {
  const notes=fs.readFileSync(path.join(here,"../components/LeadNotes.tsx"),"utf8");
  const css=fs.readFileSync(path.join(here,"../components/AdminCustomerManager.module.css"),"utf8");
  assert.match(componentSource, /onSaved=\{notes => updateNotes\(customer.id, latestEstimate.lead_id, notes\)\}>/);
  assert.match(componentSource, /Открыть смету[\s\S]*?<\/Link>\s*<\/LeadNotes>/);
  assert.match(notes, /styles.leadActionButtons/);
  assert.match(css, /\.leadActionButtons \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /min-height: 52px; box-sizing: border-box/);
});

test("internal notes are shown before opening both latest and previous estimates", () => {
  assert.match(componentSource, /notes\?: string/);
  assert.equal(componentSource.match(/<LeadNotes /g)?.length,2);
  assert.match(componentSource, /<LeadNotes[\s\S]*?className=\{styles.openEstimate\}/);
  const notes=fs.readFileSync(path.join(here,"../components/LeadNotes.tsx"),"utf8");
  assert.match(notes, /method: "PATCH", credentials: "include", cache: "no-store"/);
  assert.match(notes, /expected_notes: notes/);
  assert.match(notes, /textarea/);
  assert.match(notes, /role="alert"/);
  assert.match(notes, /maxLength=\{5000\}/);
  assert.match(notes, /\{notes \? <p className=\{styles.noteText\}/);
});

test("customer database is excluded from search indexing", () => {
  assert.match(pageSource, /robots: \{ index: false, follow: false \}/);
});
