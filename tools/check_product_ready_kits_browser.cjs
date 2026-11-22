// Run only against tools/product_ready_kits_preview.py and an isolated Next build.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const urls = ts.transpileModule(fs.readFileSync('apps/web/lib/productUrls.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText.replace(/\bexport\s+/g, '');
const productSelectionPath = new Function(`${urls};return productSelectionPath;`)();

(async () => {
  const base = process.env.READY_KITS_BASE_URL || 'http://127.0.0.1:3129';
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(() => localStorage.setItem('dimohod_analytics_consent_v1', 'declined'));
    await ctx.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      return request.method() === 'GET' && (['127.0.0.1', 'localhost'].includes(url.hostname) || !url.protocol.startsWith('http')) ? route.continue() : route.abort();
    });
    const stats = async () => (await (await ctx.request.get(`${base}/api/v1/product-ready-kits-test-preview`)).json());
    assert.equal((await stats()).isolated_public_product_preview, true);
    const kits = (await (await ctx.request.get(`${base}/api/v1/ready-kits`)).json()).items;
    assert.equal(kits.length, 12);
    const matches = id => kits.filter(k => [115, 120, 150].includes(k.diameter_mm) && k.lines.some(l => l.sku_id === id));
    const linkHrefs = id => matches(id).map(k => `/komplekty/${k.slug}`).sort();
    const allLines = kits.flatMap(k => k.lines);
    const shiber = allLines.find(l => l.product_slug === 'odnostennyi-shiber-povorotnyi' && l.diameter_mm === 115);
    const shared = allLines.find(l => l.product_slug === 'prohodnoy-stakan' && matches(l.sku_id).length === 12);
    assert.ok(shiber && shared);
    assert.equal(matches(shiber.sku_id).length, 4);
    assert.equal(new Set(matches(shared.sku_id).map(k => k.diameter_mm)).size, 3);
    assert.equal(shared.diameter_mm, null);
    const productUrl = line => productSelectionPath(line.product_slug, line, line.article);
    const page = await ctx.newPage(), errors = [], kitRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/v1/ready-kits')) kitRequests.push(request.url()); });
    const block = () => page.locator('[data-product-ready-kits]');
    async function assertLinks(id) {
      const expected = linkHrefs(id);
      if (!expected.length) { await block().waitFor({ state: 'detached' }); return; }
      await block().waitFor();
      assert.deepEqual((await block().locator('a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))).sort(), expected);
      assert.equal(await block().locator('svg.lucide-package').count(), 1);
      assert.equal(await block().locator('a').count(), new Set(expected).size);
      assert.ok(await block().evaluate(node => {
        const before = node.previousElementSibling, after = node.nextElementSibling;
        return before?.classList.contains('product-variant-block') && (!after || after.classList.contains('product-configurator-block'));
      }));
    }
    for (const line of [shiber, shared]) {
      const start = (await stats()).requests['/api/v1/ready-kits'];
      const html = (await (await ctx.request.get(`${base}${productUrl(line)}`)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      const section = html.match(/<section[^>]*data-product-ready-kits[^>]*>[\s\S]*?<\/section>/)?.[0];
      assert.ok(section, 'Plain HTTP contains initial SKU links');
      for (const href of linkHrefs(line.sku_id)) assert.ok(section.includes(`href="${href}"`));
      assert.equal((await stats()).requests['/api/v1/ready-kits'] - start, 1, 'One aggregate server request per product render');
      await page.goto(`${base}${productUrl(line)}`);
      await assertLinks(line.sku_id);
    }
    const product = await (await ctx.request.get(`${base}/api/v1/products/${shiber.product_slug}?compact=true&include_compatible=false`)).json();
    const absent = product.compact_skus.find(row => row[5] === 115 && row[3] === 'AISI 430');
    assert.equal(matches(absent[0]).length, 0);
    const absentHtml = (await (await ctx.request.get(`${base}${productUrl({ ...shiber, article: absent[1] })}`)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    assert.ok(!absentHtml.includes('data-product-ready-kits'), 'No empty section in server HTML for a real non-member SKU');
    console.log(`Real public data: ${shiber.article} → 4 kits; ${shared.article} → all 12 across Ø115/120/150; exact links in SSR`);

    await page.goto(`${base}${productUrl(shiber)}`);
    const steel = page.locator('.variant-group-steel_grade select');
    await steel.selectOption('AISI 430');
    await block().waitFor({ state: 'detached' });
    await steel.selectOption('AISI 304');
    await assertLinks(shiber.sku_id);
    await page.locator('.variant-group-diameter select').selectOption({ label: '120 мм' });
    const shiber120 = allLines.find(l => l.product_slug === shiber.product_slug && l.diameter_mm === 120);
    await assertLinks(shiber120.sku_id);
    console.log('Steel change hides/restores the section; diameter change immediately shows the correct other kit variants');

    fs.mkdirSync('.codex-telegram/product-ready-kits', { recursive: true });
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.goto(`${base}${productUrl(shared)}`);
      await assertLinks(shared.sku_id);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      for (const anchor of await block().locator('a').all()) assert.ok((await anchor.boundingBox()).height >= 44);
      await block().screenshot({ path: `.codex-telegram/product-ready-kits/shared-${width}.png` });
    }
    // Follow a real backlink for each diameter and verify its destination contains this same SKU.
    for (const diameter of [115, 120, 150]) {
      const kit = matches(shared.sku_id).find(k => k.diameter_mm === diameter);
      await block().locator(`a[href="/komplekty/${kit.slug}"]`).click();
      await page.waitForURL(`**/komplekty/${kit.slug}`);
      assert.ok((await page.locator('h1').innerText()).includes(`Ø${diameter} мм`));
      assert.ok((await page.locator('#bom').innerText()).includes(shared.article));
      await page.goBack();
      await assertLinks(shared.sku_id);
    }
    const plainCtx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const plain = await plainCtx.newPage();
    await plain.goto(`${base}${productUrl(shared)}`);
    assert.equal(await plain.locator('[data-product-ready-kits] a').count(), 12);
    await plainCtx.close();
    assert.deepEqual(kitRequests.filter(url => new URL(url).pathname.startsWith('/api/v1/ready-kits')), [], 'No browser requests for kit data');
    assert.deepEqual(errors, []);
    console.log('320/390/1440px and no-JS: all links accessible, no overflow; each diameter opens the right kit; browser makes zero kit-data requests');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
