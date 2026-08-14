"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Download, Mail, PackageCheck } from "lucide-react";
import {
  calculationProfileMeasurementsHref,
  readCalculationProfiles,
  type CalculationProfile,
} from "@/lib/calculationProfiles";
import {
  createEmptyScenarioDraft,
  mergeConfiguratorDraft,
  parseBanyaDraft,
  readConfiguratorDraft,
  saveConfiguratorDraft,
  type ScenarioConfiguratorDraft,
} from "@/lib/configuratorDraft";
import {
  calculateChimney,
  EFFECTIVE_PIPE_LENGTH_MM,
  type ChimneyCalculation,
} from "@/lib/chimneyCalculation";
import { productSelectionPath } from "@/lib/productUrls";
import type { ProductListItem, ProductListResponse } from "@/lib/api";
import { LeadForm } from "./LeadForm";

type RouteType = "ceiling" | "wall";
type StoveType = "bania" | "pech" | "kamin" | "tt-kotel" | "gaz";
type OutletType = "vertical" | "horizontal";
type RoofType = "pitched" | "flat";

type AssetName =
  | "adapter_h"
  | "cap"
  | "ceiling_passage"
  | "elbow_side_to_up"
  | "elbow_up_to_side"
  | "pipe"
  | "pipe_h"
  | "pipe_short"
  | "pipe_short_h"
  | "roof_flashing_flat"
  | "roof_flashing_pitch"
  | "start_cap"
  | "start_cap_h"
  | "storm_collar"
  | "tee"
  | "wall_bracket"
  | "wall_passage_h";

type BomType =
  | "start_cap"
  | "tee"
  | "adapter"
  | "elbow"
  | "pipe"
  | "pipe_short"
  | "wall_bracket"
  | "ceiling_passage"
  | "wall_passage"
  | "roof_flashing_pitch"
  | "roof_flashing_flat"
  | "storm_collar"
  | "cap";

type SceneImage = {
  asset: AssetName;
  x: number;
  y: number;
  w: number;
  h: number;
};

type BomItem = {
  type: BomType;
  qty: number;
};

type BgItem =
  | {
      t: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      fill: string;
      stroke?: string;
      dash?: string;
      opacity?: number;
    }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; dash?: string }
  | { t: "path"; d: string; fill: string; stroke: string }
  | { t: "label"; x: number; y: number; text: string; anchor?: "start" | "middle" };

type Scene = {
  svgW: number;
  svgH: number;
  viewBox: string;
  images: SceneImage[];
  bg: BgItem[];
  bom: BomItem[];
  badge: string;
};

type ChimneyConfiguratorProps = {
  assetBasePath?: string;
};

const VERT: Record<string, number> = {
  start_cap: 92,
  pipe: 180,
  pipe_short: 100,
  tee: 140,
  ceiling_passage: 56,
  roof_flashing_pitch: 60,
  roof_flashing_flat: 50,
  storm_collar: 30,
  wall_bracket: 24,
  cap: 88,
  elbow_side_to_up: 72,
};

const HORIZ: Record<string, number> = {
  pipe_h: 180,
  pipe_short_h: 100,
  adapter_h: 50,
  start_cap_h: 66,
  wall_passage_h: 50,
  elbow_up_to_side: 80,
};

const V_W = 200;
const H_H = 80;

const BOM_LABELS: Record<BomType, [string, string]> = {
  start_cap: ["Стартовый элемент", "тип уточняется"],
  tee: ["Тройник с ревизией", "исполнение уточняется"],
  adapter: ["Переходник", "соединение участков"],
  elbow: ["Отвод 90°", "смена направления"],
  pipe: ["Труба 1000 мм", `полезная длина после соединения — ${EFFECTIVE_PIPE_LENGTH_MM} мм`],
  pipe_short: ["Труба 500 мм", "исполнение и диаметр уточняются"],
  wall_bracket: ["Кронштейн стеновой", "расположение по схеме"],
  ceiling_passage: ["Потолочно-проходной узел", "состав требует проверки"],
  wall_passage: ["Стеновой проходной узел", "состав требует проверки"],
  roof_flashing_pitch: ["Кровельный узел для ската", "исполнение уточняется"],
  roof_flashing_flat: ["Кровельный узел для плоскости", "исполнение уточняется"],
  storm_collar: ["Юбка / стакан", "гидроизоляция"],
  cap: ["Оголовок", "исполнение уточняется"],
};

const ROUTE_OPTIONS: Array<{ id: RouteType; label: string }> = [
  { id: "ceiling", label: "Через дом" },
  { id: "wall", label: "По улице" },
];

const STOVE_OPTIONS: Array<{ id: StoveType; label: string }> = [
  { id: "bania", label: "Банная печь" },
  { id: "pech", label: "Отопительная печь" },
  { id: "kamin", label: "Камин" },
  { id: "tt-kotel", label: "Твердотопливный котёл" },
  { id: "gaz", label: "Газовый котёл" },
];

const SCENARIO_STOVE_PRESETS: Record<string, StoveType> = {
  banya: "bania",
  pech: "pech",
  kamin: "kamin",
  "tt-kotel": "tt-kotel",
  "tverdotoplivny-kotel": "tt-kotel",
  gaz: "gaz",
  "gazovyy-kotel": "gaz",
};

