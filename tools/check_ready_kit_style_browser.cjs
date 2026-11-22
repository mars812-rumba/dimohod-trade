// Owner-review prototype only. Requires the isolated local preview, never writes live data.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const base = process.env.READY_KITS_BASE_URL || "http://127.0.0.1:3129";
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const ctx = await browser.newContext({ serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dimohod_analytics_consent_v1", "declined"));
    await ctx.route("**/*", route => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) || !url.protocol.startsWith("http") ? route.continue() : route.abort();
    });
    assert.equal((await (await ctx.request.get(`${base}/api/v1/ready-kits-test-preview`)).json()).isolated_ready_kits_preview, true);
    const before = (await (await ctx.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    assert.equal(before.length, 12);
    const page = await ctx.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const artifacts = ".codex-telegram/ready-kits-style";
    fs.mkdirSync(artifacts, { recursive: true });
    for (const width of [320, 390, 768, 1024, 1440]) {
      const height = width === 320 ? 740 : width === 390 ? 844 : 1000;
      await page.setViewportSize({ width, height });
      await page.goto(`${base}/komplekty`);
      const card = page.locator('[data-kit-group="roof-4"]');
      assert.equal(await page.locator('[data-kit-group][data-catalog-pilot="true"]').count(), 1);
      assert.equal(await card.getAttribute("data-catalog-pilot"), "true");
      assert.equal(await card.locator("svg[aria-hidden]").count(), 2);
      assert.equal(await card.evaluate(node => getComputedStyle(node).borderRadius), "2px");
      const image = await card.locator("img").boundingBox(), bounds = await card.boundingBox();
      assert.ok(image.width > bounds.width * .27, "Scheme image is larger, in the catalog's left visual column");
      for (const diameter of [115, 120, 150]) {
        await card.locator(`nav a[href$="d${diameter}"]`).click();
        assert.equal(page.url(), `${base}/komplekty`);
        assert.equal(await card.locator("[data-kit-price-caption]").innerText(), `за комплект Ø${diameter}`);
        assert.match(await card.locator("[data-kit-open]").getAttribute("href"), new RegExp(`d${diameter}$`));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      // Shoot default diameter, not the final interactive state above.
      await card.locator('nav a[href$="d115"]').click();
      if ([390, 1440].includes(width)) {
        await card.screenshot({ path: `${artifacts}/after-card-${width}.png` });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${artifacts}/after-list-${width}.png` });
      }
      for (const diameter of [115, 120, 150]) {
        await page.goto(`${base}/komplekty/cherez-perekrytie-4m-d${diameter}`);
        await page.locator('[data-kit-tabs][data-enhanced="true"]').waitFor();
        assert.equal(await page.locator('main[data-catalog-pilot="true"]').count(), 1);
        assert.ok((await page.locator("h1").innerText()).includes(`Ø${diameter} мм`));
        const kit = before.find(item => item.route === "roof" && item.height_m === 4 && item.diameter_mm === diameter);
        assert.equal(await page.locator("#bom tbody tr").count(), kit.lines.length);
        assert.equal(await page.locator('[role="tab"]').count(), 3);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (width <= 390) {
          const img = await page.locator("main > section > div > img").first().boundingBox();
          const price = await page.locator("main > section strong").first().boundingBox();
          const order = await page.getByRole("button", { name: "Заказать комплект", exact: true }).boundingBox();
          const help = await page.getByRole("button", { name: "Проконсультироваться", exact: true }).boundingBox();
          assert.ok(img.y + img.height <= price.y + 1 && price.y + price.height <= order.y + 1);
          assert.ok(help.y + help.height <= height, `Both actions remain in first viewport: ${width}/${diameter}`);
        }
        for (const label of ["Заказать комплект", "Проконсультироваться"]) {
          await page.getByRole("button", { name: label, exact: true }).click();
          assert.ok(await page.getByRole("dialog").isVisible());
          await page.keyboard.press("Escape");
          assert.ok(!(await page.getByRole("dialog").isVisible()));
        }
        if (diameter === 115 && [390, 1440].includes(width)) {
          await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); scrollTo(0, 0); });
          await page.screenshot({ path: `${artifacts}/after-detail-${width}.png` });
        }
      }
      await page.goto(`${base}/komplekty/cherez-perekrytie-6m-d115`);
      assert.equal(await page.locator('main[data-catalog-pilot="true"]').count(), 0);
      console.log(`${width}px: pilot only roof 4m, all diameter choices, image/price/actions order, working dialogs, no horizontal overflow`);
    }
    for (const kit of before) {
      const html = (await (await ctx.request.get(`${base}/komplekty/${kit.slug}`)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      assert.ok(html.includes(`href="https://dimohod-trade.pro/komplekty/${kit.slug}"`));
      for (const line of kit.lines) assert.ok(html.includes(line.article));
      assert.ok(html.includes("/solutions/banya") && html.includes("/solutions/dom") && html.includes("/solutions/pech"));
    }
    assert.deepEqual((await (await ctx.request.get(`${base}/api/v1/ready-kits`)).json()).items, before);
    assert.deepEqual(errors, []);
    console.log("All 12 SSR BOM/canonical/scenario links intact; full API unchanged; no leads submitted");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
