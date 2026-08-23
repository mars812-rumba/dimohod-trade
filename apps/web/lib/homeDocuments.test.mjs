import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { homeDocuments } from "./homeDocuments.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const homeSource = fs.readFileSync(path.join(here, "../app/page.tsx"), "utf8");
const productSource = fs.readFileSync(
  path.join(here, "../components/ProductExperience.tsx"),
  "utf8",
);

test("publishes four different documents with the conformity certificate first", () => {
  assert.equal(homeDocuments.length, 4);
  assert.equal(new Set(homeDocuments.map((document) => document.id)).size, 4);
  assert.equal(new Set(homeDocuments.map((document) => document.previewUrl)).size, 4);
  assert.equal(homeDocuments[0].featured, true);
  assert.match(homeDocuments[0].title, /Сертификат соответствия/i);
});

test("keeps all material documents distinct and factual", () => {
  assert.match(homeDocuments[1].title, /Jindal Stainless/);
  assert.match(homeDocuments[2].title, /Yeun Chyang/);
  assert.match(homeDocuments[3].title, /POSCO Thainox/);
  assert.match(homeDocuments[3].description, /первая страница из двух/i);
});

test("places documents after Yandex reviews and before FAQ only on the homepage", () => {
  const reviewsPosition = homeSource.indexOf("reviewsSection");
  const documentsPosition = homeSource.indexOf("documentsSection");
  const faqPosition = homeSource.indexOf("faqSection");

  assert.ok(reviewsPosition >= 0);
  assert.ok(documentsPosition > reviewsPosition);
  assert.ok(faqPosition > documentsPosition);
  assert.doesNotMatch(productSource, /Сертификаты и документы/);
});
