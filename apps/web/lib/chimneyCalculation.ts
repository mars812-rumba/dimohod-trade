import type { ScenarioConfiguratorDraft } from "./configuratorDraft";
import {
  calculateMinimumTerminationHeight,
  type RoofTerminationRule,
} from "./chimneyTermination";
import { calculatePitchedRoofPassage } from "./roofGeometry";
import { wallRearRouteConsoleQuantity, wallRearRoutePipePlan } from "./wallRouteLayout";

export const PIPE_SOCKET_OVERLAP_MM = 50;
export const ROTARY_DAMPER_EFFECTIVE_LENGTH_MM = 130;
export const ROTARY_DAMPER_OVERALL_LENGTH_MM = 180;
export const PIPE_LENGTHS = [
  { nominalMm: 1000, effectiveMm: 950 },
  { nominalMm: 500, effectiveMm: 450 },
  { nominalMm: 350, effectiveMm: 300 },
  { nominalMm: 250, effectiveMm: 200 },
] as const;

export type ChimneyRouteKind = "ceiling" | "wall-top" | "wall-rear";
export type RouteAxis = "vertical" | "horizontal";

export type ForbiddenJointZone = {
  id: string;
  label: string;
  axis: RouteAxis;
  startMm: number;
  endMm: number;
  kind: "floor" | "wall" | "roof";
};

export type PlacedPipe = {
  id: string;
  axis: RouteAxis;
  nominalMm: number;
  effectiveMm: number;
  startMm: number;
  endMm: number;
  zone: "indoor_warm" | "wall_or_ceiling_pass" | "attic_or_cold_zone" | "outdoor";
  contour: "одностенный" | "сэндвич";
};

export type FixedRoutePart = {
  id: "warmup" | "rotary_damper" | "support_cap";
  label: string;
  axis: RouteAxis;
  nominalLengthMm: number;
  effectiveMm: number;
  startMm: number;
  endMm: number;
};

export type PipeLayoutVariant = {
  id: string;
  label: string;
  pipes: PlacedPipe[];
  coveredEndMm: number;
  reserveMm: number;
  jointPositionsMm: number[];
};

export type ChimneyBomLine = {
  key: string;
  productKind: string;
  label: string;
  quantity: number;
  nominalLengthMm?: number;
  contour?: "одностенный" | "сэндвич";
  insulationMm?: number;
  zone: string;
  selectionReason: string;
  requiresSku: boolean;
  catalogCategorySlug?: string;
  catalogSearch?: string;
  catalogDiameterMode?: "sandwich-outer-exact" | "sandwich-outer-range";
  catalogLengthMode?: "exact" | "nearest";
  materialPreference?: "stainless-standard" | "catalog-default";
  removable?: boolean;
  quantityNote?: string;
};

export type ChimneyCalculation = {
  routeKind: ChimneyRouteKind;
  floors: number;
  hasAttic: boolean;
  diameterMm: number | null;
  diameterStatus: "known" | "missing";
  roofAngleDeg: number | null;
  roofThicknessMm: number | null;
  floorThicknessesMm: number[];
  passageWoolKits: number;
  rotaryDamperHeightMm: number;
  singleWallWarmupPipeLengthMm: number;
  ridgeHeightMm: number | null;
  ridgeHorizontalDistanceMm: number | null;
  roofTerminationRequirementMm: number | null;
  tenDegreeLineHeightAtChimneyMm: number | null;
  terminationRule: RoofTerminationRule | null;
  terminationToRidgeDeltaMm: number | null;
  routeStartMm: number;
  routeTargetMm: number;
  fixedParts: FixedRoutePart[];
  forbiddenZones: ForbiddenJointZone[];
  variants: PipeLayoutVariant[];
  selectedVariant: PipeLayoutVariant | null;
  bom: ChimneyBomLine[];
  status: "automatic_draft" | "needs_review" | "invalid";
  errors: string[];
  notes: string[];
  reviewItems: string[];
};

export type CalculationInput = {
  route: "ceiling" | "wall";
  outlet: "vertical" | "horizontal";
  floors: number;
  heightM: number;
  distanceM: number;
  roofType: "pitched" | "flat";
  warmupLengthMm?: number;
  rotaryDamperHeightMm?: number;
  supportCapLengthMm?: number;
  draft: ScenarioConfiguratorDraft | null;
};

