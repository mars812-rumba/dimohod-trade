export type EngineeringSceneBranch = "main" | "upper" | "lower" | "side" | "support";
export type EngineeringSceneZone = "inside" | "wall_passage" | "outside";
export type EngineeringSceneOrientation = "horizontal" | "vertical" | "angle";

export type EngineeringGeometryFamily =
  | "single_wall_pipe"
  | "sandwich_pipe"
  | "rotary_damper"
  | "transition_support_cap"
  | "wall_passage"
  | "passage_accessory"
  | "tee_90"
  | "support_plug"
  | "support_platform"
  | "support_console"
  | "wall_console"
  | "power_clamp"
  | "terminal";

export type EngineeringSceneNode = {
  id: string;
  bomKey: string;
  productId: string | null;
  sku: string | null;
  componentType: string;
  variant: string;
  quantityIndex: number;
  parentNode: string | null;
  branch: EngineeringSceneBranch;
  zone: EngineeringSceneZone;
  orientation: EngineeringSceneOrientation;
  xMm: number;
  yMm: number;
  effectiveLengthMm: number;
  nominalLengthMm: number | null;
  visualAsset: string | null;
  visualGeometrySource: "calculation";
  catalogReferenceStatus: "resolved" | "missing";
  geometryFamily: EngineeringGeometryFamily;
};

type ScenePipe = {
  id: string;
  axis: "horizontal" | "vertical";
  nominalMm: number;
  effectiveMm: number;
  startMm: number;
  endMm: number;
  contour: "одностенный" | "сэндвич";
  thicknessProfile?: "first-floor-0.8" | "upper-outdoor-0.5";
};

type SceneVariant = { pipes: ScenePipe[] };

type SceneFixedPart = {
  id: string;
  axis: "horizontal" | "vertical";
  nominalLengthMm: number;
  effectiveMm: number;
  startMm: number;
  endMm: number;
};

type SceneCalculation = {
  routeKind: string;
  fixedParts: SceneFixedPart[];
  forbiddenZones: Array<{ kind: string; startMm: number; endMm: number }>;
  facadeConsolePositionsMm: number[];
};

type SceneBomLine = {
  key: string;
  productKind: string;
  label: string;
  quantity: number;
  nominalLengthMm?: number;
  contour?: "одностенный" | "сэндвич";
  zone: string;
  requiresSku: boolean;
};

type SceneCatalogMatch = {
  exactByFields: boolean;
  item: {
    id: string;
    selected_sku: string | null;
    article: string | null;
    name: string;
    length_mm: number | null;
    primary_image: { url: string; thumbnail_url?: string | null } | null;
  };
};

export type EngineeringSceneGraph = {
  version: "2.0";
  units: "mm";
  origin: { xMm: 0; yMm: 0 };
  wallPassage: { startMm: number; endMm: number };
  horizontalRunMm: number;
  verticalHeightMm: number;
  nodes: EngineeringSceneNode[];
  errors: string[];
  warnings: string[];
  summary: Array<{ bomKey: string; label: string; quantity: number }>;
};

const PIPE_OVERLAP_MM = 50;

function pipeBomKey(pipe: ScenePipe) {
  return `${pipe.contour === "сэндвич" ? "sandwich" : "single-layout"}-pipe-${pipe.nominalMm}${pipe.thicknessProfile === "upper-outdoor-0.5" ? "-upper-outdoor" : ""}`;
}

function geometryFamily(line: SceneBomLine): EngineeringGeometryFamily | null {
  if (line.key.startsWith("single-layout-pipe-")) return "single_wall_pipe";
  if (line.key.startsWith("sandwich-pipe-")) return "sandwich_pipe";
  if (line.key === "tee-lower-sandwich-pipe-250") return "sandwich_pipe";
  if (line.key === "rear-connection-rotary-damper") return "rotary_damper";
  if (line.key === "support-cap") return "transition_support_cap";
  if (line.key === "outside-tee") return "tee_90";
  if (line.key === "tee-lower-support-plug") return "support_plug";
  if (line.key === "outside-support-platform") return "support_platform";
  if (line.key === "tee-support-console") return "support_console";
  if (line.key === "outside-support-consoles") return "wall_console";
  if (line.key === "outside-console-power-clamps") return "power_clamp";
  if (line.key === "termination") return "terminal";
  if (line.key === "wall-passage") return "wall_passage";
  if (line.zone === "wall_or_ceiling_pass") return "passage_accessory";
  return null;
}

