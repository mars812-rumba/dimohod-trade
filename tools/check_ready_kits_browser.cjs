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
    await context.addInitScript(() => localStorage.setItem("dimohod_analytics_consent_v1", "declined"));
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) || !url.protocol.startsWith("http") ? route.continue() : route.abort();
    });
    if (process.env.READY_KITS_LIVE_MEDIA === "1") {
      const photos = new Map();
      // Optional read-only proxy for visual checks against actual public catalogue photos.
      await context.route("**/media/catalog/**", async route => {
        const path = new URL(route.request().url());
        const key = path.pathname + path.search;
        if (!photos.has(key)) photos.set(key, (async () => {
          try {
            const response = await context.request.get(`https://dimohod-trade.pro${key}`, { timeout: 10000 });
            const contentType = response.headers()["content-type"] || "";
            if (!response.ok() || !contentType.startsWith("image/")) return { status: 404, body: "" };
            return { status: 200, contentType, body: await response.body() };
          } catch { return { status: 404, body: "" }; }
        })());
        await route.fulfill(await photos.get(key));
      });
    }
    const page = await context.newPage(), errors = [];
    const marker = await context.request.get(`${base}/api/v1/ready-kits-test-preview`);
    assert.equal((await marker.json()).isolated_ready_kits_preview, true, "Only isolated preview may run this test");
    page.on("pageerror", error => errors.push(error.message));
    const indexKits = (await (await context.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    await page.goto(`${base}/komplekty`);
    assert.equal(await page.locator("[data-kit-group]").count(), 4);
    for (const key of ["roof-4", "roof-6", "wall-3", "wall-6"]) {
      const card = page.locator(`[data-kit-group="${key}"]`);
      const variants = indexKits.filter(kit => `${kit.route}-${kit.height_m}` === key);
      assert.equal(await card.locator("nav a").count(), 3);
      assert.match(await card.locator("nav a[aria-current=true]").innerText(), /115/);
      for (const diameter of [120, 150, 115]) {
        const kit = variants.find(kit => kit.diameter_mm === diameter);
        await card.locator(`nav a[href="/komplekty/${kit.slug}"]`).click();
        assert.equal(new URL(page.url()).pathname, "/komplekty", "diameter changes in-place");
        assert.equal(await card.locator("[data-kit-open]").getAttribute("href"), `/komplekty/${kit.slug}`);
        assert.equal(await card.locator("[data-kit-price-caption]").innerText(), `за комплект Ø${diameter}`);
        assert.ok((await card.locator("[data-kit-description]").innerText()).length > 20);
        const expectedPrice = kit.total_rub === null ? "Цена уточняется" : new Intl.NumberFormat("ru-RU", {
          style: "currency", currency: "RUB", maximumFractionDigits: 2,
        }).format(Number(kit.total_rub));
        assert.equal(await card.locator("[data-kit-price]").textContent(), expectedPrice);
      }
    }
    await page.screenshot({ path: `${artifacts}/grouped-index-desktop.png`, fullPage: true });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${artifacts}/grouped-index-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    console.log("Four grouped cards: all diameter links, default 115, prices/counts/URLs and mobile widths OK");
    let response = await page.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    assert.equal(response.status(), 200);
    const analyticsDecline = page.getByRole("button", { name: "Отключить аналитику", exact: true });
    if (await analyticsDecline.isVisible()) await analyticsDecline.click();
    assert.equal(await page.locator('.top-nav > a[href="/komplekty"]').isVisible(), true);
    assert.equal(await page.locator("tbody tr").count(), 11);
    const rows = page.locator("#bom tbody tr");
    assert.equal(await rows.first().locator('[data-spec-group="inner"]').count(), 0);
    const sandwich = rows.nth(3);
    for (const kind of ["inner", "insulation", "outer"]) assert.equal(await sandwich.locator(`[data-spec-group="${kind}"]`).count(), 1);
    assert.equal(await sandwich.locator("details").getAttribute("open"), null);
    assert.equal(await sandwich.locator('[data-spec-group="inner"]').isVisible(), false);
    const amounts = await sandwich.locator("td[data-label]").allTextContents();
    await sandwich.locator("summary").click();
    assert.equal(await sandwich.locator('[data-spec-group="inner"]').isVisible(), true);
    assert.match(await sandwich.locator('[data-spec-group="inner"]').innerText(), /AISI 304/);
    assert.match(await sandwich.locator('[data-spec-group="outer"]').innerText(), /AISI 430/);
    assert.deepEqual(await sandwich.locator("td[data-label]").allTextContents(), amounts);
    assert.ok(await sandwich.locator("svg").count() >= 3);
    await sandwich.locator("summary").click();
    await sandwich.screenshot({ path: `${artifacts}/desktop-sandwich-row.png` });
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
    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(size.scroll <= size.width + 1, JSON.stringify(size));
      assert.equal(await page.locator("#bom details[open]").count(), 0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const box = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: innerWidth }));
    assert.ok(box.scroll <= box.inner + 1, JSON.stringify(box));
    await page.screenshot({ path: `${artifacts}/mobile-wall.png`, fullPage: true });
    await page.screenshot({ path: `${artifacts}/mobile-wall-first-screen.png` });
    await page.locator("#bom").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${artifacts}/mobile-specification.png` });
    const firstThumb = page.locator("#bom tbody tr").first().locator("img");
    if (await firstThumb.count()) {
      await page.locator("#bom tbody tr").first().scrollIntoViewIfNeeded();
      await firstThumb.evaluate(img => { img.src = "/media/catalog/test-missing-image.png"; });
      await page.locator("#bom tbody tr").first().getByText("Фото уточняется", { exact: true }).waitFor();
    }
    const downloadEvent = page.waitForEvent("download", { timeout: 60000 });
    await page.getByRole("button", { name: "Скачать спецификацию PDF", exact: true }).click();
    const pdf = await downloadEvent;
    const pdfPath = `${artifacts}/kit-specification.pdf`;
    await pdf.saveAs(pdfPath);
    const bytes = fs.readFileSync(pdfPath);
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    assert.ok(bytes.length > 10000);
    const sample = page.locator("#bom tbody tr").nth(3);
    await sample.scrollIntoViewIfNeeded();
    if (process.env.READY_KITS_LIVE_MEDIA === "1") {
      await page.waitForFunction(() => {
        const image = document.querySelector("#bom tbody tr:nth-child(4) img");
        return image && image.complete && image.naturalWidth > 0;
      }, null, { timeout: 15000 });
    }
    await sample.screenshot({ path: `${artifacts}/mobile-sandwich-row.png` });
    const compact = await sample.boundingBox();
    assert.ok(compact.height < 250, `Compact row height ${compact.height}`);
    const briefBox = await sample.locator("[data-spec-summary]").evaluate(element => ({
      height: element.getBoundingClientRect().height, line: parseFloat(getComputedStyle(element).lineHeight),
    }));
    assert.ok(briefBox.height <= briefBox.line * 2 + 1, JSON.stringify(briefBox));
    assert.equal(await sample.locator('[data-spec-group="inner"]').isVisible(), false);
    await sample.locator("summary").click();
    assert.equal(await sample.locator('[data-spec-group="inner"]').isVisible(), true);
    await sample.screenshot({ path: `${artifacts}/mobile-sandwich-expanded.png` });
    const expanded = await sample.boundingBox();
    assert.ok(expanded.height > compact.height);
    await sample.locator("summary").press("Enter");
    assert.equal(await sample.locator('[data-spec-group="inner"]').isVisible(), false);
    console.log(`Compact mobile row ${Math.round(compact.height)} px; full details ${Math.round(expanded.height)} px; photos and actual PDF download OK`);
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
    await dialog.getByLabel("Номер телефона", { exact: true }).fill("+79991234567");
    await dialog.getByRole("button", { name: "Отправить заявку на комплект" }).click();
    assert.equal(submissions, 0); // Mandatory consent is not preselected.
    await dialog.locator('input[type="checkbox"][required]').check();
    await dialog.getByLabel("Номер телефона", { exact: true }).fill("invalid contact");
    await dialog.getByRole("button", { name: "Отправить заявку на комплект" }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(submissions, 0);
    await dialog.getByLabel("Номер телефона", { exact: true }).fill("+79991234567");
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
    await dialog.getByLabel("Способ связи", { exact: true }).selectOption("max");
    await dialog.getByLabel("Номер MAX", { exact: true }).fill("+79991234567");
    await dialog.locator('input[type="checkbox"][required]').check();
    await dialog.getByRole("button", { name: "Запросить консультацию" }).click();
    await dialog.getByText("Заявка принята", { exact: true }).waitFor();
    assert.equal(posted.contact, "+79991234567");
    assert.equal(posted.contact_method, "max");
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
    await page.goto(`${base}/komplekty`);
    assert.equal(await page.locator('[data-kit-group="roof-4"] nav a').count(), 2);
    assert.equal(await page.locator(`[data-kit-group] a[href="/komplekty/${unpublished.slug}"]`).count(), 0);
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
    assert.deepEqual(publicMatrix.items, indexKits, "catalogue/BOM/prices stay identical after UI checks");
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
    await ssr.goto(`${base}/komplekty`);
    assert.equal(await ssr.locator("[data-kit-group]").count(), 4);
    assert.equal(await ssr.locator("[data-kit-group] nav a").count(), 12);
    assert.equal(await ssr.locator('[data-kit-group] nav a[aria-current="true"]').count(), 4);
    for (const kit of indexKits) assert.equal(await ssr.locator(`[data-kit-group] nav a[href="/komplekty/${kit.slug}"]`).count(), 1);
    await ssr.locator('[data-kit-group="roof-4"] nav a[href$="d150"]').click();
    await ssr.waitForURL("**/cherez-perekrytie-4m-d150");
    assert.match(await ssr.locator("h1").innerText(), /Ø150/);
    await ssr.goto(`${base}/komplekty/cherez-perekrytie-4m-d115`);
    assert.equal(await ssr.locator("tbody tr").count(), 11);
    assert.match(await ssr.locator("h1").innerText(), /Ø115/);
    assert.ok(await ssr.locator('[data-spec-group="inner"]').count() > 0);
    assert.ok(await ssr.locator('[data-spec-group="outer"]').count() > 0);
    assert.ok(await ssr.locator("#bom tbody img").count() > 0);
    const noJsRow = ssr.locator("#bom tbody tr").nth(3);
    assert.equal(await noJsRow.locator('[data-spec-group="inner"]').isVisible(), false);
    await noJsRow.locator("summary").click();
    assert.equal(await noJsRow.locator('[data-spec-group="inner"]').isVisible(), true);
    console.log("No browser runtime errors; BOM and native disclosure work without JavaScript");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
