import assert from "node:assert/strict";
import test from "node:test";
import { estimateVariantFields, estimateVariantOptions, estimateVariantValue, selectEstimateVariant, isSandwichProduct, estimateGeometryVariants } from "./estimateSkuVariants.ts";

// Synthetic selector fixtures, not catalog specifications or installation recommendations.
const sku = (id, inner, outer, length=1000, thickness="0.8", outerThickness="0.5") => ({
  id, material: inner === "Оцинковка" ? "оцинкованная сталь" : "Нержавеющая сталь",
  steel_grade: inner === "Оцинковка" ? null : inner,
  wall_thickness_mm: thickness, outer_diameter_mm: 210, length_mm: length,
  attributes: { outer_material: outer === "Оцинковка" ? "Оцинкованная сталь" : "Нержавеющая сталь",
    outer_steel_grade: outer === "Оцинковка" ? null : outer, outer_wall_thickness_mm: outerThickness },
});
const current = sku("304-g-1000", "AISI 304", "Оцинковка");
const variants = [current, sku("304-430-500", "AISI 304", "AISI 430", 500),
  sku("304-430-1000", "AISI 304", "AISI 430"), sku("304-430-thicker", "AISI 304", "AISI 430", 1000, "0.8", "0.8"),
  sku("430-g", "AISI 430", "Оцинковка", 1000, "0.5"),
  sku("g-g", "Оцинковка", "Оцинковка", 1000, null, null),
  sku("g-430", "Оцинковка", "AISI 430", 1000, null, "0.5")];

test("inner and outer galvanization are material options, missing steel is not galvanization", () => {
  assert.deepEqual(estimateVariantOptions(variants,current,"inner"), ["AISI 304","AISI 430","Оцинковка"]);
  assert.deepEqual(estimateVariantOptions(variants,current,"outer"), ["Оцинковка","AISI 430"]);
  const unknown = {...current, material:null, steel_grade:null, attributes:{}};
  assert.equal(estimateVariantValue(unknown,"inner"),"__none__");
  assert.equal(estimateVariantValue(unknown,"outer"),"__none__");
});

test("changing the outer execution preserves inner steel, thickness and length when available", () => {
  const next = selectEstimateVariant(variants,current,"outer","AISI 430");
  assert.equal(next.id,"304-430-1000");
  assert.equal(next.steel_grade,"AISI 304");
  assert.equal(next.length_mm,1000);
  assert.equal(next.wall_thickness_mm,"0.8");
});

test("available downstream options cannot fabricate a catalog combination", () => {
  const galvanized = variants.find(s=>s.id==="g-g");
  assert.deepEqual(estimateVariantOptions(variants,galvanized,"outer"),["Оцинковка","AISI 430"]);
  assert.equal(selectEstimateVariant(variants,galvanized,"outer","AISI 304"),null);
  assert.equal(selectEstimateVariant(variants,current,"length","500"),null);
  const outer430 = variants.find(s=>s.id==="304-430-1000");
  assert.equal(selectEstimateVariant(variants,outer430,"length","500").id,"304-430-500");
  assert.equal(selectEstimateVariant(variants,outer430,"outerThickness","0.8").id,"304-430-thicker");
});

test("changing inner material picks an existing SKU without copying steel into the outer tube", () => {
  const next=selectEstimateVariant(variants,current,"inner","Оцинковка");
  assert.equal(next.id,"g-g");
  assert.equal(next.steel_grade,null);
  assert.equal(next.attributes.outer_steel_grade,null);
  assert.equal(selectEstimateVariant(variants,current,"inner","AISI 304"),current);
});

test("thickness values normalize equivalent decimal strings and outer thickness is shown only if known", () => {
  const equivalent=sku("decimal","AISI 304","Оцинковка",1000,"0,80","0.50");
  assert.equal(estimateVariantValue(equivalent,"innerThickness"),"0.8");
  assert.equal(estimateVariantValue(equivalent,"outerThickness"),"0.5");
  assert.deepEqual(estimateVariantFields(variants).map(f=>f.key),["inner","outer","innerThickness","outerThickness","length"]);
  assert.ok(!estimateVariantFields([variants.find(s=>s.id==="g-g")]).some(f=>f.key==="outerThickness"));
});

test("single wall keeps simple controls and source data stays unchanged", () => {
  const single={...current, outer_diameter_mm:null, attributes:{}};
  assert.deepEqual(estimateVariantFields([single]).map(f=>f.key),["inner","innerThickness","length"]);
  const before=JSON.stringify(variants);
  selectEstimateVariant(variants,current,"outer","AISI 430");
  assert.equal(JSON.stringify(variants),before);
  assert.equal(selectEstimateVariant([],current,"inner","AISI 304"),null);
});

test("outer choices remain reachable when catalog executions have different known inner thicknesses", () => {
  const innerGalvanized = sku("gg", "Оцинковка", "Оцинковка", 1000, null, null);
  const outerStainless = sku("gs", "Оцинковка", "AISI 430", 1000, "0.5", "0.5");
  // Some legacy variants still have an AISI field despite a galvanized inner material.
  outerStainless.steel_grade="AISI 430";
  const available=[innerGalvanized,outerStainless];
  assert.equal(estimateVariantValue(outerStainless,"inner"),"Оцинковка");
  assert.deepEqual(estimateVariantOptions(available,innerGalvanized,"outer"),["Оцинковка","AISI 430"]);
  assert.equal(selectEstimateVariant(available,innerGalvanized,"outer","AISI 430").id,"gs");
});

test("sandwich fittings are enabled by catalog classification, not a pipe-only name", () => {
  for (const category of ["sendvich-troyniki","sendvich-otvody","sendvich-zaglushki","sendvich-shibery","sendvich-ogolovki-i-deflektory"]) {
    assert.ok(isSandwichProduct({category:{slug:category},contour:null,skus:[]}));
  }
  assert.ok(isSandwichProduct({category:{slug:"other"},contour:"сэндвич",skus:[]}));
  assert.ok(isSandwichProduct({category:{slug:"other"},contour:null,skus:[{contour:"двустенный"}]}));
  assert.equal(isSandwichProduct({category:{slug:"flantsy"},contour:"одностенный",skus:[]}),false);
});

test("tees and elbows expose the material controls but no nonexistent length", () => {
  const teeVariants=variants.map(s=>({...s,length_mm:null}));
  assert.deepEqual(estimateVariantFields(teeVariants).map(f=>f.key),["inner","outer","innerThickness","outerThickness"]);
  assert.equal(selectEstimateVariant(teeVariants,teeVariants[0],"outer","AISI 430").id,"304-430-500");
});

test("material selection stays within current geometry including angle, insulation and branch diameter", () => {
  const base={...current,diameter_mm:110,angle_deg:90,insulation_mm:50,attributes:{...current.attributes,branch_diameter_mm:110}};
  const otherMaterial={...base,id:"new-material",steel_grade:"AISI 430"};
  const wrongDiameter={...base,id:"wrong-diameter",diameter_mm:150};
  const wrongAngle={...base,id:"wrong-angle",angle_deg:45};
  const wrongInsulation={...base,id:"wrong-insulation",insulation_mm:25};
  const wrongBranch={...base,id:"wrong-branch",attributes:{...base.attributes,branch_diameter_mm:150}};
  const list=[base,otherMaterial,wrongDiameter,wrongAngle,wrongInsulation,wrongBranch];
  assert.deepEqual(estimateGeometryVariants(list,base).map(s=>s.id),[base.id,"new-material"]);
});
