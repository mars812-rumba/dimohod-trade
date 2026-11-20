// Read-only browser verification against the isolated loopback fixture server.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const expected = { "roof-4": ["roof-6", "wall-3", "wall-6"], "roof-6": ["roof-4", "wall-6", "wall-3"],
  "wall-3": ["wall-6", "roof-4", "roof-6"], "wall-6": ["wall-3", "roof-6", "roof-4"] };
const rub = price => price === null ? "Цена уточняется" : new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "RUB", maximumFractionDigits: 2,
}).format(Number(price));

(async () => {
  const base = process.env.READY_KITS_BASE_URL || "http://127.0.0.1:3128";
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
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
    const href = kit => `/komplekty/${kit.slug}`;
    function related(kit) {
      return expected[`${kit.route}-${kit.height_m}`].map(scheme => before.find(item =>
        `${item.route}-${item.height_m}` === scheme && item.diameter_mm === kit.diameter_mm));
    }
    async function check(kit) {
      await page.locator('[data-kit-tabs][data-enhanced="true"]').waitFor();
      const block = page.locator("[data-kit-recommendations]");
      assert.equal(await block.count(), 1);
      assert.equal(await block.locator("h2").innerText(), `Другие комплекты Ø${kit.diameter_mm} мм`);
      const cards = block.locator("a[data-kit-recommendation]");
      assert.deepEqual(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute("href"))), related(kit).map(href));
      for (const [index, item] of related(kit).entries()) {
        assert.equal(await cards.nth(index).locator("span").innerText(), `Ø${kit.diameter_mm} мм`);
        assert.equal(await cards.nth(index).locator("strong").innerText(), rub(item.total_rub));
        assert.equal(await cards.nth(index).locator("img").getAttribute("src"), item.image_path);
      }
      assert.equal(await page.getByRole("tab").count(), 3);
      assert.equal(await page.locator("[data-kit-panel]").count(), 3);
      assert.ok(await block.evaluate(node => !node.closest("[data-kit-panel]")));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && scrollX === 0));
    }
    for (const kit of before) {
      const response = await ctx.request.get(`${base}${href(kit)}`);
      assert.ok(response.ok());
      const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
      const block = html.match(/<section[^>]*id="related"[\s\S]*?<\/section>/)[0];
      assert.ok(block.includes(`Другие комплекты Ø${kit.diameter_mm} мм`));
      assert.equal((block.match(/data-kit-recommendation="true"/g) || []).length, 3);
      assert.deepEqual([...block.matchAll(/href="([^"]+)"/g)].map(match => match[1]), related(kit).map(href));
      assert.ok(html.includes('href="/solutions/banya"') && html.includes('href="/solutions/dom"') && html.includes('href="/solutions/pech"'));
    }
    console.log("All 12 plain HTTP responses: exactly three ordered same-diameter recommendations, real links and scenario links");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const kit of before) {
        await page.goto(`${base}${href(kit)}`);
        await check(kit);
        const track = page.locator("[data-kit-recommendation-track]");
        const cards = page.locator("[data-kit-recommendation]");
        const boxes = await cards.evaluateAll(nodes => nodes.map(node => {
          const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right };
        }));
        if (width > 700) {
          assert.ok(boxes.every(box => Math.abs(box.y - boxes[0].y) < 1));
          assert.ok(await track.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
        } else {
          const bounds = await track.boundingBox();
          assert.ok(boxes[0].right <= bounds.x + bounds.width && boxes[1].x < bounds.x + bounds.width, "Full first card and next edge");
          assert.ok(await track.evaluate(node => node.scrollWidth > node.clientWidth && getComputedStyle(node).scrollSnapType.includes("x")));
        }
      }
      console.log(`${width}px: all 12 variants correct, no page horizontal overflow; responsive row/rail geometry OK`);
    }
    // State updates must follow the variant URL, not equality of totals.
    await page.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    const firstPrice = await page.locator('[data-kit-recommendation] strong').first().innerText();
    await page.getByLabel("Диаметр комплекта").selectOption("120");
    await page.waitForURL("**/komplekty/cherez-perekrytie-4m-d120");
    const selected = before.find(item => item.slug === "cherez-perekrytie-4m-d120");
    await check(selected);
    assert.equal(await page.locator('[data-kit-recommendation] strong').first().innerText(), firstPrice);
    await page.getByLabel("Высота комплекта").selectOption("6");
    await page.waitForURL("**/komplekty/cherez-perekrytie-6m-d120");
    await check(before.find(item => item.slug === "cherez-perekrytie-6m-d120"));
    for (const label of ["Применение", "Что важно уточнить", "Состав комплекта"]) {
      await page.getByRole("tab", { name: label, exact: true }).click();
      assert.ok(await page.locator("#related").isVisible());
      assert.equal(await page.locator("[data-kit-recommendations]").count(), 1);
    }
    // Native touch input, not a synthetic change to scrollLeft.
    await page.setViewportSize({ width: 390, height: 844 });
    const track = page.locator("[data-kit-recommendation-track]");
    await track.scrollIntoViewIfNeeded();
    const box = await track.boundingBox(), y = Math.max(120, box.y + 100);
    const cdp = await ctx.newCDPSession(page);
    const point = x => [{ x, y, id: 1 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(box.x + box.width * .85) });
    for (let step = 1; step <= 8; step++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(box.x + box.width * (.85 - .7 * step / 8)) });
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForFunction(() => document.querySelector("[data-kit-recommendation-track]").scrollLeft > 80);
    assert.ok(await page.evaluate(() => scrollX === 0 && document.documentElement.scrollWidth <= innerWidth + 1));
    fs.mkdirSync(".codex-telegram/ready-kits-check", { recursive: true });
    await page.screenshot({ path: ".codex-telegram/ready-kits-check/recommendations-mobile.png" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await track.scrollIntoViewIfNeeded();
    await page.screenshot({ path: ".codex-telegram/ready-kits-check/recommendations-desktop.png" });
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const plain = await noJs.newPage();
    await plain.goto(`${base}/komplekty/cherez-perekrytie-6m-d120`);
    assert.equal(await plain.locator("#related a").count(), 3);
    await plain.locator("#related a").first().click();
    await plain.waitForURL("**/komplekty/cherez-perekrytie-4m-d120");
    await noJs.close();
    assert.deepEqual((await (await ctx.request.get(`${base}/api/v1/ready-kits`)).json()).items, before);
    assert.deepEqual(errors, []);
    console.log("Equal-price Ø115 → Ø120, height update, visibility with all tabs, native touch swipe, no-JS link navigation and unchanged API OK");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
