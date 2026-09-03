import {
  createEmptyScenarioDraft,
  type EquipmentStatus,
  type ScenarioConfiguratorDraft,
} from "./configuratorDraft";
import type { ChimneyBomLine } from "./chimneyCalculation";

export const QUICK_ESTIMATE_DEFAULT_DIAMETER_MM = 120;
export const QUICK_ESTIMATE_FLOOR_HEIGHT_MM = 2500;
export const QUICK_ESTIMATE_ATTIC_HEIGHT_MM = 1500;
export const QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM = 1500;
export const QUICK_ESTIMATE_HEATER_HEIGHT_MM = 800;
export const QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM = 1000;
export const QUICK_ESTIMATE_SANDWICH_PIPE_LENGTH_MM = 1000;
export const QUICK_ESTIMATE_BASE_SANDWICH_PIPE_QUANTITY = 3;
export const QUICK_ESTIMATE_EXTRA_FLOOR_SANDWICH_PIPE_QUANTITY = 2;

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
    connectionHeight: answers.route === "ceiling" ? String(QUICK_ESTIMATE_HEATER_HEIGHT_MM) : "",
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
  const totalHeightMm = (
    answers.floors * QUICK_ESTIMATE_FLOOR_HEIGHT_MM
    + (answers.hasAttic ? QUICK_ESTIMATE_ATTIC_HEIGHT_MM : 0)
    + QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM
  );
  const sandwichRouteHeightMm = Math.max(
    0,
    totalHeightMm - QUICK_ESTIMATE_HEATER_HEIGHT_MM - QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM,
  );
  // calculateChimney starts the ceiling route at connectionHeight. Passing the
  // route above the heater (warmup + sandwich) prevents the assumed heater from
  // being counted twice. The quick BOM below fixes the sandwich portion itself.
  return (QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM + sandwichRouteHeightMm) / 1000;
}

export function quickEstimateSandwichPipeQuantity(answers: QuickEstimateAnswers): number {
  return QUICK_ESTIMATE_BASE_SANDWICH_PIPE_QUANTITY
    + Math.max(0, answers.floors - 1) * QUICK_ESTIMATE_EXTRA_FLOOR_SANDWICH_PIPE_QUANTITY;
}

/**
 * Apply the confirmed simplified ceiling-route kit to the quick estimate only.
 * The detailed configurator keeps its joint-aware pipe layout unchanged.
 */
export function applyQuickEstimateBomRules(
  sourceBom: ChimneyBomLine[],
  answers: QuickEstimateAnswers,
): ChimneyBomLine[] {
  const withConfirmedWarmSection = sourceBom.map((line) => {
    if (line.key.startsWith("single-pipe-")) {
      return {
        ...line,
        key: `single-pipe-${QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM}`,
        label: `Одностенная труба-разгон ${QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM} мм`,
        quantity: 1,
        nominalLengthMm: QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM,
        catalogLengthMode: "exact" as const,
        thicknessProfile: "first-floor-0.8" as const,
      };
    }
    if (line.key === "rotary-damper") {
      return { ...line, thicknessProfile: "first-floor-0.8" as const };
    }
    return line;
  });

  if (answers.route !== "ceiling" || !answers.hasAttic) return withConfirmedWarmSection;

  const withoutCalculatedPipes = withConfirmedWarmSection.filter((line) => (
    !line.key.startsWith("sandwich-pipe-") && !line.key.startsWith("single-layout-pipe-")
  ));
  const passageIndex = withoutCalculatedPipes.findIndex((line) => line.key === "ceiling-passage");
  const insertionIndex = passageIndex >= 0 ? passageIndex : withoutCalculatedPipes.length;
  const sandwichPipe: ChimneyBomLine = {
    key: `sandwich-pipe-${QUICK_ESTIMATE_SANDWICH_PIPE_LENGTH_MM}-quick`,
    productKind: "труба",
    label: `Сэндвич-труба ${QUICK_ESTIMATE_SANDWICH_PIPE_LENGTH_MM} мм`,
    quantity: quickEstimateSandwichPipeQuantity(answers),
    nominalLengthMm: QUICK_ESTIMATE_SANDWICH_PIPE_LENGTH_MM,
    contour: "сэндвич",
    insulationMm: 50,
    zone: "quick-ceiling-route",
    selectionReason: "Количество задано упрощённым правилом быстрого расчёта по этажности дома с чердаком.",
    requiresSku: true,
    catalogLengthMode: "exact",
    materialPreference: "stainless-standard",
    thicknessProfile: "upper-outdoor-0.5",
    quantityNote: "3 трубы для одного этажа с чердаком; по 2 трубы за каждый дополнительный этаж.",
  };

  return [
    ...withoutCalculatedPipes.slice(0, insertionIndex),
    sandwichPipe,
    ...withoutCalculatedPipes.slice(insertionIndex),
  ];
}

export function quickEstimateAssumptions(answers: QuickEstimateAnswers): string[] {
  const items = [
    answers.diameterMm === null
      ? `Диаметр не указан — предварительно Ø${QUICK_ESTIMATE_DEFAULT_DIAMETER_MM} мм`
      : `Диаметр Ø${answers.diameterMm} мм`,
  ];
  if (answers.route === "ceiling") {
    items.push(`Высота отопителя принята ${QUICK_ESTIMATE_HEATER_HEIGHT_MM} мм`);
    items.push(`Одностенная труба-разгон ${QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM} мм, сталь 0,8 мм`);
    items.push("Одноконтурный поворотный шибер, сталь 0,8 мм");
    items.push(`${QUICK_ESTIMATE_FLOOR_HEIGHT_MM / 1000} м на этаж`);
    if (answers.hasAttic) items.push(`${QUICK_ESTIMATE_ATTIC_HEIGHT_MM / 1000} м на чердак`);
    items.push(`${QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM / 1000} м наружного участка`);
    if (answers.hasAttic) {
      items.push(
        `${quickEstimateSandwichPipeQuantity(answers)} сэндвич-трубы по ${QUICK_ESTIMATE_SANDWICH_PIPE_LENGTH_MM} мм, внутренняя сталь 0,5 мм`,
      );
    }
    items.push("Кровельный комплект: УПК + мастер-флеш");
  }
  return items;
}
