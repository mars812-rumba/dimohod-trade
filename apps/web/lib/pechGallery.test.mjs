import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(here, "..");
const scenarioSource = fs.readFileSync(path.join(here, "scenarioPages.ts"), "utf8");
const templateSource = fs.readFileSync(
  path.join(webRoot, "components/ScenarioPageTemplate.tsx"),
  "utf8",
);

const galleryPaths = Array.from(
  scenarioSource.matchAll(/src: "(\/images\/solutions\/pech\/pech-gallery-\d{2}\.webp)"/g),
  (match) => match[1],
);

test("the stove solution uses five unique WebP gallery images", () => {
  assert.equal(galleryPaths.length, 5);
  assert.equal(new Set(galleryPaths).size, 5);
});

test("every configured stove gallery image exists in public assets", () => {
  for (const imagePath of galleryPaths) {
    assert.equal(fs.existsSync(path.join(webRoot, "public", imagePath)), true, imagePath);
  }
});

test("the scenario template renders the gallery as equal interactive items", () => {
  assert.match(templateSource, /<SolutionHouseGallery[\s\S]*?equalItems/);
  assert.match(templateSource, /content\.gallery\.images\.map/);
  assert.match(
    templateSource,
    /aria-labelledby=\{`\$\{content\.slug\}-gallery-title`\}/,
  );
});
