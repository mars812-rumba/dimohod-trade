import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("MAX is shared across header, menu and footer without replacing the phone", () => {
  const header = read("../components/SiteHeader.tsx");
  const footer = read("../components/SiteFooter.tsx");
  const link = read("../components/MaxContactLink.tsx");
  assert.match(header, /<MaxContactLink compact \/>/);
  assert.match(header, /<MaxContactLink onClick=\{closeMenu\} \/>/);
  assert.match(footer, /<MaxContactLink \/>/);
  assert.match(header, /href="tel:\+79650756555"/);
  assert.match(link, /href=\{maxContactUrl\}/);
  assert.match(link, /aria-label="Написать в MAX/);
  assert.match(link, /rel="noopener noreferrer"/);
  assert.match(read("./contactLinks.ts"), /https:\/\/max\.ru\/u\//);
  assert.match(read("./contactLinks.ts"), /https:\/\/max\.ru\/u\/f9LHodD0cOLL-zx1WLCq7_cpSLk9YTT8zYJhuQXqaIgrVW1kwJHHLdcpip4/);
  assert.doesNotMatch(read("./contactLinks.ts"), /f9LHodD0cOJc3LO8G1W3M0ukVh2gb0rJysvwEKyxI_ZqTse5JSqpEZCrm8I/);
  const asset = fs.readFileSync(new URL("../public/brand/max.webp", import.meta.url));
  assert.equal(asset.toString("ascii", 0, 4), "RIFF");
  assert.equal(asset.toString("ascii", 8, 12), "WEBP");
});
