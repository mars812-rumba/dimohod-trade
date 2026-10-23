import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const componentSource = fs.readFileSync(
  path.join(here, "../components/ManagerEstimateCard.tsx"),
  "utf8",
);
const pageSource = fs.readFileSync(
  path.join(here, "../app/admin/estimates/[leadId]/page.tsx"),
  "utf8",
);
const stylesSource = fs.readFileSync(
  path.join(here, "../components/ManagerEstimateCard.module.css"),
  "utf8",
);

test("manager card exchanges a fragment token through a private header", () => {
  assert.match(componentSource, /location\.hash/);
  assert.match(componentSource, /X-Lead-Manager-Token/);
  assert.match(componentSource, /history\.replaceState/);
  assert.match(componentSource, /cache:\s*"no-store"/);
  assert.match(componentSource, /credentials:\s*"include"/);
  assert.match(componentSource, /setAdmin/);
  assert.match(componentSource, /hash\.get\("admin"\)===\"1\"/);
});

test("manager card renders customer measurements and BOM", () => {
  assert.match(componentSource, /Клиент/);
  assert.match(componentSource, /Замеры/);
  assert.match(componentSource, /Состав комплекта/);
  assert.match(componentSource, /payload\.estimate\.lines\.map/);
});

test("manager card exposes accessible CRUD controls and catalog search", () => {
  assert.match(componentSource, /Редактировать \$\{line\.label\}/);
  assert.match(componentSource, /Заменить SKU \$\{line\.label\}/);
  assert.match(componentSource, /Удалить \$\{line\.label\}/);
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /manager-catalog-search/);
  assert.match(componentSource, /\/items\/\$\{line\.id\}/);
  assert.match(componentSource, /\/restore/);
});

test("manager can save a revision and generate its protected PDF", () => {
  assert.match(componentSource, /\/manager\/save/);
  assert.match(componentSource, /\/manager\/pdf/);
  assert.match(componentSource, /createChimneyEstimatePdfBlob/);
  assert.match(componentSource, /Сохранить смету/);
  assert.match(componentSource, /Сформировать PDF/);
  assert.match(componentSource, /pdf_file/);
});

test("quotation number is saved before two PDFs of the same revision and downloads are separate", () => {
  assert.match(componentSource, /htmlFor="quotation-number"/);
  assert.match(componentSource, /aria-invalid=\{quotationError\}/);
  assert.match(componentSource, /\/manager\/document/);
  assert.match(componentSource, /saveSnapshot\(false,current\)/);
  assert.match(componentSource, /createChimneySpecificationPdfBlob\(estimate,number\)/);
  assert.match(componentSource, /form\.set\("specification_file"/);
  assert.match(componentSource, /documents\.revision===payload\.revision/);
  assert.match(componentSource, /documents\.quotationNumber===quotationNumber\.trim\(\)/);
  assert.match(componentSource, /Скачать смету/);
  assert.match(componentSource, /Скачать спецификацию без цен/);
});

test("catalog lines expose an estimate-only unit price and retain saved PDF prices", () => {
  assert.match(componentSource, /Стоимость за 1 шт., ₽/);
  assert.match(componentSource, /Цена по каталогу:/);
  assert.match(componentSource, /Вернуть цену каталога/);
  assert.match(componentSource, /step="0\.01"/);
  assert.match(componentSource, /quantity:Number\(draft.quantity\),unitPriceRub/);
  assert.match(componentSource, /Number\.isFinite\(unitPriceRub\)/);
  assert.match(componentSource, /unitPriceRub:line\.unit_price_rub,lineTotalRub:line\.line_total_rub/);
  assert.doesNotMatch(componentSource, /Название, цена и характеристики берутся из каталога/);
});

test("catalog BOM editing is constrained to exact catalog variants", () => {
  assert.match(componentSource, /manager\/catalog\/metadata/);
  assert.match(componentSource, /categorySlug/);
  assert.match(componentSource, /estimateVariantFields/);
  assert.match(componentSource, /estimateVariantOptions/);
  assert.match(componentSource, /selectEstimateVariant/);
  assert.match(componentSource, /\/catalog\/items/);
  assert.match(componentSource, /skuMedia/);
  assert.match(componentSource, /<Thumb media=/);
  assert.match(componentSource, /PipeVariantControls/);
  assert.match(componentSource, /quantityDrafts/);
  assert.match(componentSource, /saveQuantity/);
  assert.match(componentSource, /replaceVariant/);
  assert.match(componentSource, /product_kind\?\.includes\("труб"\)/);
  assert.match(componentSource, /isSandwichProduct\(p\)/);
  assert.match(componentSource, /const available=estimateGeometryVariants\(variants,current\)/);
});

test("flange rows expose the verified base size as an inline SKU selector", () => {
  assert.match(componentSource, /product_kind==="фланец"/);
  assert.match(componentSource, /FlangeVariantControls/);
  assert.match(componentSource, /skuTextAttribute\(current,"base_size"\)/);
  assert.match(componentSource, /skuTextAttribute\(current,"execution"\)/);
  assert.match(componentSource, /label="Размер"/);
  assert.match(componentSource, /flangeExecutionVariant\(product\.skus,current,event\.target\.checked\)/);
  assert.match(componentSource, /type="checkbox" aria-describedby=\{statusId\}/);
  assert.match(componentSource, /Угловой фланец/);
  assert.match(componentSource, /disabled=\{disabled\|\|!executionKnown\|\|!alternative\}/);
  assert.match(componentSource, /onSelect=\{sku=>replaceVariant\(line,sku\)\}/);
});

test("manager page is excluded from search indexing", () => {
  assert.match(pageSource, /robots: \{ index: false, follow: false \}/);
});

test("manager estimate stays inside the mobile viewport", () => {
  assert.match(componentSource, /data-label="Количество"/);
  assert.match(componentSource, /quantityPrefix}>×</);
  assert.match(componentSource, /data-label="Цена"/);
  assert.match(componentSource, /data-label="Сумма"/);
  assert.match(stylesSource, /overflow-x:\s*clip/);
  assert.match(stylesSource, /tbody > tr:not\(\.editorRow\)/);
  assert.match(stylesSource, /\.tableWrap thead \{ display:\s*none; \}/);
  assert.match(stylesSource, /\.quantityCell\s*\{[\s\S]*?grid-column:\s*3;/);
  assert.match(stylesSource, /\.quantityField\s*\{[\s\S]*?min-height:\s*36px;/);
  assert.match(stylesSource, /min-width:\s*0/);
});
