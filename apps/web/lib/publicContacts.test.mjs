import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("call button uses the new mobile number in its target and accessible label", () => {
  const header = read("../components/SiteHeader.tsx");
  assert.match(header, /aria-label="Позвонить: \+7 964 342-45-65"/);
  assert.match(header, /href="tel:\+79643424565"/);
  assert.doesNotMatch(header, /79650756555|965.*075-65-55/);
});

test("footer, mobile menu and homepage expose both phones and the existing public email", () => {
  for (const path of ["../components/SiteHeader.tsx", "../components/SiteFooter.tsx", "../app/page.tsx"]) {
    const source = read(path);
    for (const target of ["tel:+79643424565", "tel:+78126424545", "mailto:office@dimohod-trade.pro"]) {
      assert.ok(source.includes(`href="${target}"`), `${path}: ${target}`);
    }
    assert.doesNotMatch(source, /79650756555/);
  }
});
