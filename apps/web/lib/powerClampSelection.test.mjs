import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";
import { CHIMNEY_ENGINEERING_RULES } from "./configuratorEngineeringRules.ts";
import { estimateCatalogVariants, estimatePickerVariants, defaultEstimateVariant, clampDiameterVariants } from "./clampVariants.ts";
import { estimateGeometryVariants, estimateVariantOptions, selectEstimateVariant } from "./estimateSkuVariants.ts";

const slug = "odnostennyi-krepezh-homut-silovoi";
const standard = { id:"430-250", article:"REAL-430-250", diameter_mm:250, outer_diameter_mm:null,
  steel_grade:"AISI 430", wall_thickness_mm:"0.80", material:"нержавеющая сталь", contour:"одностенный",
  length_mm:null, angle_deg:null, insulation_mm:null, attributes:{}, price_rub:"1000.62" };
const otherGrade = {...standard, id:"304-250", steel_grade:"AISI 304", price_rub:"1176.45"};
const zinc = {...standard, id:"zinc-250", material:"оцинковка", steel_grade:null};
const testSku = {...standard, id:"test-215", article:"RECOVERY-TEMP-POWER-CLAMP-D215", diameter_mm:215,
  steel_grade:null, wall_thickness_mm:null, material:null, price_rub:"100.00"};
const product = {slug, skus:[testSku,zinc,otherGrade,standard,{...standard,id:"430-200",diameter_mm:200}]};

test("new manual selection defaults to real 430/0.8 at the exact outer diameter, regardless of SKU order", () => {
  const options = estimatePickerVariants(product,{diameter:150,outer:250});
  assert.equal(defaultEstimateVariant(product,options),standard);
  assert.equal(defaultEstimateVariant(product,estimatePickerVariants(product,{diameter:115,outer:215})),null);
  assert.equal(defaultEstimateVariant(product,[zinc,otherGrade]),null);
  assert.ok(!estimateCatalogVariants(product).includes(testSku));
});

test("a confirmed real 215 clamp is selectable without substituting 220 or reviving a test SKU", () => {
  const real215 = { ...standard, id: "real-215", article: "DT-GOLYE-05-14-D215", diameter_mm: 215, price_rub: "899.00" };
  const real220 = { ...standard, id: "real-220", article: "DT-GOLYE-05-14-D220", diameter_mm: 220, price_rub: "899.00" };
  const current = { ...product, skus: [testSku, real220, real215, standard] };
  const options = estimatePickerVariants(current, { diameter: 115, outer: 215 });
  assert.deepEqual(options, [real215]);
  assert.equal(defaultEstimateVariant(current, options), real215);
  assert.equal(defaultEstimateVariant(current, options).price_rub, "899.00");
});

test("admin can change steel at fixed geometry and price follows the actual SKU", () => {
  const options=estimateGeometryVariants(estimateCatalogVariants(product),standard);
  assert.deepEqual(estimateVariantOptions(options,standard,"inner"),["Оцинковка","AISI 304","AISI 430"]);
  const next=selectEstimateVariant(options,standard,"inner","AISI 304");
  assert.equal(next,otherGrade);
  assert.equal(next.diameter_mm,250);
  assert.equal(next.price_rub,"1176.45");
  assert.deepEqual(estimateVariantOptions(options,next,"innerThickness"),["0.8"]);
  assert.equal(selectEstimateVariant(options,next,"innerThickness","1"),null);
  // A second thickness is exposed only when a real SKU exists (synthetic test fixture).
  const thicker={...otherGrade,id:"thicker-fixture",wall_thickness_mm:"1.0"};
  assert.deepEqual(estimateVariantOptions([...options,thicker],next,"innerThickness"),["0.8","1"]);
  assert.equal(selectEstimateVariant([...options,thicker],next,"innerThickness","1"),thicker);
  assert.deepEqual(clampDiameterVariants(product.skus,standard).map(s=>s.diameter_mm),[250,200]);
});

for (const filename of ["HomeQuickEstimate.tsx","ChimneyConfigurator.tsx"]) {
  const source=fs.readFileSync(new URL(`../components/${filename}`,import.meta.url),"utf8");
  const start=source.indexOf('const params = new URLSearchParams({ limit: "24", offset: "0", product_kind: line.productKind });');
  const end=source.indexOf("const fetchProducts =",start);
  assert.ok(start>0&&end>start);
  const executable=ts.transpileModule(source.slice(start,end).replace(/const diameterKinds = new Set\([^;]+;/, ""),
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const request=new Function("line","diameter","equipmentType","stove","CHIMNEY_ENGINEERING_RULES","diameterKinds",
    `${executable};return params;`);
  test(`${filename}: clamp request uses exact outer diameter and 430/0.8 even for gas equipment`,()=>{
    for (const inner of [100,110,115,120,150,200,250,300]) {
      for (const equipment of ["pech","gaz"]) {
        const params=request({productKind:"крепеж",catalogSearch:"Хомут силовой для консоли",
          catalogDiameterMode:"sandwich-outer-exact",preferredSteelGrade:"AISI 430",preferredWallThicknessMm:0.8},
          inner,equipment,equipment,CHIMNEY_ENGINEERING_RULES,new Set(["труба"]));
        assert.equal(params.get("diameter"),`${inner+100}:`);
        assert.equal(params.get("steel_grade"),"AISI 430");
        assert.equal(params.get("material"),"stainless");
        assert.equal(params.get("wall_thickness_mm"),"0.8");
      }
    }
  });
}

test("both wall-route BOM branches explicitly request the same standard power clamp",()=>{
  const source=fs.readFileSync(new URL("./chimneyCalculation.ts",import.meta.url),"utf8");
  const blocks=[...source.matchAll(/key: "outside-console-power-clamps",([\s\S]*?)quantityNote:/g)];
  assert.equal(blocks.length,2);
  for (const [,block] of blocks) {
    assert.match(block,/preferredSteelGrade: "AISI 430"/);
    assert.match(block,/preferredWallThicknessMm: 0.8/);
    assert.match(block,/catalogDiameterMode: "sandwich-outer-exact"/);
  }
  const ui=fs.readFileSync(new URL("../components/ManagerEstimateCard.tsx",import.meta.url),"utf8");
  assert.match(ui,/defaultEstimateVariant\(data,variants\)/);
  assert.match(ui,/SkuVariantFields variants=\{base\}/);
});