function nodeZone(xMm: number, wallStartMm: number, wallEndMm: number): EngineeringSceneZone {
  if (xMm >= wallStartMm && xMm <= wallEndMm) return "wall_passage";
  return xMm < wallStartMm ? "inside" : "outside";
}

function catalogIdentity(
  line: SceneBomLine,
  match: SceneCatalogMatch | undefined,
  warnings: string[],
) {
  if (!match) {
    warnings.push(`Нет каталожной привязки для «${line.label}»; элемент показан на схеме без SKU и цены.`);
    return {
      productId: null,
      sku: null,
      variant: line.label,
      visualAsset: null,
      catalogLengthMm: null,
      catalogReferenceStatus: "missing" as const,
    };
  }
  if (!match.item.primary_image?.url) {
    warnings.push(`У каталожного изделия «${match.item.name}» нет изображения; используется расчётная SVG-геометрия.`);
  }
  if (!match.exactByFields) warnings.push(`«${line.label}» сопоставлен с кандидатом каталога и требует подтверждения варианта.`);
  return {
    productId: match.item.id,
    sku: match.item.selected_sku ?? match.item.article ?? "",
    variant: match.item.name,
    visualAsset: match.item.primary_image?.url ?? null,
    catalogLengthMm: match.item.length_mm,
    catalogReferenceStatus: "resolved" as const,
  };
}

