import type { ScenarioConfiguratorDraft } from "./configuratorDraft";

export const PIPE_SOCKET_OVERLAP_MM = 50;
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
  lengthMm: number;
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
  quantityNote?: string;
};

export type ChimneyCalculation = {
  routeKind: ChimneyRouteKind;
  floors: number;
  hasAttic: boolean;
  diameterMm: number | null;
  diameterStatus: "known" | "oval" | "missing";
  roofAngleDeg: number | null;
  roofThicknessMm: number | null;
  floorThicknessesMm: number[];
  passageWoolKits: number;
  rotaryDamperHeightMm: number;
  singleWallWarmupPipeLengthMm: number;
  ridgeHeightMm: number | null;
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

function ceilingForbiddenZones(draft: ScenarioConfiguratorDraft | null, floors: number): ForbiddenJointZone[] {
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
  if (roofThickness !== null && atticHeight !== null) {
    const startMm = floorLevel + atticHeight;
    zones.push({
      id: "roof-pass",
      label: "Проход через кровлю",
      axis: "vertical",
      startMm,
      endMm: startMm + roofThickness,
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
  singleWallWarmupPipeLengthMm: number,
  rotaryDamperHeightMm: number,
  passageWoolKits: number,
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
      });
    }
    bom.splice(singleWallWarmupPipeLengthMm > 0 ? 1 : 0, 0, {
      key: "rotary-damper",
      productKind: "шибер",
      label: "Одноконтурный шибер поворотный",
      quantity: 1,
      contour: "одностенный",
      zone: "transition",
      selectionReason: rotaryDamperHeightMm > 0
        ? `Установлен между трубой-разгоном и опорной заглушкой; учтённая высота ${rotaryDamperHeightMm} мм.`
        : "Устанавливается между трубой-разгоном и опорной заглушкой; высоту нужно указать вручную.",
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
    bom.push({ key: "roof-passage", productKind: "проходной_узел", label: "УПК по углу кровли", quantity: 1, zone: "roof", selectionReason: "Исполнение выбирается по измеренному углу кровли.", requiresSku: true });
  } else {
    bom.push({ key: "outside-elbow", productKind: "отвод", label: "Сэндвич-отвод 90°", quantity: routeKind === "wall-top" ? 2 : 1, zone: "wall/outdoor", selectionReason: "Количество определяется поворотами выбранного маршрута.", requiresSku: true });
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
  const routeTargetMm = routeKind === "ceiling" ? connectionHeightMm + routeLengthMm : routeLengthMm;
  const terminationToRidgeDeltaMm = routeKind === "ceiling" && ridgeHeightMm
    ? Math.round(routeTargetMm - ridgeHeightMm)
    : null;
  const warmupLengthMm = routeKind === "ceiling" ? Math.max(0, Math.round(input.warmupLengthMm ?? 500)) : 0;
  const rotaryDamperHeightMm = routeKind === "ceiling"
    ? Math.max(0, Math.round(input.rotaryDamperHeightMm ?? positiveNumber(input.draft?.rotaryDamperHeight) ?? 0))
    : 0;
  const singleWallWarmupPipeLengthMm = Math.max(0, warmupLengthMm - rotaryDamperHeightMm);
  const supportCapLengthMm = routeKind === "ceiling" ? Math.max(0, Math.round(input.supportCapLengthMm ?? 70)) : 0;
  const fixedParts: FixedRoutePart[] = [];
  let pipeStartMm = routeKind === "ceiling" ? connectionHeightMm : 0;
  if (singleWallWarmupPipeLengthMm > 0) {
    fixedParts.push({ id: "warmup", label: "Одностенная труба-разгон", axis: "vertical", lengthMm: singleWallWarmupPipeLengthMm, startMm: pipeStartMm, endMm: pipeStartMm + singleWallWarmupPipeLengthMm });
    pipeStartMm += singleWallWarmupPipeLengthMm;
  }
  if (rotaryDamperHeightMm > 0) {
    fixedParts.push({ id: "rotary_damper", label: "Шибер поворотный", axis: "vertical", lengthMm: rotaryDamperHeightMm, startMm: pipeStartMm, endMm: pipeStartMm + rotaryDamperHeightMm });
    pipeStartMm += rotaryDamperHeightMm;
  }
  if (supportCapLengthMm > 0) {
    fixedParts.push({ id: "support_cap", label: "Опорная заглушка", axis: "vertical", lengthMm: supportCapLengthMm, startMm: pipeStartMm, endMm: pipeStartMm + supportCapLengthMm });
    pipeStartMm += supportCapLengthMm;
  }

  const forbiddenZones = routeKind === "ceiling"
    ? ceilingForbiddenZones(input.draft, floors)
    : wallForbiddenZones(input.draft, input.distanceM);
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
  if (routeKind === "ceiling" && rotaryDamperHeightMm === 0) {
    reviewItems.unshift("Указать фактическую высоту поворотного шибера: в каталоге этот размер не заполнен.");
  }
  if (routeKind === "ceiling" && rotaryDamperHeightMm >= warmupLengthMm && warmupLengthMm > 0) {
    errors.push("Высота поворотного шибера должна быть меньше общей высоты разгона.");
  }
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
  if (!errors.length) {
    if (routeKind === "ceiling") {
      variants = solvePipeLayouts({ axis: "vertical", startMm: pipeStartMm, targetMm: routeTargetMm, forbiddenZones, fallbackZone: hasAttic ? "attic_or_cold_zone" : "indoor_warm" });
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
    singleWallWarmupPipeLengthMm,
    rotaryDamperHeightMm,
    passageWoolKits,
  );
  if (diameter.diameterStatus === "missing") reviewItems.unshift("Указать наружный диаметр патрубка для подбора SKU.");
  if (diameter.diameterStatus === "oval") reviewItems.unshift("Замеры X и Y отличаются: соединение нужно проверить до подбора SKU.");

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
  if (!variant) return calculation.bom.filter((line) => !isLayoutPipe(line));
  const pipeLines = summarizePipeBom([variant], calculation.routeKind);
  const fixedAndNodes = calculation.bom.filter((line) => !isLayoutPipe(line));
  const insertionIndex = fixedAndNodes.findIndex((line) => line.key === "ceiling-passage" || line.key === "wall-passage");
  if (insertionIndex < 0) return [...fixedAndNodes, ...pipeLines];
  return [
    ...fixedAndNodes.slice(0, insertionIndex),
    ...pipeLines,
    ...fixedAndNodes.slice(insertionIndex),
  ];
}
