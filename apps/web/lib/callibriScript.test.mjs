import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("Callibri call tracking loads globally after the page becomes interactive", () => {
  assert.match(layout, /id="callibri-script"/);
  assert.match(layout, /src="https:\/\/cdn\.callibri\.ru\/callibri\.js"/);
  assert.match(layout, /strategy="afterInteractive"/);
  assert.ok(layout.indexOf('id="callibri-script"') < layout.indexOf("</body>"));
});
