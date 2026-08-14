import type { ScenarioConfiguratorDraft } from "./configuratorDraft";

export const NOMINAL_PIPE_LENGTH_MM = 1000;
export const EFFECTIVE_PIPE_LENGTH_MM = 950;

export type ChimneyRouteKind = "ceiling" | "wall-top" | "wall-rear";

export type ChimneyLengthPart = {
  id: "vertical" | "horizontal" | "outdoor";
  label: string;
  requiredMm: number;
  pipeQty: number;
  coveredMm: number;
};

export type ChimneyCalculation = {
  routeKind: ChimneyRouteKind;
  floors: number;
  hasAttic: boolean;
  passageQty: number;
  diameterMm: number | null;
  diameterStatus: "known" | "oval" | "missing";
  lengthParts: ChimneyLengthPart[];
  pipeQty: number;
  requiredMm: number;
  coveredMm: number;
  reserveMm: number;
  source: "profile-total" | "profile-parts" | "configurator";
  notes: string[];
  reviewItems: string[];
};

type CalculationInput = {
  route: "ceiling" | "wall";
  outlet: "vertical" | "horizontal";
  floors: number;
  heightM: number;
  distanceM: number;
  draft: ScenarioConfiguratorDraft | null;
};

function positiveNumber(value: string | number | null | undefined): number | null {
  const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
  if (normalized === "" || normalized === null || normalized === undefined) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function pipePart(id: ChimneyLengthPart["id"], label: string, requiredMm: number): ChimneyLengthPart {
  const safeRequiredMm = Math.max(0, Math.round(requiredMm));
  const pipeQty = safeRequiredMm > 0 ? Math.ceil(safeRequiredMm / EFFECTIVE_PIPE_LENGTH_MM) : 0;
  return {
    id,
    label,
    requiredMm: safeRequiredMm,
    pipeQty,
    coveredMm: pipeQty * EFFECTIVE_PIPE_LENGTH_MM,
  };
}

function measuredDiameter(draft: ScenarioConfiguratorDraft | null): Pick<ChimneyCalculation, "diameterMm" | "diameterStatus"> {
  if (!draft) return { diameterMm: null, diameterStatus: "missing" };
  const x = positiveNumber(draft.diameterX || draft.diameter);
  const y = positiveNumber(draft.diameterY || draft.diameter);
  if (x && y) {
    if (Math.round(x) !== Math.round(y)) return { diameterMm: null, diameterStatus: "oval" };
    return { diameterMm: Math.round((x + y) / 2), diameterStatus: "known" };
  }
  const single = x ?? y;
  return single
    ? { diameterMm: Math.round(single), diameterStatus: "known" }
    : { diameterMm: null, diameterStatus: "missing" };
}

function resolveCeilingHeightMm(
  draft: ScenarioConfiguratorDraft | null,
  floors: number,
  fallbackHeightM: number,
): { value: number; source: ChimneyCalculation["source"]; note?: string } {
  const totalM = positiveNumber(draft?.routeHeight);
  if (totalM) return { value: totalM * 1000, source: "profile-total" };

  const roomHeight = positiveNumber(draft?.ceilingHeight);
  const floorThickness = positiveNumber(draft?.floorThickness);
  const atticHeight = draft?.hasAttic ? positiveNumber(draft.atticHeight) : null;
  const connectionHeight = positiveNumber(draft?.connectionHeight);
  if (roomHeight && floorThickness) {
    const firstRoom = Math.max(0, roomHeight - (connectionHeight ?? 0));
    const remainingRooms = Math.max(0, floors - 1) * roomHeight;
    const construction = floors * floorThickness;
    const knownHeight = firstRoom + remainingRooms + construction + (atticHeight ?? 0);
    return {
      value: knownHeight,
      source: "profile-parts",
      note: "Высота собрана из замеров помещений, перекрытий и чердака; участок над кровлей нужно уточнить.",
    };
  }

  return { value: fallbackHeightM * 1000, source: "configurator" };
}

function resolveHorizontalLengthMm(draft: ScenarioConfiguratorDraft | null, fallbackDistanceM: number): number {
  const inside = positiveNumber(draft?.wallDistance);
  const wall = positiveNumber(draft?.wallThickness);
  const facade = positiveNumber(draft?.facadeOffset);
  if (inside || wall || facade) return (inside ?? 0) + (wall ?? 0) + (facade ?? 0);
  return fallbackDistanceM * 1000;
}

export function calculateChimney(input: CalculationInput): ChimneyCalculation {
  const draftFloors = positiveNumber(input.draft?.levels);
  const floors = Math.max(1, Math.min(3, Math.round(draftFloors ?? input.floors)));
  const hasAttic = Boolean(input.route === "ceiling" && input.draft?.hasAttic);
  const diameter = measuredDiameter(input.draft);
  const notes: string[] = [
    `Труба считается по ${EFFECTIVE_PIPE_LENGTH_MM} мм полезной длины после соединения (номинал ${NOMINAL_PIPE_LENGTH_MM} мм).`,
    "Габариты фасонных и проходных элементов не вычитаются из длины труб без подтверждённых монтажных размеров.",
  ];
  const reviewItems = [
    "Исполнение проходных узлов и фланцев проверить по конструкции перекрытия или стены.",
    "Тип, количество и шаг креплений определить после проверки основания и геометрии трассы.",
    "Необходимость тройника, ревизии и отвода конденсата подтвердить для выбранного отопителя и маршрута.",
  ];

  let routeKind: ChimneyRouteKind;
  let source: ChimneyCalculation["source"] = "configurator";
  let lengthParts: ChimneyLengthPart[];
  let passageQty: number;

  if (input.route === "ceiling") {
    routeKind = "ceiling";
    passageQty = floors;
    const resolved = resolveCeilingHeightMm(input.draft, floors, input.heightM);
    source = resolved.source;
    if (resolved.note) notes.push(resolved.note);
    if (hasAttic) notes.push("Чердак выделен отдельной холодной зоной на схеме.");
    lengthParts = [pipePart("vertical", "Вертикальная трасса", resolved.value)];
  } else {
    routeKind = input.outlet === "horizontal" ? "wall-rear" : "wall-top";
    passageQty = 1;
    const horizontalMm = resolveHorizontalLengthMm(input.draft, input.distanceM);
    const outdoorM = positiveNumber(input.draft?.outdoorHeight) ?? input.heightM;
    const parts = [pipePart("horizontal", "Горизонтальный участок через стену", horizontalMm)];
    if (routeKind === "wall-top") {
      const rise = positiveNumber(input.draft?.verticalRise);
      if (rise) parts.unshift(pipePart("vertical", "Подъём от отопителя до поворота", rise));
    }
    parts.push(pipePart("outdoor", "Наружный вертикальный участок", outdoorM * 1000));
    lengthParts = parts;
    source = input.draft && (positiveNumber(input.draft.wallDistance) || positiveNumber(input.draft.outdoorHeight))
      ? "profile-parts"
      : "configurator";
  }

  if (diameter.diameterStatus === "missing") {
    reviewItems.unshift("Указать наружный диаметр патрубка, чтобы подобрать конкретные SKU.");
  } else if (diameter.diameterStatus === "oval") {
    reviewItems.unshift("Замеры X и Y отличаются: овальность патрубка нужно проверить до подбора SKU.");
  }

  const pipeQty = lengthParts.reduce((sum, part) => sum + part.pipeQty, 0);
  const requiredMm = lengthParts.reduce((sum, part) => sum + part.requiredMm, 0);
  const coveredMm = lengthParts.reduce((sum, part) => sum + part.coveredMm, 0);

  return {
    routeKind,
    floors,
    hasAttic,
    passageQty,
    ...diameter,
    lengthParts,
    pipeQty,
    requiredMm,
    coveredMm,
    reserveMm: coveredMm - requiredMm,
    source,
    notes,
    reviewItems,
  };
}
