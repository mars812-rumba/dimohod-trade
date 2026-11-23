// Run only against tests.contact_forms_preview: local storage, no DB/mail writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const base = process.env.CONTACT_FORMS_BASE_URL || "http://127.0.0.1:3129";
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 900 }, serviceWorkers: "block" });
    await context.addInitScript(() => {
      // The PDF renderer also creates sandboxed frames without storage access.
      try { localStorage.setItem("dimohod_analytics_consent_v1", "declined"); } catch {}
    });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) || !url.protocol.startsWith("http") ? route.continue() : route.abort();
    });
    const records = async () => {
      const data = await (await context.request.get(`${base}/api/v1/contact-forms-test-preview`)).json();
      assert.equal(data.isolated_contact_forms_preview, true, "Only the isolated preview may accept test leads");
      return data.records;
    };
    const initial = (await records()).length;
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const artifacts = ".codex-telegram/phone-contact-check";
    fs.mkdirSync(artifacts, { recursive: true });
    async function checkFields(form, method, screenshot) {
      const selector = form.locator('[name="contact_method"]');
      await selector.waitFor({ state: "visible" });
      assert.deepEqual(await selector.locator("option").evaluateAll(nodes => nodes.map(node => node.value)), ["phone", "max", "whatsapp"]);
      for (const [value, label] of [["phone", "Номер телефона"], ["max", "Номер MAX"], ["whatsapp", "Номер WhatsApp"]]) {
        await selector.selectOption(value);
        assert.equal(await form.getByLabel(label, { exact: true }).count(), 1);
      }
      await selector.selectOption(method);
      const number = form.locator('[name="contact"]');
      assert.equal(await number.getAttribute("type"), "tel");
      await number.fill("@invalid_contact");
      if (await form.locator('[name="name"]').count()) await form.locator('[name="name"]').fill("Проверка формы");
      await form.locator('[name="personal_data_consent"]').check();
      await form.locator('button[type="submit"]').click();
      await form.getByRole("alert").waitFor();
      assert.match(await form.getByRole("alert").innerText(), /номер телефона/);
      await number.fill("+7 999 123-45-67");
      for (const width of [360, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await selector.scrollIntoViewIfNeeded();
        assert.ok(await form.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
        for (const field of [selector, number]) {
          const box = await field.boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.height >= 44, JSON.stringify(box));
        }
        await page.screenshot({ path: `${artifacts}/${screenshot}-${width}.png` });
      }
      await page.setViewportSize({ width: 360, height: 900 });
    }
    async function submit(form, method, screenshot, success) {
      const before = (await records()).length;
      await checkFields(form, method, screenshot);
      assert.equal((await records()).length, before, "Invalid handles must not be saved");
      await form.locator('button[type="submit"]').click();
      await success.waitFor({ timeout: 30000 });
      const after = await records();
      assert.equal(after.length, before + 1);
      const record = after.find(item => !seen.has(item.id));
      assert.ok(record);
      assert.equal(record.contact_method, method);
      assert.equal(record.contact, "+7 999 123-45-67");
      assert.equal(record.phone, record.contact);
      seen.add(record.id);
      console.log(`${screenshot}: ${method}, invalid handle rejected, local lead saved, 360/1440px OK`);
    }
    const seen = new Set((await records()).map(item => item.id));
    await page.goto(`${base}/#send-materials`);
    await submit(page.locator("form.lead-form").first(), "phone", "general", page.getByText("Заявка принята", { exact: true }));

    await page.goto(`${base}/komplekty/cherez-stenu-3m-d115`);
    await page.getByRole("button", { name: "Заказать комплект", exact: true }).click();
    const kitDialog = page.getByRole("dialog", { name: "Заказать комплект", exact: true });
    await submit(kitDialog.locator("form"), "whatsapp", "ready-kit", kitDialog.getByText("Заявка принята", { exact: true }));

    await page.goto(`${base}/bystryy-raschet`);
    await page.getByRole("button", { name: "Баня", exact: true }).click();
    await page.getByRole("button", { name: "Продолжить", exact: false }).click();
    await page.getByRole("button", { name: "Сверху", exact: true }).click();
    await page.getByRole("button", { name: "Продолжить", exact: false }).click();
    await page.getByRole("button", { name: "Через перекрытия и кровлю", exact: true }).click();
    await page.getByRole("button", { name: "Продолжить", exact: false }).click();
    const quick = page.locator("form").filter({ has: page.locator('[name="contact_method"]') });
    await submit(quick, "max", "quick-estimate", page.getByRole("heading", { name: "Предварительный расчёт готов", exact: true }));

    const { kit } = await (await context.request.get(`${base}/api/v1/ready-kits/cherez-stenu-3m-d115`)).json();
    const line = kit.lines.find(line => line.sku_id && line.product_slug);
    assert.ok(line, "Real catalogue SKU required for cart form");
    await page.evaluate(line => localStorage.setItem("dimohod_trade_cart_v1", JSON.stringify({ version: 1, items: [{
      skuId: line.sku_id, productId: line.product_id || line.sku_id, productSlug: line.product_slug,
      productName: line.name || line.label || "Труба", article: line.article || "SKU", skuName: line.name || line.label || "Труба",
      quantity: 1, unitPriceRub: Number(line.unit_price_rub), characteristics: [], imageUrl: null, addedAt: new Date().toISOString(),
    }] })), line);
    await page.goto(`${base}/cart`);
    await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
    const cartDialog = page.getByRole("dialog", { name: "Отправить корзину менеджеру", exact: true });
    await submit(cartDialog.locator("form"), "max", "cart-estimate", page.getByRole("heading", { name: "Заявка с корзиной отправлена", exact: true }));
    assert.equal((await records()).length, initial + 4);
    assert.deepEqual(errors, []);
    console.log("All four public contact forms saved locally without production writes or email");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
