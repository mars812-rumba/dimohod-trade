// Only the isolated preview is allowed: no production writes or real submissions.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const base = process.env.READY_KITS_BASE_URL || "http://127.0.0.1:3128";
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
  const artifacts = ".codex-telegram/ready-kits-check";
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  });
  try {
    async function context(options = {}) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", ...options });
      await ctx.addInitScript(() => localStorage.setItem("dimohod_analytics_consent_v1", "declined"));
      await ctx.route("**/*", route => {
        const url = new URL(route.request().url());
        return ["127.0.0.1", "localhost"].includes(url.hostname) || !url.protocol.startsWith("http") ? route.continue() : route.abort();
      });
      return ctx;
    }
    const ctx = await context();
    assert.equal((await (await ctx.request.get(`${base}/api/v1/ready-kits-test-preview`)).json()).isolated_ready_kits_preview, true);
    const before = (await (await ctx.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    assert.equal(before.length, 12);
    const page = await ctx.newPage(), errors = [];
    page.on("pageerror", error => errors.push(`${page.url()}: ${error.message}`));
    for (const kit of before) {
      const path = `/komplekty/${kit.slug}`;
      // A normal HTTP response, no browser JS. Strip scripts so RSC payload cannot pass this assertion.
      const response = await ctx.request.get(`${base}${path}`);
      assert.ok(response.ok());
      const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
      for (const text of ["Применение и маршрут", "Важные условия и ограничения", `Другие комплекты Ø${kit.diameter_mm} мм`,
        kit.content.selection_checklist[0], ...kit.lines.map(line => line.article)]) assert.ok(html.includes(text), `${kit.slug}: ${text}`);
      for (const href of ["/solutions/banya", "/solutions/dom", "/solutions/pech", `/komplekty/${before.find(item => item.slug !== kit.slug && item.diameter_mm === kit.diameter_mm).slug}`]) {
        assert.ok(html.includes(`href="${href}"`), `${kit.slug}: real HTML link ${href}`);
      }
      assert.ok(/href="\/(?:catalog|product)\//.test(html), "Product links are in markup");
      assert.ok(!html.includes('role="tabpanel" hidden=""'), "Unenhanced panels readable sequentially");
      await page.goto(`${base}${path}`);
      await page.locator('[data-kit-tabs][data-enhanced="true"]').waitFor();
      assert.equal(await page.locator("[data-kit-panel]").count(), 3);
      assert.equal(await page.locator("[data-kit-panel]:visible").count(), 1);
      assert.ok(await page.locator("#bom").isVisible());
      assert.equal(await page.locator("#bom tbody tr").count(), kit.lines.length);
      assert.ok(!(await page.locator("#application").isVisible()));
      const scheme = page.locator("#bom [data-kit-scheme] img");
      assert.equal(await scheme.getAttribute("src"), `/images/ready-kits/${kit.route}-${kit.height_m}m-scheme.webp`);
      assert.equal(await page.locator('[data-kit-scheme] figcaption').innerText(), `Схема комплекта · ${kit.height_m} м`);
      assert.ok((await ctx.request.get(`${base}${await scheme.getAttribute("src")}`)).ok());
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://dimohod-trade.pro${path}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    console.log("All 12 direct URLs: full inactive text/articles/HTML links in plain HTTP, correct scheme, BOM and canonical");

    await page.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }, { width: 320, height: 740 }]) {
      await page.setViewportSize(size);
      const tabs = page.getByRole("tablist", { name: "Разделы комплекта" });
      await tabs.evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + scrollY - 130, behavior: "instant" }));
      await page.evaluate(() => { window.__kitTabsNoReload = 42; });
      const initial = await tabs.boundingBox(), scroll = await page.evaluate(() => scrollY), url = page.url();
      const bomHeight = (await page.locator('[data-kit-panel="bom"]').boundingBox()).height;
      for (const label of ["Применение", "Что важно уточнить", "Состав комплекта"]) {
        await page.getByRole("tab", { name: label, exact: true }).click();
        const after = await tabs.boundingBox();
        assert.ok(Math.abs(after.y - initial.y) <= 2, `${size.width}/${label}: tab bar must not jump (${initial.y} → ${after.y})`);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - scroll) <= 2, `${size.width}: scroll position preserved`);
        assert.equal(page.url(), url);
        assert.equal(await page.evaluate(() => window.__kitTabsNoReload), 42);
        assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(), 1);
        assert.equal(await page.locator("[data-kit-panel]").count(), 3);
        assert.ok(await page.locator("#related").isVisible());
        if (label === "Применение") {
          assert.ok((await page.locator('[data-kit-panel="application"]').boundingBox()).height < bomHeight * .8, "Short section has natural height");
          assert.ok(await page.locator("#application h3").count() >= 3);
          if (size.width !== 320) await page.screenshot({ path: `${artifacts}/tabs-application-${size.width}.png` });
        }
        if (label === "Что важно уточнить") assert.equal(await page.locator("#conditions li svg[aria-hidden]").count(), 6);
      }
      for (const tab of await tabs.getByRole("tab").all()) {
        assert.ok(await tab.evaluate(node => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1));
        assert.equal(await tab.locator("svg[aria-hidden]").count(), 1);
      }
      await page.getByRole("tab", { name: "Состав комплекта", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.getByRole("tab", { name: "Применение", exact: true }).getAttribute("aria-selected"), "true");
      assert.ok(await page.getByRole("tab", { name: "Применение", exact: true }).evaluate(node => node === document.activeElement && getComputedStyle(node).outlineStyle !== "none"));
      await page.keyboard.press("End");
      assert.equal(await page.getByRole("tab", { name: "Что важно уточнить", exact: true }).getAttribute("aria-selected"), "true");
      await page.keyboard.press("Home");
      assert.ok(await page.locator("#bom").isVisible());
    }
    console.log("Mobile 320/390 and desktop 1440: no jump, no reload/hash, natural panel height, full labels, keyboard and focus OK");

    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const kit of before) {
      await page.goto(`${base}/komplekty/${kit.slug}`);
      const scheme = page.locator('[data-kit-scheme] img');
      await scheme.scrollIntoViewIfNeeded();
      await scheme.evaluate(node => node.decode());
      const bounds = await scheme.boundingBox();
      assert.ok(bounds.width >= 500 && bounds.width <= 560, 'Readable desktop scheme without stretching');
      assert.ok(Math.abs(bounds.height / bounds.width - 1280 / 853) < .01);
      const historyBefore = await page.evaluate(() => history.length);
      await scheme.click();
      assert.equal(await page.locator('dialog[open]').count(), 0);
      assert.equal(await page.evaluate(() => history.length), historyBefore);
      assert.equal(await page.locator('[data-kit-scheme] a, [data-kit-scheme] button').count(), 0);
      if (kit.diameter_mm === 115) await page.locator('[data-kit-scheme]').screenshot({ path: `${artifacts}/scheme-inline-${kit.route}-${kit.height_m}-1440.png` });
    }
    console.log('All 12 desktop schemes: loaded, natural proportions, plain images, clicks open no dialog and add no history');

    const mobile = await context({ isMobile: true, hasTouch: true });
    const touchPage = await mobile.newPage();
    touchPage.on("pageerror", error => errors.push(error.message));
    await touchPage.goto(`${base}/komplekty/cherez-stenu-3m-d115`);
    for (const width of [320, 390]) for (const kit of before) {
      await touchPage.setViewportSize({ width, height: 844 });
      await touchPage.goto(`${base}/komplekty/${kit.slug}`);
      const scheme = touchPage.locator('[data-kit-scheme] img');
      await scheme.scrollIntoViewIfNeeded();
      await scheme.evaluate(node => node.decode());
      const bounds = await scheme.boundingBox();
      assert.ok(bounds.width >= width - 60 && bounds.width <= width);
      assert.ok(Math.abs(bounds.height / bounds.width - 1280 / 853) < .01);
      await scheme.tap();
      assert.equal(await touchPage.locator('dialog[open]').count(), 0);
      assert.ok(await touchPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (kit.diameter_mm === 115) await touchPage.locator('[data-kit-scheme]').screenshot({ path: `${artifacts}/scheme-inline-${kit.route}-${kit.height_m}-${width}.png` });
    }
    await mobile.close();
    console.log('All 12 mobile schemes at 320/390px: full width, loaded without distortion, tapping opens no dialog');

    await page.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    for (const diameter of [120, 150, 115]) {
      await page.getByLabel("Диаметр комплекта").selectOption(String(diameter));
      await page.waitForURL(`**/komplekty/cherez-perekrytie-4m-d${diameter}`);
      assert.equal(await page.locator('[data-kit-scheme] img').getAttribute("src"), "/images/ready-kits/roof-4m-scheme.webp");
      assert.ok((await page.locator("h1").innerText()).includes(`Ø${diameter}`));
    }
    await page.getByLabel("Высота комплекта").selectOption("6");
    await page.waitForURL("**/komplekty/cherez-perekrytie-6m-d115");
    assert.equal(await page.locator('[data-kit-scheme] img').getAttribute("src"), "/images/ready-kits/roof-6m-scheme.webp");
    await page.getByRole("tab", { name: "Применение", exact: true }).click();
    assert.ok((await page.locator("#application").innerText()).includes("Название «6 м» обозначает вариант каталога."));
    const noJs = await context({ javaScriptEnabled: false });
    const plain = await noJs.newPage();
    await plain.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    for (const id of ["bom", "application", "conditions", "related"]) assert.ok(await plain.locator(`#${id}`).isVisible());
    const plainScheme = plain.locator('[data-kit-scheme] img');
    await plainScheme.scrollIntoViewIfNeeded();
    await plainScheme.evaluate(node => node.decode());
    assert.ok(await plainScheme.evaluate(node => node.complete && node.naturalWidth === 853));
    assert.equal(await plain.getByRole("tablist").count(), 0);
    await noJs.close();
    const after = (await (await ctx.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    assert.deepEqual(after, before);
    assert.deepEqual(errors, []);
    console.log("Variant scheme/text/BOM refresh, sequential no-JS reading and unchanged API data OK");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