export function positiveNumber(value: string | number | null | undefined): number | null {
  const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
  if (normalized === "" || normalized === null || normalized === undefined) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function effectiveComponentHeight(nominalLengthMm: number): number {
  return Math.max(0, nominalLengthMm - PIPE_SOCKET_OVERLAP_MM);
}

function measuredDiameter(draft: ScenarioConfiguratorDraft | null): Pick<ChimneyCalculation, "diameterMm" | "diameterStatus"> {
  if (!draft) return { diameterMm: null, diameterStatus: "missing" };
  const diameter = positiveNumber(draft.diameter);
  return diameter
    ? { diameterMm: Math.round(diameter), diameterStatus: "known" }
    : { diameterMm: null, diameterStatus: "missing" };
}

export function jointInsideForbiddenZone(positionMm: number, zones: ForbiddenJointZone[]): ForbiddenJointZone | null {
  return zones.find((zone) => positionMm > zone.startMm && positionMm < zone.endMm) ?? null;
}

function pipeZone(startMm: number, endMm: number, zones: ForbiddenJointZone[], fallback: PlacedPipe["zone"]): PlacedPipe["zone"] {
  return zones.some((zone) => startMm < zone.endMm && endMm > zone.startMm)
    ? "wall_or_ceiling_pass"
    : fallback;
}

export function solvePipeLayouts({
  axis,
  startMm,
  targetMm,
  forbiddenZones,
  fallbackZone,
  contour = "сэндвич",
  maxVariants = 3,
}: {
  axis: RouteAxis;
  startMm: number;
  targetMm: number;
  forbiddenZones: ForbiddenJointZone[];
  fallbackZone: PlacedPipe["zone"];
  contour?: PlacedPipe["contour"];
  maxVariants?: number;
}): PipeLayoutVariant[] {
  if (targetMm <= startMm) return [];
  const maximumEnd = targetMm + PIPE_LENGTHS[0].effectiveMm;
  const queue: Array<{ endMm: number; lengths: Array<(typeof PIPE_LENGTHS)[number]> }> = [
    { endMm: startMm, lengths: [] },
  ];
  const results: PipeLayoutVariant[] = [];
  const bestDepthAtEnd = new Map<number, number>();

  while (queue.length && results.length < 120) {
    const current = queue.shift()!;
    if (current.lengths.length >= 48) continue;
    for (const length of PIPE_LENGTHS) {
      const endMm = current.endMm + length.effectiveMm;
      if (endMm > maximumEnd) continue;
      if (jointInsideForbiddenZone(endMm, forbiddenZones)) continue;
      const lengths = [...current.lengths, length];
      if (endMm >= targetMm) {
        let cursor = startMm;
        const pipes = lengths.map((item, index) => {
          const pipeStart = cursor;
          cursor += item.effectiveMm;
          return {
            id: `${axis}-pipe-${index + 1}`,
            axis,
            nominalMm: item.nominalMm,
            effectiveMm: item.effectiveMm,
            startMm: pipeStart,
            endMm: cursor,
            zone: pipeZone(pipeStart, cursor, forbiddenZones, fallbackZone),
            contour,
          } satisfies PlacedPipe;
        });
        results.push({
          id: lengths.map((item) => item.nominalMm).join("-"),
          label: lengths.map((item) => item.nominalMm).join(" + "),
          pipes,
          coveredEndMm: endMm,
          reserveMm: endMm - targetMm,
          jointPositionsMm: pipes.map((pipe) => pipe.endMm),
        });
        continue;
      }

      const knownDepth = bestDepthAtEnd.get(endMm);
      if (knownDepth !== undefined && knownDepth < lengths.length - 1) continue;
      bestDepthAtEnd.set(endMm, lengths.length);
      queue.push({ endMm, lengths });
    }
  }

  return results
    .sort((left, right) => {
      if (left.reserveMm !== right.reserveMm) return left.reserveMm - right.reserveMm;
      if (left.pipes.length !== right.pipes.length) return left.pipes.length - right.pipes.length;
      const leftShort = left.pipes.filter((pipe) => pipe.nominalMm < 1000).length;
      const rightShort = right.pipes.filter((pipe) => pipe.nominalMm < 1000).length;
      return leftShort - rightShort;
    })
    .filter((variant, index, all) => all.findIndex((item) => item.id === variant.id) === index)
    .slice(0, maxVariants);
}

function ceilingForbiddenZones(
  draft: ScenarioConfiguratorDraft | null,
  floors: number,
  roofType: "pitched" | "flat",
): ForbiddenJointZone[] {
  const levelMeasurements = [
    [positiveNumber(draft?.ceilingHeight), positiveNumber(draft?.floorThickness)],
    [positiveNumber(draft?.secondCeilingHeight), positiveNumber(draft?.secondFloorThickness)],
    [positiveNumber(draft?.thirdCeilingHeight), positiveNumber(draft?.thirdFloorThickness)],
  ];
  const zones: ForbiddenJointZone[] = [];
  let floorLevel = 0;
  for (let index = 0; index < floors; index += 1) {
    const fallback = levelMeasurements[0];
    const roomHeight = levelMeasurements[index]?.[0] ?? fallback[0];
    const floorThickness = levelMeasurements[index]?.[1] ?? fallback[1];
    if (!roomHeight || !floorThickness) break;
    const startMm = floorLevel + roomHeight;
    const endMm = startMm + floorThickness;
    zones.push({
      id: `floor-${index + 1}`,
      label: index === floors - 1 && draft?.hasAttic ? `Перекрытие ${index + 1} перед чердаком` : `Перекрытие ${index + 1}`,
      axis: "vertical",
      startMm,
      endMm,
      kind: "floor",
    });
    floorLevel = endMm;
  }
  const atticHeight = draft?.hasAttic ? positiveNumber(draft.atticHeight) : 0;
  const roofThickness = positiveNumber(draft?.roofThickness);
  const pitchedPassage = roofType === "pitched"
    ? calculatePitchedRoofPassage({
        ridgeInnerHeightMm: positiveNumber(draft?.ridgeHeight),
        chimneyToRidgeHorizontalMm: positiveNumber(draft?.ridgeHorizontalDistance),
        roofAngleDeg: positiveNumber(draft?.roofAngle),
        roofThicknessAlongChimneyMm: roofThickness,
      })
    : null;
  if (pitchedPassage || (roofThickness !== null && atticHeight !== null)) {
    const startMm = pitchedPassage?.innerHeightAtChimneyMm ?? floorLevel + (atticHeight ?? 0);
    const endMm = pitchedPassage?.outerHeightAtChimneyMm ?? startMm + (roofThickness ?? 0);
    zones.push({
      id: "roof-pass",
      label: "Проход через кровлю",
      axis: "vertical",
      startMm,
      endMm,
      kind: "roof",
    });
  }
  return zones;
}

function wallForbiddenZones(draft: ScenarioConfiguratorDraft | null, fallbackDistanceM: number): ForbiddenJointZone[] {
  const inside = positiveNumber(draft?.wallDistance) ?? fallbackDistanceM * 1000;
  const thickness = positiveNumber(draft?.wallThickness);
  if (!thickness) return [];
  return [{
    id: "wall-pass",
    label: "Проход через стену",
    axis: "horizontal",
    startMm: inside,
    endMm: inside + thickness,
    kind: "wall",
  }];
}

function summarizePipeBom(variants: PipeLayoutVariant[], routeKind: ChimneyRouteKind): ChimneyBomLine[] {
  const selected = variants[0];
  if (!selected) return [];
  const counts = new Map<string, { nominalLengthMm: number; contour: PlacedPipe["contour"]; quantity: number }>();
  selected.pipes.forEach((pipe) => {
    const key = `${pipe.contour}-${pipe.nominalMm}`;
    const current = counts.get(key);
    counts.set(key, { nominalLengthMm: pipe.nominalMm, contour: pipe.contour, quantity: (current?.quantity ?? 0) + 1 });
  });
  return [...counts.entries()]
    .sort(([, left], [, right]) => right.nominalLengthMm - left.nominalLengthMm)
    .map(([, { nominalLengthMm, contour, quantity }]) => ({
      key: `${contour === "сэндвич" ? "sandwich" : "single-layout"}-pipe-${nominalLengthMm}`,
      productKind: "труба",
      label: `${contour === "сэндвич" ? "Сэндвич-труба" : "Одностенная труба"} ${nominalLengthMm} мм`,
      quantity,
      nominalLengthMm,
      contour,
      insulationMm: contour === "сэндвич" ? 50 : undefined,
      zone: routeKind === "ceiling" ? "indoor/cold/pass" : "wall/outdoor",
      selectionReason: "Длина выбрана так, чтобы соединения не попадали внутрь проходных зон.",
      requiresSku: true,
    }));
}

function addRouteNodes(
  bom: ChimneyBomLine[],
  routeKind: ChimneyRouteKind,
  passageQty: number,
  hasAttic: boolean,
  singleWallWarmupPipeLengthMm: number,
  rotaryDamperHeightMm: number,
  passageWoolKits: number,
  wallRearConsoleQuantity: number,
) {
  if (routeKind === "ceiling") {
    if (singleWallWarmupPipeLengthMm > 0) {
      bom.unshift({
        key: `single-pipe-${singleWallWarmupPipeLengthMm}`,
        productKind: "труба",
        label: `Одностенная труба-разгон ${singleWallWarmupPipeLengthMm} мм`,
        quantity: 1,
        nominalLengthMm: singleWallWarmupPipeLengthMm,
        contour: "одностенный",
        zone: "indoor_warm",
        selectionReason: "Из общей высоты разгона вычтена высота поворотного шибера.",
        requiresSku: true,
        catalogLengthMode: "nearest",
      });
    }
    bom.splice(singleWallWarmupPipeLengthMm > 0 ? 1 : 0, 0, {
      key: "rotary-damper",
      productKind: "шибер",
      label: "Одноконтурный шибер поворотный",
      quantity: 1,
      contour: "одностенный",
      zone: "transition",
      selectionReason: `Установлен между трубой-разгоном и опорной заглушкой; полезная длина ${rotaryDamperHeightMm} мм уже учитывает вставленный 50-мм порт.`,
      requiresSku: true,
      catalogSearch: "Одноконтурный шибер поворотный",
    });
    bom.splice(singleWallWarmupPipeLengthMm > 0 ? 2 : 1, 0, {
      key: "support-cap",
      productKind: "заглушка",
      label: "Сэндвич-заглушка опорная",
      quantity: 1,
      contour: "сэндвич",
      insulationMm: 50,
      zone: "transition",
      selectionReason: "Опорный переход перед сэндвич-участком задан схемой.",
      requiresSku: true,
    });
  }
  bom.push({
    key: routeKind === "ceiling" ? "ceiling-passage" : "wall-passage",
    productKind: "проходной_узел",
    label: routeKind === "ceiling" ? "Стакан прохода перекрытия" : "Стакан прохода стены",
    quantity: passageQty,
    zone: "wall_or_ceiling_pass",
    selectionReason: "По одному стакану для каждой рассчитанной проходной зоны.",
    requiresSku: true,
    catalogCategorySlug: "uzly-prohoda-sten-i-perekrytiy",
    catalogSearch: routeKind === "ceiling" ? "Проходной стакан" : undefined,
  });
  bom.push({
    key: "passage-insulation",
    productKind: "изоляция",
    label: "Комплект ваты для проходных узлов",
    quantity: routeKind === "ceiling" ? passageWoolKits : passageQty,
    zone: "wall_or_ceiling_pass",
    selectionReason: "Общее количество для проходов перекрытий и кровли задаётся вручную и проверяется менеджером.",
    requiresSku: true,
    catalogCategorySlug: "uzly-prohoda-sten-i-perekrytiy",
    catalogSearch: "Комплект ваты для проходного стакана",
    quantityNote: routeKind === "ceiling" ? "Количество указано вручную." : undefined,
  });
  bom.push({
    key: "passage-flange",
    productKind: "фланец",
    label: "Фланец проходного узла",
    quantity: passageQty * 2,
    zone: "wall_or_ceiling_pass",
    selectionReason: "По два фланца на проход: со стороны помещения и с противоположной стороны конструкции.",
    requiresSku: true,
  });
  const upperFloorSkirtQty = Math.max(0, passageQty - (hasAttic ? 1 : 0));
  const decorativeSkirts = routeKind === "ceiling"
    ? [
      {
        key: "floor-decorative-skirt-upper",
        label: "Декоративная юбка — сверху перекрытия",
        quantity: upperFloorSkirtQty,
        selectionReason: "Закрывает верхний фланец прямого прохода только в помещении; со стороны холодного чердака юбка не устанавливается.",
      },
      {
        key: "floor-decorative-skirt-lower",
        label: "Декоративная юбка — снизу перекрытия",
        quantity: passageQty,
        selectionReason: "Закрывает нижний фланец прямого прохода перекрытия.",
      },
    ]
    : [
      {
        key: "wall-decorative-skirt-interior",
        label: "Декоративная юбка — со стороны помещения",
        quantity: passageQty,
        selectionReason: "Закрывает фланец прямого прохода с внутренней стороны стены.",
      },
      {
        key: "wall-decorative-skirt-exterior",
        label: "Декоративная юбка — с наружной стороны стены",
        quantity: passageQty,
        selectionReason: "Закрывает фланец прямого прохода с наружной стороны стены.",
      },
    ];
  decorativeSkirts.filter((skirt) => skirt.quantity > 0).forEach((skirt) => bom.push({
    ...skirt,
    productKind: "декоративная_юбка",
    zone: "wall_or_ceiling_pass",
    requiresSku: true,
    catalogCategorySlug: "uzly-prohoda-sten-i-perekrytiy",
    catalogSearch: "Декоративная юбка",
    catalogDiameterMode: "sandwich-outer-exact",
    removable: true,
  }));
  bom.push({
    key: routeKind === "ceiling" ? "floor-clamp" : "wall-clamp",
    productKind: "крепеж",
    label: routeKind === "ceiling" ? "Хомут в перекрытие" : "Хомут в стеновой проход",
    quantity: routeKind === "ceiling" ? passageQty + 1 : passageQty,
    zone: "wall_or_ceiling_pass",
    selectionReason: routeKind === "ceiling"
      ? "По одному на каждый проход перекрытия и один на проход кровли; используется одно семейство с изменяемым углом."
      : "По одному на проход; размер выбирается по наружному диаметру сэндвич-трубы.",
    requiresSku: true,
    catalogCategorySlug: routeKind === "ceiling" ? "uzly-prohoda-sten-i-perekrytiy" : undefined,
    catalogSearch: routeKind === "ceiling" ? "Хомут в перекрытие" : undefined,
  });
  if (routeKind === "ceiling") {
    bom.push({ key: "roof-interior-flange", productKind: "фланец", label: "Фланец кровельного прохода со стороны помещения", quantity: 1, zone: "roof", selectionReason: "Добавлен со стороны помещения по правилу кровельного узла.", requiresSku: true });
    bom.push({
      key: "roof-master-flash",
      productKind: "проходной_узел",
      label: "Мастер-флеш",
      quantity: 1,
      zone: "roof",
      selectionReason: "Гибкая кровельная проходка надевается на трубу и остаётся отдельной позицией от УПК.",
      requiresSku: true,
      catalogCategorySlug: "uzly-prohoda-krovli",
      catalogSearch: "Мастер-флеш",
      removable: true,
    });
    bom.push({
      key: "roof-passage",
      productKind: "проходной_узел",
      label: "УПК по углу кровли",
      quantity: 1,
      zone: "roof",
      selectionReason: "Жёсткий металлический УПК выбирается по наружному диаметру сэндвич-трубы и измеренному углу кровли; Master Flash не является заменой УПК.",
      requiresSku: true,
      catalogCategorySlug: "uzly-prohoda-krovli",
      catalogSearch: "Проходной узел кровли (УПК) до 45°",
      catalogDiameterMode: "sandwich-outer-range",
      removable: true,
    });
  } else if (routeKind === "wall-rear") {
    bom.push({
      key: "outside-tee",
      productKind: "тройник",
      label: "Сэндвич-тройник с К/О 90°",
      quantity: 1,
      contour: "сэндвич",
      insulationMm: 50,
      zone: "wall/outdoor",
      selectionReason: "Узел соединяет горизонтальное подключение с наружным вертикальным участком выбранного маршрута.",
      requiresSku: true,
      catalogCategorySlug: "sendvich-troyniki",
      catalogSearch: "Сэндвич-тройник с К/О 90°",
    });
    bom.push({
      key: "outside-support-consoles",
      productKind: "консоль",
      label: "Консоль универсальная",
      quantity: wallRearConsoleQuantity,
      zone: "wall/outdoor",
      selectionReason: "Одна консоль служит опорой под тройником; остальные устанавливаются на наружной сэндвич-колонне с шагом 2000 мм.",
      requiresSku: true,
      catalogCategorySlug: "homuty-i-krepezh",
      catalogSearch: "Консоль универсальная",
      catalogDiameterMode: "sandwich-outer-range",
      quantityNote: `1 под тройником + ${Math.max(0, wallRearConsoleQuantity - 1)} на наружной колонне.`,
    });
  } else {
    bom.push({ key: "outside-elbow", productKind: "отвод", label: "Сэндвич-отвод 90°", quantity: 2, zone: "wall/outdoor", selectionReason: "Количество определяется поворотами выбранного маршрута.", requiresSku: true });
  }
  bom.push({ key: "termination", productKind: "оголовок", label: "Оголовок", quantity: 1, contour: "сэндвич", zone: "termination", selectionReason: "Завершает рассчитанную трассу.", requiresSku: true });
}

export function calculateChimney(input: CalculationInput): ChimneyCalculation {
  const draftFloors = positiveNumber(input.draft?.levels);
  const floors = Math.max(1, Math.min(3, Math.round(draftFloors ?? input.floors)));
  const hasAttic = Boolean(input.route === "ceiling" && input.draft?.hasAttic);
  const diameter = measuredDiameter(input.draft);
  const roofAngleDeg = positiveNumber(input.draft?.roofAngle);
  const roofThicknessMm = positiveNumber(input.draft?.roofThickness);
  const measuredRidgeHeightMm = positiveNumber(input.draft?.ridgeHeight);
  const ridgeHeightMm = measuredRidgeHeightMm ? Math.round(measuredRidgeHeightMm) : null;
  const measuredRidgeHorizontalDistanceMm = positiveNumber(input.draft?.ridgeHorizontalDistance);
  const ridgeHorizontalDistanceMm = measuredRidgeHorizontalDistanceMm
    ? Math.round(measuredRidgeHorizontalDistanceMm)
    : null;
  const routeKind: ChimneyRouteKind = input.route === "ceiling"
    ? "ceiling"
    : input.outlet === "horizontal" ? "wall-rear" : "wall-top";
  const errors: string[] = [];
  const notes = [
    "Каждый стык проверяется по абсолютной координате трассы.",
    `Расчётные полезные длины учитывают соединение ${PIPE_SOCKET_OVERLAP_MM} мм.`,
  ];
  const reviewItems = [
    "Подтвердить полезную длину соединения для труб 500, 350 и 250 мм.",
    "Подобрать конкретные исполнения проходных узлов и фланцев по конструкции и наружному диаметру.",
    "Тип и количество креплений подтвердить после проверки основания.",
  ];

  const connectionHeightMm = routeKind === "wall-rear"
    ? positiveNumber(input.draft?.rearOutletBottomHeight) ?? 0
    : positiveNumber(input.draft?.connectionHeight) ?? 0;
  const routeLengthMm = input.heightM * 1000;
  const legacyRouteTargetMm = connectionHeightMm + routeLengthMm;
  const warmupLengthMm = routeKind === "ceiling" ? Math.max(0, Math.round(input.warmupLengthMm ?? 1000)) : 0;
  const rotaryDamperHeightMm = routeKind === "ceiling"
    ? ROTARY_DAMPER_EFFECTIVE_LENGTH_MM
    : 0;
  const singleWallWarmupPipeLengthMm = warmupLengthMm;
  const supportCapLengthMm = routeKind === "ceiling" ? Math.max(0, Math.round(input.supportCapLengthMm ?? 70)) : 0;
  const fixedParts: FixedRoutePart[] = [];
  let pipeStartMm = routeKind === "ceiling" ? connectionHeightMm : 0;
  if (singleWallWarmupPipeLengthMm > 0) {
    const effectiveMm = effectiveComponentHeight(singleWallWarmupPipeLengthMm);
    fixedParts.push({ id: "warmup", label: "Одностенная труба-разгон", axis: "vertical", nominalLengthMm: singleWallWarmupPipeLengthMm, effectiveMm, startMm: pipeStartMm, endMm: pipeStartMm + effectiveMm });
    pipeStartMm += effectiveMm;
  }
  if (rotaryDamperHeightMm > 0) {
    fixedParts.push({
      id: "rotary_damper",
      label: "Шибер поворотный",
      axis: "vertical",
      nominalLengthMm: ROTARY_DAMPER_OVERALL_LENGTH_MM,
      effectiveMm: rotaryDamperHeightMm,
      startMm: pipeStartMm,
      endMm: pipeStartMm + rotaryDamperHeightMm,
    });
    pipeStartMm += rotaryDamperHeightMm;
  }
  if (supportCapLengthMm > 0) {
    const effectiveMm = effectiveComponentHeight(supportCapLengthMm);
    fixedParts.push({ id: "support_cap", label: "Опорная заглушка", axis: "vertical", nominalLengthMm: supportCapLengthMm, effectiveMm, startMm: pipeStartMm, endMm: pipeStartMm + effectiveMm });
    pipeStartMm += effectiveMm;
  }

  const forbiddenZones = routeKind === "ceiling"
    ? ceilingForbiddenZones(input.draft, floors, input.roofType)
    : wallForbiddenZones(input.draft, input.distanceM);
  const roofZoneForTermination = forbiddenZones.find((zone) => zone.kind === "roof");
  const terminationHeight = routeKind === "ceiling"
    ? calculateMinimumTerminationHeight({
        roofType: input.roofType,
        ridgeHeightMm,
        ridgeHorizontalDistanceMm,
        roofOuterHeightAtChimneyMm: roofZoneForTermination?.endMm ?? null,
      })
    : null;
  const routeTargetMm = routeKind === "ceiling"
    ? terminationHeight?.minimumHeightMm ?? legacyRouteTargetMm
    : routeLengthMm;
  const terminationToRidgeDeltaMm = routeKind === "ceiling" && ridgeHeightMm
    ? Math.round(routeTargetMm - ridgeHeightMm)
    : null;
  const floorThicknessesMm = forbiddenZones
    .filter((zone) => zone.kind === "floor")
    .map((zone) => zone.endMm - zone.startMm);
  const passageWoolKits = Math.max(1, Math.min(30, Math.round(positiveNumber(input.draft?.passageWoolKits) ?? 3)));
  if (routeKind === "ceiling" && floors > 1) {
    const missingSecond = !positiveNumber(input.draft?.secondCeilingHeight) || !positiveNumber(input.draft?.secondFloorThickness);
    const missingThird = floors > 2 && (!positiveNumber(input.draft?.thirdCeilingHeight) || !positiveNumber(input.draft?.thirdFloorThickness));
    if (missingSecond || missingThird) {
      reviewItems.unshift("Для незаполненных этажей повторены размеры первого этажа; внесите отдельные высоты и толщины перекрытий.");
    }
  }
  if (routeKind === "ceiling" && !roofThicknessMm) {
    reviewItems.unshift("Заполнить толщину кровельного пирога, чтобы построить кровельный проход и проверить стыки.");
  }
  if (routeKind === "ceiling" && hasAttic && !positiveNumber(input.draft?.atticHeight)) {
    reviewItems.unshift("Заполнить высоту чердака, чтобы определить отметку кровельного прохода.");
  }
  if (routeKind === "ceiling" && !ridgeHeightMm) {
    reviewItems.unshift("Указать высоту дома в коньке: без неё контур кровли не привязан к абсолютной отметке здания.");
  }
  if (routeKind === "ceiling" && input.roofType === "pitched" && !ridgeHorizontalDistanceMm) {
    reviewItems.unshift("Указать горизонтальное расстояние от оси дымохода до конька для расчёта высоты устья.");
  }
  fixedParts.forEach((part) => {
    if (part.nominalLengthMm <= PIPE_SOCKET_OVERLAP_MM) {
      errors.push(`Номинальная высота «${part.label}» должна быть больше зоны соединения ${PIPE_SOCKET_OVERLAP_MM} мм.`);
    }
  });
  const roofZoneForRidge = forbiddenZones.find((zone) => zone.kind === "roof");
  if (ridgeHeightMm && roofZoneForRidge && ridgeHeightMm <= roofZoneForRidge.endMm) {
    reviewItems.unshift("Высота конька должна быть выше наружной границы кровельного прохода; проверьте замеры.");
  }
  fixedParts.forEach((part) => {
    const forbidden = jointInsideForbiddenZone(part.endMm, forbiddenZones);
    if (forbidden) errors.push(`Стык после «${part.label}» попадает внутрь зоны «${forbidden.label}».`);
  });
  if (!forbiddenZones.length) {
    reviewItems.unshift(routeKind === "ceiling"
      ? "Заполнить высоту помещения и толщину перекрытия: без них нельзя проверить координаты стыков."
      : "Заполнить толщину стены: без неё нельзя проверить стыки в стеновом проходе.");
  }

  let variants: PipeLayoutVariant[] = [];
  let wallRearConsoleQuantity = 0;
  if (!errors.length) {
    if (routeKind === "ceiling") {
      variants = solvePipeLayouts({ axis: "vertical", startMm: pipeStartMm, targetMm: routeTargetMm, forbiddenZones, fallbackZone: hasAttic ? "attic_or_cold_zone" : "indoor_warm" });
    } else if (routeKind === "wall-rear") {
      const outdoorHeightMm = (positiveNumber(input.draft?.outdoorHeight) ?? input.heightM) * 1000;
      const plan = wallRearRoutePipePlan(outdoorHeightMm);
      wallRearConsoleQuantity = wallRearRouteConsoleQuantity(
        plan.outdoorPipeQuantity,
        plan.outdoorPipeNominalMm,
      );
      const connectionEffectiveMm = effectiveComponentHeight(plan.connectionPipeNominalMm);
      const outdoorEffectiveMm = effectiveComponentHeight(plan.outdoorPipeNominalMm);
      const horizontalPipe: PlacedPipe = {
        id: "horizontal-pipe-1",
        axis: "horizontal",
        nominalMm: plan.connectionPipeNominalMm,
        effectiveMm: connectionEffectiveMm,
        startMm: 0,
        endMm: connectionEffectiveMm,
        zone: "wall_or_ceiling_pass",
        contour: "одностенный",
      };
      const outdoorPipes: PlacedPipe[] = Array.from({ length: plan.outdoorPipeQuantity }, (_, index) => ({
        id: `outdoor-pipe-${index + 1}`,
        axis: "vertical",
        nominalMm: plan.outdoorPipeNominalMm,
        effectiveMm: outdoorEffectiveMm,
        startMm: index * outdoorEffectiveMm,
        endMm: (index + 1) * outdoorEffectiveMm,
        zone: "outdoor",
        contour: "сэндвич",
      }));
      variants = [{
        id: `rear-${plan.connectionPipeNominalMm}--outdoor-${plan.outdoorPipeQuantity}x${plan.outdoorPipeNominalMm}`,
        label: `${plan.connectionPipeNominalMm} / ${plan.outdoorPipeQuantity} × ${plan.outdoorPipeNominalMm}`,
        pipes: [horizontalPipe, ...outdoorPipes],
        coveredEndMm: outdoorHeightMm,
        reserveMm: 0,
        jointPositionsMm: [horizontalPipe.endMm, ...outdoorPipes.map((pipe) => pipe.endMm)],
      }];
    } else {
      const wallEndMm = (positiveNumber(input.draft?.wallDistance) ?? input.distanceM * 1000)
        + (positiveNumber(input.draft?.wallThickness) ?? 0)
        + (positiveNumber(input.draft?.facadeOffset) ?? 0);
      const horizontal = solvePipeLayouts({ axis: "horizontal", startMm: 0, targetMm: wallEndMm, forbiddenZones, fallbackZone: "indoor_warm", maxVariants: 1 })[0];
      const outdoorHeightMm = (positiveNumber(input.draft?.outdoorHeight) ?? input.heightM) * 1000;
      const outdoor = solvePipeLayouts({ axis: "vertical", startMm: 0, targetMm: outdoorHeightMm, forbiddenZones: [], fallbackZone: "outdoor", maxVariants: 1 })[0];
      if (horizontal && outdoor) {
        const indoorRiseMm = routeKind === "wall-top" ? positiveNumber(input.draft?.verticalRise) ?? 0 : 0;
        const indoor = indoorRiseMm > 0
          ? solvePipeLayouts({ axis: "vertical", startMm: 0, targetMm: indoorRiseMm, forbiddenZones: [], fallbackZone: "indoor_warm", contour: "одностенный", maxVariants: 1 })[0]
          : null;
        variants = [{
          id: `${indoor?.id ?? "no-rise"}--${horizontal.id}--${outdoor.id}`,
          label: `${indoor ? `${indoor.label} / ` : ""}${horizontal.label} / ${outdoor.label}`,
          pipes: [
            ...(indoor?.pipes.map((pipe, index) => ({ ...pipe, id: `indoor-pipe-${index + 1}` })) ?? []),
            ...horizontal.pipes,
            ...outdoor.pipes.map((pipe, index) => ({ ...pipe, id: `outdoor-pipe-${index + 1}` })),
          ],
          coveredEndMm: (indoor?.coveredEndMm ?? 0) + horizontal.coveredEndMm + outdoor.coveredEndMm,
          reserveMm: (indoor?.reserveMm ?? 0) + horizontal.reserveMm + outdoor.reserveMm,
          jointPositionsMm: [...(indoor?.jointPositionsMm ?? []), ...horizontal.jointPositionsMm, ...outdoor.jointPositionsMm],
        }];
      }
    }
  }
  if (!variants.length && !errors.length) errors.push("Не найдена раскладка труб без стыков внутри проходных зон.");

  const bom = summarizePipeBom(variants, routeKind);
  addRouteNodes(
    bom,
    routeKind,
    routeKind === "ceiling" ? floors : 1,
    hasAttic,
    singleWallWarmupPipeLengthMm,
    rotaryDamperHeightMm,
    passageWoolKits,
    wallRearConsoleQuantity,
  );
  if (diameter.diameterStatus === "missing") reviewItems.unshift("Указать наружный диаметр патрубка для подбора SKU.");

  return {
    routeKind,
    floors,
    hasAttic,
    ...diameter,
    roofAngleDeg,
    roofThicknessMm,
    floorThicknessesMm,
    passageWoolKits,
    rotaryDamperHeightMm,
    singleWallWarmupPipeLengthMm,
    ridgeHeightMm,
    ridgeHorizontalDistanceMm,
    roofTerminationRequirementMm: terminationHeight?.roofRequirementMm ?? null,
    tenDegreeLineHeightAtChimneyMm: terminationHeight?.tenDegreeLineHeightAtChimneyMm ?? null,
    terminationRule: terminationHeight?.roofRule ?? null,
    terminationToRidgeDeltaMm,
    routeStartMm: connectionHeightMm,
    routeTargetMm,
    fixedParts,
    forbiddenZones,
    variants,
    selectedVariant: variants[0] ?? null,
    bom,
    status: errors.length ? "invalid" : reviewItems.length ? "needs_review" : "automatic_draft",
    errors,
    notes,
    reviewItems,
  };
}

export function bomForVariant(calculation: ChimneyCalculation, variant: PipeLayoutVariant | null): ChimneyBomLine[] {
  const isLayoutPipe = (line: ChimneyBomLine) => line.key.startsWith("sandwich-pipe-") || line.key.startsWith("single-layout-pipe-");
  const withMaterialDefaults = (lines: ChimneyBomLine[]) => lines.map((line) => ({
    ...line,
    materialPreference: line.materialPreference ?? (
      line.key === "ceiling-passage"
      || line.key === "wall-passage"
      || line.productKind === "крепеж"
      || line.productKind === "изоляция"
        ? "catalog-default"
        : "stainless-standard"
    ),
  } satisfies ChimneyBomLine));
  if (!variant) return withMaterialDefaults(calculation.bom.filter((line) => !isLayoutPipe(line)));
  const pipeLines = summarizePipeBom([variant], calculation.routeKind);
  const fixedAndNodes = calculation.bom.filter((line) => !isLayoutPipe(line));
  const insertionIndex = fixedAndNodes.findIndex((line) => line.key === "ceiling-passage" || line.key === "wall-passage");
  if (insertionIndex < 0) return withMaterialDefaults([...fixedAndNodes, ...pipeLines]);
  return withMaterialDefaults([
    ...fixedAndNodes.slice(0, insertionIndex),
    ...pipeLines,
    ...fixedAndNodes.slice(insertionIndex),
  ]);
}
