// Shared ready-kit styling. Requires the isolated local preview, never writes live data.
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
      assert.equal(await page.locator('[data-kit-group][data-catalog-pilot="true"]').count(), 4);
      for (const key of ["roof-4", "roof-6", "wall-3", "wall-6"]) {
        const group = page.locator(`[data-kit-group="${key}"]`);
        assert.equal(await group.locator('[data-kit-open]').evaluate(node => getComputedStyle(node).justifyContent), "flex-end");
        assert.equal(await group.locator('[data-kit-open]').evaluate(node => getComputedStyle(node).color), 'rgb(189, 61, 22)');
        for (const diameter of [115, 120, 150]) {
          await group.locator(`nav a[href$="d${diameter}"]`).click();
          assert.equal(page.url(), `${base}/komplekty`);
          assert.equal(await group.locator('[data-kit-price-caption]').innerText(), `за комплект Ø${diameter}`);
          assert.match(await group.locator('[data-kit-open]').getAttribute('href'), new RegExp(`d${diameter}$`));
        }
        await group.locator('nav a[href$="d115"]').click();
      }
      assert.equal(await card.getAttribute("data-catalog-pilot"), "true");
      assert.equal(await card.locator("svg[aria-hidden]").count(), 2);
      assert.equal(await card.evaluate(node => getComputedStyle(node).borderRadius), "2px");
      const image = await card.locator("img").boundingBox(), bounds = await card.boundingBox();
      assert.ok(image.width > bounds.width * .27, "Scheme image is larger, in the catalog's left visual column");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if ([390, 1440].includes(width)) {
        await card.screenshot({ path: `${artifacts}/after-card-${width}.png` });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${artifacts}/after-list-${width}.png` });
      }
      for (const kit of before) {
        const diameter = kit.diameter_mm;
        await page.goto(`${base}/komplekty/${kit.slug}`);
        await page.locator('[data-kit-tabs][data-enhanced="true"]').waitFor();
        assert.equal(await page.locator('main[data-catalog-pilot="true"]').count(), 1);
        assert.ok((await page.locator("h1").innerText()).includes(`Ø${diameter} мм`));
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
        const capture = kit.route === "roof" && kit.height_m === 4 && diameter === 115 && [390, 1440].includes(width);
        if (capture) {
          await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); scrollTo(0, 0); });
          await page.screenshot({ path: `${artifacts}/after-detail-${width}.png` });
        }
        await page.getByRole('tab', { name: 'Применение', exact: true }).click();
        const scenarios = page.locator('#application a[href^="/solutions/"]');
        assert.equal(await scenarios.count(), 3);
        for (const link of await scenarios.all()) assert.equal(await link.evaluate(node => getComputedStyle(node).color), 'rgb(189, 61, 22)');
        const listBox = await page.locator('#application ul').boundingBox();
        const noteBox = await page.locator('#application > p').last().boundingBox();
        assert.ok(noteBox.y - listBox.y - listBox.height >= 24, 'Explanation is separated from scenario links');
        if (capture) await page.locator('#application').screenshot({ path: `${artifacts}/after-application-${width}.png` });
        await page.getByRole('tab', { name: 'Что важно уточнить', exact: true }).click();
        const heading = page.getByRole('heading', { name: 'Что подготовить перед заказом', exact: true });
        const headingBox = await heading.boundingBox();
        const limitationsBox = await page.locator('#conditions > ul').first().boundingBox();
        assert.ok(headingBox.y - limitationsBox.y - limitationsBox.height >= 32, 'Checklist has a clear top gap');
        const contact = page.getByRole('link', { name: 'Связаться со специалистом →', exact: true });
        assert.equal(await contact.getAttribute('href'), '/contacts');
        assert.equal(await contact.evaluate(node => getComputedStyle(node).color), 'rgb(189, 61, 22)');
        const checklistBox = await page.locator('#conditions > ul').last().boundingBox();
        const contactBox = await contact.boundingBox();
        assert.ok(contactBox.y - checklistBox.y - checklistBox.height >= 28);
        if (capture) { await heading.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${artifacts}/after-checklist-${width}.png` }); }
        const custom = page.locator('[data-kit-custom-request]');
        await page.mouse.move(0, 0);
        const calculate = custom.getByRole('link', { name: 'Рассчитать в калькуляторе', exact: true });
        assert.equal(await calculate.getAttribute('href'), '/bystryy-raschet');
        assert.equal(await calculate.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(189, 61, 22)');
        assert.ok((await calculate.boundingBox()).height >= 48);
        if (capture) await custom.screenshot({ path: `${artifacts}/after-custom-request-${width}.png` });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      console.log(`${width}px: all 4 groups / 12 pages, accents and spacing, diameter choices, working dialogs, no horizontal overflow`);
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
