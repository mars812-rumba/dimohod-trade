import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./managerEstimateCharacteristics.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace(/\bexport\s+/gu,"");
const resolve=new Function(`${code}; return managerEstimateCharacteristics;`)();
const names=new Function(`${code}; return managerEstimateNames;`)();
test("old incomplete captions are replaced by exact SKU metadata for PDF",()=>{
  const line={sku_id:"pipe-304-430",characteristics:["Ø 300/400 мм","AISI 304","0.8 мм"]};
  const canonical=["Ø 300/400 мм","Внутренняя труба: AISI 304 · 0,8 мм","Наружная труба: AISI 430 · 0,5 мм"];
  assert.deepEqual(resolve(line,{"pipe-304-430":{estimate_characteristics:canonical}}),canonical);
  assert.deepEqual(line.characteristics,["Ø 300/400 мм","AISI 304","0.8 мм"]);
});
test("manual, non-sandwich and unavailable SKUs retain saved characteristics",()=>{
  for(const sku_id of [null,"flange","retired"]){
    const line={sku_id,characteristics:["Сохранённое исполнение"]};
    assert.equal(resolve(line,{flange:{estimate_characteristics:null},other:{estimate_characteristics:["Нельзя подменять SKU"]}}),line.characteristics);
  }
});

test("both PDF name fields use the exact SKU contour names, not a neighboring variant",()=>{
  const line={sku_id:"sandwich",label:"Труба",sku_name:"Труба L=1000 мм"};
  const metadata={sandwich:{estimate_label:"Сэндвич-труба",estimate_sku_name:"Сэндвич-труба L=1000 мм"},single:{estimate_label:"Труба",estimate_sku_name:"Труба L=500 мм"}};
  assert.deepEqual(names(line,metadata),{label:"Сэндвич-труба",skuName:"Сэндвич-труба L=1000 мм"});
  assert.deepEqual(names({...line,sku_id:"single"},metadata),{label:"Труба",skuName:"Труба L=500 мм"});
  assert.deepEqual(names({...line,sku_id:null},metadata),{label:line.label,skuName:line.sku_name});
});
