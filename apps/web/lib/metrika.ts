export const YANDEX_METRIKA_COUNTER_ID = 112091795;
export const ANALYTICS_CONSENT_STORAGE_KEY = "dimohod_analytics_consent_v1";

export const METRIKA_GOALS = {
  quickEstimateContactSent: "quick_estimate_contact_sent",
  deepMeasurementFormSent: "deep_measurement_form_sent",
  catalogCartSent: "catalog_cart_sent",
  phoneClick: "phone_click",
} as const;

export type MetrikaGoal = (typeof METRIKA_GOALS)[keyof typeof METRIKA_GOALS];
export type MetrikaGoalParams = Record<string, string | number | boolean>;

type QueuedGoal = {
  goal: MetrikaGoal;
  params?: MetrikaGoalParams;
};

type MetrikaWindow = Window & {
  __dimohodMetrikaGoalQueue?: QueuedGoal[];
  ym?: (...args: unknown[]) => void;
};

function analyticsAllowed() {
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function reachMetrikaGoal(goal: MetrikaGoal, params?: MetrikaGoalParams) {
  if (typeof window === "undefined" || !analyticsAllowed()) return false;

  const metrikaWindow = window as MetrikaWindow;
  if (typeof metrikaWindow.ym === "function") {
    metrikaWindow.ym(YANDEX_METRIKA_COUNTER_ID, "reachGoal", goal, params);
    return true;
  }

  const queue = metrikaWindow.__dimohodMetrikaGoalQueue ?? [];
  queue.push({ goal, params });
  metrikaWindow.__dimohodMetrikaGoalQueue = queue.slice(-20);
  return true;
}

export function flushMetrikaGoals() {
  if (typeof window === "undefined" || !analyticsAllowed()) return;

  const metrikaWindow = window as MetrikaWindow;
  if (typeof metrikaWindow.ym !== "function") return;

  const queue = metrikaWindow.__dimohodMetrikaGoalQueue ?? [];
  metrikaWindow.__dimohodMetrikaGoalQueue = [];
  for (const { goal, params } of queue) {
    metrikaWindow.ym(YANDEX_METRIKA_COUNTER_ID, "reachGoal", goal, params);
  }
}
