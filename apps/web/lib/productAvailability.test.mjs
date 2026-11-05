import assert from "node:assert/strict";
import test from "node:test";
import { productOfferAvailability } from "./productAvailability.ts";

test("historical or unknown stock does not claim availability", () => {
  for (const status of [undefined, null, "unknown", "unexpected"]) {
    assert.equal(productOfferAvailability(status), undefined);
  }
  assert.equal(productOfferAvailability("in_stock"), "https://schema.org/InStock");
  assert.equal(productOfferAvailability("out_of_stock"), "https://schema.org/OutOfStock");
});
