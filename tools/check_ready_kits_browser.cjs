// Run only against the isolated tests.ready_kits_preview app, never production.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const base = process.env.READY_KITS_BASE_URL || "http://127.0.0.1:3127";
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
  const artifacts = ".codex-telegram/ready-kits-check";
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch({
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
    headless: true, args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) || !url.protocol.startsWith("http") ? route.continue() : route.abort();
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let response = await page.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    assert.equal(response.status(), 200);
    const analyticsDecline = page.getByRole("button", { name: "Отключить аналитику", exact: true });
    if (await analyticsDecline.isVisible()) await analyticsDecline.click();
    assert.equal(await page.locator("tbody tr").count(), 11);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://dimohod-trade.pro/komplekty/cherez-perekrytie-4m-d115");
    assert.equal(await page.getByLabel("Диаметр комплекта").locator("option").count(), 1);
    await page.screenshot({ path: `${artifacts}/desktop-roof.png`, fullPage: true });
    await page.getByLabel("Высота комплекта").selectOption("6");
    await page.waitForURL("**/cherez-perekrytie-6m-d115");
    assert.match(await page.locator("h1").innerText(), /6 м/);
    assert.equal(await page.locator("tbody tr").count(), 11);
    console.log("Desktop SSR/BOM/canonical/height navigation OK");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/komplekty/cherez-stenu-3m-d115`);
    assert.equal(await page.locator("tbody tr").count(), 14);
    const box = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: innerWidth }));
    assert.ok(box.scroll <= box.inner + 1, JSON.stringify(box));
    await page.screenshot({ path: `${artifacts}/mobile-wall.png`, fullPage: true });
    await page.screenshot({ path: `${artifacts}/mobile-wall-first-screen.png` });
    let posted = "";
    await page.route("**/api/v1/leads", async route => {
      posted = route.request().postData() || "";
      await route.fulfill({ status: 201, contentType: "application/json", body: '{"status":"accepted"}' });
    });
    await page.getByRole("button", { name: "Заказать комплект", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.locator('input[name="name"]').fill("Тест локальной формы");
    await dialog.locator('input[name="phone"]').fill("+79991234567");
    await dialog.locator('input[type="checkbox"][required]').check();
    await dialog.getByRole("button", { name: "Отправить заявку на комплект" }).click();
    await dialog.getByText("Заявка принята", { exact: true }).waitFor();
    assert.ok(posted.includes("ready-kit-order") && posted.includes("DT-GOLYE-05-14-D215"));
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Проконсультироваться" }).click();
    assert.match(await dialog.locator("h2").innerText(), /Консультация/);
    await page.keyboard.press("Escape");
    console.log("Mobile width, order payload, consultation OK (lead submission mocked)");

    for (const slug of ["cherez-perekrytie-4m-d120", "cherez-stenu-6m-d150", "unknown"]) {
      response = await page.goto(`${base}/komplekty/${slug}`);
      assert.equal(response.status(), 404, slug);
    }
    const xml = await (await context.request.get(`${base}/sitemap.xml`)).text();
    assert.ok(xml.includes("/komplekty/cherez-perekrytie-4m-d115"));
    assert.ok(!xml.includes("/komplekty/cherez-perekrytie-4m-d120"));
    await page.goto(`${base}/admin/ready-kits`);
    assert.match(page.url(), /\/admin\/login/);
    await context.addCookies([{ name: "dimohod_admin_session", value: "local-preview-only", url: base }]);
    await page.goto(`${base}/admin/ready-kits`);
    await page.locator("main details").first().waitFor();
    assert.equal(await page.locator("main details").count(), 12);
    await page.screenshot({ path: `${artifacts}/admin-matrix.png`, fullPage: true });
    console.log("Draft HTTP 404, sitemap, admin login and 12-row matrix OK");
    assert.deepEqual(errors, []);
    const noJs = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "block" });
    const ssr = await noJs.newPage();
    await ssr.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    assert.equal(await ssr.locator("tbody tr").count(), 11);
    assert.match(await ssr.locator("h1").innerText(), /Ø115/);
    console.log("No browser runtime errors; BOM and H1 visible without JavaScript");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
