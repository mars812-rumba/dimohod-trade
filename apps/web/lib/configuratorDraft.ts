export type DraftFieldStatus = "known" | "measure" | "later";
export type DraftRoute = "ceiling" | "wall" | "wall-direct" | "unknown";
export type MeasurementObjectType = "banya" | "house" | "boiler-room" | "other";
export type EquipmentStatus = "installed" | "selected" | "not-selected";
export type PassportStatus = "yes" | "no" | "unknown";
export type DiameterSource = "passport" | "measured" | "unknown";

export type ScenarioConfiguratorDraft = {
  scenario: "banya" | "dom";
  objectType: MeasurementObjectType;
  equipmentStatus: EquipmentStatus;
  passportStatus: PassportStatus;
  equipmentType: "" | "pech" | "kamin" | "tt-kotel" | "gaz";
  manufacturer: string;
  model: string;
  outlet: "" | "top" | "rear";
  diameter: string;
  diameterX: string;
  diameterY: string;
  diameterSource: DiameterSource;
  connectionHeight: string;
  grateHeight: string;
  rearOutletBottomHeight: string;
  warmupLength: string;
  rotaryDamperHeight: string;
  supportCapHeight: string;
  connectionDetails: string;
  route: DraftRoute;
  ceilingHeight: string;
  floorThickness: string;
  secondCeilingHeight: string;
  secondFloorThickness: string;
  thirdCeilingHeight: string;
  thirdFloorThickness: string;
  levels: string;
  hasAttic: boolean;
  ridgeHeight: string;
  ridgeHorizontalDistance: string;
  routeHeight: string;
  roofAngle: string;
  roofThickness: string;
  passageWoolKits: string;
  atticHeight: string;
  wallExitHeight: string;
  wallDistance: string;
  wallThickness: string;
  wallMaterial: string;
  verticalRise: string;
  facadeOffset: string;
  roofOverhang: string;
  outdoorHeight: string;
  routeNotes: string;
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
    objectType: scenario === "banya" ? "banya" : "house",
    equipmentStatus: "installed",
    passportStatus: "unknown",
    equipmentType: "",
    manufacturer: "",
    model: "",
    outlet: "",
    diameter: "",
    diameterX: "",
    diameterY: "",
    diameterSource: "unknown",
    connectionHeight: "",
    grateHeight: "",
    rearOutletBottomHeight: "",
    warmupLength: "500",
    rotaryDamperHeight: "130",
    supportCapHeight: "70",
    connectionDetails: "",
    route: "unknown",
    ceilingHeight: "",
    floorThickness: "200",
    secondCeilingHeight: "",
    secondFloorThickness: "",
    thirdCeilingHeight: "",
    thirdFloorThickness: "",
    levels: "",
    hasAttic: false,
    ridgeHeight: "",
    ridgeHorizontalDistance: "",
    routeHeight: "",
    roofAngle: "",
    roofThickness: "",
    passageWoolKits: "3",
    atticHeight: "",
    wallExitHeight: "",
    wallDistance: "",
    wallThickness: "",
    wallMaterial: "",
    verticalRise: "",
    facadeOffset: "",
    roofOverhang: "",
    outdoorHeight: "",
    routeNotes: "",
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
    draft.diameterX || draft.diameterY
      ? `патрубок X ${draft.diameterX || "?"} / Y ${draft.diameterY || "?"} мм`
      : draft.diameter ? `патрубок ${draft.diameter} мм` : "",
    draft.outlet === "rear" && draft.rearOutletBottomHeight
      ? `нижняя кромка патрубка ${draft.rearOutletBottomHeight} мм от пола`
      : draft.connectionHeight ? `верх отопителя ${draft.connectionHeight} мм от пола` : "",
    draft.connectionDetails.trim(),
  ].filter(Boolean);
  if (connection.length) params.set("stoveModel", connection.join(" · "));

  if (draft.route !== "ceiling" && draft.outdoorHeight && Number.isFinite(Number(draft.outdoorHeight))) {
    params.set("heightM", draft.outdoorHeight);
  }
  const wallDistance = Number(draft.wallDistance);
  if (draft.wallDistance && Number.isFinite(wallDistance)) {
    params.set("distanceM", String(wallDistance > 20 ? wallDistance / 1000 : wallDistance));
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
    const draft = { ...createEmptyScenarioDraft(parsed.scenario), ...parsed };
    // Older profiles stored one diameter field. Keep it visible after migration.
    if (!draft.diameterX && draft.diameter) draft.diameterX = draft.diameter;
    if (!draft.diameterY && draft.diameter) draft.diameterY = draft.diameter;
    return draft;
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
