import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("../components/HomeHeroCarousel.tsx", import.meta.url);
const componentSource = await readFile(componentUrl, "utf8");

test("hero carousel references existing responsive image assets", async () => {
  assert.doesNotMatch(componentSource, /\.mobile\.webp/);
  assert.doesNotMatch(componentSource, /<source\b/);

  const fileNames = [...componentSource.matchAll(/\["([^"]+\.webp)",/g)]
    .map((match) => match[1]);
  assert.ok(fileNames.length > 0);

  await Promise.all(fileNames.map((fileName) => access(new URL(
    `../public/images/home/hero-projects/${fileName}`,
    import.meta.url,
  ))));
});