const OUTLET_OPTIONS: Array<{ id: OutletType; label: string }> = [
  { id: "vertical", label: "Вертикальный" },
  { id: "horizontal", label: "Горизонтальный" },
];

const FLOOR_OPTIONS = [
  { id: 1, label: "1 этаж" },
  { id: 2, label: "2 этажа" },
  { id: 3, label: "3 этажа" },
];

const ROOF_OPTIONS: Array<{ id: RoofType; label: string }> = [
  { id: "pitched", label: "Скатная" },
  { id: "flat", label: "Плоская" },
];

function scenarioDraftSummary(draft: ScenarioConfiguratorDraft | null): string[] {
  if (!draft) return [];
  const values = [
    draft.route === "ceiling" && draft.levels ? `Количество этажей: ${draft.levels === "3" ? "3 и более" : draft.levels}` : "",
    draft.route === "ceiling" && draft.ceilingHeight ? `До потолка: ${draft.ceilingHeight} мм` : "",
    draft.route === "ceiling" && draft.floorThickness ? `Высота перекрытия: ${draft.floorThickness} мм` : "",
    draft.route === "ceiling" ? `Чердак: ${draft.hasAttic ? "есть" : "нет"}` : "",
    draft.route === "ceiling" && draft.atticHeight ? `Высота чердака: ${draft.atticHeight} мм` : "",
    draft.route === "ceiling" && draft.roofAngle ? `Угол кровли: ${draft.roofAngle}°` : "",
    draft.route !== "ceiling" && draft.wallExitHeight ? `Точка выхода через стену: ${draft.wallExitHeight} м` : "",
    draft.route !== "ceiling" && draft.wallThickness ? `Толщина стены: ${draft.wallThickness} мм` : "",
    draft.route !== "ceiling" && draft.wallMaterial ? `Материал стены: ${draft.wallMaterial}` : "",
    draft.route !== "ceiling" && draft.facadeOffset ? `От фасада до оси трубы: ${draft.facadeOffset} мм` : "",
    draft.route !== "ceiling" && draft.roofOverhang ? `Вынос кровли: ${draft.roofOverhang} мм` : "",
    draft.routeNotes ? `Особенности маршрута: ${draft.routeNotes}` : "",
    draft.photosReady ? "Фотографии места установки: подготовлены" : "",
  ].filter(Boolean);
  if (draft.deferredFields.length) values.push(`Уточнить позже: ${draft.deferredFields.join(", ")}`);
  return values;
}

function pushBom(bom: BomItem[], type: BomType, qty: number) {
  const current = bom.find((item) => item.type === type);

  if (current) {
    current.qty += qty;
  } else {
    bom.push({ type, qty });
  }
}

function buildCeilingScene({
  roof,
  calculation,
}: {
  roof: RoofType;
  calculation: ChimneyCalculation;
}): Scene {
  const bom: BomItem[] = [];
  const cx = V_W / 2;
  const order: AssetName[] = [];

  order.push("start_cap");
  pushBom(bom, "start_cap", 1);

  pushBom(bom, "adapter", 1);
  const passageIndexes = Array.from({ length: calculation.passageQty }, (_, index) =>
    Math.min(
      Math.max(0, calculation.pipeQty - 1),
      Math.max(0, Math.round(((index + 1) / (calculation.passageQty + 1)) * calculation.pipeQty) - 1),
    ),
  );

  for (let index = 0; index < calculation.pipeQty; index += 1) {
    order.push("pipe");
    pushBom(bom, "pipe", 1);

    passageIndexes.forEach((passageIndex) => {
      if (passageIndex === index) {
        order.push("ceiling_passage");
        pushBom(bom, "ceiling_passage", 1);
      }
    });
  }

  const roofAsset: AssetName = roof === "pitched" ? "roof_flashing_pitch" : "roof_flashing_flat";
  order.push(roofAsset);
  pushBom(bom, roofAsset, 1);
  order.push("storm_collar");
  pushBom(bom, "storm_collar", 1);
  order.push("cap");
  pushBom(bom, "cap", 1);

  const marginTop = 26;
  const marginBottom = 26;
  const totalH = order.reduce((sum, asset) => sum + VERT[asset], 0) + marginTop + marginBottom;
  let cursor = totalH - marginBottom;
  const images = order.map((asset) => {
    const h = VERT[asset];
    cursor -= h;
    return { asset, x: 0, y: cursor, w: V_W, h };
  });

  const ceilingParts = images.filter((item) => item.asset === "ceiling_passage");
  const roofPart = images.find((item) => item.asset.startsWith("roof_flashing"));
  const groundY = totalH - marginBottom;
  const topCeiling = ceilingParts[ceilingParts.length - 1];
  const roomTop = topCeiling ? topCeiling.y + topCeiling.h + 6 : groundY - 180;
  const atticTop = roofPart ? roofPart.y + roofPart.h : 80;

  const bg: BgItem[] = [
    { t: "rect", x: 0, y: 0, w: V_W, h: atticTop, fill: "#e9e4d6", opacity: 0.5 },
    {
      t: "rect",
      x: 14,
      y: atticTop,
      w: V_W - 28,
      h: calculation.hasAttic ? Math.max(0, roomTop - atticTop - 2) : 0,
      fill: "none",
      stroke: "#8a8272",
      dash: "3,3",
    },
    { t: "rect", x: 0, y: roomTop, w: V_W, h: groundY - roomTop, fill: "#dcd6c4", opacity: 0.55 },
    { t: "line", x1: 8, y1: groundY, x2: V_W - 8, y2: groundY, stroke: "#8a8272", dash: "3,3" },
    { t: "rect", x: cx - 22, y: groundY - 30, w: 44, h: 30, fill: "none", stroke: "#b5602f" },
    { t: "label", x: 10, y: 16, text: "НАД КРОВЛЕЙ" },
    { t: "label", x: 10, y: groundY - 8, text: "ПОМЕЩЕНИЕ" },
  ];

  if (calculation.hasAttic) {
    bg.push({ t: "label", x: 10, y: atticTop + 14, text: "ЧЕРДАК" });
  }

  ceilingParts.forEach((part, index) => {
    bg.push({
      t: "label",
      x: 10,
      y: part.y - 4,
      text: index === 0 ? "ПЕРЕКРЫТИЕ" : `ПЕРЕКРЫТИЕ ${index + 1}`,
    });
  });

  return {
    svgW: V_W,
    svgH: totalH,
    viewBox: `0 0 ${V_W} ${totalH}`,
    images,
    bg,
    bom,
    badge: `${(calculation.requiredMm / 1000).toFixed(2)} м · ${calculation.pipeQty} труб · ${calculation.floors} эт.${calculation.hasAttic ? " · чердак" : ""}`,
  };
}

