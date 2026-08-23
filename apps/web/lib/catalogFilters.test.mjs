import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogFilteredHeading,
  catalogFilterPath,
  getCatalogFilterKey,
  hasCatalogQuery,
  normalizeCatalogFilters,
  parseCatalogFilters,
  serializeCatalogFilters,
} from "./catalogFilters.ts";

test("removes empty and unknown catalog parameters", () => {
  assert.deepEqual(parseCatalogFilters({
    diameter: "100:200",
    inner_thickness: "",
    unknown: "unsafe",
  }), { diameter: "100:200" });
});

test("normalizes encoding, whitespace, decimal commas and parameter order", () => {
  const left = parseCatalogFilters(new URLSearchParams(
    "outer_pipe=stainless%7CAISI+304%7C0.5&diameter=0100%3A0200&inner_thickness=0%2C8",
  ));
  const right = normalizeCatalogFilters({
    inner_thickness: "0.8",
    diameter: "100:200",
    outer_pipe: " STAINLESS | AISI   304 | 0,5 ",
  });

  assert.deepEqual(left, right);
  assert.equal(
    serializeCatalogFilters(left),
    "diameter=100%3A200&inner_thickness=0.8&outer_pipe=stainless%7CAISI+304%7C0.5",
  );
  assert.equal(getCatalogFilterKey(left), getCatalogFilterKey(right));
});

test("collapses identical duplicates and rejects conflicting duplicates", () => {
  assert.deepEqual(parseCatalogFilters({ length: ["350", "350"] }), { length: "350" });
  assert.deepEqual(parseCatalogFilters({ length: ["350", "500"] }), {});
});

test("rejects unsafe numeric filters and removes the duplicate first page", () => {
  assert.deepEqual(normalizeCatalogFilters({
    diameter: "0:200",
    inner_thickness: "-0.5",
    length: "0",
    page: "1",
  }), {});
  assert.deepEqual(normalizeCatalogFilters({ page: "2" }), { page: "2" });
});

test("builds one deterministic user URL", () => {
  assert.equal(
    catalogFilterPath("sendvich-truby", { length: "350", diameter: "100:200" }),
    "/catalog/sendvich-truby?diameter=100%3A200&length=350",
  );
});

test("detects even unknown non-empty query parameters for noindex", () => {
  assert.equal(hasCatalogQuery({ inner_thickness: "" }), false);
  assert.equal(hasCatalogQuery({ tracking: "unexpected" }), true);
});

test("builds a specific H1 from selected sandwich-pipe filters", () => {
  assert.equal(
    catalogFilteredHeading("Сэндвич-трубы", {
      diameter: "110:210",
      inner_pipe: "stainless|AISI 304",
      outer_pipe: "stainless|AISI 304|0.5",
    }),
    "Сэндвич-трубы 110/210 AISI 304 0.5 мм",
  );
});

test("shows both selected steel grades when sandwich pipes use different steels", () => {
  assert.equal(
    catalogFilteredHeading("Сэндвич-трубы", {
      diameter: "100:200",
      inner_pipe: "stainless|AISI 316",
      outer_pipe: "stainless|AISI 430|0.5",
    }),
    "Сэндвич-трубы 100/200 AISI 316 / AISI 430 0.5 мм",
  );
});

test("does not duplicate the steel grade when both sandwich pipes use the same steel", () => {
  assert.equal(
    catalogFilteredHeading("Сэндвич-трубы", {
      diameter: "110:210",
      inner_pipe: "stainless|AISI 304",
      outer_pipe: "stainless|AISI 304|0.5",
    }),
    "Сэндвич-трубы 110/210 AISI 304 0.5 мм",
  );
});

test("keeps the base category H1 generic without explicit filters", () => {
  assert.equal(catalogFilteredHeading("Сэндвич-трубы", {}), "Сэндвич-трубы");
});
