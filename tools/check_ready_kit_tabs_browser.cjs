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
    page.on("pageerror", error => errors.push(error.message));
    for (const kit of before) {
      const path = `/komplekty/${kit.slug}`;
      // A normal HTTP response, no browser JS. Strip scripts so RSC payload cannot pass this assertion.
      const response = await ctx.request.get(`${base}${path}`);
      assert.ok(response.ok());
      const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      for (const text of ["Применение и маршрут", "Важные условия и ограничения", "Похожие комплекты",
        kit.content.selection_checklist[0], ...kit.lines.map(line => line.article)]) assert.ok(html.includes(text), `${kit.slug}: ${text}`);
      for (const href of ["/solutions/banya", "/solutions/dom", "/solutions/pech", `/komplekty/${before.find(item => item.slug !== kit.slug).slug}`]) {
        assert.ok(html.includes(`href="${href}"`), `${kit.slug}: real HTML link ${href}`);
      }
      assert.ok(/href="\/(?:catalog|product)\//.test(html), "Product links are in markup");
      assert.ok(!html.includes('role="tabpanel" hidden=""'), "Unenhanced panels readable sequentially");
      await page.goto(`${base}${path}`);
      await page.locator('[data-kit-tabs][data-enhanced="true"]').waitFor();
      assert.equal(await page.locator("[data-kit-panel]").count(), 4);
      assert.equal(await page.locator("[data-kit-panel]:visible").count(), 1);
      assert.ok(await page.locator("#bom").isVisible());
      assert.equal(await page.locator("#bom tbody tr").count(), kit.lines.length);
      assert.ok(!(await page.locator("#application").isVisible()));
      const scheme = page.locator("#bom > a");
      assert.equal(await scheme.getAttribute("href"), `/images/ready-kits/${kit.route}-${kit.height_m}m-scheme.webp`);
      assert.ok((await scheme.innerText()).includes(`Посмотреть схему комплекта · ${kit.height_m} м`));
      assert.ok((await ctx.request.get(`${base}${await scheme.getAttribute("href")}`)).ok());
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
      for (const label of ["Применение", "Что важно уточнить", "Похожие комплекты", "Состав комплекта"]) {
        await page.getByRole("tab", { name: label, exact: true }).click();
        const after = await tabs.boundingBox();
        assert.ok(Math.abs(after.y - initial.y) <= 2, `${size.width}/${label}: tab bar must not jump (${initial.y} → ${after.y})`);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - scroll) <= 2, `${size.width}: scroll position preserved`);
        assert.equal(page.url(), url);
        assert.equal(await page.evaluate(() => window.__kitTabsNoReload), 42);
        assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(), 1);
        assert.equal(await page.locator("[data-kit-panel]").count(), 4);
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
      assert.equal(await page.getByRole("tab", { name: "Похожие комплекты", exact: true }).getAttribute("aria-selected"), "true");
      await page.keyboard.press("Home");
      assert.ok(await page.locator("#bom").isVisible());
    }
    console.log("Mobile 320/390 and desktop 1440: no jump, no reload/hash, natural panel height, full labels, keyboard and focus OK");

    await page.setViewportSize({ width: 1440, height: 1000 });
    const trigger = page.locator("#bom > a");
    await trigger.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => scrollY);
    await trigger.click();
    const dialog = page.locator("dialog[open]");
    await dialog.waitFor();
    const viewport = dialog.locator("[data-route-viewport]");
    const canvas = viewport.locator("button");
    const normal = await canvas.boundingBox();
    await dialog.locator("header").getByRole("button", { name: "Увеличить схему", exact: true }).click();
    assert.ok((await canvas.boundingBox()).width > normal.width * 1.5);
    const box = await viewport.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const panBefore = await viewport.evaluate(node => node.scrollTop);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 90, { steps: 5 }); await page.mouse.up();
    assert.ok(await viewport.evaluate(node => node.scrollTop) > panBefore + 30);
    await page.screenshot({ path: `${artifacts}/scheme-desktop-zoom.png` });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - scrollBefore) <= 2);
    assert.ok(await trigger.evaluate(node => document.activeElement === node));
    await trigger.click();
    await page.locator("dialog[open]").getByRole("button", { name: "Закрыть схему", exact: true }).click();
    await page.locator("dialog[open]").waitFor({ state: "hidden" });
    console.log("Desktop scheme: zoom button, mouse pan, X/Escape, original scroll and focus restored");

    const mobile = await context({ isMobile: true, hasTouch: true });
    const touchPage = await mobile.newPage();
    touchPage.on("pageerror", error => errors.push(error.message));
    await touchPage.goto(`${base}/komplekty/cherez-stenu-3m-d115`);
    await touchPage.locator("#bom > a").tap();
    const touchDialog = touchPage.locator("dialog[open]");
    await touchDialog.waitFor();
    const touchViewport = touchDialog.locator("[data-route-viewport]");
    const v = await touchViewport.boundingBox(), x = v.x + v.width / 2, y = v.y + v.height / 2;
    const cdp = await mobile.newCDPSession(touchPage);
    const fingers = spread => [{ x: x - spread, y, id: 1 }, { x: x + spread, y, id: 2 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(40) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(85) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touchPage.waitForFunction(() => Number(document.querySelector('dialog[open] [style*="--route-viewer-scale"]').style.getPropertyValue("--route-viewer-scale")) > 1.5);
    const top = await touchViewport.evaluate(node => node.scrollTop);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - 100, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.ok(await touchViewport.evaluate(node => node.scrollTop) > top + 30);
    await touchPage.screenshot({ path: `${artifacts}/scheme-mobile-pinch.png` });
    await touchDialog.getByRole("button", { name: "Закрыть схему", exact: true }).tap();
    await touchPage.locator("dialog[open]").waitFor({ state: "hidden" });
    await mobile.close();
    console.log("Real Chromium touch events: two-finger pinch and one-finger pan OK");

    await page.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    for (const diameter of [120, 150, 115]) {
      await page.getByLabel("Диаметр комплекта").selectOption(String(diameter));
      await page.waitForURL(`**/komplekty/cherez-perekrytie-4m-d${diameter}`);
      assert.equal(await page.locator("#bom > a").getAttribute("href"), "/images/ready-kits/roof-4m-scheme.webp");
      assert.ok((await page.locator("h1").innerText()).includes(`Ø${diameter}`));
    }
    await page.getByLabel("Высота комплекта").selectOption("6");
    await page.waitForURL("**/komplekty/cherez-perekrytie-6m-d115");
    assert.equal(await page.locator("#bom > a").getAttribute("href"), "/images/ready-kits/roof-6m-scheme.webp");
    await page.getByRole("tab", { name: "Применение", exact: true }).click();
    assert.ok((await page.locator("#application").innerText()).includes("Название «6 м» обозначает вариант каталога."));
    const noJs = await context({ javaScriptEnabled: false });
    const plain = await noJs.newPage();
    await plain.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    for (const id of ["bom", "application", "conditions", "related"]) assert.ok(await plain.locator(`#${id}`).isVisible());
    assert.equal(await plain.getByRole("tablist").count(), 0);
    await noJs.close();
    const after = (await (await ctx.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    assert.deepEqual(after, before);
    assert.deepEqual(errors, []);
    console.log("Variant scheme/text/BOM refresh, sequential no-JS reading and unchanged API data OK");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