export function buildExternalWallSceneGraph({
  calculation,
  variant,
  bom,
  catalogMatches,
}: {
  calculation: SceneCalculation;
  variant: SceneVariant | null;
  bom: SceneBomLine[];
  catalogMatches: Record<string, SceneCatalogMatch>;
}): EngineeringSceneGraph {
  const errors: string[] = [];
  const warnings: string[] = [];
  const wall = calculation.forbiddenZones.find((zone) => zone.kind === "wall");
  if (calculation.routeKind !== "wall-rear") errors.push("Scene graph v2 поддерживает только наружный маршрут с горизонтальным выходом.");
  if (!variant) errors.push("Нет рассчитанной раскладки труб.");
  if (!wall) errors.push("Не заданы обе границы защищённой зоны стены.");

  const wallStartMm = wall?.startMm ?? 0;
  const wallEndMm = wall?.endMm ?? 0;
  const pipes = variant?.pipes ?? [];
  const horizontalPipes = pipes.filter((pipe) => pipe.axis === "horizontal");
  const verticalPipes = pipes.filter((pipe) => pipe.axis === "vertical");
  const horizontalRunMm = Math.max(0, ...horizontalPipes.map((pipe) => pipe.endMm));
  const verticalHeightMm = Math.max(0, ...verticalPipes.map((pipe) => pipe.endMm));
  if (wall && horizontalRunMm < wallEndMm) errors.push("Горизонтальная трасса не пересекает стену целиком.");

  const routeJoints = [
    ...horizontalPipes.map((pipe) => pipe.endMm),
    ...calculation.fixedParts.filter((part) => part.axis === "horizontal").map((part) => part.endMm),
  ];
  const forbiddenJoint = routeJoints.find((jointMm) => jointMm > wallStartMm && jointMm < wallEndMm);
  if (forbiddenJoint !== undefined) errors.push(`Стык ${forbiddenJoint} мм находится внутри стены ${wallStartMm}–${wallEndMm} мм.`);
  const continuousPassagePipe = horizontalPipes.find((pipe) => (
    pipe.contour === "сэндвич" && pipe.startMm <= wallStartMm && pipe.endMm >= wallEndMm
  ));
  if (wall && !continuousPassagePipe) errors.push("Защищённую зону стены не пересекает одна цельная сэндвич-труба.");

  const horizontalIntervals = [
    ...horizontalPipes.map((pipe) => ({ id: pipe.id, startMm: pipe.startMm, endMm: pipe.endMm })),
    ...calculation.fixedParts
      .filter((part) => part.axis === "horizontal")
      .map((part) => ({ id: part.id, startMm: part.startMm, endMm: part.endMm })),
  ].sort((left, right) => left.startMm - right.startMm || left.endMm - right.endMm);
  horizontalIntervals.forEach((interval, index) => {
    if (index === 0 && interval.startMm !== 0) errors.push(`Горизонтальная цепочка начинается не от патрубка, а с X=${interval.startMm} мм.`);
    const previous = horizontalIntervals[index - 1];
    if (previous && previous.endMm !== interval.startMm) {
      errors.push(`Нарушена последовательность горизонтальной цепочки между «${previous.id}» и «${interval.id}».`);
    }
  });

  const bomByKey = new Map(bom.map((line) => [line.key, line]));
  const nodes: EngineeringSceneNode[] = [];
  const addNode = ({
    line,
    index,
    family,
    parentNode = null,
    branch = "main",
    orientation,
    xMm,
    yMm,
    effectiveLengthMm = 0,
    nominalLengthMm = null,
  }: {
    line: SceneBomLine;
    index: number;
    family: EngineeringGeometryFamily;
    parentNode?: string | null;
    branch?: EngineeringSceneBranch;
    orientation: EngineeringSceneOrientation;
    xMm: number;
    yMm: number;
    effectiveLengthMm?: number;
    nominalLengthMm?: number | null;
  }) => {
    const identity = catalogIdentity(line, catalogMatches[line.key], warnings);
    if (identity.catalogLengthMm !== null && nominalLengthMm !== null && identity.catalogLengthMm !== nominalLengthMm) {
      errors.push(`Длина «${line.label}» в BOM (${nominalLengthMm} мм) не совпадает с каталогом (${identity.catalogLengthMm} мм).`);
      return;
    }
    nodes.push({
      id: `${line.key}-${index + 1}`,
      bomKey: line.key,
      productId: identity.productId,
      sku: identity.sku,
      componentType: line.productKind,
      variant: identity.variant,
      quantityIndex: index,
      parentNode,
      branch,
      zone: nodeZone(xMm, wallStartMm, wallEndMm),
      orientation,
      xMm,
      yMm,
      effectiveLengthMm,
      nominalLengthMm,
      visualAsset: identity.visualAsset,
      visualGeometrySource: "calculation",
      catalogReferenceStatus: identity.catalogReferenceStatus,
      geometryFamily: family,
    });
  };

  horizontalPipes.concat(verticalPipes).forEach((pipe) => {
    const key = pipeBomKey(pipe);
    const line = bomByKey.get(key);
    if (!line) {
      errors.push(`Труба ${pipe.nominalMm} мм (${pipe.contour}) есть в расчёте, но отсутствует в BOM.`);
      return;
    }
    const sameBefore = pipes.filter((candidate) => pipeBomKey(candidate) === key && candidate.id.localeCompare(pipe.id) < 0).length;
    addNode({
      line,
      index: sameBefore,
      family: pipe.contour === "сэндвич" ? "sandwich_pipe" : "single_wall_pipe",
      orientation: pipe.axis,
      xMm: pipe.axis === "horizontal" ? pipe.startMm : horizontalRunMm,
      yMm: pipe.axis === "vertical" ? pipe.startMm : 0,
      effectiveLengthMm: pipe.effectiveMm,
      nominalLengthMm: pipe.nominalMm,
    });
  });

  const fixedKeyById: Record<string, string> = {
    rotary_damper: "rear-connection-rotary-damper",
    support_cap: "support-cap",
  };
  calculation.fixedParts.filter((part) => part.axis === "horizontal").forEach((part) => {
    const key = fixedKeyById[part.id];
    const line = key ? bomByKey.get(key) : undefined;
    const family = line ? geometryFamily(line) : null;
    if (!line || !family) {
      errors.push(`Расчётный элемент «${part.id}» не сопоставлен со строкой BOM и SVG-геометрией.`);
      return;
    }
    addNode({ line, index: 0, family, orientation: "horizontal", xMm: part.startMm, yMm: 0, effectiveLengthMm: part.effectiveMm, nominalLengthMm: part.nominalLengthMm });
  });

  const teeLine = bomByKey.get("outside-tee");
  if (teeLine) addNode({ line: teeLine, index: 0, family: "tee_90", orientation: "vertical", xMm: horizontalRunMm, yMm: 0 });

  const teeLowerPipeLine = bomByKey.get("tee-lower-sandwich-pipe-250");
  const teeLowerPipeNominalMm = teeLowerPipeLine?.nominalLengthMm ?? 0;
  const teeLowerPipeEffectiveMm = Math.max(0, teeLowerPipeNominalMm - PIPE_OVERLAP_MM);
  if (teeLowerPipeLine) addNode({
    line: teeLowerPipeLine,
    index: 0,
    family: "sandwich_pipe",
    parentNode: "outside-tee-1",
    branch: "lower",
    orientation: "vertical",
    xMm: horizontalRunMm,
    yMm: -teeLowerPipeEffectiveMm,
    effectiveLengthMm: teeLowerPipeEffectiveMm,
    nominalLengthMm: teeLowerPipeNominalMm,
  });

  const supportPlatformLine = bomByKey.get("outside-support-platform");
  if (supportPlatformLine) addNode({ line: supportPlatformLine, index: 0, family: "support_platform", parentNode: teeLowerPipeLine ? "tee-lower-sandwich-pipe-250-1" : "outside-tee-1", branch: "support", orientation: "horizontal", xMm: horizontalRunMm, yMm: -250 });

  const teeConsoleLine = bomByKey.get("tee-support-console");
  if (teeConsoleLine) addNode({ line: teeConsoleLine, index: 0, family: "support_console", parentNode: "outside-support-platform-1", branch: "support", orientation: "horizontal", xMm: horizontalRunMm, yMm: -320 });

  const facadeConsoleLine = bomByKey.get("outside-support-consoles");
  const powerClampLine = bomByKey.get("outside-console-power-clamps");
  calculation.facadeConsolePositionsMm.forEach((positionMm, index) => {
    if (facadeConsoleLine) addNode({ line: facadeConsoleLine, index, family: "wall_console", branch: "support", orientation: "horizontal", xMm: horizontalRunMm, yMm: positionMm });
    if (powerClampLine) addNode({ line: powerClampLine, index, family: "power_clamp", parentNode: `outside-support-consoles-${index + 1}`, branch: "support", orientation: "horizontal", xMm: horizontalRunMm, yMm: positionMm });
  });

  const terminationLine = bomByKey.get("termination");
  if (terminationLine) addNode({ line: terminationLine, index: 0, family: "terminal", branch: "upper", orientation: "vertical", xMm: horizontalRunMm, yMm: verticalHeightMm });

  bom.filter((line) => line.zone === "wall_or_ceiling_pass").forEach((line) => {
    const family = geometryFamily(line);
    if (!family) {
      errors.push(`Для «${line.label}» не назначено семейство SVG-геометрии.`);
      return;
    }
    for (let index = 0; index < line.quantity; index += 1) {
      addNode({ line, index, family, branch: "side", orientation: "horizontal", xMm: wallStartMm + (wallEndMm - wallStartMm) / 2, yMm: 0 });
    }
  });

  const renderedByBom = new Map<string, number>();
  nodes.forEach((node) => renderedByBom.set(node.bomKey, (renderedByBom.get(node.bomKey) ?? 0) + 1));
  bom.forEach((line) => {
    const family = geometryFamily(line);
    if (!family) return;
    const rendered = renderedByBom.get(line.key) ?? 0;
    if (rendered !== line.quantity) errors.push(`Количество «${line.label}»: BOM ${line.quantity}, scene graph ${rendered}.`);
  });

  const supportPlug = nodes.find((node) => node.geometryFamily === "support_plug");
  const supportPlatform = nodes.find((node) => node.geometryFamily === "support_platform");
  const tee = nodes.find((node) => node.geometryFamily === "tee_90");
  if (supportPlug && tee && (supportPlug.xMm !== tee.xMm || supportPlug.yMm >= tee.yMm)) errors.push("Опорная заглушка должна находиться строго под тройником.");
  if (supportPlug?.zone === "wall_passage") errors.push("Опорная заглушка попала в защищённую зону стены.");
  if (supportPlatform && tee && (supportPlatform.xMm !== tee.xMm || supportPlatform.yMm >= tee.yMm)) errors.push("Опорная площадка должна находиться строго под тройником.");
  if (supportPlatform?.zone === "wall_passage") errors.push("Опорная площадка попала в защищённую зону стены.");

  const consoleCoordinates = nodes
    .filter((node) => node.geometryFamily === "wall_console")
    .map((node) => `${node.xMm}:${node.yMm}`);
  if (new Set(consoleCoordinates).size !== consoleCoordinates.length) errors.push("Обнаружены дубли фасадных консолей на одной отметке.");

  return {
    version: "2.0",
    units: "mm",
    origin: { xMm: 0, yMm: 0 },
    wallPassage: { startMm: wallStartMm, endMm: wallEndMm },
    horizontalRunMm,
    verticalHeightMm,
    nodes,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    summary: bom.filter((line) => geometryFamily(line) !== null).map((line) => ({ bomKey: line.key, label: line.label, quantity: line.quantity })),
  };
}

export function effectiveInstalledLength(nominalLengthMm: number) {
  return Math.max(0, nominalLengthMm - PIPE_OVERLAP_MM);
}