function buildWallScene({
  outlet,
  calculation,
}: {
  outlet: OutletType;
  calculation: ChimneyCalculation;
}): Scene {
  const bom: BomItem[] = [];
  const images: SceneImage[] = [];
  const groundY = 260;
  const stoveX = 90;
  const horizYFixed = groundY - 90;
  let horizY: number;
  let rowStartX: number;

  if (outlet === "vertical") {
    pushBom(bom, "start_cap", 1);
    pushBom(bom, "elbow", 1);

    let cursor = groundY - 30;
    const stack: AssetName[] = ["start_cap"];
    const insideRiseQty = calculation.lengthParts.find((part) => part.id === "vertical")?.pipeQty ?? 0;
    for (let index = 0; index < insideRiseQty; index += 1) {
      stack.push("pipe");
      pushBom(bom, "pipe", 1);
    }
    stack.push("elbow_up_to_side");

    let lastImage!: SceneImage;
    stack.forEach((asset) => {
      const isElbow = asset === "elbow_up_to_side";
      const h = isElbow ? HORIZ.elbow_up_to_side : VERT[asset];
      cursor -= h;
      const w = isElbow ? HORIZ.elbow_up_to_side : V_W;
      const x = isElbow ? stoveX - w / 2 : stoveX - V_W / 2;
      lastImage = { asset, x, y: cursor, w, h };
      images.push(lastImage);
    });

    horizY = lastImage.y + lastImage.h / 2;
    rowStartX = lastImage.x + lastImage.w;
  } else {
    pushBom(bom, "start_cap", 1);
    horizY = horizYFixed;
    rowStartX = stoveX;
    images.push({ asset: "start_cap_h", x: rowStartX, y: horizY - H_H / 2, w: HORIZ.start_cap_h, h: H_H });
    rowStartX += HORIZ.start_cap_h;
  }

  pushBom(bom, "adapter", 1);
  const rowAssets: AssetName[] = ["adapter_h"];
  const horizontalPipeQty = calculation.lengthParts.find((part) => part.id === "horizontal")?.pipeQty ?? 0;

  for (let index = 0; index < horizontalPipeQty; index += 1) {
    rowAssets.push("pipe_h");
    pushBom(bom, "pipe", 1);
  }

  rowAssets.push("wall_passage_h");
  pushBom(bom, "wall_passage", 1);

  let cx = rowStartX;
  const rowY = horizY - H_H / 2;
  let wallX = rowStartX;

  rowAssets.forEach((asset) => {
    const w = HORIZ[asset];
    images.push({ asset, x: cx, y: rowY, w, h: H_H });

    if (asset === "wall_passage_h") {
      wallX = cx + w / 2;
    }

    cx += w;
  });

  const rowEndX = cx;
  pushBom(bom, "elbow", 1);
  const esuH = VERT.elbow_side_to_up;
  const esuX = rowEndX;
  const esuY = horizY - esuH / 2;
  images.push({ asset: "elbow_side_to_up", x: esuX, y: esuY, w: 200, h: esuH });
  const exteriorX = esuX + 100;

  const vertOrder: AssetName[] = [];
  const exteriorPipeQty = calculation.lengthParts.find((part) => part.id === "outdoor")?.pipeQty ?? 0;

  for (let index = 0; index < exteriorPipeQty; index += 1) {
    vertOrder.push("pipe");
    pushBom(bom, "pipe", 1);
  }
  vertOrder.push("cap");
  pushBom(bom, "cap", 1);

  let cursor2 = esuY;
  vertOrder.forEach((asset) => {
    const h = VERT[asset];
    cursor2 -= h;
    images.push({ asset, x: exteriorX - V_W / 2, y: cursor2, w: V_W, h });
  });

  const topY = cursor2;
  const svgW = exteriorX + V_W / 2 + 20;
  const marginTop = 24;
  const imageTopY = images.reduce((minimum, image) => Math.min(minimum, image.y), topY);
  const canvasTop = Math.min(marginTop, topY - 20, imageTopY - 20);
  const svgH = groundY + 40 - canvasTop;
  const roomTopY = horizY - 34;
  const eaveX = wallX + 16;

  const bg: BgItem[] = [
    { t: "rect", x: wallX, y: canvasTop, w: svgW - wallX, h: groundY - canvasTop, fill: "#e9e4d6", opacity: 0.45 },
    { t: "rect", x: 20, y: roomTopY, w: wallX - 28, h: groundY - roomTopY, fill: "#dcd6c4", opacity: 0.6 },
    {
      t: "path",
      d: `M 8 ${roomTopY} L ${eaveX} ${roomTopY} L ${(20 + wallX - 8) / 2} ${roomTopY - 30} L 8 ${roomTopY - 2} Z`,
      fill: "#c9a877",
      stroke: "#8a6a3a",
    },
    { t: "rect", x: 0, y: groundY, w: svgW, h: svgH - (groundY - canvasTop), fill: "#cfc4ab", opacity: 0.5 },
    { t: "line", x1: 6, y1: groundY, x2: svgW - 6, y2: groundY, stroke: "#8a8272", dash: "3,3" },
    { t: "rect", x: wallX - 8, y: roomTopY - 34, w: 16, h: groundY - (roomTopY - 34), fill: "#cbb385", stroke: "#8a6a3a" },
    { t: "rect", x: stoveX - 20, y: groundY - 30, w: 40, h: 30, fill: "none", stroke: "#b5602f" },
    { t: "label", x: 26, y: groundY - 8, text: "ПОМЕЩЕНИЕ" },
    { t: "label", x: exteriorX - 10, y: canvasTop + 14, text: "НАРУЖНАЯ ЧАСТЬ", anchor: "middle" },
  ];

  return {
    svgW,
    svgH,
    viewBox: `0 ${canvasTop} ${svgW} ${svgH}`,
    images,
    bg,
    bom,
    badge: `${(calculation.requiredMm / 1000).toFixed(2)} м трассы · ${calculation.pipeQty} труб по ${EFFECTIVE_PIPE_LENGTH_MM} мм`,
  };
}

