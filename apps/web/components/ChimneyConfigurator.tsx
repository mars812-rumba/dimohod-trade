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
  bomForVariant,
  calculateChimney,
  PIPE_SOCKET_OVERLAP_MM,
  type ChimneyCalculation,
  type PipeLayoutVariant,
} from "@/lib/chimneyCalculation";
import { productSelectionPath } from "@/lib/productUrls";
import type { ProductListItem, ProductListResponse } from "@/lib/api";
import { LeadForm } from "./LeadForm";

type RouteType = "ceiling" | "wall";
type StoveType = "bania" | "pech" | "kamin" | "tt-kotel" | "gaz";
type OutletType = "vertical" | "horizontal";
type RoofType = "pitched" | "flat";

type ChimneyConfiguratorProps = {
  assetBasePath?: string;
};

type CatalogBomMatch = {
  item: ProductListItem;
  exactByFields: boolean;
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
    draft.route === "ceiling" && draft.secondCeilingHeight ? `Высота 2 этажа: ${draft.secondCeilingHeight} мм` : "",
    draft.route === "ceiling" && draft.secondFloorThickness ? `Перекрытие над 2 этажом: ${draft.secondFloorThickness} мм` : "",
    draft.route === "ceiling" && draft.thirdCeilingHeight ? `Высота 3 этажа: ${draft.thirdCeilingHeight} мм` : "",
    draft.route === "ceiling" && draft.thirdFloorThickness ? `Перекрытие над 3 этажом: ${draft.thirdFloorThickness} мм` : "",
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

function GeneratedChimneyScheme({ calculation, variant }: { calculation: ChimneyCalculation; variant: PipeLayoutVariant | null }) {
  const ceiling = calculation.routeKind === "ceiling";
  const pipes = variant?.pipes ?? [];
  const maximumMm = Math.max(
    calculation.routeTargetMm,
    variant?.coveredEndMm ?? 0,
    ...calculation.forbiddenZones.map((zone) => zone.endMm),
    1000,
  );
  const floorY = 700;
  const topY = 56;
  const verticalY = (millimeters: number) => floorY - (millimeters / maximumMm) * (floorY - topY);

  if (!ceiling) {
    const horizontalPipes = pipes.filter((pipe) => pipe.axis === "horizontal");
    const indoorPipes = pipes.filter((pipe) => pipe.axis === "vertical" && pipe.contour === "одностенный");
    const outdoorPipes = pipes.filter((pipe) => pipe.axis === "vertical" && pipe.contour === "сэндвич");
    const topRoute = calculation.routeKind === "wall-top";
    const horizontalY = topRoute ? 390 : 560;
    const horizontalMax = Math.max(...horizontalPipes.map((pipe) => pipe.endMm), 1000);
    const outdoorMax = Math.max(...outdoorPipes.map((pipe) => pipe.endMm), 1000);
    const indoorMax = Math.max(...indoorPipes.map((pipe) => pipe.endMm), 1000);
    const horizontalX = (millimeters: number) => 70 + (millimeters / horizontalMax) * 210;
    const outdoorY = (millimeters: number) => horizontalY - (millimeters / outdoorMax) * (horizontalY - 92);
    const indoorY = (millimeters: number) => 520 - (millimeters / indoorMax) * (520 - horizontalY);
    const wall = calculation.forbiddenZones.find((zone) => zone.kind === "wall");
    return (
      <svg className="configurator-generated-svg" viewBox="0 0 360 740" role="img" aria-label="Расчётная схема дымохода через стену со стыками">
        <rect width="360" height="740" fill="#f3efe4" />
        <rect x="24" y="520" width="60" height="80" rx="4" fill="#d9cbb7" stroke="#173d4c" strokeWidth="2" />
        <text x="54" y="618" textAnchor="middle">ОТОПИТЕЛЬ</text>
        {wall ? <>
          <rect x={horizontalX(wall.startMm)} y="70" width={Math.max(12, horizontalX(wall.endMm) - horizontalX(wall.startMm))} height="590" fill="#e2c99f" opacity="0.75" />
          <text x={(horizontalX(wall.startMm) + horizontalX(wall.endMm)) / 2} y="684" textAnchor="middle">СТЕНА</text>
        </> : null}
        {indoorPipes.map((pipe, index) => (
          <g key={pipe.id}>
            <rect x="42" y={indoorY(pipe.endMm)} width="24" height={indoorY(pipe.startMm) - indoorY(pipe.endMm)} fill="#e7ece9" stroke="#173d4c" strokeWidth="2" />
            <text x="72" y={(indoorY(pipe.startMm) + indoorY(pipe.endMm)) / 2 + 3}>Р{index + 1} · {pipe.nominalMm}</text>
            <circle cx="54" cy={indoorY(pipe.endMm)} r="4" fill="#b13f20" />
          </g>
        ))}
        {topRoute ? <path d={`M54 ${horizontalY} Q54 ${horizontalY - 18} 72 ${horizontalY - 18} L84 ${horizontalY - 18}`} fill="none" stroke="#173d4c" strokeWidth="24" /> : null}
        {horizontalPipes.map((pipe, index) => (
          <g key={pipe.id}>
            <rect x={horizontalX(pipe.startMm)} y={horizontalY - 12} width={horizontalX(pipe.endMm) - horizontalX(pipe.startMm)} height="24" fill="#dce7e4" stroke="#173d4c" strokeWidth="2" />
            <text x={(horizontalX(pipe.startMm) + horizontalX(pipe.endMm)) / 2} y={horizontalY - 18} textAnchor="middle">Т{index + 1} · {pipe.nominalMm}</text>
            <circle cx={horizontalX(pipe.endMm)} cy={horizontalY} r="4" fill="#b13f20" />
          </g>
        ))}
        <path d={`M280 ${horizontalY} Q300 ${horizontalY} 300 ${horizontalY - 20} L300 ${horizontalY - 40}`} fill="none" stroke="#173d4c" strokeWidth="24" />
        {outdoorPipes.map((pipe, index) => (
          <g key={pipe.id}>
            <rect x="288" y={outdoorY(pipe.endMm)} width="24" height={outdoorY(pipe.startMm) - outdoorY(pipe.endMm)} fill="#dce7e4" stroke="#173d4c" strokeWidth="2" />
            <text x="320" y={(outdoorY(pipe.startMm) + outdoorY(pipe.endMm)) / 2 + 3}>Н{index + 1} · {pipe.nominalMm}</text>
            <circle cx="300" cy={outdoorY(pipe.endMm)} r="4" fill="#b13f20" />
          </g>
        ))}
        <path d="M286 100 L300 78 L314 100 Z" fill="#b13f20" />
        <text x="300" y="42" textAnchor="middle">НАРУЖНЫЙ СТОЯК</text>
        <text x="180" y="722" textAnchor="middle">Красная точка — координата стыка</text>
      </svg>
    );
  }

  return (
    <svg className="configurator-generated-svg" viewBox="0 0 360 740" role="img" aria-label="Расчётная вертикальная схема дымохода со стыками и перекрытиями">
      <rect width="360" height="740" fill="#f3efe4" />
      <line x1="22" y1={floorY} x2="338" y2={floorY} stroke="#8a8272" strokeDasharray="5 4" />
      {calculation.forbiddenZones.map((zone) => (
        <g key={zone.id}>
          <rect x="30" y={verticalY(zone.endMm)} width="300" height={Math.max(8, verticalY(zone.startMm) - verticalY(zone.endMm))} fill="#e2c99f" opacity="0.82" stroke="#8a6a3a" />
          <text x="38" y={verticalY(zone.endMm) - 6}>{zone.label.toUpperCase()} · {zone.startMm}–{zone.endMm} мм</text>
        </g>
      ))}
      <rect x="142" y={verticalY(calculation.routeStartMm)} width="76" height={Math.max(36, floorY - verticalY(calculation.routeStartMm))} rx="4" fill="#d9cbb7" stroke="#173d4c" strokeWidth="2" />
      <text x="180" y={floorY - 12} textAnchor="middle">ОТОПИТЕЛЬ</text>
      {calculation.fixedParts.map((part) => (
        <g key={part.id}>
          <rect x="166" y={verticalY(part.endMm)} width="28" height={Math.max(6, verticalY(part.startMm) - verticalY(part.endMm))} fill={part.id === "support_cap" ? "#c6825f" : "#e7ece9"} stroke="#173d4c" strokeWidth="2" />
          <line x1="194" y1={(verticalY(part.startMm) + verticalY(part.endMm)) / 2} x2="226" y2={(verticalY(part.startMm) + verticalY(part.endMm)) / 2} stroke="#b13f20" />
          <text x="232" y={(verticalY(part.startMm) + verticalY(part.endMm)) / 2 + 4}>{part.label} · {part.lengthMm} мм</text>
          <circle cx="180" cy={verticalY(part.endMm)} r="4" fill="#b13f20" />
        </g>
      ))}
      {pipes.map((pipe, index) => (
        <g key={pipe.id}>
          <rect x="162" y={verticalY(pipe.endMm)} width="36" height={Math.max(5, verticalY(pipe.startMm) - verticalY(pipe.endMm))} fill={pipe.zone === "wall_or_ceiling_pass" ? "#cfddd8" : "#e7ece9"} stroke="#173d4c" strokeWidth="2" />
          <line x1="198" y1={(verticalY(pipe.startMm) + verticalY(pipe.endMm)) / 2} x2="226" y2={(verticalY(pipe.startMm) + verticalY(pipe.endMm)) / 2} stroke="#b13f20" />
          <text x="232" y={(verticalY(pipe.startMm) + verticalY(pipe.endMm)) / 2 + 4}>Т{index + 1} · {pipe.nominalMm} мм</text>
          <circle cx="180" cy={verticalY(pipe.endMm)} r="4" fill="#b13f20" />
        </g>
      ))}
      <line x1="100" y1={verticalY(calculation.routeTargetMm)} x2="260" y2={verticalY(calculation.routeTargetMm)} stroke="#b13f20" strokeDasharray="5 4" />
      <path d={`M164 ${Math.max(34, verticalY(calculation.routeTargetMm) - 18)} L180 ${Math.max(12, verticalY(calculation.routeTargetMm) - 42)} L196 ${Math.max(34, verticalY(calculation.routeTargetMm) - 18)} Z`} fill="#b13f20" />
      <line x1="24" y1={floorY} x2="24" y2={verticalY(calculation.routeTargetMm)} stroke="#b13f20" />
      <text x="14" y={(floorY + verticalY(calculation.routeTargetMm)) / 2} transform={`rotate(-90 14 ${(floorY + verticalY(calculation.routeTargetMm)) / 2})`} textAnchor="middle">До завершения · {calculation.routeTargetMm} мм от чистого пола</text>
      <text x="180" y="724" textAnchor="middle">Красная точка — координата стыка</text>
    </svg>
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
  const [warmupLengthMm, setWarmupLengthMm] = useState(500);
  const [supportCapLengthMm, setSupportCapLengthMm] = useState(70);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [stoveModel, setStoveModel] = useState(searchParams.get("stoveModel") ?? "");
  const [catalogMatches, setCatalogMatches] = useState<Record<string, CatalogBomMatch>>({});
  const [catalogMatchStatus, setCatalogMatchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

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
    const draftWarmup = Number(transferredDraft.warmupLength);
    if (Number.isFinite(draftWarmup) && draftWarmup >= 0) setWarmupLengthMm(draftWarmup);
    const draftSupportCap = Number(transferredDraft.supportCapHeight);
    if (Number.isFinite(draftSupportCap) && draftSupportCap >= 0) setSupportCapLengthMm(draftSupportCap);

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
      warmupLength: String(warmupLengthMm),
      supportCapHeight: String(supportCapLengthMm),
      routeHeight: route === "ceiling" ? String(heightM) : baseDraft.routeHeight,
      outdoorHeight: route === "wall" ? String(heightM) : baseDraft.outdoorHeight,
      wallDistance: route === "wall" ? String(Math.round(distanceM * 1000)) : baseDraft.wallDistance,
    });
    try {
      saveConfiguratorDraft(window.sessionStorage, updatedDraft);
    } catch {
      // The configurator remains usable without browser storage.
    }
  }, [distanceM, draftHydrated, floors, hasAttic, heightM, outlet, route, stove, supportCapLengthMm, transferredDraft, warmupLengthMm]);

  const calculationDraft = useMemo<ScenarioConfiguratorDraft | null>(() => {
    if (!transferredDraft) return null;
    return {
      ...transferredDraft,
      route: route === "wall" && outlet === "horizontal" ? "wall-direct" : route,
      outlet: outlet === "vertical" ? "top" : "rear",
      levels: String(floors),
      hasAttic,
      warmupLength: String(warmupLengthMm),
      supportCapHeight: String(supportCapLengthMm),
      routeHeight: route === "ceiling" ? String(heightM) : transferredDraft.routeHeight,
      outdoorHeight: route === "wall" ? String(heightM) : transferredDraft.outdoorHeight,
      wallDistance: route === "wall" ? String(Math.round(distanceM * 1000)) : transferredDraft.wallDistance,
    };
  }, [distanceM, floors, hasAttic, heightM, outlet, route, supportCapLengthMm, transferredDraft, warmupLengthMm]);

  const calculation = useMemo(
    () => calculateChimney({
      route,
      outlet,
      floors,
      heightM,
      distanceM,
      warmupLengthMm,
      supportCapLengthMm,
      draft: calculationDraft,
    }),
    [calculationDraft, distanceM, floors, heightM, outlet, route, supportCapLengthMm, warmupLengthMm],
  );
  const selectedVariant = calculation.variants.find((variant) => variant.id === selectedVariantId)
    ?? calculation.selectedVariant;
  const selectedBom = useMemo(
    () => bomForVariant(calculation, selectedVariant),
    [calculation, selectedVariant],
  );
  const selectedPipeQuantity = selectedVariant?.pipes.length ?? 0;
  const selectedCoveredMm = selectedVariant
    ? selectedVariant.pipes.reduce((sum, pipe) => sum + pipe.effectiveMm, 0)
    : 0;
  useEffect(() => {
    const diameter = calculation.diameterMm;
    if (!diameter || calculation.diameterStatus !== "known") {
      setCatalogMatches({});
      setCatalogMatchStatus("idle");
      return;
    }

    const controller = new AbortController();
    const diameterKinds = new Set(["труба", "отвод", "заглушка", "оголовок"]);
    setCatalogMatchStatus("loading");
    Promise.all(selectedBom.filter((line) => line.requiresSku).map(async (line) => {
      const params = new URLSearchParams({ limit: "24", offset: "0", product_kind: line.productKind });
      const exactByFields = diameterKinds.has(line.productKind);
      if (exactByFields) params.set("diameter", `${diameter}:`);
      if (line.nominalLengthMm) params.set("length_mm", String(line.nominalLengthMm));
      if (line.contour) params.set("contour", line.contour);
      if (line.productKind === "отвод") params.set("angle_deg", "90");
      const response = await fetch(`${assetBasePath}/api/v1/products?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) throw new Error("catalog request failed");
      const payload = await response.json() as ProductListResponse;
      return payload.items[0] ? [line.key, { item: payload.items[0], exactByFields }] as const : null;
    }))
      .then((entries) => {
        setCatalogMatches(Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))));
        setCatalogMatchStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalogMatches({});
        setCatalogMatchStatus("error");
      });
    return () => controller.abort();
  }, [assetBasePath, calculation.diameterMm, calculation.diameterStatus, selectedBom]);

  const totalQty = selectedBom.reduce((sum, item) => sum + item.quantity, 0);
  const stoveLabel = STOVE_OPTIONS.find((option) => option.id === stove)?.label ?? "Источник";
  const sceneTitle =
    route === "ceiling" ? "Схема: через перекрытие и кровлю" : "Схема: наружный монтаж по стене";
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
        `Расчётная отметка завершения: ${calculation.routeTargetMm} мм`,
        `Раскладка труб: ${selectedVariant?.label || "не найдена"}`,
        `Соединения: ${selectedVariant?.jointPositionsMm.join(", ") || "нет"} мм`,
        `Запас раскладки: ${selectedVariant?.reserveMm ?? 0} мм`,
        ...transferredDetails,
        "Позиции:",
        ...selectedBom.map((part) => `${part.label} — ${part.quantity} шт. (${part.selectionReason})`),
        ...(calculation.errors.length ? ["Ошибки:", ...calculation.errors] : []),
        "Требует проверки:",
        ...calculation.reviewItems,
      ].join("\n"),
    [calculation, distanceM, floors, outlet, roof, route, selectedBom, selectedVariant, stoveLabel, stoveModel, transferredDetails],
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
    const rows = selectedBom.map((part) => `<tr><td>${part.label}</td><td>${part.quantity}</td></tr>`).join("");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.opener = null;
    const summary = escapeHtml(configuration.split("\nПозиции:")[0]).replaceAll("\n", "<br>");
    printWindow.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Комплект из конфигуратора — Дымоход Трейд</title><style>body{font:15px Arial,sans-serif;color:#102127;margin:40px}h1{font-size:28px}p{line-height:1.55}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;border:1px solid #ccd5d7;text-align:left}.note{padding:16px;background:#eef2f2} @page{size:A4;margin:18mm}</style></head><body><h1>Комплект дымохода из конфигуратора</h1><p>${summary}</p><table><thead><tr><th>Позиция</th><th>Количество</th></tr></thead><tbody>${rows}</tbody></table><p class="note">Раскладка проверяет координаты стыков и исключает соединения внутри известных проходных зон. Полезные длины коротких труб и конкретные SKU требуют подтверждения.</p><p>Дымоход Трейд · +7 (965) 075-65-55 · office@dimohod-trade.pro</p><script>window.onload=()=>window.print()<\/script></body></html>`);
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

              <div className="configurator-inline-inputs">
                <label className="configurator-text-field">
                  <span className="configurator-label">Разгон, мм</span>
                  <input
                    inputMode="numeric"
                    min="0"
                    onChange={(event) => setWarmupLengthMm(Math.max(0, Number(event.target.value) || 0))}
                    type="number"
                    value={warmupLengthMm}
                  />
                </label>
                <label className="configurator-text-field">
                  <span className="configurator-label">Опорная заглушка, мм</span>
                  <input
                    inputMode="numeric"
                    min="0"
                    onChange={(event) => setSupportCapLengthMm(Math.max(0, Number(event.target.value) || 0))}
                    type="number"
                    value={supportCapLengthMm}
                  />
                </label>
              </div>

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
              Каждый стык проверяется относительно стены и перекрытий. Для расчёта соединения труб
              используется нахлёст {PIPE_SOCKET_OVERLAP_MM} мм.
            </span>
          </div>
        </div>

        <div className="configurator-schematic-pane">
          <div className="configurator-schematic-top">
            <span>{sceneTitle}</span>
            <strong>{calculation.status === "invalid" ? "Есть конфликт" : `${selectedPipeQuantity} труб`}</strong>
          </div>
          <div className="configurator-svg-wrap">
            <GeneratedChimneyScheme calculation={calculation} variant={selectedVariant} />
          </div>
          <div className="configurator-height-badge">
            Отметка завершения {calculation.routeTargetMm} мм · раскладка {selectedVariant?.label ?? "не найдена"}
          </div>
          {calculation.variants.length > 1 ? (
            <fieldset className="configurator-variants">
              <legend>Допустимые раскладки без стыков в проходах</legend>
              {calculation.variants.map((variant, index) => (
                <label key={variant.id}>
                  <input
                    checked={(selectedVariant?.id ?? calculation.variants[0]?.id) === variant.id}
                    name="pipe-layout-variant"
                    onChange={() => setSelectedVariantId(variant.id)}
                    type="radio"
                  />
                  <span><strong>Вариант {index + 1}</strong>{variant.label} мм · запас {variant.reserveMm} мм</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="configurator-length-breakdown" aria-label="Координаты узлов дымохода">
            {calculation.fixedParts.map((part) => (
              <div key={part.id}>
                <span>{part.label}</span>
                <strong>{part.startMm}–{part.endMm} мм</strong>
              </div>
            ))}
            {selectedVariant?.pipes.map((pipe, index) => (
              <div key={pipe.id}>
                <span>Т{index + 1} · труба {pipe.nominalMm} мм</span>
                <strong>{pipe.startMm}–{pipe.endMm} мм</strong>
              </div>
            ))}
            <div className="is-total">
              <span>Полезная длина труб</span>
              <strong>{selectedCoveredMm} мм</strong>
            </div>
          </div>
          {calculation.errors.length ? (
            <div className="configurator-calculation-errors" role="alert">
              <strong>Схему нужно изменить</strong>
              {calculation.errors.map((error) => <p key={error}>{error}</p>)}
            </div>
          ) : null}
        </div>

        <div className="configurator-spec">
          <div className="configurator-spec-head">
            <span>Спецификация</span>
            <strong>{selectedBom.length} типов деталей</strong>
          </div>
          <div className="configurator-spec-list">
            {selectedBom.map((part) => {
              const catalogMatch = catalogMatches[part.key];
              return (
                <div key={part.key} className="configurator-spec-row">
                  <span className="configurator-spec-dot" />
                  <div>
                    <strong>{part.label}</strong>
                    <small>{part.selectionReason}</small>
                    {catalogMatch ? (
                      <Link className="configurator-spec-sku" href={productSelectionPath(catalogMatch.item.slug, catalogMatch.item, catalogMatch.item.selected_sku)}>
                        {catalogMatch.item.article || catalogMatch.item.name}
                        {!catalogMatch.exactByFields ? " · кандидат по типу, проверить размер" : " · совпадение по полям"}
                      </Link>
                    ) : null}
                  </div>
                  <em>×{part.quantity}</em>
                </div>
              );
            })}
          </div>
          <div className="configurator-catalog-match" data-status={catalogMatchStatus}>
            <div className="configurator-catalog-match-title">
              <PackageCheck aria-hidden size={18} />
              <strong>Каталожные позиции</strong>
            </div>
            {catalogMatchStatus === "loading" ? <p>Сопоставляем строки BOM со структурированными полями каталога…</p> : null}
            {catalogMatchStatus === "ready" ? <p>Найдено {Object.keys(catalogMatches).length} из {selectedBom.length} позиций. Совпадения только по типу помечены для проверки.</p> : null}
            {catalogMatchStatus === "idle" ? <p>Укажите одинаковые значения X и Y наружного диаметра патрубка для подбора SKU.</p> : null}
            {catalogMatchStatus === "error" ? <p>Каталог временно недоступен; геометрический расчёт и BOM сохранены.</p> : null}
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
