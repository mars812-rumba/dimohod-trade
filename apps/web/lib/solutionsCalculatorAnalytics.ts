import { METRIKA_GOALS, reachMetrikaGoal } from "./metrika";

type Stage = "start" | "result" | "submit";
type Progress = { at: number; stages: Stage[] };
type AnalyticsWindow = Window & { __dimohodSolutionsProgress?: Progress };
const STORAGE_KEY = "dimohod:solutions-funnel:v1";
const WINDOW_MS = 30 * 60 * 1000;
const goals = { start: METRIKA_GOALS.solutionsCalcStart, result: METRIKA_GOALS.solutionsCalcResult, submit: METRIKA_GOALS.solutionsCalcSubmit };

/** One event per stage and active calculation window, including SPA navigation/reloads. No form values or contacts. */
export function trackSolutionsCalculator(stage: Stage, details: { scenario?: string; first_field?: string; source?: string } = {}) {
  if (typeof window === "undefined") return false;
  const target = window as AnalyticsWindow;
  let saved: unknown = target.__dimohodSolutionsProgress;
  if (!saved) {
    try { saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "null"); } catch { /* Memory-only fallback. */ }
  }
  const now = Date.now();
  const candidate = saved as Partial<Progress> | null;
  const valid = candidate && typeof candidate.at === "number" && now >= candidate.at && now - candidate.at < WINDOW_MS && Array.isArray(candidate.stages);
  const progress: Progress = valid ? { at: candidate.at!, stages: candidate.stages!.filter(item => ["start", "result", "submit"].includes(item)) } : { at: now, stages: [] };
  if (progress.stages.includes(stage)) return false;
  if (!reachMetrikaGoal(goals[stage], { path: window.location.pathname, ...details })) return false;
  const next: Progress = { at: now, stages: [...progress.stages, stage] };
  target.__dimohodSolutionsProgress = next;
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Do not break calculation without storage. */ }
  return true;
}

export function resetSolutionsCalculatorAnalytics() {
  if (typeof window === "undefined") return;
  delete (window as AnalyticsWindow).__dimohodSolutionsProgress;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* Optional storage. */ }
}
