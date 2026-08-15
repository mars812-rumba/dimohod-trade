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

function catalogMediaUrl(url: string, assetBasePath: string) {
  return url.startsWith("/media/") ? `${assetBasePath}${url}` : url;
}

function formatCatalogPrice(value: string | null) {
  if (value === null || Number(value) <= 0) return "Цена по запросу";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

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
    draft.route === "ceiling" && draft.ridgeHeight ? `Высота дома в коньке: ${draft.ridgeHeight} мм` : "",
    draft.route === "ceiling" && draft.roofAngle ? `Угол кровли: ${draft.roofAngle}°` : "",
    draft.route === "ceiling" && draft.passageWoolKits ? `Комплекты ваты: ${draft.passageWoolKits} шт. (вручную)` : "",
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

function GeneratedChimneyScheme({
  calculation,
  variant,
  roofType,
  roofThicknessMm,
}: {
  calculation: ChimneyCalculation;
  variant: PipeLayoutVariant | null;
  roofType: RoofType;
  roofThicknessMm: number | null;
}) {
  const ceiling = calculation.routeKind === "ceiling";
  const pipes = variant?.pipes ?? [];
  const maximumMm = Math.max(
    calculation.routeTargetMm,
    calculation.ridgeHeightMm ?? 0,
    variant?.coveredEndMm ?? 0,
    ...calculation.forbiddenZones.map((zone) => zone.endMm),
    1000,
  );
  const floorY = 700;
  const topY = 56;

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

  const floorZones = calculation.forbiddenZones.filter((zone) => zone.kind === "floor");
  const upperFloorZone = floorZones[floorZones.length - 1];
  const chimneyX = 120;
  const houseLeft = 30;
  const houseRight = 200;
  const roofAngleDeg = roofType === "flat" ? 0 : calculation.roofAngleDeg;
  const drawnRoofAngleDeg = roofAngleDeg ?? 24;
  const roofAngleRad = drawnRoofAngleDeg * Math.PI / 180;
  const roofSlope = Math.tan(roofAngleRad);
  const roofZone = calculation.forbiddenZones.find((zone) => zone.kind === "roof");
  const baseMillimetersToPixels = (floorY - topY) / maximumMm;
  const millimetersToPixels = baseMillimetersToPixels;
  const verticalY = (millimeters: number) => floorY - millimeters * millimetersToPixels;
  const firstCeilingY = floorZones[0] ? verticalY(floorZones[0].startMm) : verticalY(maximumMm * 0.48);
  const atticBottomY = upperFloorZone ? verticalY(upperFloorZone.endMm) : firstCeilingY;
  const roofGeometryMeasured = Boolean(roofZone || roofThicknessMm);
  const measuredRoofThicknessPx = roofZone
    ? verticalY(roofZone.startMm) - verticalY(roofZone.endMm)
    : roofThicknessMm
      ? roofThicknessMm * millimetersToPixels
      : 9;
  const roofThicknessPx = measuredRoofThicknessPx;
  const roofInnerAtChimneyY = roofZone
    ? verticalY(roofZone.startMm)
    : atticBottomY - 14 - roofSlope * (chimneyX - houseLeft);
  const roofOuterAtChimneyY = roofZone
    ? verticalY(roofZone.endMm)
    : roofInnerAtChimneyY - roofThicknessPx;
  const roofSurfaceYAt = (x: number, atChimneyY: number) => atChimneyY - roofSlope * (x - chimneyX);
  const roofStartX = houseLeft - 8;
  const roofEndX = houseRight + 8;
  const ridgeX = 226;
  const ridgeOuterY = calculation.ridgeHeightMm
    ? verticalY(calculation.ridgeHeightMm)
    : Math.max(topY + 18, roofSurfaceYAt(ridgeX, roofOuterAtChimneyY));
  const rightRoofEndX = 310;
  const rightRoofOuterEndY = ridgeOuterY + roofSlope * (rightRoofEndX - ridgeX);
  const roofInnerStartY = roofSurfaceYAt(roofStartX, roofInnerAtChimneyY);
  const roofInnerEndY = roofSurfaceYAt(roofEndX, roofInnerAtChimneyY);
  const roofOuterStartY = roofSurfaceYAt(roofStartX, roofOuterAtChimneyY);
  const roofOuterEndY = roofSurfaceYAt(roofEndX, roofOuterAtChimneyY);
  const roofCenterY = (roofInnerAtChimneyY + roofOuterAtChimneyY) / 2;
  const roofCakePath = [
    `M${roofStartX} ${roofOuterStartY}`,
    `L${roofEndX} ${roofOuterEndY}`,
    `L${roofEndX} ${roofInnerEndY}`,
    `L${roofStartX} ${roofInnerStartY}`,
    "Z",
  ].join(" ");
  const roofOuterPath = `M${roofStartX} ${roofOuterStartY} L${roofEndX} ${roofOuterEndY}`;
  const roofInnerPath = `M${roofStartX} ${roofInnerStartY} L${roofEndX} ${roofInnerEndY}`;
  const rightRoofReferencePath = `M${ridgeX} ${ridgeOuterY} L${rightRoofEndX} ${rightRoofOuterEndY}`;
  const upkHalfWidth = 34;
  const upkLeftBaseY = roofSurfaceYAt(chimneyX - upkHalfWidth, roofOuterAtChimneyY);
  const upkRightBaseY = roofSurfaceYAt(chimneyX + upkHalfWidth, roofOuterAtChimneyY);
  const upkTopY = Math.min(upkLeftBaseY, upkRightBaseY) - 42;
  const skirtHalfWidth = 28;
  const skirtLeftBaseY = roofSurfaceYAt(chimneyX - skirtHalfWidth, roofInnerAtChimneyY);
  const skirtRightBaseY = roofSurfaceYAt(chimneyX + skirtHalfWidth, roofInnerAtChimneyY);
  const skirtNeckY = Math.max(skirtLeftBaseY, skirtRightBaseY) + 18;
  const terminationY = verticalY(calculation.routeTargetMm);
  const buildingRoofYAt = (x: number) => roofSurfaceYAt(x, roofInnerAtChimneyY);
  const atticLabelY = floorZones.length
    ? (atticBottomY + roofCenterY) / 2
    : roofCenterY + 70;
  const floorRooms = floorZones.map((zone, index) => {
    const bottomMm = index === 0 ? 0 : floorZones[index - 1].endMm;
    return {
      id: `room-${index + 1}`,
      floor: index + 1,
      topY: verticalY(zone.startMm),
      bottomY: verticalY(bottomMm),
    };
  });
  const callouts = [
    {
      id: "termination",
      anchorY: Math.max(36, verticalY(calculation.routeTargetMm) - 22),
      label: "Оголовок",
      detail: calculation.terminationToRidgeDeltaMm === null
        ? "Завершение трассы"
        : `${calculation.terminationToRidgeDeltaMm >= 0 ? "+" : ""}${calculation.terminationToRidgeDeltaMm} мм к коньку`,
    },
    ...[{
      id: roofZone?.id ?? "roof-pass-placeholder",
      anchorY: roofZone ? verticalY((roofZone.startMm + roofZone.endMm) / 2) : roofCenterY,
      label: "Проход кровли",
      detail: roofZone
        ? `${roofZone.startMm}–${roofZone.endMm} мм${roofAngleDeg !== null ? ` · ${roofAngleDeg}°` : ""}`
        : calculation.hasAttic
          ? "нужен замер кровли"
          : `над ${calculation.floors} этажом${roofAngleDeg !== null ? ` · ${roofAngleDeg}°` : ""}`,
    }],
    ...(floorZones.length
      ? floorZones.slice().reverse().map((zone) => ({
          id: zone.id,
          anchorY: verticalY((zone.startMm + zone.endMm) / 2),
          label: `Перекрытие ${zone.id.replace("floor-", "")}`,
          detail: `${zone.startMm}–${zone.endMm} мм`,
        }))
      : [{
          id: "floor-pass-placeholder",
          anchorY: firstCeilingY,
          label: "Проход перекрытия",
          detail: "нужны высота и толщина",
        }]),
    ...calculation.fixedParts.slice().reverse().map((part) => ({
      id: part.id,
      anchorY: (verticalY(part.startMm) + verticalY(part.endMm)) / 2,
      label: part.label,
      detail: `${part.lengthMm} мм`,
    })),
    {
      id: "heater",
      anchorY: (verticalY(calculation.routeStartMm) + floorY) / 2,
      label: "Печь / топка",
      detail: calculation.routeStartMm > 0
        ? `патрубок: ${calculation.routeStartMm} мм`
        : "отметка патрубка не указана",
    },
  ];
  const calloutTopY = 108;
  const calloutStep = callouts.length > 1 ? (680 - calloutTopY) / (callouts.length - 1) : 0;

  return (
    <svg className="configurator-generated-svg configurator-building-svg" viewBox="0 0 380 740" role="img" aria-labelledby="generated-scheme-title generated-scheme-description">
      <title id="generated-scheme-title">Расчётная схема дымохода через перекрытие и кровлю</title>
      <desc id="generated-scheme-description">Вертикальный разрез здания с печью, трубами, проходными зонами, координатами стыков и перечнем узлов.</desc>
      <rect width="380" height="740" className="scheme-paper" />

      <g aria-hidden="true">
        {floorRooms.length ? floorRooms.map((room) => (
          <g key={room.id}>
            <rect x={houseLeft} y={room.topY} width={houseRight - houseLeft} height={Math.max(0, room.bottomY - room.topY)} className="scheme-room" />
            <text x={houseLeft + 10} y={room.topY + 24} className="scheme-zone-name">
              {calculation.floors === 1 ? "ПОМЕЩЕНИЕ БАНИ" : `${room.floor} ЭТАЖ`}
            </text>
          </g>
        )) : (
          <>
            <rect x={houseLeft} y={firstCeilingY} width={houseRight - houseLeft} height={floorY - firstCeilingY} className="scheme-room" />
            <text x={houseLeft + 10} y={Math.min(floorY - 18, firstCeilingY + 24)} className="scheme-zone-name">ПОМЕЩЕНИЕ БАНИ</text>
          </>
        )}
        {calculation.hasAttic ? (
          <path
            d={`M${houseLeft} ${buildingRoofYAt(houseLeft)} L${houseRight} ${buildingRoofYAt(houseRight)} L${houseRight} ${atticBottomY} L${houseLeft} ${atticBottomY} Z`}
            className="scheme-attic"
          />
        ) : null}
        <line x1={houseLeft} y1={floorY} x2={houseRight} y2={floorY} className="scheme-floor-line" />
        <line x1={houseLeft} y1={floorY} x2={houseLeft} y2={buildingRoofYAt(houseLeft)} className="scheme-wall-line" />
        <line x1={houseRight} y1={floorY} x2={houseRight} y2={buildingRoofYAt(houseRight)} className="scheme-wall-line" />
        <path d={roofCakePath} className={roofGeometryMeasured ? "scheme-roof-cake" : "scheme-roof-cake is-placeholder"} />
        <path d={roofOuterPath} className={roofGeometryMeasured ? "scheme-roof-surface is-outer" : "scheme-roof-surface is-outer is-placeholder"} />
        <path d={roofInnerPath} className={roofGeometryMeasured ? "scheme-roof-surface is-inner" : "scheme-roof-surface is-inner is-placeholder"} />
        <path d={rightRoofReferencePath} className="scheme-roof-reference" />
        <line x1={ridgeX} y1={ridgeOuterY} x2={rightRoofEndX} y2={ridgeOuterY} className="scheme-ridge-datum" />
        <text x={ridgeX + 5} y={ridgeOuterY - 7} className="scheme-ridge-label">
          {calculation.ridgeHeightMm ? `КОНЁК · ${calculation.ridgeHeightMm} ММ` : "КОНЁК · НУЖЕН ЗАМЕР"}
        </text>
        {calculation.hasAttic ? <text x={houseLeft + 10} y={atticLabelY} className="scheme-zone-name">ХОЛОДНЫЙ ЧЕРДАК</text> : null}
      </g>

      {calculation.forbiddenZones.map((zone) => (
        <g key={zone.id}>
          {zone.kind !== "roof" ? (
            <rect
              x={houseLeft}
              y={verticalY(zone.endMm)}
              width={houseRight - houseLeft}
              height={verticalY(zone.startMm) - verticalY(zone.endMm)}
              className="scheme-pass-band"
            />
          ) : null}
        </g>
      ))}
      {!floorZones.length ? (
        <rect x={houseLeft} y={firstCeilingY - 5} width={houseRight - houseLeft} height="10" className="scheme-pass-band is-placeholder" />
      ) : null}
      {floorZones.map((zone) => {
        const clampY = verticalY((zone.startMm + zone.endMm) / 2);
        return (
          <g key={`${zone.id}-clamp`} className="scheme-floor-clamp" aria-hidden="true">
            <rect x={houseLeft + 5} y={clampY - 10} width="51" height="20" className="scheme-floor-joist" />
            <rect x={houseRight - 56} y={clampY - 10} width="51" height="20" className="scheme-floor-joist" />
            <rect x={houseLeft + 48} y={clampY - 4} width={chimneyX - 25 - (houseLeft + 48)} height="8" className="scheme-clamp-ear" />
            <rect x={chimneyX + 25} y={clampY - 4} width={houseRight - 48 - (chimneyX + 25)} height="8" className="scheme-clamp-ear" />
            <rect x={chimneyX - 25} y={clampY - 7} width="50" height="14" className="scheme-clamp-body" />
            <circle cx={houseLeft + 53} cy={clampY} r="2" className="scheme-clamp-bolt" />
            <circle cx={houseRight - 53} cy={clampY} r="2" className="scheme-clamp-bolt" />
          </g>
        );
      })}
      <g className={roofGeometryMeasured ? "scheme-roof-node" : "scheme-roof-node is-placeholder"} aria-hidden="true">
        <rect
          x={chimneyX - 31}
          y={roofInnerAtChimneyY - 3}
          width="62"
          height="6"
          className="scheme-roof-inner-flange"
          transform={`rotate(${-drawnRoofAngleDeg} ${chimneyX} ${roofInnerAtChimneyY})`}
        />
        {roofType === "flat" ? (
          <path
            d={`M${chimneyX - skirtHalfWidth} ${skirtLeftBaseY} L${chimneyX - 11} ${skirtNeckY} L${chimneyX + 11} ${skirtNeckY} L${chimneyX + skirtHalfWidth} ${skirtRightBaseY} Z`}
            className="scheme-roof-skirt is-optional"
          />
        ) : null}
      </g>

      <rect
        x={chimneyX - 31}
        y={verticalY(calculation.routeStartMm)}
        width="62"
        height={Math.max(38, floorY - verticalY(calculation.routeStartMm))}
        rx="4"
        className="scheme-heater"
      />
      <rect x={chimneyX - 21} y={floorY - 66} width="42" height="28" rx="2" className="scheme-heater-door" />
      <line x1={chimneyX - 22} y1={floorY - 18} x2={chimneyX + 22} y2={floorY - 18} className="scheme-heater-detail" />

      {calculation.fixedParts.map((part) => (
        <g key={part.id}>
          <rect
            x={chimneyX - (part.id === "support_cap" ? 18 : part.id === "rotary_damper" ? 15 : 12)}
            y={verticalY(part.endMm)}
            width={part.id === "support_cap" ? 36 : part.id === "rotary_damper" ? 30 : 24}
            height={verticalY(part.startMm) - verticalY(part.endMm)}
            className={part.id === "support_cap" ? "scheme-transition" : part.id === "rotary_damper" ? "scheme-rotary-damper" : "scheme-single-pipe"}
          />
          {part.id === "rotary_damper" ? (
            <>
              <line x1={chimneyX - 15} y1={(verticalY(part.startMm) + verticalY(part.endMm)) / 2} x2={chimneyX + 24} y2={(verticalY(part.startMm) + verticalY(part.endMm)) / 2} className="scheme-damper-axis" />
              <circle cx={chimneyX + 25} cy={(verticalY(part.startMm) + verticalY(part.endMm)) / 2} r="2.5" className="scheme-damper-handle" />
            </>
          ) : null}
          <circle cx={chimneyX} cy={verticalY(part.endMm)} r="3.5" className="scheme-joint" />
        </g>
      ))}

      {pipes.map((pipe, index) => {
        const middleY = (verticalY(pipe.startMm) + verticalY(pipe.endMm)) / 2;
        return (
          <g key={pipe.id}>
            <rect
              x={chimneyX - 16}
              y={verticalY(pipe.endMm)}
              width="32"
              height={verticalY(pipe.startMm) - verticalY(pipe.endMm)}
              className={pipe.zone === "wall_or_ceiling_pass" ? "scheme-sandwich-pipe is-pass" : "scheme-sandwich-pipe"}
            />
            <line x1={chimneyX - 16} y1={middleY} x2="94" y2={middleY} className="scheme-pipe-leader" />
            <text x="90" y={middleY + 3} textAnchor="end" className="scheme-pipe-label">Т{index + 1} · {pipe.nominalMm}</text>
            <circle cx={chimneyX} cy={verticalY(pipe.endMm)} r="3.5" className="scheme-joint" />
          </g>
        );
      })}

      <g className={roofGeometryMeasured ? "scheme-roof-upk-foreground" : "scheme-roof-upk-foreground is-placeholder"} aria-hidden="true">
        <rect
          x={chimneyX - 43}
          y={roofOuterAtChimneyY - 4}
          width="86"
          height="8"
          className="scheme-roof-upk-base"
          transform={`rotate(${-drawnRoofAngleDeg} ${chimneyX} ${roofOuterAtChimneyY})`}
        />
        <path
          d={`M${chimneyX - upkHalfWidth} ${upkLeftBaseY} C${chimneyX - 25} ${upkLeftBaseY - 8} ${chimneyX - 14} ${upkTopY + 15} ${chimneyX - 11} ${upkTopY + 8} L${chimneyX - 11} ${upkTopY} L${chimneyX + 11} ${upkTopY} L${chimneyX + 11} ${upkTopY + 8} C${chimneyX + 14} ${upkTopY + 15} ${chimneyX + 25} ${upkRightBaseY - 8} ${chimneyX + upkHalfWidth} ${upkRightBaseY} Z`}
          className="scheme-roof-upk-collar"
        />
        <rect x={chimneyX - 13} y={upkTopY - 3} width="26" height="6" rx="1" className="scheme-roof-upk-band" />
      </g>

      <line x1={chimneyX - 34} y1={terminationY} x2={chimneyX + 34} y2={terminationY} className="scheme-target-line" />
      <g className="scheme-termination" aria-hidden="true">
        <rect x={chimneyX - 10} y={terminationY - 10} width="20" height="10" />
        <path d={`M${chimneyX - 10} ${terminationY - 10} L${chimneyX - 16} ${terminationY - 22} L${chimneyX + 16} ${terminationY - 22} L${chimneyX + 10} ${terminationY - 10} Z`} />
        <rect x={chimneyX - 17} y={terminationY - 27} width="34" height="6" rx="1" />
        <rect x={chimneyX - 14} y={terminationY - 40} width="28" height="13" rx="2" />
        <path d={`M${chimneyX - 17} ${terminationY - 40} Q${chimneyX} ${terminationY - 47} ${chimneyX + 17} ${terminationY - 40} L${chimneyX + 14} ${terminationY - 37} L${chimneyX - 14} ${terminationY - 37} Z`} />
      </g>

      <line x1="18" y1={floorY} x2="18" y2={verticalY(calculation.routeTargetMm)} className="scheme-dimension" />
      <line x1="13" y1={floorY} x2="23" y2={floorY} className="scheme-dimension" />
      <line x1="13" y1={verticalY(calculation.routeTargetMm)} x2="23" y2={verticalY(calculation.routeTargetMm)} className="scheme-dimension" />
      <text
        x="10"
        y={(floorY + verticalY(calculation.routeTargetMm)) / 2}
        transform={`rotate(-90 10 ${(floorY + verticalY(calculation.routeTargetMm)) / 2})`}
        textAnchor="middle"
        className="scheme-dimension-label"
      >{calculation.routeTargetMm} мм от чистого пола</text>

      <g className="scheme-callouts">
        {callouts.map((callout, index) => {
          const labelY = calloutTopY + index * calloutStep;
          return (
            <g key={callout.id}>
              <path d={`M${chimneyX + 18} ${callout.anchorY} L252 ${callout.anchorY} L260 ${labelY}`} className="scheme-callout-line" />
              <circle cx="270" cy={labelY} r="9" className="scheme-callout-number" />
              <text x="270" y={labelY + 3.4} textAnchor="middle" className="scheme-callout-index">{index + 1}</text>
              <text x="284" y={labelY - 2} className="scheme-callout-title">{callout.label}</text>
              <text x="284" y={labelY + 11} className="scheme-callout-detail">{callout.detail}</text>
            </g>
          );
        })}
      </g>

      <g transform="translate(38 718)">
        <circle cx="4" cy="0" r="3.5" className="scheme-joint" />
        <text x="14" y="3" className="scheme-legend">стык · не должен попадать внутрь проходной зоны</text>
      </g>
    </svg>
  );
}

function VerticalPassageDetails({
  calculation,
  roofType,
}: {
  calculation: ChimneyCalculation;
  roofType: RoofType;
}) {
  const roofThicknessMm = calculation.roofThicknessMm;
  const roofAngleDeg = roofType === "flat" ? 0 : calculation.roofAngleDeg;
  const drawnRoofAngleDeg = roofAngleDeg ?? 24;
  const roofAngleRad = drawnRoofAngleDeg * Math.PI / 180;
  const roofSlope = Math.tan(roofAngleRad);
  const detailRoofThicknessPx = roofThicknessMm
    ? Math.max(16, Math.min(52, roofThicknessMm * 0.12))
    : 24;
  const roofOuterAtPipeY = 116 - detailRoofThicknessPx / 2;
  const roofInnerAtPipeY = 116 + detailRoofThicknessPx / 2;
  const detailRoofYAt = (x: number, atPipeY: number) => atPipeY - roofSlope * (x - 160);
  const detailRoofHalfRun = Math.abs(roofSlope) > 0.01
    ? Math.min(112, 74 / Math.abs(roofSlope))
    : 112;
  const roofStartX = 160 - detailRoofHalfRun;
  const roofEndX = 160 + detailRoofHalfRun;
  const roofOuterStartY = detailRoofYAt(roofStartX, roofOuterAtPipeY);
  const roofOuterEndY = detailRoofYAt(roofEndX, roofOuterAtPipeY);
  const roofInnerStartY = detailRoofYAt(roofStartX, roofInnerAtPipeY);
  const roofInnerEndY = detailRoofYAt(roofEndX, roofInnerAtPipeY);
  const detailRoofCakePath = `M${roofStartX} ${roofOuterStartY} L${roofEndX} ${roofOuterEndY} L${roofEndX} ${roofInnerEndY} L${roofStartX} ${roofInnerStartY} Z`;
  const detailUpkHalfWidth = Math.min(42, detailRoofHalfRun - 4);
  const detailUpkLeftBaseY = detailRoofYAt(160 - detailUpkHalfWidth, roofOuterAtPipeY);
  const detailUpkRightBaseY = detailRoofYAt(160 + detailUpkHalfWidth, roofOuterAtPipeY);
  const detailUpkTopY = Math.min(detailUpkLeftBaseY, detailUpkRightBaseY) - 46;
  const detailSkirtHalfWidth = Math.min(34, detailRoofHalfRun - 4);
  const detailSkirtLeftY = detailRoofYAt(160 - detailSkirtHalfWidth, roofInnerAtPipeY);
  const detailSkirtRightY = detailRoofYAt(160 + detailSkirtHalfWidth, roofInnerAtPipeY);
  const detailSkirtNeckY = Math.max(detailSkirtLeftY, detailSkirtRightY) + 22;

  return (
    <section className="configurator-node-details" aria-labelledby="passage-details-title">
      <div className="configurator-node-details-head">
        <span>Узлы вертикальной трассы</span>
        <strong id="passage-details-title">Что войдёт в комплект</strong>
      </div>
      <article className="configurator-node-card">
        <div className="configurator-node-card-title">
          <span>01</span>
          <div><strong>Проход перекрытия</strong><small>Повторяется для каждого перекрытия</small></div>
        </div>
        <svg viewBox="0 0 380 244" role="img" aria-labelledby="floor-node-title floor-node-description">
          <title id="floor-node-title">Состав узла прохода перекрытия</title>
          <desc id="floor-node-description">Сэндвич-труба проходит через стакан в перекрытии, с двух сторон установлены фланцы, внутри показаны хомут и зона заполнения ватой.</desc>
          <defs>
            <pattern id="floor-insulation-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M-2 8 L8 -2 M2 10 L10 2" className="scheme-node-hatch" />
            </pattern>
          </defs>
          <rect x="18" y="86" width="284" height="62" className="scheme-node-structure" />
          <rect x="18" y="101" width="70" height="32" className="scheme-node-joist" />
          <rect x="232" y="101" width="70" height="32" className="scheme-node-joist" />
          <rect x="116" y="77" width="88" height="80" rx="3" className="scheme-node-sleeve" />
          <rect x="124" y="84" width="72" height="66" fill="url(#floor-insulation-pattern)" className="scheme-node-insulation" />
          <rect x="145" y="18" width="30" height="194" className="scheme-node-pipe" />
          <rect x="106" y="78" width="108" height="8" rx="2" className="scheme-node-flange" />
          <rect x="106" y="148" width="108" height="8" rx="2" className="scheme-node-flange" />
          <rect x="72" y="113" width="65" height="8" className="scheme-node-clamp-ear" />
          <rect x="183" y="113" width="65" height="8" className="scheme-node-clamp-ear" />
          <rect x="137" y="108" width="46" height="18" className="scheme-node-clamp" />
          <circle cx="80" cy="117" r="2.5" className="scheme-node-clamp-bolt" />
          <circle cx="240" cy="117" r="2.5" className="scheme-node-clamp-bolt" />
          <line x1="175" y1="42" x2="252" y2="42" className="scheme-node-leader" />
          <text x="258" y="45" className="scheme-node-label">Сэндвич-труба</text>
          <line x1="204" y1="96" x2="252" y2="78" className="scheme-node-leader" />
          <text x="258" y="80" className="scheme-node-label">Стакан</text>
          <line x1="214" y1="82" x2="252" y2="106" className="scheme-node-leader" />
          <text x="258" y="109" className="scheme-node-label">Фланец 1</text>
          <line x1="214" y1="152" x2="252" y2="144" className="scheme-node-leader" />
          <text x="258" y="147" className="scheme-node-label">Фланец 2</text>
          <line x1="183" y1="117" x2="70" y2="184" className="scheme-node-leader" />
          <text x="16" y="202" className="scheme-node-label">Хомут в перекрытие</text>
          <text x="160" y="218" textAnchor="middle" className="scheme-node-note">
            Перекрытие: {calculation.floorThicknessesMm.length ? `${calculation.floorThicknessesMm.join(" / ")} мм` : "нужен замер"}
          </text>
          <text x="160" y="235" textAnchor="middle" className="scheme-node-note">
            Вата в BOM: {calculation.passageWoolKits} компл. · вручную
          </text>
        </svg>
      </article>

      <article className="configurator-node-card">
        <div className="configurator-node-card-title">
          <span>02</span>
          <div><strong>Проход кровли</strong><small>{roofAngleDeg === null ? "Угол нужно измерить" : `Угол кровли ${roofAngleDeg}°`}</small></div>
        </div>
        <svg viewBox="0 0 380 230" role="img" aria-labelledby="roof-node-title roof-node-description">
          <title id="roof-node-title">Состав узла прохода кровли</title>
          <desc id="roof-node-description">Вертикальная сэндвич-труба проходит через кровельный пирог под измеренным углом. УПК показан снаружи на верхней поверхности, внутренний фланец — отдельно на нижней поверхности.</desc>
          <path d={detailRoofCakePath} className="scheme-node-roof-cake" />
          <path d={`M${roofStartX} ${roofOuterStartY} L${roofEndX} ${roofOuterEndY}`} className="scheme-node-roof-surface is-outer" />
          <path d={`M${roofStartX} ${roofInnerStartY} L${roofEndX} ${roofInnerEndY}`} className="scheme-node-roof-surface is-inner" />
          <rect x="145" y="14" width="30" height="202" className="scheme-node-pipe" />
          <rect
            x="108"
            y={roofOuterAtPipeY - 5}
            width="104"
            height="10"
            className="scheme-node-upk"
            transform={`rotate(${-drawnRoofAngleDeg} 160 ${roofOuterAtPipeY})`}
          />
          <path
            d={`M${160 - detailUpkHalfWidth} ${detailUpkLeftBaseY} C132 ${detailUpkLeftBaseY - 8} 145 ${detailUpkTopY + 17} 149 ${detailUpkTopY + 9} L149 ${detailUpkTopY} L171 ${detailUpkTopY} L171 ${detailUpkTopY + 9} C175 ${detailUpkTopY + 17} 188 ${detailUpkRightBaseY - 8} ${160 + detailUpkHalfWidth} ${detailUpkRightBaseY} Z`}
            className="scheme-node-upk-collar"
          />
          <rect x="147" y={detailUpkTopY - 3} width="26" height="6" rx="1" className="scheme-node-upk-band" />
          <rect
            x="122"
            y={roofInnerAtPipeY - 3.5}
            width="76"
            height="7"
            className="scheme-node-flange"
            transform={`rotate(${-drawnRoofAngleDeg} 160 ${roofInnerAtPipeY})`}
          />
          {roofType === "flat" ? (
            <path
              d={`M${160 - detailSkirtHalfWidth} ${detailSkirtLeftY} L149 ${detailSkirtNeckY} L171 ${detailSkirtNeckY} L${160 + detailSkirtHalfWidth} ${detailSkirtRightY} Z`}
              className="scheme-node-skirt is-optional"
            />
          ) : null}
          <path d={`M74 ${roofInnerStartY + 8} A28 28 0 0 1 98 ${roofInnerStartY + 8 - roofSlope * 24}`} className="scheme-node-angle" />
          <text x="52" y={Math.min(205, roofInnerStartY + 42)} className="scheme-node-label">{roofAngleDeg === null ? "угол ?" : `${roofAngleDeg}°`}</text>
          <line x1="175" y1="38" x2="252" y2="38" className="scheme-node-leader" />
          <text x="258" y="41" className="scheme-node-label">Сэндвич-труба</text>
          <line x1="205" y1={roofOuterAtPipeY - 4} x2="252" y2="88" className="scheme-node-leader" />
          <text x="258" y="91" className="scheme-node-label">УПК по углу</text>
          <line x1="198" y1={roofInnerAtPipeY} x2="252" y2="132" className="scheme-node-leader" />
          <text x="258" y="135" className="scheme-node-label">{roofType === "flat" ? "Внутренний фланец" : "Фланец под углом"}</text>
          {roofType === "flat" ? (
            <>
              <line x1="172" y1={detailSkirtNeckY} x2="252" y2="156" className="scheme-node-leader" />
              <text x="258" y="159" className="scheme-node-label">Юбка (опция)</text>
            </>
          ) : null}
          <line x1="135" y1={roofInnerAtPipeY + 10} x2="50" y2="184" className="scheme-node-leader" />
          <text x="16" y="202" className="scheme-node-label">Фланец из помещения</text>
          <text x="160" y="224" textAnchor="middle" className="scheme-node-note">
            Кровельный пирог: {roofThicknessMm ? `${roofThicknessMm} мм` : "нужен замер"}
          </text>
        </svg>
      </article>
    </section>
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
  const [rotaryDamperHeightMm, setRotaryDamperHeightMm] = useState(0);
  const [supportCapLengthMm, setSupportCapLengthMm] = useState(70);
  const [passageWoolKits, setPassageWoolKits] = useState(3);
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
    const draftRotaryDamperHeight = Number(transferredDraft.rotaryDamperHeight);
    if (Number.isFinite(draftRotaryDamperHeight) && draftRotaryDamperHeight >= 0) setRotaryDamperHeightMm(draftRotaryDamperHeight);
    const draftSupportCap = Number(transferredDraft.supportCapHeight);
    if (Number.isFinite(draftSupportCap) && draftSupportCap >= 0) setSupportCapLengthMm(draftSupportCap);
    const draftPassageWoolKits = Number(transferredDraft.passageWoolKits);
    if (Number.isFinite(draftPassageWoolKits) && draftPassageWoolKits >= 1 && draftPassageWoolKits <= 30) {
      setPassageWoolKits(Math.round(draftPassageWoolKits));
    }

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
      rotaryDamperHeight: String(rotaryDamperHeightMm),
      supportCapHeight: String(supportCapLengthMm),
      passageWoolKits: String(passageWoolKits),
      routeHeight: route === "ceiling" ? String(heightM) : baseDraft.routeHeight,
      outdoorHeight: route === "wall" ? String(heightM) : baseDraft.outdoorHeight,
      wallDistance: route === "wall" ? String(Math.round(distanceM * 1000)) : baseDraft.wallDistance,
    });
    try {
      saveConfiguratorDraft(window.sessionStorage, updatedDraft);
    } catch {
      // The configurator remains usable without browser storage.
    }
  }, [distanceM, draftHydrated, floors, hasAttic, heightM, outlet, passageWoolKits, rotaryDamperHeightMm, route, stove, supportCapLengthMm, transferredDraft, warmupLengthMm]);

  const calculationDraft = useMemo<ScenarioConfiguratorDraft | null>(() => {
    if (!transferredDraft) return null;
    return {
      ...transferredDraft,
      route: route === "wall" && outlet === "horizontal" ? "wall-direct" : route,
      outlet: outlet === "vertical" ? "top" : "rear",
      levels: String(floors),
      hasAttic,
      warmupLength: String(warmupLengthMm),
      rotaryDamperHeight: String(rotaryDamperHeightMm),
      supportCapHeight: String(supportCapLengthMm),
      passageWoolKits: String(passageWoolKits),
      routeHeight: route === "ceiling" ? String(heightM) : transferredDraft.routeHeight,
      outdoorHeight: route === "wall" ? String(heightM) : transferredDraft.outdoorHeight,
      wallDistance: route === "wall" ? String(Math.round(distanceM * 1000)) : transferredDraft.wallDistance,
    };
  }, [distanceM, floors, hasAttic, heightM, outlet, passageWoolKits, rotaryDamperHeightMm, route, supportCapLengthMm, transferredDraft, warmupLengthMm]);

  const calculation = useMemo(
    () => calculateChimney({
      route,
      outlet,
      floors,
      heightM,
      distanceM,
      warmupLengthMm,
      rotaryDamperHeightMm,
      supportCapLengthMm,
      draft: calculationDraft,
    }),
    [calculationDraft, distanceM, floors, heightM, outlet, rotaryDamperHeightMm, route, supportCapLengthMm, warmupLengthMm],
  );
  const roofThicknessMm = calculation.roofThicknessMm;
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
    const diameterKinds = new Set(["труба", "отвод", "заглушка", "оголовок", "шибер"]);
    setCatalogMatchStatus("loading");
    Promise.all(selectedBom.filter((line) => line.requiresSku).map(async (line) => {
      const params = new URLSearchParams({ limit: "24", offset: "0", product_kind: line.productKind });
      if (line.catalogCategorySlug) params.set("category", line.catalogCategorySlug);
      if (line.catalogSearch) params.set("q", line.catalogSearch);
      const exactByFields = diameterKinds.has(line.productKind);
      if (exactByFields) {
        const outerDiameter = line.insulationMm !== undefined
          ? diameter + line.insulationMm * 2
          : null;
        params.set("diameter", `${diameter}:${outerDiameter ?? ""}`);
      }
      if (line.nominalLengthMm) params.set("length_mm", String(line.nominalLengthMm));
      if (line.contour) params.set("contour", line.contour);
      if (line.insulationMm !== undefined) params.set("insulation_mm", String(line.insulationMm));
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
        ...selectedBom.map((part) => `${part.label} — ${part.quantity} шт.${part.quantityNote ? `; ${part.quantityNote}` : ""} (${part.selectionReason})`),
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
    const rows = selectedBom.map((part) => `<tr><td>${part.label}${part.quantityNote ? `<br><small>${part.quantityNote}</small>` : ""}</td><td>${part.quantity}</td></tr>`).join("");
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
                  <span className="configurator-label">Общая высота разгона, мм</span>
                  <input
                    inputMode="numeric"
                    min="0"
                    onChange={(event) => setWarmupLengthMm(Math.max(0, Number(event.target.value) || 0))}
                    type="number"
                    value={warmupLengthMm}
                  />
                </label>
                <label className="configurator-text-field">
                  <span className="configurator-label">Высота поворотного шибера, мм</span>
                  <input
                    inputMode="numeric"
                    min="0"
                    max={warmupLengthMm}
                    onChange={(event) => setRotaryDamperHeightMm(Math.max(0, Number(event.target.value) || 0))}
                    type="number"
                    value={rotaryDamperHeightMm}
                  />
                  <small>Укажите фактический размер: он вычитается из длины одностенной трубы-разгона.</small>
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
                <label className="configurator-text-field">
                  <span className="configurator-label">Комплекты ваты на проходы, вручную</span>
                  <input
                    inputMode="numeric"
                    min="1"
                    max="30"
                    onChange={(event) => setPassageWoolKits(Math.max(1, Math.min(30, Math.round(Number(event.target.value) || 1))))}
                    type="number"
                    value={passageWoolKits}
                  />
                  <small>Обычно ставят 3–6 комплектов; окончательное количество определяет менеджер по узлам прохода.</small>
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
            <GeneratedChimneyScheme
              calculation={calculation}
              roofThicknessMm={roofThicknessMm}
              roofType={roof}
              variant={selectedVariant}
            />
          </div>
          {calculation.routeKind === "ceiling" ? (
            <VerticalPassageDetails
              calculation={calculation}
              roofType={roof}
            />
          ) : null}
          <div className="configurator-height-badge">
            Отметка завершения {calculation.routeTargetMm} мм
            {calculation.ridgeHeightMm ? ` · конёк ${calculation.ridgeHeightMm} мм` : " · высота конька не указана"}
            {` · раскладка ${selectedVariant?.label ?? "не найдена"}`}
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
            <strong>
              {calculation.diameterMm !== null
                ? `Ø ${calculation.diameterMm}/${calculation.diameterMm + 100} · изоляция 50 мм`
                : `${selectedBom.length} типов деталей`}
            </strong>
          </div>
          <div className="configurator-spec-list">
            {selectedBom.map((part) => {
              const catalogMatch = catalogMatches[part.key];
              return (
                <div key={part.key} className="configurator-spec-row">
                  <div className="configurator-spec-media" aria-hidden={!catalogMatch?.item.primary_image}>
                    {catalogMatch?.item.primary_image ? (
                      <img
                        src={catalogMediaUrl(catalogMatch.item.primary_image.thumbnail_url ?? catalogMatch.item.primary_image.url, assetBasePath)}
                        alt={catalogMatch.item.primary_image.alt ?? ""}
                        width={catalogMatch.item.primary_image.width ?? undefined}
                        height={catalogMatch.item.primary_image.height ?? undefined}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <PackageCheck aria-hidden size={20} />
                    )}
                  </div>
                  <div>
                    <strong>{part.label}</strong>
                    <small>{part.selectionReason}</small>
                    {part.quantityNote ? <small>{part.quantityNote}</small> : null}
                    {catalogMatch ? (
                      <>
                        <span className="configurator-spec-parameters">
                          {catalogMatch.item.diameter_mm !== null ? `Ø ${catalogMatch.item.diameter_mm}${catalogMatch.item.outer_diameter_mm !== null ? `/${catalogMatch.item.outer_diameter_mm}` : ""} мм` : null}
                          {catalogMatch.item.length_mm !== null ? ` · L ${catalogMatch.item.length_mm} мм` : null}
                          {catalogMatch.item.insulation_mm !== null ? ` · изоляция ${catalogMatch.item.insulation_mm} мм` : null}
                          {` · ${formatCatalogPrice(catalogMatch.item.price_rub)}`}
                        </span>
                        <Link className="configurator-spec-sku" href={productSelectionPath(catalogMatch.item.slug, catalogMatch.item, catalogMatch.item.selected_sku)}>
                          {catalogMatch.item.article || catalogMatch.item.name}
                          {!catalogMatch.exactByFields ? " · кандидат по типу, проверить размер" : " · точное исполнение"}
                        </Link>
                      </>
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
