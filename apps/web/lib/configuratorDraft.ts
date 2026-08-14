export type DraftFieldStatus = "known" | "measure" | "later";
export type DraftRoute = "ceiling" | "wall" | "wall-direct" | "unknown";

export type ScenarioConfiguratorDraft = {
  scenario: "banya" | "dom";
  equipmentType: "" | "pech" | "kamin" | "tt-kotel" | "gaz";
  manufacturer: string;
  model: string;
  outlet: "" | "top" | "rear";
  diameter: string;
  connectionHeight: string;
  connectionDetails: string;
  route: DraftRoute;
  ceilingHeight: string;
  floorThickness: string;
  levels: string;
  hasAttic: boolean;
  routeHeight: string;
  roofAngle: string;
  wallExitHeight: string;
  wallDistance: string;
  outdoorHeight: string;
  photosReady: boolean;
  deferredFields: string[];
};

export const CONFIGURATOR_DRAFT_STORAGE_KEY = "dimohod-trade:configurator-draft";

type DraftStorage = Pick<Storage, "getItem" | "setItem">;

export function createEmptyScenarioDraft(
  scenario: ScenarioConfiguratorDraft["scenario"],
): ScenarioConfiguratorDraft {
  return {
    scenario,
    equipmentType: "",
    manufacturer: "",
    model: "",
    outlet: "",
    diameter: "",
    connectionHeight: "",
    connectionDetails: "",
    route: "unknown",
    ceilingHeight: "",
    floorThickness: "200",
    levels: "",
    hasAttic: false,
    routeHeight: "",
    roofAngle: "",
    wallExitHeight: "",
    wallDistance: "",
    outdoorHeight: "",
    photosReady: false,
    deferredFields: [],
  };
}

export function draftFieldStatus(
  draft: ScenarioConfiguratorDraft,
  field: keyof ScenarioConfiguratorDraft,
): DraftFieldStatus {
  const value = draft[field];
  if (typeof value === "boolean" ? value : Array.isArray(value) ? value.length > 0 : Boolean(value)) {
    return "known";
  }
  return draft.deferredFields.includes(field) ? "later" : "measure";
}

export function scenarioDraftConfiguratorHref(draft: ScenarioConfiguratorDraft): string {
  const params = new URLSearchParams({
    scenario: draft.equipmentType || draft.scenario,
  });
  if (draft.route !== "unknown") {
    params.set("route", draft.route === "wall-direct" ? "wall" : draft.route);
  }
  if (draft.outlet) params.set("outlet", draft.outlet === "top" ? "vertical" : "horizontal");

  const connection = [
    draft.manufacturer.trim(),
    draft.model.trim(),
    draft.diameter ? `патрубок ${draft.diameter} мм` : "",
    draft.connectionHeight ? `точка подключения ${draft.connectionHeight} мм` : "",
    draft.connectionDetails.trim(),
  ].filter(Boolean);
  if (connection.length) params.set("stoveModel", connection.join(" · "));

  const height = draft.route === "ceiling" ? draft.routeHeight : draft.outdoorHeight;
  if (height && Number.isFinite(Number(height))) params.set("heightM", height);
  if (draft.wallDistance && Number.isFinite(Number(draft.wallDistance))) {
    params.set("distanceM", draft.wallDistance);
  }
  const levelsCount = draft.levels.match(/\d+/)?.[0];
  if (levelsCount) params.set("floors", levelsCount);

  params.set("draft", JSON.stringify(draft));
  return `/?${params.toString()}#calculator`;
}

export function parseScenarioDraft(value: string | null): ScenarioConfiguratorDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ScenarioConfiguratorDraft>;
    if (parsed.scenario !== "banya" && parsed.scenario !== "dom") return null;
    return { ...createEmptyScenarioDraft(parsed.scenario), ...parsed };
  } catch {
    return null;
  }
}

export function readConfiguratorDraft(storage: DraftStorage): ScenarioConfiguratorDraft | null {
  return parseScenarioDraft(storage.getItem(CONFIGURATOR_DRAFT_STORAGE_KEY));
}

export function saveConfiguratorDraft(
  storage: DraftStorage,
  draft: ScenarioConfiguratorDraft,
): void {
  storage.setItem(CONFIGURATOR_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function mergeConfiguratorDraft(
  current: ScenarioConfiguratorDraft | null,
  patch: Partial<ScenarioConfiguratorDraft> & Pick<ScenarioConfiguratorDraft, "scenario">,
): ScenarioConfiguratorDraft {
  const base = current?.scenario === patch.scenario
    ? current
    : createEmptyScenarioDraft(patch.scenario);

  return {
    ...base,
    ...patch,
    scenario: patch.scenario,
    deferredFields: patch.deferredFields ?? base.deferredFields,
  };
}

// Backward-compatible name for the configurator while scenario drafts are shared.
export const parseBanyaDraft = parseScenarioDraft;
