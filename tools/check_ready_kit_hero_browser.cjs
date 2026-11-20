// Read-only layout check against the isolated ready-kits preview, never production.
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
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await context.addInitScript(() => localStorage.setItem("dimohod_analytics_consent_v1", "declined"));
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) || !url.protocol.startsWith("http") ? route.continue() : route.abort();
    });
    const marker = await context.request.get(`${base}/api/v1/ready-kits-test-preview`);
    assert.equal((await marker.json()).isolated_ready_kits_preview, true);
    const kits = (await (await context.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    assert.equal(kits.length, 12);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    async function boxes(kit) {
      await page.evaluate(() => scrollTo(0, 0));
      const hero = page.locator("main > section").first();
      const box = async locator => { const value = await locator.boundingBox(); assert.ok(value); return value; };
      return {
        h1: await box(hero.locator("h1")), image: await box(hero.locator("img").first()),
        price: await box(hero.locator("strong").first()),
        order: await box(hero.getByRole("button", { name: "Заказать комплект", exact: true })),
        consultation: await box(hero.getByRole("button", { name: "Проконсультироваться", exact: true })),
        description: await box(hero.getByText(kit.content?.short_description || kit.description, { exact: true })),
        selectors: await box(hero.getByLabel("Высота комплекта", { exact: true })),
      };
    }
    function mobileOrder(layout, size, mustFit) {
      for (const [first, second] of [["h1", "image"], ["image", "price"], ["price", "order"], ["order", "consultation"], ["consultation", "description"], ["consultation", "selectors"]]) {
        assert.ok(layout[first].y + layout[first].height <= layout[second].y + 1, `${first} before ${second}: ${JSON.stringify(layout)}`);
      }
      assert.ok(layout.order.height >= 44 && layout.consultation.height >= 44);
      if (mustFit) assert.ok(layout.consultation.y + layout.consultation.height <= size.height, `Both buttons must fit ${JSON.stringify(size)}: ${JSON.stringify(layout)}`);
    }
    for (const kit of kits) {
      await page.goto(`${base}/komplekty/${kit.slug}`);
      assert.equal(await page.locator('h1').innerText(), kit.name);
      assert.equal(await page.getByRole("button", { name: "Заказать комплект", exact: true }).count(), 1);
      const layout = await boxes(kit);
      mobileOrder(layout, { width: 390, height: 844 }, true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    const kit = kits.find(item => item.slug === "cherez-perekrytie-4m-d115");
    await page.goto(`${base}/komplekty/${kit.slug}`);
    for (const size of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 375, height: 667 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(size);
      const layout = await boxes(kit);
      mobileOrder(layout, size, size.height >= 667);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${artifacts}/mobile-hero-${size.width}x${size.height}.png` });
      console.log(`Mobile ${size.width}x${size.height}: last button bottom ${Math.round(layout.consultation.y + layout.consultation.height)} px`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const desktop = await boxes(kit);
    assert.ok(desktop.image.x + desktop.image.width <= desktop.h1.x);
    assert.ok(desktop.description.y < desktop.selectors.y && desktop.selectors.y < desktop.price.y);
    assert.ok(desktop.price.y < desktop.order.y);
    await page.screenshot({ path: `${artifacts}/desktop-hero-unchanged.png` });
    const withoutJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const ssr = await withoutJs.newPage();
    await ssr.goto(`${base}/komplekty/${kit.slug}`);
    const button = await ssr.getByRole("button", { name: "Проконсультироваться", exact: true }).boundingBox();
    assert.ok(button && button.y + button.height <= 844);
    assert.deepEqual(errors, []);
    console.log("All 12 mobile heroes, original desktop order and CSS layout without JS OK; no submissions made");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