function renderBackground(item: BgItem, index: number) {
  if (item.t === "rect") {
    return (
      <rect
        key={index}
        x={item.x}
        y={item.y}
        width={item.w}
        height={Math.max(0, item.h)}
        fill={item.fill}
        stroke={item.stroke ?? "none"}
        strokeDasharray={item.dash ?? undefined}
        opacity={item.opacity ?? 1}
      />
    );
  }

  if (item.t === "line") {
    return (
      <line
        key={index}
        x1={item.x1}
        y1={item.y1}
        x2={item.x2}
        y2={item.y2}
        stroke={item.stroke}
        strokeDasharray={item.dash ?? undefined}
      />
    );
  }

  if (item.t === "path") {
    return <path key={index} d={item.d} fill={item.fill} stroke={item.stroke} />;
  }

  return (
    <text
      key={index}
      x={item.x}
      y={item.y}
      fill="#7a715e"
      fontSize="9"
      letterSpacing="0.05em"
      textAnchor={item.anchor ?? "start"}
    >
      {item.text}
    </text>
  );
}

export function ChimneyConfigurator({ assetBasePath = "" }: ChimneyConfiguratorProps) {
  const searchParams = useSearchParams();
  const scenario = searchParams.get("scenario");
  const requestedProfileId = searchParams.get("profile") ?? "";
  const serializedDraft = searchParams.get("draft");
  const urlDraft = useMemo(() => parseBanyaDraft(serializedDraft), [serializedDraft]);
  const [transferredDraft, setTransferredDraft] = useState<ScenarioConfiguratorDraft | null>(urlDraft);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [calculationProfiles, setCalculationProfiles] = useState<CalculationProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const initialStove = scenario ? SCENARIO_STOVE_PRESETS[scenario] : undefined;
  const initialRoute = searchParams.get("route");
  const initialOutlet = searchParams.get("outlet");
  const initialHeight = Number(searchParams.get("heightM"));
  const initialDistance = Number(searchParams.get("distanceM"));
  const initialFloors = Number(searchParams.get("floors"));
  const transferredDetails = useMemo(() => scenarioDraftSummary(transferredDraft), [transferredDraft]);
  const [route, setRoute] = useState<RouteType>(initialRoute === "wall" ? "wall" : "ceiling");
  const [stove, setStove] = useState<StoveType>(initialStove ?? "bania");
  const [outlet, setOutlet] = useState<OutletType>(initialOutlet === "horizontal" ? "horizontal" : "vertical");
  const [distanceM, setDistanceM] = useState(Number.isFinite(initialDistance) && initialDistance >= 0.1 && initialDistance <= 6 ? initialDistance : 1.5);
  const [floors, setFloors] = useState(Number.isFinite(initialFloors) && initialFloors >= 1 && initialFloors <= 3 ? initialFloors : 1);
  const [hasAttic, setHasAttic] = useState(false);
  const [roof, setRoof] = useState<RoofType>("pitched");
  const [heightM, setHeightM] = useState(Number.isFinite(initialHeight) && initialHeight >= 1 && initialHeight <= 20 ? initialHeight : 5);
  const [stoveModel, setStoveModel] = useState(searchParams.get("stoveModel") ?? "");
  const [pipeMatch, setPipeMatch] = useState<ProductListItem | null>(null);
  const [pipeMatchStatus, setPipeMatchStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");

  useEffect(() => {
    try {
      const profiles = readCalculationProfiles(window.localStorage);
      const requestedProfile = requestedProfileId
        ? profiles.find((profile) => profile.id === requestedProfileId)
        : undefined;
      setCalculationProfiles(profiles);
      const storedDraft = readConfiguratorDraft(window.sessionStorage);
      const nextDraft = requestedProfile?.draft ?? (urlDraft
        ? mergeConfiguratorDraft(storedDraft, urlDraft)
        : storedDraft);
      if (nextDraft) {
        setTransferredDraft(nextDraft);
        saveConfiguratorDraft(window.sessionStorage, nextDraft);
      }
      if (requestedProfile) {
        setActiveProfileId(requestedProfile.id);
        setProfileNotice(`Загружен профиль «${requestedProfile.name}».`);
      } else if (requestedProfileId) {
        setProfileNotice("Этот профиль не найден в текущем браузере. Выберите другой профиль или создайте новый.");
      }
    } catch {
      // URL parameters still initialize the configurator when storage is unavailable.
    }
    setDraftHydrated(true);
  }, [requestedProfileId, urlDraft]);

  useEffect(() => {
    if (!transferredDraft) return;

    if (transferredDraft.route !== "unknown") {
      setRoute(transferredDraft.route === "wall-direct" ? "wall" : transferredDraft.route);
    }
    if (transferredDraft.outlet) setOutlet(transferredDraft.outlet === "top" ? "vertical" : "horizontal");

    const draftStove = transferredDraft.scenario === "banya"
      ? "bania"
      : (transferredDraft.equipmentType || "pech");
    setStove(draftStove as StoveType);

    const draftFloors = Number(transferredDraft.levels);
    if (Number.isFinite(draftFloors) && draftFloors >= 1 && draftFloors <= 3) setFloors(draftFloors);
    setHasAttic(Boolean(transferredDraft.hasAttic));

    const draftHeight = Number(
      transferredDraft.route !== "ceiling"
        ? transferredDraft.outdoorHeight
        : transferredDraft.routeHeight,
    );
    if (Number.isFinite(draftHeight) && draftHeight >= 1 && draftHeight <= 20) setHeightM(draftHeight);

    const rawDraftDistance = Number(transferredDraft.wallDistance);
    const draftDistance = rawDraftDistance > 20 ? rawDraftDistance / 1000 : rawDraftDistance;
    if (Number.isFinite(draftDistance) && draftDistance >= 0.1 && draftDistance <= 6) setDistanceM(draftDistance);

    if (!searchParams.get("stoveModel")) {
      const connection = [
        transferredDraft.manufacturer.trim(),
        transferredDraft.model.trim(),
        transferredDraft.diameterX || transferredDraft.diameterY
          ? `патрубок X ${transferredDraft.diameterX || "?"} / Y ${transferredDraft.diameterY || "?"} мм`
          : transferredDraft.diameter ? `патрубок ${transferredDraft.diameter} мм` : "",
        transferredDraft.outlet === "rear" && transferredDraft.rearOutletBottomHeight
          ? `нижняя кромка патрубка ${transferredDraft.rearOutletBottomHeight} мм от пола`
          : transferredDraft.connectionHeight ? `верх отопителя ${transferredDraft.connectionHeight} мм от пола` : "",
        transferredDraft.connectionDetails.trim(),
      ].filter(Boolean);
      if (connection.length) setStoveModel(connection.join(" · "));
    }
  }, [searchParams, transferredDraft]);

  useEffect(() => {
    if (!draftHydrated) return;
    const draftScenario = stove === "bania" ? "banya" : "dom";
    const equipmentType = stove === "bania" ? "" : stove;
    const baseDraft = transferredDraft?.scenario === draftScenario
      ? transferredDraft
      : createEmptyScenarioDraft(draftScenario);
    const draftRoute = route === "wall"
      && outlet === "horizontal"
      && transferredDraft?.route === "wall-direct"
      ? "wall-direct"
      : route;
    const updatedDraft = mergeConfiguratorDraft(baseDraft, {
      scenario: draftScenario,
      equipmentType,
      route: draftRoute,
      outlet: outlet === "vertical" ? "top" : "rear",
      levels: String(floors),
      hasAttic,
      routeHeight: route === "ceiling" ? String(heightM) : baseDraft.routeHeight,
      outdoorHeight: route === "wall" ? String(heightM) : baseDraft.outdoorHeight,
      wallDistance: route === "wall" ? String(Math.round(distanceM * 1000)) : baseDraft.wallDistance,
    });
    try {
      saveConfiguratorDraft(window.sessionStorage, updatedDraft);
    } catch {
      // The configurator remains usable without browser storage.
    }
  }, [distanceM, draftHydrated, floors, hasAttic, heightM, outlet, route, stove, transferredDraft]);

  const calculationDraft = useMemo<ScenarioConfiguratorDraft | null>(() => {
    if (!transferredDraft) return null;
    return {
      ...transferredDraft,
      route: route === "wall" && outlet === "horizontal" ? "wall-direct" : route,
      outlet: outlet === "vertical" ? "top" : "rear",
      levels: String(floors),
      hasAttic,
      routeHeight: route === "ceiling" ? String(heightM) : transferredDraft.routeHeight,
      outdoorHeight: route === "wall" ? String(heightM) : transferredDraft.outdoorHeight,
      wallDistance: route === "wall" ? String(Math.round(distanceM * 1000)) : transferredDraft.wallDistance,
    };
  }, [distanceM, floors, hasAttic, heightM, outlet, route, transferredDraft]);

  const calculation = useMemo(
    () => calculateChimney({ route, outlet, floors, heightM, distanceM, draft: calculationDraft }),
    [calculationDraft, distanceM, floors, heightM, outlet, route],
  );

  const scene = useMemo(
    () =>
      route === "ceiling"
        ? buildCeilingScene({ roof, calculation })
        : buildWallScene({ outlet, calculation }),
    [calculation, outlet, roof, route],
  );

  useEffect(() => {
    const diameter = calculation.diameterMm;
    if (!diameter || calculation.diameterStatus !== "known") {
      setPipeMatch(null);
      setPipeMatchStatus("idle");
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: "12",
      offset: "0",
      product_kind: "труба",
      diameter: `${diameter}:`,
      length_mm: "1000",
      contour: "сэндвич",
    });
    setPipeMatchStatus("loading");
    fetch(`${assetBasePath}/api/v1/products?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("catalog request failed");
        return response.json() as Promise<ProductListResponse>;
      })
      .then((payload) => {
        setPipeMatch(payload.items[0] ?? null);
        setPipeMatchStatus(payload.items.length ? "ready" : "empty");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPipeMatch(null);
        setPipeMatchStatus("error");
      });
    return () => controller.abort();
  }, [assetBasePath, calculation.diameterMm, calculation.diameterStatus]);

  const totalQty = scene.bom.reduce((sum, item) => sum + item.qty, 0);
  const stoveLabel = STOVE_OPTIONS.find((option) => option.id === stove)?.label ?? "Источник";
  const sceneTitle =
    route === "ceiling" ? "Схема: через перекрытие и кровлю" : "Схема: наружный монтаж по стене";
  const assetUrl = (asset: AssetName) => `${assetBasePath}/images/configurator/${asset}.png`;
  const activeProfile = calculationProfiles.find((profile) => profile.id === activeProfileId);
  const measurementsHref = activeProfile
    ? calculationProfileMeasurementsHref(activeProfile.id)
    : "/zamery?edit=1";

  const loadCalculationProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    if (!profileId) {
      setProfileNotice("Используется текущий несохранённый расчёт.");
      return;
    }

    const profile = calculationProfiles.find((item) => item.id === profileId);
    if (!profile) {
      setProfileNotice("Профиль не найден в текущем браузере.");
      return;
    }

    setTransferredDraft(profile.draft);
    try {
      saveConfiguratorDraft(window.sessionStorage, profile.draft);
    } catch {
      // The loaded values still remain available for the current render.
    }
    setProfileNotice(`Загружен профиль «${profile.name}».`);
  };
  const configuration = useMemo(
    () =>
      [
        `Маршрут: ${route === "ceiling" ? "через дом" : "по улице"}`,
        `Источник: ${stoveLabel}`,
        `Модель отопителя / патрубок: ${stoveModel.trim() || "не указаны"}`,
        route === "ceiling" ? `Этажность: ${floors}; кровля: ${roof === "pitched" ? "скатная" : "плоская"}` : `Выход: ${outlet === "vertical" ? "вертикальный" : "горизонтальный"}; до стены: ${distanceM.toFixed(1)} м`,
        `Расчётная длина трассы: ${(calculation.requiredMm / 1000).toFixed(2)} м`,
        `Труба 1000 мм: ${calculation.pipeQty} шт. по ${EFFECTIVE_PIPE_LENGTH_MM} мм полезной длины`,
        `Закрываемая длина: ${(calculation.coveredMm / 1000).toFixed(2)} м; остаток на подрезку/уточнение: ${calculation.reserveMm} мм`,
        ...transferredDetails,
        "Позиции:",
        ...scene.bom.map((part) => `${BOM_LABELS[part.type][0]} — ${part.qty} шт.`),
        "Требует проверки:",
        ...calculation.reviewItems,
      ].join("\n"),
    [calculation, distanceM, floors, outlet, roof, route, scene.bom, stoveLabel, stoveModel, transferredDetails],
  );

  function savePdf() {
    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character);
    const rows = scene.bom.map((part) => `<tr><td>${BOM_LABELS[part.type][0]}</td><td>${part.qty}</td></tr>`).join("");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.opener = null;
    const summary = escapeHtml(configuration.split("\nПозиции:")[0]).replaceAll("\n", "<br>");
    printWindow.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Комплект из конфигуратора — Дымоход Трейд</title><style>body{font:15px Arial,sans-serif;color:#102127;margin:40px}h1{font-size:28px}p{line-height:1.55}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;border:1px solid #ccd5d7;text-align:left}.note{padding:16px;background:#eef2f2} @page{size:A4;margin:18mm}</style></head><body><h1>Комплект дымохода из конфигуратора</h1><p>${summary}</p><table><thead><tr><th>Позиция</th><th>Количество</th></tr></thead><tbody>${rows}</tbody></table><p class="note">Количество метровых труб рассчитано по 950 мм полезной длины после соединения. Конкретные SKU, исполнение проходов, фланцы и крепления проверяются перед заказом.</p><p>Дымоход Трейд · +7 (965) 075-65-55 · office@dimohod-trade.pro</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    printWindow.document.close();
  }

  return (
    <div className="chimney-configurator" aria-label="Интерактивный конфигуратор комплекта дымохода">
      <div className="configurator-header">
        <div>
          <p className="eyebrow">Бета · результат уточняет инженер</p>
          <h3>Соберите базовую схему дымохода за 30 секунд.</h3>
          <p>
            Теперь конфигуратор учитывает два маршрута: вертикальный проход через дом и кровлю,
            либо боковое подключение с наружным стояком по фасаду.
          </p>
          {initialStove ? (
            <p className="configurator-preset" role="status">
              Сценарий страницы: <strong>{stoveLabel}</strong>
              {transferredDraft ? " · исходные данные перенесены" : ""}
            </p>
          ) : null}
        </div>
        <div className="configurator-count" aria-live="polite">
          <strong>{totalQty}</strong>
          <span>деталей в комплекте</span>
        </div>
      </div>

      <div className="configurator-profile-bar">
        <label className="configurator-profile-select">
          <span>Замеры объекта</span>
          <select value={activeProfileId} onChange={(event) => loadCalculationProfile(event.target.value)}>
            <option value="">Текущий несохранённый расчёт</option>
            {calculationProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <div className="configurator-profile-meta">
          <p role="status">
            {profileNotice || (calculationProfiles.length
              ? "Выберите сохранённые замеры. Изменения в конфигураторе не перезаписывают их автоматически."
              : "Сохранённых профилей в этом браузере пока нет.")}
          </p>
          <Link href={measurementsHref}>
            {activeProfile ? "Изменить замеры" : "Открыть мои замеры"}
          </Link>
        </div>
      </div>

      <div className="configurator-body">
        <div className="configurator-controls">
          <div className="configurator-field">
            <label className="configurator-text-field">
              <span className="configurator-label">Модель отопителя и параметры патрубка</span>
              <input
                name="stove-model"
                value={stoveModel}
                onChange={(event) => setStoveModel(event.target.value)}
                placeholder="Например: модель отопителя и параметры патрубка"
              />
            </label>
          </div>

          <div className="configurator-field">
            <div className="configurator-label">Маршрут</div>
            <div className="configurator-segmented" role="group" aria-label="Маршрут дымохода">
              {ROUTE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === route ? "active" : ""}
                  aria-pressed={option.id === route}
                  onClick={() => setRoute(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="configurator-field">
            <div className="configurator-label" id="configurator-source-label">Источник</div>
            <div
              className="configurator-segmented"
              role="group"
              aria-labelledby="configurator-source-label"
            >
              {STOVE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === stove ? "active" : ""}
                  aria-pressed={option.id === stove}
                  onClick={() => setStove(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {route === "wall" ? (
            <>
              <div className="configurator-field">
                <div className="configurator-label">Выход из отопителя</div>
                <div className="configurator-segmented" role="group" aria-label="Выход из отопителя">
                  {OUTLET_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={option.id === outlet ? "active" : ""}
                      aria-pressed={option.id === outlet}
                      onClick={() => setOutlet(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="configurator-field">
                <div className="configurator-label">Удалённость от стены: {distanceM.toFixed(1)} м</div>
                <input
                  aria-label="Удалённость от стены"
                  className="configurator-range"
                  type="range"
                  min="0.1"
                  max="6"
                  step="0.1"
                  value={distanceM}
                  onChange={(event) => setDistanceM(Number(event.target.value))}
                />
                <div className="configurator-ticks">
                  <span>0.1 м</span>
                  <span>6 м</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="configurator-field">
                <div className="configurator-label">Перекрытия</div>
                <div className="configurator-segmented" role="group" aria-label="Количество этажей">
                  {FLOOR_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={option.id === floors ? "active" : ""}
                      aria-pressed={option.id === floors}
                      onClick={() => setFloors(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="configurator-check-field">
                <input
                  checked={hasAttic}
                  onChange={(event) => setHasAttic(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>Есть чердак</strong>
                  <small>Добавим отдельную холодную зону в расчётную схему.</small>
                </span>
              </label>

              <div className="configurator-field">
                <div className="configurator-label">Кровля</div>
                <div className="configurator-segmented" role="group" aria-label="Тип кровли">
                  {ROOF_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={option.id === roof ? "active" : ""}
                      aria-pressed={option.id === roof}
                      onClick={() => setRoof(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="configurator-field">
            <div className="configurator-label">
              Высота: {heightM.toFixed(1)} м{route === "wall" ? " наружного участка" : ""}
            </div>
            <input
              aria-label="Высота дымохода"
              className="configurator-range"
              type="range"
              min="1"
              max="20"
              step="0.1"
              value={heightM}
              onChange={(event) => setHeightM(Number(event.target.value))}
            />
            <div className="configurator-ticks">
              <span>1 м</span>
              <span>20 м</span>
            </div>
          </div>

          <div className="configurator-note">
            <strong>{sceneTitle}</strong>
            <span>
              Метровые трубы считаются по {EFFECTIVE_PIPE_LENGTH_MM} мм полезной длины после соединения.
              Исполнение проходов и креплений подтверждается после проверки объекта.
            </span>
          </div>
        </div>

        <div className="configurator-schematic-pane">
          <div className="configurator-schematic-top">
            <span>{sceneTitle}</span>
            <strong>{(calculation.requiredMm / 1000).toFixed(2)} м</strong>
          </div>
          <div className="configurator-svg-wrap">
            <svg
              className="configurator-svg"
              viewBox={scene.viewBox}
              style={{ height: `${Math.min(560, scene.svgH * 1.4)}px` }}
              role="img"
              aria-label={sceneTitle}
            >
              <rect x={scene.viewBox.split(" ")[0]} y={scene.viewBox.split(" ")[1]} width={scene.svgW} height={scene.svgH} fill="#f3efe4" />
              {scene.bg.map(renderBackground)}
              {scene.images.map((image, index) => (
                <image
                  key={`${image.asset}-${index}`}
                  href={assetUrl(image.asset)}
                  x={image.x}
                  y={image.y}
                  width={image.w}
                  height={image.h}
                  imageRendering="optimizeQuality"
                />
              ))}
            </svg>
          </div>
          <div className="configurator-height-badge">{scene.badge}</div>
          <div className="configurator-length-breakdown" aria-label="Расчёт длины труб">
            {calculation.lengthParts.map((part) => (
              <div key={part.id}>
                <span>{part.label}</span>
                <strong>{(part.requiredMm / 1000).toFixed(2)} м → {part.pipeQty} шт.</strong>
              </div>
            ))}
            <div className="is-total">
              <span>Перекрываем трубами</span>
              <strong>{(calculation.coveredMm / 1000).toFixed(2)} м</strong>
            </div>
          </div>
        </div>

        <div className="configurator-spec">
          <div className="configurator-spec-head">
            <span>Спецификация</span>
            <strong>{scene.bom.length} типов деталей</strong>
          </div>
          <div className="configurator-spec-list">
            {scene.bom.map((part) => {
              const [label, note] = BOM_LABELS[part.type];

              return (
                <div key={part.type} className="configurator-spec-row">
                  <span className="configurator-spec-dot" />
                  <div>
                    <strong>{label}</strong>
                    <small>{note}</small>
                  </div>
                  <em>×{part.qty}</em>
                </div>
              );
            })}
          </div>
          <div className="configurator-catalog-match" data-status={pipeMatchStatus}>
            <div className="configurator-catalog-match-title">
              <PackageCheck aria-hidden size={18} />
              <strong>Труба из каталога</strong>
            </div>
            {pipeMatchStatus === "loading" ? <p>Ищем вариант по диаметру и длине…</p> : null}
            {pipeMatchStatus === "ready" && pipeMatch ? (
              <>
                <p>
                  Найден вариант с совпадением по диаметру, длине 1000 мм и контуру «сэндвич».
                  Полную совместимость нужно подтвердить вместе с остальными элементами.
                </p>
                <Link href={productSelectionPath(pipeMatch.slug, pipeMatch, pipeMatch.selected_sku)}>
                  {pipeMatch.name} · {calculation.pipeQty} шт.
                </Link>
              </>
            ) : null}
            {pipeMatchStatus === "idle" ? (
              <p>Укажите одинаковые значения X и Y наружного диаметра патрубка для подбора SKU.</p>
            ) : null}
            {pipeMatchStatus === "empty" ? <p>Точного варианта по заданным параметрам в каталоге не найдено.</p> : null}
            {pipeMatchStatus === "error" ? <p>Каталог временно недоступен; количественный расчёт сохранён.</p> : null}
          </div>
          <div className="configurator-review-list">
            <div className="configurator-review-title">
              <AlertTriangle aria-hidden size={18} />
              <strong>Проверить перед заказом</strong>
            </div>
            {calculation.reviewItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </div>
      <div className="configurator-result-actions">
        <div>
          <strong>Комплект собран в конфигураторе</strong>
          <span>Сохраните её в PDF или отправьте состав на проверку.</span>
        </div>
        <button type="button" onClick={savePdf}>
          <Download aria-hidden size={16} /> Сохранить PDF
        </button>
        <a href={`mailto:office@dimohod-trade.pro?subject=${encodeURIComponent("Проверка сметы дымохода")}&body=${encodeURIComponent(configuration)}`}>
          <Mail aria-hidden size={16} /> Отправить по почте
        </a>
      </div>
      <div className="configurator-lead">
        <LeadForm source="configurator" configuration={configuration} title="Проверить комплект перед заказом" />
        <aside>
          <strong>Можно просто позвонить</strong>
          <a href="tel:+79650756555">+7 (965) 075-65-55</a>
          <span>Санкт-Петербург, ул. Хрустальная, 11Б<br />ООО «Дымоходы-трейд плюс» · ОГРН 1177847018216</span>
        </aside>
      </div>
    </div>
  );
}
