import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const rating = source.match(/<div\s+className=\{styles\.reviewStars\}[\s\S]*?<\/div>/)?.[0];

test("review rating has an image role permitting its accessible name", () => {
  assert.ok(rating);
  assert.match(rating, /role="img"/);
  assert.match(rating, /aria-label=\{`Оценка \$\{review\.rating\} из 5`\}/);
});

test("individual stars are decorative and rating is not an interactive control", () => {
  assert.match(rating, /<Star\s[\s\S]*?aria-hidden="true"/);
  assert.doesNotMatch(rating, /tabIndex|onClick|role="(?:button|radio)"/);
  assert.match(rating, /length: 5/);
});
