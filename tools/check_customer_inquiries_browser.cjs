// Synthetic, loopback-only tests.customer_inquiries_preview; never production CRM.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const base = process.env.CUSTOMER_INQUIRIES_BASE_URL || "http://127.0.0.1:3130";
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block", acceptDownloads: true });
    await context.addInitScript(() => { try { localStorage.setItem("dimohod_analytics_consent_v1", "declined"); } catch {} });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) || !url.protocol.startsWith("http") ? route.continue() : route.abort();
    });
    const marker = await (await context.request.get(`${base}/api/v1/customer-inquiries-test-preview`)).json();
    assert.equal(marker.isolated_customer_inquiries_preview, true, "Never run against real CRM");
    assert.equal((await context.request.get(`${base}/api/v1/admin/customers`)).status(), 401);
    await context.addCookies([{ name: "dimohod_admin_session", value: marker.admin_session, url: base, httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/admin/customers`);
    const inquiry = page.locator(`[data-inquiry="${"a".repeat(32)}"]`);
    await inquiry.waitFor();
    const customers = await (await context.request.get(`${base}/api/v1/admin/customers`)).json();
    assert.equal(customers.total, 2);
    const plain = customers.items.find(item => item.inquiries?.some(item => item.lead_id === "a".repeat(32)));
    const mixed = customers.items.find(item => item.inquiries?.some(item => item.lead_id === "b".repeat(32)));
    assert.equal(plain.estimates.length, 0);
    assert.equal(mixed.estimates.length, 1);
    const plainCard = page.locator("article").filter({ has: inquiry }).first();
    assert.equal(await plainCard.getByRole("link", { name: "Открыть смету", exact: true }).count(), 0);
    assert.match(await inquiry.innerText(), /Форма на главной/);
    assert.match(await inquiry.innerText(), /Прошу перезвонить\nЕсть фото печи/);
    assert.match(await inquiry.innerText(), /https:\/\/dimohod-trade.pro\//);
    const attachmentUrl = await inquiry.getByRole("link", { name: "Скачать вложение", exact: true }).getAttribute("href");
    const file = await context.request.get(`${base}${attachmentUrl}`);
    assert.equal(file.status(), 200);
    assert.equal(await file.text(), "%PDF-synthetic-inquiry-only");
    const downloadPromise = page.waitForEvent("download");
    await inquiry.getByRole("link", { name: "Скачать вложение", exact: true }).click();
    assert.equal((await downloadPromise).suggestedFilename(), "attachment.pdf");
    console.log("Legacy plain lead and mixed customer: separate inquiry, no fake estimate, private attachment OK");

    const notes = `Заметка проверки ${Date.now()}\nПозвонить завтра`;
    const edit = inquiry.getByRole("button", { name: /Добавить заметку|Редактировать заметку/ });
    await edit.click();
    await inquiry.getByLabel("Заметка по заявке", { exact: true }).fill(notes);
    await inquiry.getByRole("button", { name: "Сохранить заметку", exact: true }).click();
    await inquiry.getByText("Заметка сохранена", { exact: true }).waitFor();
    await page.reload();
    await inquiry.getByText(notes, { exact: true }).waitFor();
    const artifacts = ".codex-telegram/customer-inquiries-check";
    fs.mkdirSync(artifacts, { recursive: true });
    for (const width of [1440, 768, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      await inquiry.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.ok(await inquiry.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
      await page.screenshot({ path: `${artifacts}/inquiry-${width}.png` });
    }
    const search = page.getByRole("search");
    await search.getByRole("searchbox").fill("a".repeat(32));
    await search.getByRole("button", { name: "Найти", exact: true }).click();
    await inquiry.waitFor();
    await page.locator(`[data-inquiry="${"b".repeat(32)}"]`).waitFor({ state: "detached" });
    console.log("Notes survive reload; search by exact lead ID and 360/768/1440px layouts OK");

    const card = page.locator("article").filter({ has: inquiry }).first();
    await card.getByRole("button", { name: "Удалить клиента и сметы", exact: true }).click();
    const confirmation = card.getByRole("dialog");
    await confirmation.getByRole("checkbox").check();
    await confirmation.getByRole("button", { name: "Подтвердить удаление", exact: true }).click();
    await inquiry.waitFor({ state: "detached" });
    assert.equal((await (await context.request.get(`${base}/api/v1/admin/customers?q=${"a".repeat(32)}`)).json()).total, 0);
    await page.getByRole("button", { name: "Восстановить клиента и сметы", exact: true }).click();
    await inquiry.waitFor();
    assert.equal(await inquiry.getByText(notes, { exact: true }).count(), 1);
    assert.deepEqual(errors, []);
    console.log("Plain lead deletion/restore works and automatic indexing never resurrects archived records");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
