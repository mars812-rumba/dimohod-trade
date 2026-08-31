import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("mobile legal links use the same typography as category submenu links", () => {
  assert.match(header, /className="mobile-menu-legal" aria-label="Правовые документы"/);
  assert.match(
    header,
    /mobile-menu-legal[\s\S]*privacyPolicyPath[\s\S]*personalDataConsentPath[\s\S]*userAgreementPath/,
  );
  assert.match(header, /className="mobile-menu-legal-title">Документы<\/p>/);
  assert.match(
    styles,
    /\.mobile-menu-catalog-body > a,[\s\S]*\.mobile-menu-categories a,[\s\S]*\.mobile-menu-categories summary,[\s\S]*\.mobile-menu-legal > a \{[\s\S]*font-size: 13px;[\s\S]*line-height: 1\.35;/,
  );
  assert.doesNotMatch(styles, /\.mobile-menu-legal > a \{[^}]*font-size: 11px/);
});

test("mobile menu uses explicit regular weights except for the primary action", () => {
  assert.match(
    styles,
    /\.mobile-menu-nav > a,[\s\S]*\.mobile-menu-catalog > summary \{[\s\S]*font-weight: 400;/,
  );
  assert.match(styles, /\.mobile-menu-nav h2 \{[\s\S]*font-weight: 400;/);
  assert.match(styles, /\.mobile-menu-footer > a,[\s\S]*\.mobile-menu-footer > p \{[\s\S]*font-weight: 400;/);
  assert.match(styles, /\.mobile-menu-path strong \{[^}]*font-weight: 600;/);
});
