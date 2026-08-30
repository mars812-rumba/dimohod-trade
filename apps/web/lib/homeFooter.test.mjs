import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const homeSource = fs.readFileSync(path.join(here, "../app/page.tsx"), "utf8");

test("credits the site developer with a direct Telegram link", () => {
  assert.match(homeSource, /href="https:\/\/t\.me\/marseloid"/);
  assert.match(homeSource, /Сайт разработан: @marseloid/);
  assert.match(homeSource, /IconBrandTelegram/);
});
