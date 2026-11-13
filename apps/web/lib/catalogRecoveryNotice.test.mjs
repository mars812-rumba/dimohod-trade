import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const provision = readFileSync(
  new URL("../../../deploy/native-runtime/provision.py", import.meta.url),
  "utf8",
);

test("public layout and native provisioning no longer contain the catalog recovery notice", () => {
  assert.doesNotMatch(layout, /NEXT_PUBLIC_CATALOG_RECOVERY_NOTICE/);
  assert.doesNotMatch(provision, /NEXT_PUBLIC_CATALOG_RECOVERY_NOTICE/);
  assert.doesNotMatch(layout, /Каталог восстанавливается/);
});
