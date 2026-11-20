// Isolated local preview only. Lead submission is intercepted, never sent.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const base = process.env.READY_KITS_BASE_URL || "http://127.0.0.1:3128";
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
    let submitted = 0;
    await ctx.route("**/api/v1/leads", async route => {
      assert.equal(route.request().method(), "POST");
      const form = await new Response(route.request().postDataBuffer(), {
        headers: { "Content-Type": route.request().headers()["content-type"] },
      }).formData();
      assert.equal(form.get("source"), "Готовые комплекты");
      assert.equal(form.get("name"), "Тестовый клиент");
      assert.equal(form.get("phone"), "+79990000000");
      assert.equal(form.get("personal_data_consent"), "true");
      assert.ok(form.get("configuration").includes("/komplekty"));
      assert.equal(form.get("comment"), "Диаметр 150, высота 5 м");
      submitted++;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "accepted" }) });
    });
    const page = await ctx.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/komplekty`);
      const block = page.locator("[data-kit-custom-request]");
      assert.equal(await block.count(), 1);
      assert.equal(await page.locator("[data-kit-group]").count(), 4);
      await block.scrollIntoViewIfNeeded();
      const box = await block.boundingBox(), last = await page.locator("[data-kit-group]").last().boundingBox();
      assert.ok(box.y >= last.y + last.height);
      assert.equal(await block.locator(":scope > div > h2").innerText(), "Нужен другой диаметр, высота или маршрут?");
      assert.equal(await block.locator(":scope > div > p").innerText(), "Рассчитайте комплект под свою печь или передайте размеры специалисту");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const calculator = block.getByRole("link", { name: "Рассчитать в калькуляторе", exact: true });
      assert.equal(await calculator.getAttribute("href"), "/bystryy-raschet");
      const trigger = block.locator('[aria-haspopup="dialog"]');
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Индивидуальный расчёт комплекта" });
      assert.ok(await dialog.isVisible());
      assert.ok(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
      await page.keyboard.press("Escape");
      assert.ok(!(await dialog.isVisible()));
      assert.ok(await trigger.evaluate(node => node === document.activeElement));
      await trigger.click();
      await dialog.getByRole("button", { name: "Закрыть форму", exact: true }).click();
      assert.ok(!(await dialog.isVisible()));
      if (width === 390) {
        fs.mkdirSync(".codex-telegram/ready-kits-check", { recursive: true });
        await page.screenshot({ path: ".codex-telegram/ready-kits-check/custom-request-mobile.png" });
      }
      await trigger.click();
      await dialog.locator('[name="name"]').fill("Тестовый клиент");
      await dialog.locator('[name="phone"]').fill("+79990000000");
      await dialog.locator('[name="comment"]').fill("Диаметр 150, высота 5 м");
      await dialog.locator('[name="personal_data_consent"]').check();
      await dialog.getByRole("button", { name: "Заказать индивидуальный расчёт", exact: true }).click();
      await dialog.getByText("Заявка принята", { exact: true }).waitFor();
      await dialog.getByRole("button", { name: "Закрыть форму", exact: true }).click();
      await calculator.click();
      await page.waitForURL("**/bystryy-raschet");
      await page.getByRole("heading", { name: "Где нужен дымоход?", exact: true }).waitFor();
      console.log(`${width}px: block follows four cards, calculator opens, form works with source, Esc/X/focus and mobile width OK`);
    }
    assert.equal(submitted, 3);
    assert.deepEqual(errors, []);
    console.log("All lead requests were intercepted locally; no production applications or emails created");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
