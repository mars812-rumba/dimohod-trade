import {
  createEmptyScenarioDraft,
  type EquipmentStatus,
  type ScenarioConfiguratorDraft,
} from "./configuratorDraft";

export const QUICK_ESTIMATE_DEFAULT_DIAMETER_MM = 120;
export const QUICK_ESTIMATE_FLOOR_HEIGHT_MM = 2500;
export const QUICK_ESTIMATE_ATTIC_HEIGHT_MM = 1500;
export const QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM = 1500;

export type QuickEstimateObject = "banya" | "house";
export type QuickEstimateRoute = "ceiling" | "wall";
export type QuickEstimateOutlet = "top" | "rear";
export type QuickEstimateEquipment = ScenarioConfiguratorDraft["equipmentType"];

export type QuickEstimateAnswers = {
  objectType: QuickEstimateObject;
  equipmentStatus: EquipmentStatus;
  equipmentType: QuickEstimateEquipment;
  outlet: QuickEstimateOutlet;
  diameterMm: number | null;
  route: QuickEstimateRoute;
  floors: number;
  hasAttic: boolean;
  outdoorHeightM: number;
  wallDistanceM: number | null;
};

export function quickEstimateDraft(answers: QuickEstimateAnswers): ScenarioConfiguratorDraft {
  const scenario = answers.objectType === "banya" ? "banya" : "dom";
  const draft = createEmptyScenarioDraft(scenario);
  const wallDistanceM = answers.wallDistanceM ?? 0;
  const levelHeight = String(QUICK_ESTIMATE_FLOOR_HEIGHT_MM);

  return {
    ...draft,
    objectType: answers.objectType,
    equipmentStatus: answers.equipmentStatus,
    equipmentType: answers.equipmentType,
    outlet: answers.outlet,
    diameter: String(answers.diameterMm ?? QUICK_ESTIMATE_DEFAULT_DIAMETER_MM),
    diameterSource: answers.diameterMm === null ? "unknown" : "measured",
    route: answers.route === "ceiling"
      ? "ceiling"
      : answers.outlet === "rear" ? "wall-direct" : "wall",
    levels: String(answers.floors),
    hasAttic: answers.route === "ceiling" && answers.hasAttic,
    ceilingHeight: levelHeight,
    secondCeilingHeight: answers.floors >= 2 ? levelHeight : "",
    secondFloorThickness: answers.floors >= 2 ? draft.floorThickness : "",
    thirdCeilingHeight: answers.floors >= 3 ? levelHeight : "",
    thirdFloorThickness: answers.floors >= 3 ? draft.floorThickness : "",
    atticHeight: answers.route === "ceiling" && answers.hasAttic
      ? String(QUICK_ESTIMATE_ATTIC_HEIGHT_MM)
      : "",
    outdoorHeight: answers.route === "wall" ? String(answers.outdoorHeightM) : "",
    wallDistance: answers.route === "wall" ? String(Math.round(wallDistanceM * 1000)) : "",
    routeHeight: answers.route === "ceiling"
      ? String(
        answers.floors * QUICK_ESTIMATE_FLOOR_HEIGHT_MM
        + (answers.hasAttic ? QUICK_ESTIMATE_ATTIC_HEIGHT_MM : 0)
        + QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM,
      )
      : String(Math.round(answers.outdoorHeightM * 1000)),
    routeNotes: "Предварительный быстрый расчёт. Размеры и состав комплекта нужно подтвердить по замерам.",
    deferredFields: ["manufacturer", "model", "roofAngle", "roofThickness", "ridgeHeight", "ridgeHorizontalDistance", "wallThickness"],
  };
}

export function quickEstimateHeightM(answers: QuickEstimateAnswers): number {
  if (answers.route === "wall") return answers.outdoorHeightM;
  return (
    answers.floors * QUICK_ESTIMATE_FLOOR_HEIGHT_MM
    + (answers.hasAttic ? QUICK_ESTIMATE_ATTIC_HEIGHT_MM : 0)
    + QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM
  ) / 1000;
}

export function quickEstimateAssumptions(answers: QuickEstimateAnswers): string[] {
  const items = [
    answers.diameterMm === null
      ? `Диаметр не указан — предварительно Ø${QUICK_ESTIMATE_DEFAULT_DIAMETER_MM} мм`
      : `Диаметр Ø${answers.diameterMm} мм`,
  ];
  if (answers.route === "ceiling") {
    items.push(`${QUICK_ESTIMATE_FLOOR_HEIGHT_MM / 1000} м на этаж`);
    if (answers.hasAttic) items.push(`${QUICK_ESTIMATE_ATTIC_HEIGHT_MM / 1000} м на чердак`);
    items.push(`${QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM / 1000} м наружного участка`);
    items.push("Кровельный комплект: УПК + мастер-флеш");
  }
  return items;
}
