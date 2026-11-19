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
    const marker = await context.request.get(`${base}/api/v1/ready-kits-test-preview`);
    assert.equal((await marker.json()).isolated_ready_kits_preview, true, "Only isolated preview may run this test");
    page.on("pageerror", error => errors.push(error.message));
    let response = await page.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    assert.equal(response.status(), 200);
    const analyticsDecline = page.getByRole("button", { name: "Отключить аналитику", exact: true });
    if (await analyticsDecline.isVisible()) await analyticsDecline.click();
    assert.equal(await page.locator('.top-nav > a[href="/komplekty"]').isVisible(), true);
    assert.equal(await page.locator("tbody tr").count(), 11);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://dimohod-trade.pro/komplekty/cherez-perekrytie-4m-d115");
    assert.equal(await page.getByLabel("Диаметр комплекта").locator("option").count(), 3);
    await page.screenshot({ path: `${artifacts}/desktop-roof.png`, fullPage: true });
    await page.getByLabel("Высота комплекта").selectOption("6");
    await page.waitForURL("**/cherez-perekrytie-6m-d115");
    assert.match(await page.locator("h1").innerText(), /6 м/);
    assert.equal(await page.locator("tbody tr").count(), 11);
    console.log("Desktop SSR/BOM/canonical/height navigation OK");

    for (const width of [1280, 1100, 1025]) {
      await page.setViewportSize({ width, height: 844 });
      const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(size.scroll <= size.width + 1, JSON.stringify(size));
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/komplekty/cherez-stenu-3m-d115`);
    assert.equal(await page.locator("tbody tr").count(), 14);
    const box = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: innerWidth }));
    assert.ok(box.scroll <= box.inner + 1, JSON.stringify(box));
    await page.screenshot({ path: `${artifacts}/mobile-wall.png`, fullPage: true });
    await page.screenshot({ path: `${artifacts}/mobile-wall-first-screen.png` });
    await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
    const mobileKitLink = page.locator('.mobile-menu-nav > a[href="/komplekty"]');
    assert.equal(await mobileKitLink.isVisible(), true);
    await page.getByRole("button", { name: "Закрыть меню", exact: true }).click();
    let posted, submissions = 0;
    await page.route("**/api/v1/ready-kits/*/inquiry", async route => {
      posted = route.request().postDataJSON();
      submissions++;
      assert.match(route.request().url(), /cherez-stenu-3m-d115\/inquiry$/);
      await route.fulfill({ status: 201, contentType: "application/json", body: '{"status":"accepted","id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}' });
    });
    await page.getByRole("button", { name: "Заказать комплект", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(await dialog.locator('input[name="name"]').count(), 0);
    await dialog.getByLabel("Телефон или Telegram", { exact: true }).fill("+79991234567");
    await dialog.getByRole("button", { name: "Отправить заявку на комплект" }).click();
    assert.equal(submissions, 0); // Mandatory consent is not preselected.
    await dialog.locator('input[type="checkbox"][required]').check();
    await dialog.getByLabel("Телефон или Telegram", { exact: true }).fill("invalid contact");
    await dialog.getByRole("button", { name: "Отправить заявку на комплект" }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(submissions, 0);
    await dialog.getByLabel("Телефон или Telegram", { exact: true }).fill("+79991234567");
    await dialog.getByRole("button", { name: "Отправить заявку на комплект" }).click();
    await dialog.getByText("Заявка принята", { exact: true }).waitFor();
    assert.equal(posted.contact, "+79991234567");
    assert.equal(posted.contact_method, "phone");
    assert.equal(posted.intent, "order");
    assert.equal(posted.personal_data_consent, true);
    assert.ok(!("name" in posted) && !("lines" in posted) && !("total_rub" in posted));
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Проконсультироваться" }).click();
    assert.match(await dialog.locator("h2").innerText(), /Консультация/);
    await dialog.getByLabel("Телефон или Telegram", { exact: true }).fill("https://t.me/kit_buyer");
    await dialog.locator('input[type="checkbox"][required]').check();
    await dialog.getByRole("button", { name: "Запросить консультацию" }).click();
    await dialog.getByText("Заявка принята", { exact: true }).waitFor();
    assert.equal(posted.contact, "@kit_buyer");
    assert.equal(posted.contact_method, "telegram");
    assert.equal(posted.intent, "consultation");
    assert.equal(submissions, 2);
    await page.keyboard.press("Escape");
    console.log("Mobile width, order payload, consultation OK (lead submission mocked)");

    // An explicit administrative unpublish must still override the approved seed.
    const initialMatrix = await (await context.request.get(`${base}/api/v1/admin/ready-kits`)).json();
    const unpublished = initialMatrix.items.find(item => item.definition.slug === "cherez-perekrytie-4m-d120").definition;
    const hidden = await context.request.put(`${base}/api/v1/admin/ready-kits/${unpublished.slug}`, {
      data: { revision: unpublished.revision, lines: unpublished.lines, description: unpublished.description,
        limitations: unpublished.limitations, approved: false, published: false },
    });
    assert.equal(hidden.status(), 200, await hidden.text());
    for (const slug of ["cherez-perekrytie-4m-d120", "unknown"]) {
      response = await page.goto(`${base}/komplekty/${slug}`);
      assert.equal(response.status(), 404, slug);
    }
    const xml = await (await context.request.get(`${base}/sitemap.xml`)).text();
    assert.ok(xml.includes("/komplekty/cherez-perekrytie-4m-d115"));
    assert.ok(!xml.includes("/komplekty/cherez-perekrytie-4m-d120"));
    assert.ok(xml.includes("/komplekty/cherez-stenu-6m-d150"));
    await page.goto(`${base}/admin/ready-kits`);
    assert.match(page.url(), /\/admin\/login/);
    await context.addCookies([{ name: "dimohod_admin_session", value: "local-preview-only", url: base }]);
    await page.goto(`${base}/admin/ready-kits`);
    await page.locator("main details").first().waitFor();
    assert.equal(await page.locator("main details").count(), 12);
    const draft = page.locator("main details").nth(1);
    await draft.locator("summary").click();
    assert.equal(JSON.parse(await draft.locator("textarea").first().inputValue()).length, 11);
    assert.match(await draft.locator("summary").innerText(), /НЕ СОГЛАСОВАН/);
    await page.screenshot({ path: `${artifacts}/admin-matrix.png`, fullPage: true });
    console.log("Draft HTTP 404, sitemap, admin login and 12-row matrix OK");

    // Restore the temporary unpublish in the guarded preview, never production.
    const matrix = await (await context.request.get(`${base}/api/v1/admin/ready-kits`)).json();
    for (const { definition: d } of matrix.items.filter(item => item.definition.status === "draft")) {
      const saved = await context.request.put(`${base}/api/v1/admin/ready-kits/${d.slug}`, {
        data: { revision: d.revision, lines: d.lines, description: d.description,
          limitations: d.limitations, approved: true, published: true },
      });
      assert.equal(saved.status(), 200, await saved.text());
    }
    const publicMatrix = await (await context.request.get(`${base}/api/v1/ready-kits`)).json();
    assert.equal(publicMatrix.items.length, 12);
    await page.goto(`${base}/komplekty/cherez-stenu-3m-d115`);
    assert.equal(await page.getByLabel("Диаметр комплекта").locator("option").count(), 3);
    for (const diameter of [120, 150]) {
      await page.getByLabel("Диаметр комплекта").selectOption(String(diameter));
      await page.waitForURL(`**/cherez-stenu-3m-d${diameter}`);
      assert.match(await page.locator("h1").innerText(), new RegExp(`Ø${diameter}`));
      assert.match(await page.locator("tbody").innerText(), new RegExp(`DT-GOLYE-05-14-D${diameter + 100}`));
    }
    await page.getByLabel("Высота комплекта").selectOption("6");
    await page.waitForURL("**/cherez-stenu-6m-d150");
    console.log("All 12 owner-approved compositions and diameter/height navigation OK; temporary unpublish preserved");
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
