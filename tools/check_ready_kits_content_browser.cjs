// Content writes are confined to the explicitly marked isolated test preview.
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
  let context, original;
  try {
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await context.addInitScript(() => localStorage.setItem("dimohod_analytics_consent_v1", "declined"));
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) || !url.protocol.startsWith("http") ? route.continue() : route.abort();
    });
    const marker = await context.request.get(`${base}/api/v1/ready-kits-test-preview`);
    assert.equal((await marker.json()).isolated_ready_kits_preview, true);
    const kits = (await (await context.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    assert.equal(kits.length, 12);
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const ssr = await noJs.newPage();
    const descriptions = new Set();
    for (const kit of kits) {
      await ssr.goto(`${base}/komplekty/${kit.slug}`);
      assert.equal(await ssr.locator("h1").innerText(), kit.name);
      assert.equal(await ssr.locator('link[rel="canonical"]').getAttribute("href"), `https://dimohod-trade.pro/komplekty/${kit.slug}`);
      assert.equal(await ssr.locator('meta[name="description"]').getAttribute("content"), kit.content.seo_description);
      assert.equal(await ssr.locator("#faq details").count(), 6);
      assert.equal(await ssr.locator("#faq details[open]").count(), 0);
      assert.equal(await ssr.locator("#faq details p").first().textContent(), kit.content.faq[0].answer);
      assert.equal((await ssr.locator("#application section p").allTextContents()).join(" "), kit.content.application_description);
      assert.ok(await ssr.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      descriptions.add(kit.content.seo_description);
    }
    assert.equal(descriptions.size, 12);
    console.log("12 server-rendered descriptions, FAQs, canonicals and unique meta descriptions OK without JavaScript");
    await noJs.close();

    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/komplekty/${kits[0].slug}`);
    await page.locator("#faq summary").first().click();
    assert.ok(await page.locator("#faq details p").first().isVisible());
    await page.locator("#faq").screenshot({ path: `${artifacts}/content-faq-mobile.png` });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#faq").screenshot({ path: `${artifacts}/content-faq-desktop.png` });
    await context.addCookies([{ name: "dimohod_admin_session", value: "local-preview-only", url: base }]);
    const matrix = (await (await context.request.get(`${base}/api/v1/admin/ready-kits`)).json()).items;
    original = matrix.find(item => item.definition.slug === kits[0].slug).definition;
    await page.goto(`${base}/admin/ready-kits`);
    const editor = page.locator("main > details").first();
    await editor.locator("summary").click();
    assert.equal(await editor.getByLabel("Вопрос 1", { exact: true }).inputValue(), original.content.faq[0].question);
    await editor.getByLabel("Короткое описание", { exact: true }).fill("Локальная проверка короткого описания");
    await editor.getByLabel("Описание применения", { exact: true }).fill("Локальная проверка основного текста");
    await editor.getByLabel("Пояснение к составу", { exact: true }).fill("Локальная проверка пояснения");
    await editor.getByLabel("Что подготовить перед заказом — по одному пункту на строку", { exact: true }).fill("Пункт проверки один\nПункт проверки два");
    await editor.getByLabel("SEO Description", { exact: true }).fill("Локальная проверка SEO для Ø{diameter} мм");
    await editor.getByRole("button", { name: "Удалить вопрос 6", exact: true }).click();
    await editor.getByRole("button", { name: "Добавить вопрос", exact: true }).click();
    await editor.getByRole("button", { name: "Сохранить комплект", exact: true }).click();
    assert.ok(await editor.getByText("Заполните вопрос и ответ для каждого пункта FAQ или удалите пустой пункт", { exact: true }).isVisible());
    await editor.getByLabel("Вопрос 6", { exact: true }).fill("Локальный вопрос редактора?");
    await editor.getByLabel("Ответ 6", { exact: true }).fill("Локальный ответ редактора.");
    await editor.getByRole("button", { name: "Сохранить комплект", exact: true }).click();
    await editor.getByText("Сохранено", { exact: true }).waitFor();
    await page.reload();
    await editor.locator("summary").click();
    assert.equal(await editor.getByLabel("Короткое описание", { exact: true }).inputValue(), "Локальная проверка короткого описания");
    assert.equal(await editor.getByLabel("Ответ 6", { exact: true }).inputValue(), "Локальный ответ редактора.");
    const updated = (await (await context.request.get(`${base}/api/v1/ready-kits/${original.slug}`)).json()).kit;
    assert.deepEqual(updated.lines, kits[0].lines);
    assert.equal(updated.total_rub, kits[0].total_rub);
    assert.deepEqual(updated.content.selection_checklist, ["Пункт проверки один", "Пункт проверки два"]);
    assert.equal(updated.content.seo_description, "Локальная проверка SEO для Ø115 мм");
    await page.goto(`${base}/komplekty/${original.slug}`);
    assert.ok(await page.getByText("Локальная проверка короткого описания", { exact: true }).isVisible());
    assert.equal(await page.locator("#application p").first().textContent(), "Локальная проверка основного текста");
    assert.equal(await page.locator("#faq details").count(), 6);
    assert.deepEqual(errors, []);
    console.log("Admin text/checklist/FAQ/SEO edits survive reload and update public SSR; BOM, price and approval unchanged");
  } finally {
    if (original && context) {
      const matrix = (await (await context.request.get(`${base}/api/v1/admin/ready-kits`)).json()).items;
      const current = matrix.find(item => item.definition.slug === original.slug).definition;
      const restored = await context.request.put(`${base}/api/v1/admin/ready-kits/${original.slug}`, {
        data: { revision: current.revision, lines: original.lines, description: original.description,
          content: original.content, limitations: original.limitations, approved: original.status === "approved", published: original.published },
      });
      assert.ok(restored.ok(), "Restore isolated test content");
    }
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
