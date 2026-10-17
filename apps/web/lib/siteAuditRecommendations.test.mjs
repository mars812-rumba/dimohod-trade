import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("contact and installation routes have their own canonical, social metadata and one H1", () => {
  for (const route of ["contacts", "montazh"]) {
    const source = read(`../app/${route}/page.tsx`);
    assert.ok(source.includes(`canonical: "/${route}"`));
    assert.ok(source.includes(`url: "/${route}"`));
    assert.match(source, /openGraph:/);
    assert.match(source, /twitter:/);
    assert.equal((source.match(/<h1>/g) ?? []).length, 1);
    assert.doesNotMatch(source, /noindex|use client/);
    assert.ok(read("../app/sitemap.ts").includes(`absoluteUrl("/${route}")`));
    assert.ok(read("../components/SiteFooter.tsx").includes(`href="/${route}"`));
  }
});

test("site call tracking number remains distinct from external listings and replaces legacy public calls", () => {
  const contacts = read("../app/contacts/page.tsx");
  for (const target of ["tel:+79643424565", "tel:+78126424545", "mailto:office@dimohod-trade.pro"]) {
    assert.ok(contacts.includes(`href="${target}"`));
  }
  function checkDirectory(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = new URL(entry.name, `${directory.href}/`);
      if (entry.isDirectory()) checkDirectory(path);
      else if (/\.tsx?$/.test(entry.name)) {
        assert.doesNotMatch(readFileSync(path, "utf8"), /79650756555|965\) 075-65-55|965 075-65-55/, path.pathname);
      }
    }
  }
  for (const directory of ["../app", "../components", "."]) checkDirectory(new URL(directory, import.meta.url));
});

test("installation uses confirmed shared terms and existing inquiry and real-object components", () => {
  const source = read("../app/montazh/page.tsx");
  assert.match(source, /<InstallationTermsSection \/>/);
  assert.match(source, /installationTerms\.geography/);
  assert.match(source, /не цену монтажа/);
  assert.match(source, /Замер оплачивается отдельно/);
  assert.match(source, /<HomeWorksShowcase objectIds=\{\[11, 10, 1\]\}/);
  assert.match(source, /<LeadForm source="installation-page"/);
  assert.doesNotMatch(source, /бесплатн|за один день|от \d+ ?₽/);
});

test("PDF requests are measured separately from successful leads and respect existing consent gate", () => {
  const pdf = read("./chimneyEstimatePdf.ts");
  const metrika = read("./metrika.ts");
  assert.ok(pdf.indexOf("pdf.download(") < pdf.indexOf("reachMetrikaGoal(METRIKA_GOALS.estimatePdfDownloadRequested)"));
  assert.doesNotMatch(pdf, /METRIKA_GOALS\.leadSubmitted/);
  assert.match(metrika, /estimate_pdf_download_requested/);
  assert.match(metrika, /!analyticsAllowed\(\)/);
});
