import assert from "node:assert/strict";
import test from "node:test";
import { quickEstimateContact, isQuickEstimateLead } from "./quickEstimateLead.ts";

test("a single field accepts a phone or normalizes a Telegram handle/link", () => {
  assert.deepEqual(quickEstimateContact(" +7 (999) 123-45-67 "), { method: "phone", value: "+7 (999) 123-45-67" });
  for (const value of ["@test_user", "test_user", "https://t.me/test_user", "t.me/test_user/"]) {
    assert.deepEqual(quickEstimateContact(value), { method: "telegram", value: "@test_user" });
  }
  for (const value of ["", "-------", "123", "@abc", "a@b.com", "https://example.com/test_user"]) {
    assert.equal(quickEstimateContact(value), null);
  }
});

test("only a complete saved receipt can restore the result and callback action", () => {
  const receipt = { id: "a".repeat(32), callbackToken: "b".repeat(43), callbackRequested: false,
    customer: { name: "", contactMethod: "telegram", contact: "@test_user" } };
  assert.equal(isQuickEstimateLead(receipt), true);
  for (const changes of [{ id: "" }, { callbackToken: "" }, { customer: null },
    { customer: { name: "", contactMethod: "phone", contact: "@test_user" } }, { callbackRequested: undefined }]) {
    assert.equal(isQuickEstimateLead({ ...receipt, ...changes }), false);
  }
});
