import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const button = readFileSync(new URL("../components/CustomerDeleteButton.tsx", import.meta.url), "utf8");
const manager = readFileSync(new URL("../components/AdminCustomerManager.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/AdminCustomerManager.module.css", import.meta.url), "utf8");

test("customer deletion requires a fresh authenticated preview and explicit confirmation", () => {
  assert.match(button, /\/api\/v1\/admin\/customers\/\$\{customerId\}\/deletion-preview/);
  assert.match(button, /method: "DELETE", credentials: "include", cache: "no-store"/);
  assert.match(button, /expected_version: preview.version, confirmation: "delete_customer_with_estimates"/);
  assert.match(button, /if \(sending.current \|\| !preview \|\| !confirmed\) return/);
  assert.match(button, /disabled=\{busy \|\| !confirmed\}/);
  assert.match(button, /preview.lead_count/);
  assert.match(button, /preview.estimate_count/);
  assert.doesNotMatch(button, /dangerouslySetInnerHTML/);
});

test("errors keep the card; changed records require a new preview; cancel and Escape are supported", () => {
  assert.match(button, /response.status === 409\) \{ setPreview\(null\); setConfirmed\(false\)/);
  assert.match(button, /response.status === 401/);
  assert.match(button, /data\?\.status !== "deleted"/);
  assert.match(button, /role="alert"/);
  assert.match(button, /role="dialog" aria-labelledby/);
  assert.match(button, /e.key === "Escape" && !busy/);
  assert.match(button, /autoFocus disabled=\{busy\}/);
  assert.match(css, /\.customerDeletion button, \.undoDeletion button \{\s*min-height: 44px/);
});

test("successful deletion updates the list and provides authenticated recovery without reusing contact IDs", () => {
  assert.match(manager, /<CustomerDeleteButton customerId=\{customer.id\}/);
  assert.match(manager, /current.filter\(item => item.id !== customer.id\)/);
  assert.match(manager, /\/api\/v1\/admin\/customers\/trash\/\$\{deletionId\}\/restore/);
  assert.match(manager, /method: "POST", credentials: "include", cache: "no-store"/);
  assert.match(manager, /Восстановить клиента и сметы/);
  assert.match(manager, /if \(!deleted \|\| restoreSending.current\) return/);
});
