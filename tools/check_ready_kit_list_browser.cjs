// Read-only UI checks. Never submit inquiries or write to the production catalogue.
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
  const descriptions = {
    "roof-4": "Три метровых сэндвича и метровая одностенная труба. Один проход через перекрытие.",
    "roof-6": "Шесть метровых сэндвичей и метровая одностенная труба. На схеме показаны два прохода через перекрытия.",
    "wall-3": "Через стену проходит секция длиной 750 мм. От наружного тройника вверх идут три метровых сэндвича.",
    "wall-6": "Через стену проходит секция длиной 750 мм. Вдоль фасада поднимаются шесть метровых сэндвичей с двумя фасадными консолями.",
  };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
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
    const card = key => page.locator(`[data-kit-group="${key}"]`);
    async function snapshot(key) {
      const node = card(key);
      return { active: await node.locator("nav a[aria-current=true]").getAttribute("href"),
        href: await node.locator("[data-kit-open]").getAttribute("href"),
        caption: await node.locator("[data-kit-price-caption]").innerText(), price: await node.locator("[data-kit-price]").innerText() };
    }
    for (const size of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      await page.setViewportSize(size);
      await page.goto(`${base}/komplekty`);
      assert.equal(await page.locator("[data-kit-group]").count(), 4);
      await page.evaluate(() => { window.__kitListNoReload = 42; });
      for (const key of Object.keys(descriptions)) {
        const node = card(key), variants = before.filter(kit => `${kit.route}-${kit.height_m}` === key);
        assert.equal(await node.locator("[data-kit-description]").innerText(), descriptions[key]);
        assert.equal(await node.locator("[data-kit-steel]").innerText(), "Сталь сэндвича: внутри AISI 304, снаружи AISI 430.");
        assert.match(await node.locator("img").getAttribute("src"), new RegExp(`/images/ready-kits/${variants[0].route}-title.webp$`));
        assert.equal(await node.locator("[data-kit-count]").count(), 0);
        assert.equal(await node.locator("nav a").count(), 3);
        assert.match((await snapshot(key)).caption, /Ø115$/);
        for (const diameter of [115, 120, 150]) {
          const neighbors = {};
          for (const other of Object.keys(descriptions).filter(other => other !== key)) neighbors[other] = await snapshot(other);
          const kit = variants.find(item => item.diameter_mm === diameter);
          await node.locator(`nav a[href="/komplekty/${kit.slug}"]`).click();
          assert.equal(page.url(), `${base}/komplekty`);
          assert.equal(await page.evaluate(() => window.__kitListNoReload), 42);
          const state = await snapshot(key);
          assert.equal(state.caption, `за комплект Ø${diameter}`);
          assert.equal(state.href, `/komplekty/${kit.slug}`);
          assert.equal(state.active, state.href);
          const expected = kit.total_rub === null ? "Цена уточняется" : new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(Number(kit.total_rub));
          assert.equal(state.price, expected);
          for (const other of Object.keys(neighbors)) assert.deepEqual(await snapshot(other), neighbors[other]);
        }
        const image = await node.locator("img").boundingBox(), title = await node.locator("h2").boundingBox();
        const description = await node.locator("[data-kit-description]").boundingBox(), steel = await node.locator("[data-kit-steel]").boundingBox();
        const dimensions = await node.locator("nav").boundingBox(), price = await node.locator("[aria-live]").boundingBox();
        assert.ok(image.x + image.width <= title.x + 1 && title.y + title.height <= description.y + 1);
        assert.ok(steel.y >= description.y + description.height - 1 && steel.y >= image.y + image.height - 1);
        assert.ok(Math.abs(steel.x - image.x) < 2 && Math.abs(dimensions.x - steel.x) < 2 && Math.abs(price.x - steel.x) < 2);
        assert.ok(await node.locator("[data-kit-description]").evaluate(el => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      // Explicit regression: identical prices must not collapse diameter identity.
      const key = "roof-4", variants = before.filter(kit => `${kit.route}-${kit.height_m}` === key);
      const a = variants.find(kit => kit.diameter_mm === 115), b = variants.find(kit => kit.diameter_mm === 120);
      assert.equal(a.total_rub, b.total_rub);
      await card(key).locator(`nav a[href="/komplekty/${a.slug}"]`).click();
      const first = await snapshot(key), neighbor = await snapshot("wall-6");
      await card(key).locator(`nav a[href="/komplekty/${b.slug}"]`).click();
      const second = await snapshot(key);
      assert.equal(second.price, first.price);
      assert.equal(second.caption, "за комплект Ø120");
      assert.equal(second.href, `/komplekty/${b.slug}`);
      assert.deepEqual(await snapshot("wall-6"), neighbor);
      await page.screenshot({ path: `${artifacts}/list-comparison-${size.width}.png`, fullPage: true });
      console.log(`${size.width}px: all 12 choices, descriptions, steel, full-width controls and isolated equal-price Ø120 OK`);
    }
    await card("roof-4").locator("[data-kit-open]").click();
    await page.waitForURL("**/komplekty/cherez-perekrytie-4m-d120");
    assert.ok((await page.locator("h1").innerText()).includes("Ø120 мм"));
    const html = (await (await ctx.request.get(`${base}/komplekty`)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    for (const text of Object.values(descriptions)) assert.ok(html.includes(text));
    for (const kit of before) assert.ok(html.includes(`href="/komplekty/${kit.slug}"`));
    const after = (await (await ctx.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    assert.deepEqual(after, before);
    assert.deepEqual(errors, []);
    console.log("Ø120 CTA opens the correct page; all 12 links and four descriptions are SSR; full API data unchanged");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
