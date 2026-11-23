// Read-only check against tools/product_ready_kits_preview.py and an isolated Next build.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const base = process.env.CATALOG_BASE_URL || 'http://127.0.0.1:3129';
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => localStorage.setItem('dimohod_analytics_consent_v1', 'declined'));
    await ctx.route('**/*', route => {
      const url = new URL(route.request().url());
      return route.request().method() === 'GET' && (!url.protocol.startsWith('http') || ['127.0.0.1', 'localhost'].includes(url.hostname))
        ? route.continue() : route.abort();
    });
    const get = async path => (await ctx.request.get(`${base}${path}`)).json();
    assert.equal((await get('/api/v1/product-ready-kits-test-preview')).isolated_public_product_preview, true);
    const product = await get('/api/v1/products/odnostennyi-truba?compact=true&include_compatible=false');
    const expected = [100, 115, 120, 150].map(diameter => {
      const sku = product.compact_skus.find(row => row[5] === diameter && row[6] === null
        && row[9] === 1000 && row[3] === 'AISI 304' && Number(row[4]) === 0.5 && row[2] === 'нержавеющая сталь');
      assert.ok(sku, `Real matching SKU for Ø${diameter}`);
      return { diameter, sku, price: new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(sku[11])) };
    });
    const categoryPath = '/catalog/odnokonturnye-truby';
    const html = (await (await ctx.request.get(`${base}${categoryPath}`)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const section = html.match(/<section[^>]*data-single-wall-offers[^>]*>[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, 'Table is present in plain HTTP HTML');
    assert.equal((section.match(/<a href=/g) || []).length, expected.length);
    for (const { sku, price } of expected) { assert.ok(section.includes(`sku=${sku[1]}`)); assert.ok(section.includes(price)); }
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const block = () => page.locator('[data-single-wall-offers]');
    await page.goto(`${base}${categoryPath}`);
    assert.equal(await block().locator('tbody tr').count(), expected.length);
    assert.ok(await block().evaluate(node => node.previousElementSibling.matches('.lead.catalog-category-description')
      && Boolean(node.compareDocumentPosition(document.querySelector('.catalog-mobile-filter')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    assert.ok(await page.locator('[data-single-wall-description]').evaluate(node =>
      Boolean(document.querySelector('.catalog-products-grid').compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)));
    const tree = await get('/api/v1/catalog/tree');
    const flatten = items => items.flatMap(item => [item, ...flatten(item.children)]);
    const category = flatten(tree.items).find(item => item.slug === 'odnokonturnye-truby');
    const intro = (await page.locator('.lead.catalog-category-description').innerText()).trim();
    assert.equal((intro.match(/[.!?]+(?=\s|$)/g) || []).length, 2);
    assert.equal(`${intro} ${(await page.locator('[data-single-wall-description]').innerText()).trim()}`, category.description);
    fs.mkdirSync('.codex-telegram/single-wall-offers', { recursive: true });
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.ok(await block().locator('table').evaluate(node => node.scrollWidth <= node.clientWidth + 1));
      for (const row of await block().locator('tbody tr').all()) {
        const cells = row.locator('th, td'); assert.equal(await cells.count(), 3);
        for (const cell of [cells.nth(1), cells.nth(2)]) {
          const box = await cell.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
        }
        assert.ok((await row.locator('a').boundingBox()).height >= 44);
      }
      await block().screenshot({ path: `.codex-telegram/single-wall-offers/table-${width}.png` });
    }
    await page.setViewportSize({ width: 360, height: 800 });
    for (const { diameter, sku, price } of expected) {
      await page.goto(`${base}${categoryPath}`);
      const row = block().locator('tbody tr').filter({ hasText: `Ø${diameter} мм` });
      assert.equal(await row.locator('td').first().innerText(), price);
      await row.locator('a').click();
      await page.waitForURL(url => url.pathname === `/product/odnostennyi-truba-d${diameter}`);
      assert.equal(new URL(page.url()).searchParams.get('sku'), sku[1]);
      assert.equal(await page.locator('.variant-group-diameter select').inputValue(), `${diameter}:`);
      assert.equal(await page.locator('.variant-group-length_mm select').inputValue(), '1000');
      assert.equal(await page.locator('.variant-group-steel_grade select').inputValue(), 'AISI 304');
      assert.equal(await page.locator('.variant-group-wall_thickness_mm [aria-pressed="true"]').innerText(), '0,5 мм');
      assert.ok((await page.locator('.product-variant-block').innerText()).includes(sku[1]));
      assert.equal(await page.locator('.sku-price-block-selection .sku-price').innerText(), price);
      // The detailed endpoint must agree with the table's exact SKU and raw price.
      const detail = await get(`/api/v1/products/odnostennyi-truba?sku=${sku[1]}&compact=true&include_compatible=false`);
      const selected = detail.skus.find(item => item.id === sku[0]);
      assert.ok(selected); assert.equal(selected.price_rub, sku[11]);
      assert.equal(selected.diameter_mm, diameter); assert.equal(selected.length_mm, 1000);
      assert.equal(selected.steel_grade, 'AISI 304'); assert.equal(Number(selected.wall_thickness_mm), 0.5);
      console.log(`Exact link Ø${diameter}: ${sku[1]}, 1000 mm / AISI 304 / 0.5 mm, ${price}`);
    }
    for (const length of [150, 350, 500, 750, 1000]) {
      await page.locator('.variant-group-length_mm select').selectOption(String(length));
      const image = product.extra_attributes.media.find(item => item.role === 'general' && item.lengths_mm?.includes(length));
      assert.ok(image);
      await page.waitForFunction(url => document.querySelector('img.product-image')?.getAttribute('src') === url, image.url);
      assert.equal(await page.locator('.product-gallery-thumbs button').count(), length === 1000 ? 3 : 0);
    }
    await page.goto(`${base}${categoryPath}`);
    await page.locator('select[name="length"]').selectOption('500');
    await page.locator('select[name="diameter"]').selectOption('115:');
    await page.locator('.catalog-filter-submit').click();
    await page.waitForURL(url => url.searchParams.get('length') === '500');
    assert.equal(await page.locator('select[name="length"]').inputValue(), '500');
    assert.equal(await page.locator('select[name="diameter"]').inputValue(), '115:');
    const card = page.locator('.catalog-product-card').first();
    const cardUrl = new URL(await card.locator('.catalog-product-media-link').getAttribute('href'), base);
    assert.equal(cardUrl.searchParams.get('length'), '500');
    const medium = product.extra_attributes.media.find(item => item.role === 'general' && item.lengths_mm?.includes(500));
    assert.equal(await card.locator('.catalog-product-photo').getAttribute('src'), medium.thumbnail_url);
    assert.equal(await block().locator('tbody tr').count(), expected.length);
    await page.goto(`${base}/catalog/sendvich-truby`);
    assert.equal(await block().count(), 0, 'Other category has no single-wall block');
    assert.ok(await page.locator('#sandwich-offers-title').count(), 'Existing sandwich block remains');
    const plainCtx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
    const plain = await plainCtx.newPage(); await plain.goto(`${base}${categoryPath}`);
    assert.equal(await plain.locator('[data-single-wall-offers] a').count(), expected.length);
    await plain.locator('[data-single-wall-offers] a').first().click();
    assert.ok((await plain.locator('.product-variant-block').innerText()).includes(expected[0].sku[1]));
    await plainCtx.close();
    assert.deepEqual(errors, []);
    console.log('360/768/1440px: price and link visible without scrolling; original HTML/no-JS links, all exact selections/prices, filters and length photos pass');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
