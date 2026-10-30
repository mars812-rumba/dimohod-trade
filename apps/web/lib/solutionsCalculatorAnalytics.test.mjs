import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const storageKey = "dimohod:solutions-funnel:v1";
function setup({ consent = "accepted", ready = true, brokenStorage = false, ssr = false } = {}) {
  const calls = [];
  const stored = new Map();
  const window = {
    location: { pathname: "/solutions/banya" },
    localStorage: { getItem: () => consent },
    sessionStorage: {
      getItem(key) { if (brokenStorage) throw Error("denied"); return stored.get(key) ?? null; },
      setItem(key, value) { if (brokenStorage) throw Error("denied"); stored.set(key, value); },
      removeItem(key) { if (brokenStorage) throw Error("denied"); stored.delete(key); },
    },
  };
  const ym = (...args) => calls.push(args);
  if (ready) window.ym = ym;
  let now = 10000000;
  const context = vm.createContext({ ...(ssr ? {} : { window }), Date: { now: () => now } });
  const source = [read("metrika.ts"), read("solutionsCalculatorAnalytics.ts")].join("\n");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
  vm.runInContext(`${code}\nglobalThis.api={trackSolutionsCalculator,resetSolutionsCalculatorAnalytics,flushMetrikaGoals}`, context);
  return { ...context.api, calls, window, stored, ym, advance: value => { now += value; } };
}

test("stages use the requested counter and identifiers, without synthesizing other stages", () => {
  const app = setup();
  for (const stage of ["start", "result", "submit"]) assert.equal(app.trackSolutionsCalculator(stage, { source: "quick" }), true);
  assert.deepEqual(app.calls.map(call => call.slice(0, 3)), [
    [112091795, "reachGoal", "solutions_calc_start"],
    [112091795, "reachGoal", "solutions_calc_result"],
    [112091795, "reachGoal", "solutions_calc_submit"],
  ]);
  assert.equal(JSON.stringify(app.calls).includes("contact"), false);
  const direct = setup();
  direct.trackSolutionsCalculator("submit");
  assert.equal(direct.calls.length, 1);
});

test("navigation, reload and repeat renders do not duplicate a stage", () => {
  const app = setup();
  app.trackSolutionsCalculator("start");
  app.window.location.pathname = "/configurator";
  delete app.window.__dimohodSolutionsProgress;
  assert.equal(app.trackSolutionsCalculator("start"), false);
  app.trackSolutionsCalculator("result");
  assert.equal(app.trackSolutionsCalculator("result"), false);
  assert.equal(app.calls.length, 2);
});

test("restart or timeout permits a new calculation", () => {
  const app = setup();
  app.trackSolutionsCalculator("start");
  app.resetSolutionsCalculatorAnalytics();
  assert.equal(app.trackSolutionsCalculator("start"), true);
  app.advance(30 * 60 * 1000);
  assert.equal(app.trackSolutionsCalculator("start"), true);
});

test("SSR and declined consent send nothing and do not consume a stage", () => {
  for (const options of [{ ssr: true }, { consent: "declined" }]) {
    const app = setup(options);
    assert.equal(app.trackSolutionsCalculator("start"), false);
    app.resetSolutionsCalculatorAnalytics();
    assert.equal(app.calls.length, 0);
    assert.equal(app.stored.size, 0);
  }
});

test("late counter loading queues exactly one event", () => {
  const app = setup({ ready: false });
  app.trackSolutionsCalculator("start");
  app.trackSolutionsCalculator("start");
  assert.equal(app.calls.length, 0);
  app.window.ym = app.ym;
  app.flushMetrikaGoals();
  app.flushMetrikaGoals();
  assert.equal(app.calls.length, 1);
});

test("blocked or malformed storage does not break the form", () => {
  for (const brokenStorage of [false, true]) {
    const app = setup({ brokenStorage });
    app.stored.set(storageKey, "{bad json");
    assert.equal(app.trackSolutionsCalculator("start"), true);
    assert.equal(app.trackSolutionsCalculator("start"), false);
    app.resetSolutionsCalculatorAnalytics();
  }
});

test("component wiring guards success and keeps existing business goals", () => {
  const dialog = read("../components/EstimateLeadDialog.tsx");
  assert.ok(dialog.indexOf('trackSolutionsCalculator("submit"') > dialog.indexOf("if (!response.ok) throw"));
  assert.match(dialog, /payload\?\.status\s*===\s*"accepted"/);
  assert.match(dialog, /metrikaGoal\s*===\s*METRIKA_GOALS\.quickEstimateContactSent/);
  assert.match(dialog, /reachMetrikaGoal\(METRIKA_GOALS\.leadSubmitted/);
  assert.match(dialog, /reachMetrikaGoal\(metrikaGoal/);
  const quick = read("../components/HomeQuickEstimate.tsx");
  assert.match(quick, /step\s*===\s*4\s*&&\s*matchStatus\s*===\s*"ready"/);
  assert.match(quick, /!calculation\.errors\.length/);
  const full = read("../components/ChimneyConfigurator.tsx");
  assert.match(full, /activeProfile\s*&&\s*catalogMatchStatus\s*===\s*"ready"/);
  assert.match(full, /!diagramValidationErrors\.length/);
});
