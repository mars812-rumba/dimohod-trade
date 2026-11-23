import assert from "node:assert/strict";
import test from "node:test";
import { quickEstimateContact, isQuickEstimateLead } from "./quickEstimateLead.ts";

test("phone, MAX and WhatsApp accept only phone numbers", () => {
  for (const method of ["phone", "max", "whatsapp"]) {
    assert.deepEqual(quickEstimateContact(" +7 (999) 123-45-67 ", method), { method, value: "+7 (999) 123-45-67" });
    for (const value of ["", "-------", "123", "@test_user", "test_user", "https://t.me/test_user", "a@b.com", "https://example.com/79991234567", "1234567890123456"]) {
      assert.equal(quickEstimateContact(value, method), null);
    }
  }
  for (const method of ["telegram", "email", "unknown", null]) assert.equal(quickEstimateContact("+79991234567", method), null);
});

test("only a complete saved receipt can restore the result and callback action", () => {
  const receipt = { id: "a".repeat(32), callbackToken: "b".repeat(43), callbackRequested: false,
    customer: { name: "", contactMethod: "max", contact: "+79991234567" } };
  for (const contactMethod of ["phone", "max", "whatsapp"]) assert.equal(isQuickEstimateLead({ ...receipt, customer: { ...receipt.customer, contactMethod } }), true);
  assert.equal(isQuickEstimateLead({ ...receipt, customer: { name: "", contactMethod: "telegram", contact: "@test_user" } }), false);
  for (const changes of [{ id: "" }, { callbackToken: "" }, { customer: null },
    { customer: { name: "", contactMethod: "phone", contact: "@test_user" } }, { callbackRequested: undefined }]) {
    assert.equal(isQuickEstimateLead({ ...receipt, ...changes }), false);
  }
});
