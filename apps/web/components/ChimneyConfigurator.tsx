"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  IconAlertTriangle as AlertTriangle,
  IconDownload as Download,
  IconPackage as PackageCheck,
  IconPlus as Plus,
} from "@tabler/icons-react";
import {
  calculationProfileMeasurementsHref,
  readCalculationProfiles,
  type CalculationProfile,
} from "@/lib/calculationProfiles";
import {
  saveConfiguratorDraft,
  type ScenarioConfiguratorDraft,
} from "@/lib/configuratorDraft";
import {
  bomForVariant,
  calculateChimney,
  PIPE_SOCKET_OVERLAP_MM,
  ROTARY_DAMPER_EFFECTIVE_LENGTH_MM,
  type ChimneyCalculation,
  type ChimneyBomLine,
  type PipeLayoutVariant,
} from "@/lib/chimneyCalculation";
import {
  wallTopRouteFacadeConsolePositions,
} from "@/lib/wallRouteLayout";
import {
  buildExternalWallSceneGraph,
  type EngineeringSceneGraph,
  type EngineeringSceneNode,
} from "@/lib/chimneySceneGraph";
import { productSelectionPath } from "@/lib/productUrls";
import type { ProductListItem, ProductListResponse } from "@/lib/api";
import {
  buildChimneyEstimate,
  formatRub,
  type CatalogEstimateMatch,
  type EstimateMeasurement,
} from "@/lib/chimneyEstimate";
import { downloadChimneyEstimatePdf } from "@/lib/chimneyEstimatePdf";

type RouteType = "ceiling" | "wall";
type StoveType = "bania" | "pech" | "kamin" | "tt-kotel" | "gaz";
type OutletType = "vertical" | "horizontal";
type RoofType = "pitched" | "flat";

type ChimneyConfiguratorProps = {
  assetBasePath?: string;
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

function shortMaterialLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.toLocaleLowerCase("ru-RU");
  if (normalized.includes("нержав") || normalized === "stainless") return "нерж.";
  if (normalized.includes("оцинк") || normalized === "galvanized") return "оцинковка";
  return value.trim();
}

function catalogMaterialLabel(item: ProductListItem): string | null {
  const innerMaterial = shortMaterialLabel(item.material);
  const inner = [innerMaterial, item.steel_grade].filter(Boolean).join(" ");
  const outerMaterial = shortMaterialLabel(item.attributes.outer_material);
  const outerSteel = typeof item.attributes.outer_steel_grade === "string"
    ? item.attributes.outer_steel_grade
    : null;
  const outer = [outerMaterial, outerSteel].filter(Boolean).join(" ");
  if (inner && outer) return `${inner} · наруж. ${outer}`;
  return inner || outer || null;
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

const ACTIVE_CALCULATION_PROFILE_KEY = "dimohod-trade:active-calculation-profile:v1";

function SchemePartCallout({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g aria-hidden="true" pointerEvents="none">
      <line stroke="#1769aa" strokeWidth="2" x1={x} x2={x} y1={y + 12} y2={y + 25} />
      <circle cx={x} cy={y} fill="#fff" r="12" stroke="#1769aa" strokeWidth="2" />
      <text fill="#17343e" fontSize="11" fontWeight="800" textAnchor="middle" x={x} y={y + 4}>{label}</text>
    </g>
  );
}

function HorizontalPipeSegment({
  x,
  centerY,
  width,
  height,
  gradientId,
  filterId,
  label,
}: {
  x: number;
  centerY: number;
  width: number;
  height: number;
  gradientId: string;
  filterId?: string;
  label?: string;
}) {
  const safeWidth = Math.max(4, width);
  const radiusX = Math.min(5, safeWidth / 5);
  const topY = centerY - height / 2;
  const fill = `url(#${gradientId})`;
  return (
    <g>
      <rect
        fill={fill}
        filter={filterId ? `url(#${filterId})` : undefined}
        height={height}
        rx={Math.min(8, height / 5)}
        stroke="#344348"
        strokeWidth="2"
        width={safeWidth}
        x={x}
        y={topY}
      />
      <ellipse cx={x + radiusX} cy={centerY} fill={fill} rx={radiusX} ry={height / 2 - 1} stroke="#344348" strokeWidth="1.5" />
      <ellipse cx={x + safeWidth - radiusX} cy={centerY} fill="none" rx={radiusX} ry={height / 2 - 1} stroke="#657277" strokeWidth="1.5" />
      <rect fill={fill} height={height + 6} rx="3" stroke="#2d3b40" strokeWidth="1.5" width={Math.min(8, safeWidth / 4)} x={x + 2} y={topY - 3} />
      {safeWidth > 18 ? (
        <line opacity="0.72" stroke="#fff" strokeLinecap="round" strokeWidth="2" x1={x + 12} x2={x + safeWidth - 10} y1={topY + 9} y2={topY + 9} />
      ) : null}
      {label && safeWidth >= 28 ? <SchemePartCallout label={label} x={x + safeWidth / 2} y={topY - 18} /> : null}
    </g>
  );
}

function HorizontalTransitionAssembly({
  flowStartX,
  centerY,
  direction,
  gradientId,
  filterId,
}: {
  flowStartX: number;
  centerY: number;
  direction: "left" | "right";
  gradientId: string;
  filterId: string;
}) {
  const damperWidth = 72;
  const capWidth = 52;
  const sign = direction === "right" ? 1 : -1;
  const damperCenterX = flowStartX + sign * damperWidth / 2;
  const capCenterX = flowStartX + sign * (damperWidth + capWidth / 2);
  const transform = direction === "left" ? `translate(${flowStartX * 2} 0) scale(-1 1)` : undefined;
  const fill = `url(#${gradientId})`;

  return (
    <g aria-label="Поворотный шибер и опорная сэндвич-заглушка">
      <g transform={transform}>
        <rect
          fill={fill}
          filter={`url(#${filterId})`}
          height="44"
          rx="8"
          stroke="#344348"
          strokeWidth="2"
          width={damperWidth}
          x={flowStartX}
          y={centerY - 22}
        />
        <ellipse cx={flowStartX + 4} cy={centerY} fill={fill} rx="4" ry="21" stroke="#344348" strokeWidth="1.5" />
        <rect fill={fill} height="52" rx="3" stroke="#2d3b40" strokeWidth="1.5" width="9" x={flowStartX + 4} y={centerY - 26} />
        <rect fill={fill} height="52" rx="3" stroke="#2d3b40" strokeWidth="1.5" width="9" x={flowStartX + damperWidth - 11} y={centerY - 26} />
        <line opacity="0.74" stroke="#fff" strokeLinecap="round" strokeWidth="2" x1={flowStartX + 15} x2={flowStartX + damperWidth - 15} y1={centerY - 11} y2={centerY - 11} />

        <path
          d={`M${flowStartX + damperWidth},${centerY - 20} L${flowStartX + damperWidth + 12},${centerY - 20} L${flowStartX + damperWidth + 19},${centerY - 27} L${flowStartX + damperWidth + capWidth - 7},${centerY - 27} L${flowStartX + damperWidth + capWidth},${centerY - 23} L${flowStartX + damperWidth + capWidth},${centerY + 23} L${flowStartX + damperWidth + capWidth - 7},${centerY + 27} L${flowStartX + damperWidth + 19},${centerY + 27} L${flowStartX + damperWidth + 12},${centerY + 20} Z`}
          fill={fill}
          filter={`url(#${filterId})`}
          stroke="#344348"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <rect fill={fill} height="58" rx="3" stroke="#2d3b40" strokeWidth="1.5" width="9" x={flowStartX + damperWidth + capWidth - 10} y={centerY - 29} />
        <line opacity="0.72" stroke="#fff" strokeLinecap="round" strokeWidth="2" x1={flowStartX + damperWidth + 21} x2={flowStartX + damperWidth + capWidth - 14} y1={centerY - 14} y2={centerY - 14} />
      </g>

      <line stroke="#4b5b60" strokeWidth="3" x1={damperCenterX} x2={damperCenterX} y1={centerY - 25} y2={centerY - 43} />
      <circle cx={damperCenterX} cy={centerY - 45} fill="#e46235" r="5" stroke="#923719" strokeWidth="2" />
      <line stroke="#923719" strokeLinecap="round" strokeWidth="4" x1={damperCenterX} x2={damperCenterX + 18} y1={centerY - 45} y2={centerY - 57} />
      <SchemePartCallout label="Ш" x={damperCenterX} y={centerY - 75} />
      <SchemePartCallout label="ОЗ" x={capCenterX} y={centerY - 75} />
    </g>
  );
}

function DynamicWallTopScheme({
  outlet = "top",
  variant,
}: {
  outlet?: "top" | "rear";
  variant: PipeLayoutVariant | null;
}) {
  const rearOutlet = outlet === "rear";
  const outdoorPipes = variant?.pipes.filter((pipe) => (
    pipe.axis === "vertical" && pipe.contour === "сэндвич"
  )) ?? [];
  const horizontalPipes = variant?.pipes.filter((pipe) => pipe.axis === "horizontal") ?? [];
  const outdoorNominalMm = outdoorPipes.reduce((sum, pipe) => sum + pipe.nominalMm, 0);
  const horizontalNominalMm = horizontalPipes.reduce((sum, pipe) => sum + pipe.nominalMm, 0);
  const consolePositionsMm = wallTopRouteFacadeConsolePositions(outdoorNominalMm);
  const stackTopY = 220;
  const horizontalAxisY = rearOutlet ? 1200 : 1088;
  const routeDeltaY = horizontalAxisY - 1088;
  const stackBottomY = 1058 + routeDeltaY;
  const stackHeight = stackBottomY - stackTopY;
  const horizontalStartX = rearOutlet ? 406 : 382;
  const horizontalEndX = 658;
  const horizontalWidth = horizontalEndX - horizontalStartX;
  let outdoorCursorY = stackBottomY;
  let horizontalCursorX = horizontalStartX;

  return (
    <svg
      aria-labelledby="dynamic-wall-top-title dynamic-wall-top-description"
      className="configurator-dynamic-svg-scheme"
      role="img"
      viewBox="0 0 1024 1536"
    >
      <title id="dynamic-wall-top-title">{rearOutlet ? "Динамическая схема прямого заднего выхода через стену" : "Динамическая схема верхнего выхода через стену"}</title>
      <desc id="dynamic-wall-top-description">
        {rearOutlet
          ? "Векторная расчётная схема прямого заднего выхода без отвода 90 градусов; количество труб и креплений соответствует выбранной раскладке конфигуратора."
          : "Векторная расчётная схема верхнего выхода с отводом 90 градусов; количество труб и креплений соответствует выбранной раскладке конфигуратора."}
      </desc>
      <defs>
        <linearGradient id="dynamic-steel-vertical" x1="0" x2="1">
          <stop offset="0" stopColor="#667176" />
          <stop offset="0.16" stopColor="#c7ced0" />
          <stop offset="0.38" stopColor="#f7f8f7" />
          <stop offset="0.62" stopColor="#aeb8ba" />
          <stop offset="0.82" stopColor="#eef1f0" />
          <stop offset="1" stopColor="#5b666a" />
        </linearGradient>
        <linearGradient id="dynamic-steel-horizontal" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#667176" />
          <stop offset="0.2" stopColor="#dfe4e3" />
          <stop offset="0.48" stopColor="#fafbfa" />
          <stop offset="0.78" stopColor="#a2adaf" />
          <stop offset="1" stopColor="#566166" />
        </linearGradient>
        <linearGradient id="dynamic-console-top" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f2f4f3" />
          <stop offset="0.48" stopColor="#aab2b4" />
          <stop offset="1" stopColor="#687277" />
        </linearGradient>
        <linearGradient id="dynamic-roof" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#6f4a2e" />
          <stop offset="0.5" stopColor="#bd8050" />
          <stop offset="1" stopColor="#664028" />
        </linearGradient>
        <linearGradient id="dynamic-stove" x1="0" x2="1">
          <stop offset="0" stopColor="#151b1e" />
          <stop offset="0.5" stopColor="#3d474b" />
          <stop offset="1" stopColor="#121719" />
        </linearGradient>
        <radialGradient id="dynamic-fire" cx="50%" cy="72%" r="72%">
          <stop offset="0" stopColor="#ffd45b" />
          <stop offset="0.42" stopColor="#f26a21" />
          <stop offset="1" stopColor="#55170d" />
        </radialGradient>
        <pattern height="24" id="dynamic-grid" patternUnits="userSpaceOnUse" width="24">
          <path d="M24 0H0V24" fill="none" stroke="#dfe8eb" strokeWidth="1" />
        </pattern>
        <filter id="dynamic-pipe-shadow" height="130%" width="150%" x="-25%" y="-15%">
          <feDropShadow dx="2" dy="4" floodColor="#182428" floodOpacity="0.2" stdDeviation="4" />
        </filter>
      </defs>

      <rect fill="#fff" height="1536" width="1024" />
      <rect fill="url(#dynamic-grid)" height="1340" opacity="0.58" rx="28" width="944" x="40" y="36" />

      <g aria-label="Здание и отопитель, построенные векторными примитивами">
        <text fill="#173d4c" fontSize="38" fontWeight="850" x="64" y="92">Наружный дымоход через стену</text>
        <text fill="#53656d" fontSize="21" x="64" y="128">{rearOutlet ? "Прямой задний выход · расчётная SVG-схема" : "Верхний выход отопителя · расчётная SVG-схема"}</text>

        <path d="M54 570 L535 278 L610 332 L136 630 Z" fill="url(#dynamic-roof)" stroke="#3d2a20" strokeLinejoin="round" strokeWidth="10" />
        <path d="M61 555 L535 262 L619 324" fill="none" stroke="#252b2d" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24" />
        <path d="M112 608 L538 350 V1348 H112 Z" fill="#f3ecdf" stroke="#9b866e" strokeWidth="3" />
        <rect fill="#d9b47c" height="998" stroke="#795b37" strokeWidth="3" width="52" x="520" y="350" />
        <path d="M528 350 V1348 M546 350 V1348 M564 350 V1348" opacity="0.35" stroke="#8b673d" strokeWidth="3" />
        <rect fill="#8b5d37" height="22" width="506" x="88" y="1348" />

        <g aria-label="Отопитель">
          <rect fill="url(#dynamic-stove)" height="228" rx="14" stroke="#0d1214" strokeWidth="5" width="178" x="104" y="1120" />
          <rect fill="#101517" height="112" rx="8" stroke="#718087" strokeWidth="4" width="126" x="130" y="1150" />
          <path d="M151 1244 C132 1208 163 1192 164 1160 C191 1188 185 1203 197 1218 C209 1197 222 1186 224 1165 C252 1203 241 1232 226 1244 Z" fill="url(#dynamic-fire)" />
          <rect fill="#20292c" height="38" rx="5" width="126" x="130" y="1282" />
          <circle cx="242" cy="1200" fill="#aeb8ba" r="5" />
          {rearOutlet ? (
            <>
              <rect fill="url(#dynamic-steel-horizontal)" height="52" rx="5" stroke="#344348" strokeWidth="3" width="30" x="268" y={horizontalAxisY - 26} />
              <ellipse cx="282" cy={horizontalAxisY} fill="url(#dynamic-steel-horizontal)" rx="8" ry="25" stroke="#344348" strokeWidth="2" />
            </>
          ) : (
            <rect fill="url(#dynamic-steel-vertical)" height="38" rx="5" stroke="#344348" strokeWidth="3" width="52" x="207" y="1084" />
          )}
        </g>

        {!rearOutlet ? (
          <g aria-label="Отвод 90 градусов">
            <path d="M233 1120 V1112 Q233 1088 257 1088 H286" fill="none" stroke="#344348" strokeLinecap="round" strokeLinejoin="round" strokeWidth="52" />
            <path d="M233 1120 V1112 Q233 1088 257 1088 H286" fill="none" stroke="url(#dynamic-steel-horizontal)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="46" />
          </g>
        ) : null}

        <g aria-label="Проход стены">
          <rect fill="#efc758" height="88" opacity="0.85" stroke="#9d7118" strokeWidth="3" width="74" x="510" y={horizontalAxisY - 44} />
          <rect fill="none" height="108" stroke="#657277" strokeWidth="5" width="104" x="495" y={horizontalAxisY - 54} />
          <line stroke="#657277" strokeWidth="4" x1="505" x2="505" y1={horizontalAxisY - 62} y2={horizontalAxisY + 62} />
          <line stroke="#657277" strokeWidth="4" x1="589" x2="589" y1={horizontalAxisY - 62} y2={horizontalAxisY + 62} />
        </g>
      </g>

      <g aria-label="Сэндвич-тройник" transform={`translate(0 ${routeDeltaY})`}>
        <rect fill="url(#dynamic-steel-vertical)" filter="url(#dynamic-pipe-shadow)" height="116" rx="6" stroke="#3f4b4f" strokeWidth="3" width="68" x="659" y="1046" />
        <path d="M620 1061 H675 V1115 H620 L603 1088 Z" fill="url(#dynamic-steel-horizontal)" stroke="#3f4b4f" strokeLinejoin="round" strokeWidth="3" />
        <line stroke="#29363b" strokeWidth="4" x1="657" x2="729" y1="1048" y2="1048" />
        <line stroke="#29363b" strokeWidth="4" x1="657" x2="729" y1="1160" y2="1160" />
      </g>
      <g aria-label="Оголовок">
        <path d="M662 222 H724 L711 192 H675 Z" fill="url(#dynamic-steel-vertical)" stroke="#344348" strokeWidth="3" />
        <path d="M650 190 H736 L712 160 H674 Z" fill="url(#dynamic-steel-horizontal)" stroke="#344348" strokeLinejoin="round" strokeWidth="3" />
        <line stroke="#344348" strokeWidth="5" x1="674" x2="674" y1="192" y2="220" />
        <line stroke="#344348" strokeWidth="5" x1="712" x2="712" y1="192" y2="220" />
      </g>

      <g aria-label="Сэндвич-опорная площадка под тройником" transform={`translate(0 ${routeDeltaY})`}>
        <rect
          fill="url(#dynamic-console-top)"
          filter="url(#dynamic-pipe-shadow)"
          height="22"
          rx="4"
          stroke="#3f494d"
          strokeWidth="2"
          width="116"
          x="635"
          y="1160"
        />
        <circle cx="646" cy="1171" fill="#303c41" r="3" />
        <circle cx="740" cy="1171" fill="#303c41" r="3" />
      </g>
      <g aria-label="Универсальная консоль под опорной площадкой" transform={`translate(0 ${routeDeltaY})`}>
        <polygon
          fill="url(#dynamic-console-top)"
          filter="url(#dynamic-pipe-shadow)"
          points="635,1182 572,1182 572,1234"
          stroke="#3f494d"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <line stroke="#687277" strokeWidth="3" x1="627" x2="580" y1="1192" y2="1225" />
      </g>

      <g aria-label={`Наружные сэндвич-трубы: ${outdoorPipes.length}`}>
        {outdoorPipes.map((pipe, index) => {
          const height = outdoorNominalMm > 0
            ? stackHeight * (pipe.nominalMm / outdoorNominalMm)
            : stackHeight / Math.max(1, outdoorPipes.length);
          outdoorCursorY -= height;
          const y = outdoorCursorY;
          return (
            <g key={pipe.id}>
              <rect
                fill="url(#dynamic-steel-vertical)"
                filter="url(#dynamic-pipe-shadow)"
                height={Math.max(2, height - 4)}
                rx="5"
                stroke="#3f4b4f"
                strokeWidth="2"
                width="68"
                x="659"
                y={y + 2}
              />
              <line stroke="#29363b" strokeWidth="4" x1="657" x2="729" y1={y + 3} y2={y + 3} />
              <line stroke="rgba(255,255,255,0.72)" strokeWidth="2" x1="664" x2="664" y1={y + 10} y2={y + height - 8} />
              <text className="dynamic-pipe-index" textAnchor="middle" x="693" y={y + height / 2 + 5}>
                {index + 1}
              </text>
            </g>
          );
        })}
        {!outdoorPipes.length ? (
          <rect className="dynamic-pipe-placeholder" height={stackHeight} width="68" x="659" y={stackTopY} />
        ) : null}
        <line stroke="#29363b" strokeWidth="4" x1="657" x2="729" y1={stackBottomY} y2={stackBottomY} />
      </g>

      <g aria-label={`Универсальные консоли с силовыми хомутами через каждые два метра: ${consolePositionsMm.length}`}>
        {consolePositionsMm.map((positionMm, index) => {
          const ratio = outdoorNominalMm > 0 ? positionMm / outdoorNominalMm : 0;
          const y = Math.max(stackTopY + 78, Math.min(stackBottomY - 88, stackBottomY - ratio * stackHeight));
          return (
            <g key={`${positionMm}-${index}`}>
              <polygon
                fill="url(#dynamic-console-top)"
                filter="url(#dynamic-pipe-shadow)"
                points={`660,${y + 8} 540,${y + 8} 540,${y + 68}`}
                stroke="#3f494d"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <line stroke="#687277" strokeWidth="3" x1="646" x2="551" y1={y + 20} y2={y + 55} />
              <rect fill="url(#dynamic-steel-vertical)" height="18" rx="5" stroke="#29363b" strokeWidth="2" width="84" x="651" y={y} />
              <circle cx="658" cy={y + 9} fill="#303c41" r="3" />
              <circle cx="728" cy={y + 9} fill="#303c41" r="3" />
            </g>
          );
        })}
      </g>

      {horizontalPipes.length ? (
        <g aria-label={`Горизонтальные трубы: ${horizontalPipes.length}`}>
          {rearOutlet ? (
            <HorizontalTransitionAssembly
              centerY={horizontalAxisY}
              direction="right"
              filterId="dynamic-pipe-shadow"
              flowStartX={282}
              gradientId="dynamic-steel-horizontal"
            />
          ) : (
            <HorizontalTransitionAssembly
              centerY={horizontalAxisY}
              direction="right"
              filterId="dynamic-pipe-shadow"
              flowStartX={258}
              gradientId="dynamic-steel-horizontal"
            />
          )}
          {horizontalPipes.map((pipe, index) => {
            const width = horizontalNominalMm > 0
              ? horizontalWidth * (pipe.nominalMm / horizontalNominalMm)
              : horizontalWidth / horizontalPipes.length;
            const x = horizontalCursorX;
            horizontalCursorX += width;
            return (
              <HorizontalPipeSegment
                centerY={horizontalAxisY}
                filterId="dynamic-pipe-shadow"
                gradientId="dynamic-steel-horizontal"
                height={54}
                key={pipe.id}
                label={`Г${index + 1}`}
                width={Math.max(2, width - 4)}
                x={x + 2}
              />
            );
          })}
          <line stroke="#29363b" strokeWidth="4" x1={horizontalEndX} x2={horizontalEndX} y1={horizontalAxisY - 30} y2={horizontalAxisY + 30} />
        </g>
      ) : null}

      <g className="dynamic-scheme-summary" transform="translate(42 1420)">
        <rect height="72" rx="18" width="900" />
        <text x="24" y="29">По выбранной смете</text>
        <text x="24" y="55">
          трубы — {outdoorPipes.length + horizontalPipes.length} шт. · площадка — 1 шт. · консоли — {consolePositionsMm.length + 1} шт. · силовые хомуты — {consolePositionsMm.length} шт.
        </text>
      </g>
    </svg>
  );
}

function EngineeringSceneProduct({ node, scale, originX, originY, projectedX, projectedY }: {
  node: EngineeringSceneNode;
  scale: number;
  originX: number;
  originY: number;
  projectedX?: number;
  projectedY?: number;
}) {
  const x = projectedX ?? originX + node.xMm * scale;
  const y = projectedY ?? originY - node.yMm * scale;
  const length = Math.max(8, node.effectiveLengthMm * scale);
  const sandwich = node.geometryFamily === "sandwich_pipe";
  const pipeWidth = sandwich ? 30 : 20;
  const common = {
    "data-product-id": node.productId,
    "data-sku": node.sku,
    "data-catalog-asset": node.visualAsset,
  };

  if (node.geometryFamily === "single_wall_pipe" || node.geometryFamily === "sandwich_pipe") {
    return node.orientation === "horizontal" ? (
      <g {...common} transform={`translate(${x} ${y})`}>
        <rect fill="url(#scene-steel)" height={pipeWidth} rx="3" stroke="#26343d" width={length} x="0" y={-pipeWidth / 2} />
        <line stroke="#26343d" strokeWidth="3" x1={length} x2={length} y1={-pipeWidth / 2 - 2} y2={pipeWidth / 2 + 2} />
      </g>
    ) : (
      <g {...common} transform={`translate(${x} ${y})`}>
        <rect fill="url(#scene-steel)" height={length} rx="3" stroke="#26343d" width={pipeWidth} x={-pipeWidth / 2} y={-length} />
        <line stroke="#26343d" strokeWidth="3" x1={-pipeWidth / 2 - 2} x2={pipeWidth / 2 + 2} y1={-length} y2={-length} />
      </g>
    );
  }
  if (node.geometryFamily === "rotary_damper") return (
    <g {...common} transform={`translate(${x} ${y})`}>
      <rect fill="url(#scene-steel)" height="20" rx="3" stroke="#26343d" width={length} x="0" y="-10" />
      <line stroke="#26343d" strokeWidth="4" x1={length * 0.5} x2={length * 0.5} y1="-10" y2="-35" />
      <circle cx={length * 0.5} cy="-38" fill="#e46235" r="5" stroke="#923719" strokeWidth="2" />
      <line stroke="#923719" strokeLinecap="round" strokeWidth="4" x1={length * 0.5} x2={length * 0.5 + 24} y1="-38" y2="-50" />
    </g>
  );
  if (node.geometryFamily === "transition_support_cap") return (
    <g {...common} transform={`translate(${x} ${y})`}>
      <path
        d={`M0,-10 H${Math.max(8, length * 0.35)} L${length * 0.55},-15 H${length} V15 H${length * 0.55} L${Math.max(8, length * 0.35)},10 H0 Z`}
        fill="url(#scene-steel)"
        stroke="#26343d"
        strokeLinejoin="round"
      />
    </g>
  );
  if (node.geometryFamily === "tee_90") return (
    <g {...common} transform={`translate(${x} ${y})`}>
      <rect fill="url(#scene-steel)" height="92" rx="6" stroke="#26343d" width="34" x="-17" y="-46" />
      <path d="M-62,-17 H0 V17 H-62" fill="url(#scene-steel)" stroke="#26343d" />
      <line stroke="#26343d" strokeWidth="3" x1="-20" x2="20" y1="-46" y2="-46" />
    </g>
  );
  if (node.geometryFamily === "support_plug") return (
    <g {...common} transform={`translate(${x} ${y})`}>
      <rect fill="url(#scene-steel)" height="12" rx="2" stroke="#26343d" width="76" x="-38" y="-6" />
      <path d="M-38,5 v13 h8 M38,5 v13 h-8" fill="none" stroke="#26343d" strokeWidth="3" />
      <ellipse cx="0" cy="-8" fill="url(#scene-steel)" rx="24" ry="7" stroke="#26343d" />
      <rect fill="url(#scene-steel)" height="28" stroke="#26343d" width="48" x="-24" y="-36" />
      <ellipse cx="0" cy="-36" fill="#c7ced0" rx="24" ry="7" stroke="#26343d" />
      <rect fill="url(#scene-steel)" height="18" stroke="#26343d" width="30" x="-15" y="6" />
    </g>
  );
  if (node.geometryFamily === "support_platform") return (
    <g {...common} transform={`translate(${x} ${y})`}>
      <rect fill="url(#scene-steel)" height="12" rx="2" stroke="#26343d" width="76" x="-38" y="-6" />
      <circle cx="-29" cy="0" fill="#303c41" r="2.5" />
      <circle cx="29" cy="0" fill="#303c41" r="2.5" />
    </g>
  );
  if (node.geometryFamily === "support_console" || node.geometryFamily === "wall_console") return (
    <g {...common} transform={`translate(${x} ${y})`}>
      <rect fill="#202629" height="62" rx="2" stroke="#111719" width="8" x="-94" y="-31" />
      <rect fill="#202629" height="7" rx="2" stroke="#111719" width="70" x="-86" y="-20" />
      <rect fill="#202629" height="7" rx="2" stroke="#111719" width="70" x="-86" y="13" />
      <path d="M-82,13 L-24,-16 M-78,20 L-20,-13" fill="none" stroke="#111719" strokeWidth="4" />
      <circle cx="-90" cy="-24" fill="#d8ddde" r="2.5" />
      <circle cx="-90" cy="24" fill="#d8ddde" r="2.5" />
    </g>
  );
  if (node.geometryFamily === "power_clamp") return (
    <g {...common} transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" fill="none" rx="25" ry="10" stroke="#26343d" strokeWidth="5" />
      <line stroke="#26343d" strokeWidth="4" x1="24" x2="55" y1="0" y2="0" />
    </g>
  );
  if (node.geometryFamily === "terminal") return (
    <g {...common} transform={`translate(${x} ${y})`}>
      <path d="M-28,-8 H28 L12,-34 H-12 Z" fill="url(#scene-steel)" stroke="#26343d" />
      <rect fill="url(#scene-steel)" height="16" stroke="#26343d" width="30" x="-15" y="-8" />
    </g>
  );
  return null;
}

function EngineeringSceneCallout({
  anchorX,
  anchorY,
  label,
  value,
  x,
  y,
}: {
  anchorX: number;
  anchorY: number;
  label: string;
  value?: string;
  x: number;
  y: number;
}) {
  const lineEndX = x < anchorX ? x + 154 : x;
  return (
    <g aria-hidden="true">
      <path
        d={`M${anchorX} ${anchorY} L${lineEndX} ${anchorY} L${lineEndX} ${y + 22}`}
        fill="none"
        stroke="#e25b32"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx={anchorX} cy={anchorY} fill="#fff" r="4" stroke="#e25b32" strokeWidth="2" />
      <rect fill="#fff" height={value ? 48 : 34} rx="8" stroke="#cbd7da" width="154" x={x} y={y} />
      <text fill="#173d4c" fontSize="13" fontWeight="800" x={x + 10} y={y + 20}>{label}</text>
      {value ? <text fill="#5b6b72" fontSize="11.5" x={x + 10} y={y + 37}>{value}</text> : null}
    </g>
  );
}

function DynamicWallRearScheme({ scene }: { scene: EngineeringSceneGraph }) {
  const passageNodes = scene.nodes.filter((node) => node.geometryFamily === "wall_passage" || node.geometryFamily === "passage_accessory");
  const productNodes = scene.nodes.filter((node) => node.geometryFamily !== "wall_passage" && node.geometryFamily !== "passage_accessory");
  const horizontalNodes = productNodes.filter((node) => (
    node.orientation === "horizontal"
    && (node.geometryFamily === "single_wall_pipe" || node.geometryFamily === "sandwich_pipe" || node.geometryFamily === "rotary_damper" || node.geometryFamily === "transition_support_cap")
  ));
  const teeNode = productNodes.find((node) => node.geometryFamily === "tee_90");
  const verticalNodes = productNodes.filter((node) => !horizontalNodes.includes(node) && node !== teeNode);
  const verticalPipeNodes = verticalNodes.filter((node) => node.geometryFamily === "sandwich_pipe");
  const facadeSupports = verticalNodes.filter((node) => node.geometryFamily === "wall_console");
  const damperNode = horizontalNodes.find((node) => node.geometryFamily === "rotary_damper");
  const terminalNode = verticalNodes.find((node) => node.geometryFamily === "terminal");
  const supportPlugNode = verticalNodes.find((node) => node.geometryFamily === "support_plug");
  const representativeSupport = facadeSupports[Math.floor(facadeSupports.length / 2)];
  const horizontalMaximumMm = Math.max(scene.horizontalRunMm, 1000);
  const verticalMaximumMm = Math.max(scene.verticalHeightMm, 1000);
  const horizontalScale = 350 / horizontalMaximumMm;
  const verticalScale = 430 / verticalMaximumMm;
  const horizontalOriginX = 132;
  const horizontalAxisY = 610;
  const verticalAxisX = horizontalOriginX + scene.horizontalRunMm * horizontalScale;
  const verticalOriginY = horizontalAxisY;
  const wallX = horizontalOriginX + scene.wallPassage.startMm * horizontalScale;
  const wallWidth = Math.max(30, (scene.wallPassage.endMm - scene.wallPassage.startMm) * horizontalScale);
  const horizontalPipeCount = horizontalNodes.filter((node) => node.geometryFamily === "single_wall_pipe" || node.geometryFamily === "sandwich_pipe").length;
  const pipeGroups = Array.from(verticalPipeNodes.reduce((groups, node) => {
    const key = node.nominalLengthMm ?? node.bomKey;
    const current = groups.get(key);
    groups.set(key, { node, quantity: (current?.quantity ?? 0) + 1 });
    return groups;
  }, new Map<number | string, { node: EngineeringSceneNode; quantity: number }>()).values());
  const pipeSummary = pipeGroups
    .map(({ node, quantity }) => `${node.nominalLengthMm ?? "—"} мм ×${quantity}`)
    .join(" · ");
  const terminalY = terminalNode ? verticalOriginY - terminalNode.yMm * verticalScale - 24 : 150;
  const representativeSupportY = representativeSupport
    ? verticalOriginY - representativeSupport.yMm * verticalScale
    : 335;
  const damperX = damperNode
    ? horizontalOriginX + damperNode.xMm * horizontalScale + Math.max(8, damperNode.effectiveLengthMm * horizontalScale) / 2
    : 205;

  return (
    <svg aria-labelledby="engineering-wall-title engineering-wall-desc" className="configurator-generated-svg configurator-engineering-route-svg" role="img" viewBox="0 0 680 800">
      <title id="engineering-wall-title">Расчётная схема наружного дымохода через стену</title>
      <desc id="engineering-wall-desc">{`Единая векторная трасса от заднего патрубка отопителя через стену к наружному тройнику и вертикальной сэндвич-колонне. Горизонтальный участок ${scene.horizontalRunMm} мм содержит ${horizontalPipeCount} труб; наружная вертикаль ${scene.verticalHeightMm} мм содержит ${verticalPipeNodes.length} труб.`}</desc>
      <defs>
        <linearGradient id="scene-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#647176" />
          <stop offset="0.25" stopColor="#dce2e3" />
          <stop offset="0.5" stopColor="#f8faf9" />
          <stop offset="0.78" stopColor="#aab4b7" />
          <stop offset="1" stopColor="#536066" />
        </linearGradient>
        <marker id="scene-arrow" markerHeight="7" markerWidth="7" orient="auto-start-reverse" refX="5" refY="3.5" viewBox="0 0 7 7">
          <path d="M1 1 L6 3.5 L1 6" fill="none" stroke="#587079" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <rect fill="#fff" height="800" rx="20" width="680" />
      <text fill="#173d4c" fontSize="24" fontWeight="800" x="28" y="38">Дымоход через стену</text>
      <text fill="#53656d" fontSize="13" x="28" y="60">Прямой задний выход · единая расчётная SVG-схема</text>

      <g data-scene="continuous-wall-route">
        <path d={`M28 690 H${wallX} V116 H28 Z`} fill="#f5ecdf" stroke="#c3ab8d" strokeWidth="1.5" />
        <rect fill="#d8b98d" height="574" stroke="#8e7555" strokeWidth="2" width={wallWidth} x={wallX} y="116" />
        <line stroke="#8e7555" strokeWidth="3" x1={wallX + wallWidth} x2={wallX + wallWidth} y1="116" y2="690" />
        <text fill="#6e5b43" fontSize="12" fontWeight="800" textAnchor="middle" transform={`rotate(-90 ${wallX + wallWidth / 2} 300)`} x={wallX + wallWidth / 2} y="300">СТЕНА</text>

        <g aria-label="Отопитель с задним патрубком">
          <rect fill="#263136" height="126" rx="8" stroke="#111719" strokeWidth="3" width="92" x="40" y={horizontalAxisY - 63} />
          <rect fill="#101719" height="58" rx="4" stroke="#637178" width="58" x="57" y={horizontalAxisY - 30} />
          <path d={`M68 ${horizontalAxisY + 17} L76 ${horizontalAxisY - 16} L86 ${horizontalAxisY + 6} L96 ${horizontalAxisY - 11} L104 ${horizontalAxisY + 17} Z`} fill="#e25b32" />
          <circle cx="116" cy={horizontalAxisY} fill="#c7d0d2" r="14" stroke="#26343d" strokeWidth="2" />
          <text fill="#173d4c" fontSize="13" fontWeight="800" textAnchor="middle" x="86" y={horizontalAxisY + 86}>ОТОПИТЕЛЬ</text>
        </g>

        <g aria-label="Защищённый проход стены без стыка">
          {passageNodes.map((node, index) => (
            <g data-catalog-asset={node.visualAsset} data-product-id={node.productId} key={node.id}>
              {node.geometryFamily === "wall_passage" ? (
                <rect fill="#e8f2f5" fillOpacity="0.72" height="78" stroke="#24779d" strokeDasharray="7 4" strokeWidth="2.5" width={wallWidth + 18} x={wallX - 9} y={horizontalAxisY - 39} />
              ) : (
                <rect fill="none" height={58 + index * 3} opacity="0.75" stroke="#6a8795" strokeWidth="1.5" width={Math.max(12, wallWidth - index * 3)} x={wallX + index * 1.5} y={horizontalAxisY - 29 - index * 1.5} />
              )}
            </g>
          ))}
        </g>

        <g aria-label="Непрерывный маршрут из scene graph">
          {horizontalNodes.map((node) => <EngineeringSceneProduct key={node.id} node={node} originX={horizontalOriginX} originY={horizontalAxisY} scale={horizontalScale} />)}
          {teeNode ? <EngineeringSceneProduct node={teeNode} originX={horizontalOriginX} originY={horizontalAxisY} scale={horizontalScale} /> : null}
          {verticalNodes.map((node) => (
            <EngineeringSceneProduct
              key={`vertical-${node.id}`}
              node={node}
              originX={verticalAxisX}
              originY={verticalOriginY}
              projectedX={verticalAxisX}
              projectedY={node.geometryFamily === "support_plug"
                ? horizontalAxisY + 72
                : node.geometryFamily === "support_console"
                  ? horizontalAxisY + 126
                  : undefined}
              scale={verticalScale}
            />
          ))}
        </g>

        <g aria-label="Размеры маршрута">
          <path d={`M${horizontalOriginX} 726 H${verticalAxisX}`} fill="none" markerEnd="url(#scene-arrow)" markerStart="url(#scene-arrow)" stroke="#587079" strokeWidth="1.5" />
          <line stroke="#9aabb0" x1={horizontalOriginX} x2={horizontalOriginX} y1={horizontalAxisY + 24} y2="736" />
          <line stroke="#9aabb0" x1={verticalAxisX} x2={verticalAxisX} y1={horizontalAxisY + 50} y2="736" />
          <rect fill="#fff" height="28" rx="7" stroke="#cbd7da" width="118" x={(horizontalOriginX + verticalAxisX) / 2 - 59} y="712" />
          <text fill="#173d4c" fontSize="13" fontWeight="800" textAnchor="middle" x={(horizontalOriginX + verticalAxisX) / 2} y="731">{`${scene.horizontalRunMm} мм`}</text>

          <path d={`M662 ${terminalY} V${horizontalAxisY}`} fill="none" markerEnd="url(#scene-arrow)" markerStart="url(#scene-arrow)" stroke="#587079" strokeWidth="1.5" />
          <line stroke="#9aabb0" x1={verticalAxisX + 22} x2="670" y1={terminalY} y2={terminalY} />
          <line stroke="#9aabb0" x1={verticalAxisX + 22} x2="670" y1={horizontalAxisY} y2={horizontalAxisY} />
          <text fill="#173d4c" fontSize="13" fontWeight="800" textAnchor="middle" transform={`rotate(-90 650 ${(terminalY + horizontalAxisY) / 2})`} x="650" y={(terminalY + horizontalAxisY) / 2 + 4}>{`${scene.verticalHeightMm} мм`}</text>
        </g>

        <EngineeringSceneCallout anchorX={damperX} anchorY={horizontalAxisY - 38} label="Поворотный шибер" value="доступен из помещения" x={40} y={448} />
        <EngineeringSceneCallout anchorX={wallX + wallWidth / 2} anchorY={horizontalAxisY - 42} label="Проход стены" value="одна труба, без стыка" x={245} y={438} />
        <EngineeringSceneCallout anchorX={verticalAxisX} anchorY={horizontalAxisY} label="Тройник 90°" value="наружная точка поворота" x={500} y={526} />
        <EngineeringSceneCallout anchorX={verticalAxisX} anchorY={terminalY} label="Оголовок" x={500} y={82} />
        {facadeSupports.length ? (
          <EngineeringSceneCallout anchorX={verticalAxisX - 24} anchorY={representativeSupportY} label="Крепление к стене" value={`${facadeSupports.length} компл.`} x={40} y={300} />
        ) : null}
        {supportPlugNode ? (
          <EngineeringSceneCallout anchorX={verticalAxisX} anchorY={horizontalAxisY + 72} label="Опорная заглушка" value="только нижняя ветвь" x={500} y={660} />
        ) : null}

        <g aria-label="Состав наружной вертикали">
          <rect fill="#edf3f4" height="64" rx="10" stroke="#cbd7da" width="272" x="40" y="92" />
          <text fill="#173d4c" fontSize="13" fontWeight="800" x="54" y="115">Сэндвич-трубы · {verticalPipeNodes.length} шт.</text>
          <text fill="#53656d" fontSize="11.5" x="54" y="138">{pipeSummary || "Длины отсутствуют в BOM"}</text>
        </g>
      </g>

      <text fill="#53656d" fontSize="11.5" x="28" y="780">Геометрия построена по замерам; горизонталь и вертикаль имеют независимый масштаб.</text>
    </svg>
  );
}

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
    draft.route === "ceiling" && draft.ridgeHorizontalDistance ? `От оси дымохода до конька: ${draft.ridgeHorizontalDistance} мм` : "",
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

export function GeneratedChimneyScheme({
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
  const actualTerminationMm = variant?.coveredEndMm ?? calculation.routeTargetMm;
  const maximumMm = Math.max(
    calculation.routeTargetMm,
    actualTerminationMm,
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
        {wall ? (
          <g aria-hidden="true">
            <path
              d={`M${horizontalX(wall.startMm)} ${horizontalY - 29} L${horizontalX(wall.startMm) - 18} ${horizontalY - 12} L${horizontalX(wall.startMm) - 18} ${horizontalY + 12} L${horizontalX(wall.startMm)} ${horizontalY + 29} Z`}
              className="scheme-wall-decorative-skirt"
            />
            <path
              d={`M${horizontalX(wall.endMm)} ${horizontalY - 29} L${horizontalX(wall.endMm) + 18} ${horizontalY - 12} L${horizontalX(wall.endMm) + 18} ${horizontalY + 12} L${horizontalX(wall.endMm)} ${horizontalY + 29} Z`}
              className="scheme-wall-decorative-skirt"
            />
          </g>
        ) : null}
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
  const singleWallDiameterMm = calculation.diameterMm ?? 0;
  const sandwichOuterDiameterMm = singleWallDiameterMm + 100;
  const singleWallWidthPx = singleWallDiameterMm * millimetersToPixels;
  const sandwichWidthPx = sandwichOuterDiameterMm * millimetersToPixels;
  const singleWallHalfWidthPx = singleWallWidthPx / 2;
  const sandwichHalfWidthPx = sandwichWidthPx / 2;
  const jointZoneY = (jointMm: number) => verticalY(jointMm + PIPE_SOCKET_OVERLAP_MM / 2);
  const jointZoneHeight = (jointMm: number) => (
    verticalY(jointMm - PIPE_SOCKET_OVERLAP_MM / 2) - verticalY(jointMm + PIPE_SOCKET_OVERLAP_MM / 2)
  );
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
  const ridgePeakY = calculation.ridgeHeightMm
    ? verticalY(calculation.ridgeHeightMm)
    : Math.max(topY + 18, roofSurfaceYAt(ridgeX, roofInnerAtChimneyY));
  const rightRoofEndX = 310;
  const rightRoofInnerEndY = ridgePeakY + roofSlope * (rightRoofEndX - ridgeX);
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
  const rightRoofReferencePath = `M${ridgeX} ${ridgePeakY} L${rightRoofEndX} ${rightRoofInnerEndY}`;
  const upkHalfWidth = 34;
  const upkLeftBaseY = roofSurfaceYAt(chimneyX - upkHalfWidth, roofOuterAtChimneyY);
  const upkRightBaseY = roofSurfaceYAt(chimneyX + upkHalfWidth, roofOuterAtChimneyY);
  const upkTopY = Math.min(upkLeftBaseY, upkRightBaseY) - 42;
  const skirtHalfWidth = 28;
  const roofInteriorFlangeHalfWidth = Math.max(44, sandwichHalfWidthPx + 18);
  const skirtLeftBaseY = roofSurfaceYAt(chimneyX - skirtHalfWidth, roofInnerAtChimneyY);
  const skirtRightBaseY = roofSurfaceYAt(chimneyX + skirtHalfWidth, roofInnerAtChimneyY);
  const skirtNeckY = Math.max(skirtLeftBaseY, skirtRightBaseY) + 18;
  const minimumTerminationY = verticalY(calculation.routeTargetMm);
  const terminationY = verticalY(actualTerminationMm);
  const tenDegreeLineYAtChimney = calculation.tenDegreeLineHeightAtChimneyMm === null
    ? null
    : verticalY(calculation.tenDegreeLineHeightAtChimneyMm);
  const actualTerminationToRidgeDeltaMm = calculation.ridgeHeightMm === null
    ? null
    : Math.round(actualTerminationMm - calculation.ridgeHeightMm);
  const ridgeDimensionMm = calculation.ridgeHeightMm ?? calculation.routeTargetMm;
  const ridgeDimensionY = verticalY(ridgeDimensionMm);
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
      anchorY: Math.max(36, terminationY - 22),
      label: "Оголовок",
      detail: actualTerminationToRidgeDeltaMm === null
        ? "Завершение трассы"
        : `${actualTerminationMm} мм · ${actualTerminationToRidgeDeltaMm >= 0 ? "+" : ""}${actualTerminationToRidgeDeltaMm} мм к коньку`,
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
      detail: part.id === "rotary_damper"
        ? `${part.effectiveMm} мм полезная · порт учтён`
        : `${part.nominalLengthMm} мм · +${part.effectiveMm} мм`,
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
      <desc id="generated-scheme-description">Вертикальный разрез здания с печью, трубами, проходными зонами, широкими верхними и нижними фланцами перекрытий, внутренним кровельным фланцем, координатами стыков и перечнем узлов. Со стороны холодного чердака декоративная юбка не устанавливается. В проходах показаны зазор до деревянных конструкций и заполнение каменной ватой без неподтверждённого числового размера.</desc>
      <defs>
        <pattern id="building-floor-insulation-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M-2 6 L6 -2 M1 9 L9 1" className="scheme-floor-insulation-hatch" />
        </pattern>
      </defs>
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
        <line x1={ridgeX} y1={ridgePeakY} x2={rightRoofEndX} y2={ridgePeakY} className="scheme-ridge-datum" />
        <text x={ridgeX + 5} y={ridgePeakY - 7} className="scheme-ridge-label">
          {calculation.ridgeHeightMm ? `КОНЁК · ${calculation.ridgeHeightMm} ММ` : "КОНЁК · НУЖЕН ЗАМЕР"}
        </text>
        {calculation.ridgeHorizontalDistanceMm ? (
          <g className="scheme-ridge-distance">
            <line x1={chimneyX} y1={ridgePeakY + 24} x2={ridgeX} y2={ridgePeakY + 24} />
            <line x1={chimneyX} y1={ridgePeakY + 19} x2={chimneyX} y2={ridgePeakY + 29} />
            <line x1={ridgeX} y1={ridgePeakY + 19} x2={ridgeX} y2={ridgePeakY + 29} />
            <text x={(chimneyX + ridgeX) / 2} y={ridgePeakY + 19} textAnchor="middle">
              X = {calculation.ridgeHorizontalDistanceMm} мм
            </text>
          </g>
        ) : null}
        {tenDegreeLineYAtChimney !== null ? (
          <g className="scheme-ten-degree-clearance">
            <line x1={ridgeX} y1={ridgePeakY} x2={chimneyX} y2={tenDegreeLineYAtChimney} />
            <text x={(ridgeX + chimneyX) / 2 + 4} y={(ridgePeakY + tenDegreeLineYAtChimney) / 2 - 5}>10° · линия минимума</text>
          </g>
        ) : null}
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
        const leftWoodInnerX = houseLeft + 56;
        const rightWoodInnerX = houseRight - 56;
        const pipeLeftX = chimneyX - sandwichHalfWidthPx;
        const pipeRightX = chimneyX + sandwichHalfWidthPx;
        return (
          <g key={`${zone.id}-joists`} aria-hidden="true">
            <rect x={houseLeft + 5} y={clampY - 10} width="51" height="20" className="scheme-floor-joist" />
            <rect x={houseRight - 56} y={clampY - 10} width="51" height="20" className="scheme-floor-joist" />
            <rect x={leftWoodInnerX} y={clampY - 10} width={Math.max(0, pipeLeftX - leftWoodInnerX)} height="20" fill="url(#building-floor-insulation-pattern)" className="scheme-floor-insulation" />
            <rect x={pipeRightX} y={clampY - 10} width={Math.max(0, rightWoodInnerX - pipeRightX)} height="20" fill="url(#building-floor-insulation-pattern)" className="scheme-floor-insulation" />
          </g>
        );
      })}

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
          {part.id === "support_cap" ? (
            <path
              d={`M${chimneyX - sandwichHalfWidthPx} ${verticalY(part.endMm)} L${chimneyX + sandwichHalfWidthPx} ${verticalY(part.endMm)} L${chimneyX + singleWallHalfWidthPx} ${verticalY(part.startMm)} L${chimneyX - singleWallHalfWidthPx} ${verticalY(part.startMm)} Z`}
              className="scheme-transition"
            />
          ) : (
            <rect
              x={chimneyX - singleWallHalfWidthPx}
              y={verticalY(part.endMm)}
              width={singleWallWidthPx}
              height={verticalY(part.startMm) - verticalY(part.endMm)}
              className={part.id === "rotary_damper" ? "scheme-rotary-damper" : "scheme-single-pipe"}
            />
          )}
          {part.id === "rotary_damper" ? (
            <>
              <line x1={chimneyX - singleWallHalfWidthPx} y1={(verticalY(part.startMm) + verticalY(part.endMm)) / 2} x2={chimneyX + 24} y2={(verticalY(part.startMm) + verticalY(part.endMm)) / 2} className="scheme-damper-axis" />
              <circle cx={chimneyX + 25} cy={(verticalY(part.startMm) + verticalY(part.endMm)) / 2} r="2.5" className="scheme-damper-handle" />
            </>
          ) : null}
          <rect
            x={chimneyX - (part.id === "support_cap" ? sandwichHalfWidthPx : singleWallHalfWidthPx)}
            y={jointZoneY(part.endMm)}
            width={part.id === "support_cap" ? sandwichWidthPx : singleWallWidthPx}
            height={jointZoneHeight(part.endMm)}
            className="scheme-joint-zone"
          />
        </g>
      ))}

      {pipes.map((pipe, index) => {
        const middleY = (verticalY(pipe.startMm) + verticalY(pipe.endMm)) / 2;
        return (
          <g key={pipe.id}>
            <rect
              x={chimneyX - sandwichHalfWidthPx}
              y={verticalY(pipe.endMm)}
              width={sandwichWidthPx}
              height={verticalY(pipe.startMm) - verticalY(pipe.endMm)}
              className={pipe.zone === "wall_or_ceiling_pass" ? "scheme-sandwich-pipe is-pass" : "scheme-sandwich-pipe"}
            />
            <line x1={chimneyX - sandwichHalfWidthPx} y1={middleY} x2="94" y2={middleY} className="scheme-pipe-leader" />
            <text x="90" y={middleY + 3} textAnchor="end" className="scheme-pipe-label">Т{index + 1} · {pipe.nominalMm}</text>
            <rect
              x={chimneyX - sandwichHalfWidthPx}
              y={jointZoneY(pipe.endMm)}
              width={sandwichWidthPx}
              height={jointZoneHeight(pipe.endMm)}
              className="scheme-joint-zone"
            />
          </g>
        );
      })}

      {floorZones.map((zone) => {
        const upperSurfaceY = verticalY(zone.endMm);
        const lowerSurfaceY = verticalY(zone.startMm);
        const skirtNeckHalfWidth = Math.max(3, sandwichHalfWidthPx);
        const skirtBaseHalfWidth = skirtNeckHalfWidth + 7;
        const passageOpeningHalfWidth = skirtBaseHalfWidth + 4;
        const finishFlangeHalfWidth = passageOpeningHalfWidth + 10;
        const atticSide = calculation.hasAttic && zone.id === upperFloorZone?.id;
        return (
          <g key={`${zone.id}-passage-finishes`} aria-hidden="true">
            <g className="scheme-floor-finish-flanges">
              <rect x={chimneyX - finishFlangeHalfWidth} y={upperSurfaceY - 3} width={finishFlangeHalfWidth * 2} height="6" rx="1" />
              <rect x={chimneyX - finishFlangeHalfWidth} y={lowerSurfaceY - 3} width={finishFlangeHalfWidth * 2} height="6" rx="1" />
            </g>
            <g className="scheme-floor-decorative-skirts">
              {!atticSide ? <path d={`M${chimneyX - skirtBaseHalfWidth} ${upperSurfaceY - 3} L${chimneyX - skirtNeckHalfWidth} ${upperSurfaceY - 11} L${chimneyX + skirtNeckHalfWidth} ${upperSurfaceY - 11} L${chimneyX + skirtBaseHalfWidth} ${upperSurfaceY - 3} Z`} /> : null}
              <path d={`M${chimneyX - skirtBaseHalfWidth} ${lowerSurfaceY + 3} L${chimneyX - skirtNeckHalfWidth} ${lowerSurfaceY + 11} L${chimneyX + skirtNeckHalfWidth} ${lowerSurfaceY + 11} L${chimneyX + skirtBaseHalfWidth} ${lowerSurfaceY + 3} Z`} />
            </g>
          </g>
        );
      })}

      {floorZones.map((zone) => {
        const clampY = verticalY((zone.startMm + zone.endMm) / 2);
        const clampBodyHalfWidth = 25;
        const clampMountHalfWidth = 42;
        const clampEarWidth = clampMountHalfWidth - clampBodyHalfWidth;
        return (
          <g key={`${zone.id}-clamp`} className="scheme-floor-clamp" aria-hidden="true">
            <rect x={chimneyX - clampMountHalfWidth} y={clampY - 4} width={clampEarWidth} height="8" className="scheme-clamp-ear" />
            <rect x={chimneyX + clampBodyHalfWidth} y={clampY - 4} width={clampEarWidth} height="8" className="scheme-clamp-ear" />
            <rect x={chimneyX - clampBodyHalfWidth} y={clampY - 7} width={clampBodyHalfWidth * 2} height="14" className="scheme-clamp-body" />
            <circle cx={chimneyX - clampMountHalfWidth + 5} cy={clampY} r="2" className="scheme-clamp-bolt" />
            <circle cx={chimneyX + clampMountHalfWidth - 5} cy={clampY} r="2" className="scheme-clamp-bolt" />
          </g>
        );
      })}

      <g className={roofGeometryMeasured ? "scheme-roof-node" : "scheme-roof-node is-placeholder"} aria-hidden="true">
        <rect
          x={chimneyX - roofInteriorFlangeHalfWidth}
          y={roofInnerAtChimneyY - 3}
          width={roofInteriorFlangeHalfWidth * 2}
          height="6"
          className="scheme-roof-inner-flange"
          transform={`rotate(${-drawnRoofAngleDeg} ${chimneyX} ${roofInnerAtChimneyY})`}
        />
        {roofType === "flat" ? (
          <path
            d={`M${chimneyX - skirtHalfWidth} ${skirtLeftBaseY} L${chimneyX - sandwichHalfWidthPx} ${skirtNeckY} L${chimneyX + sandwichHalfWidthPx} ${skirtNeckY} L${chimneyX + skirtHalfWidth} ${skirtRightBaseY} Z`}
            className="scheme-roof-skirt is-optional"
          />
        ) : null}
      </g>

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
          d={`M${chimneyX - upkHalfWidth} ${upkLeftBaseY} C${chimneyX - 25} ${upkLeftBaseY - 8} ${chimneyX - sandwichHalfWidthPx} ${upkTopY + 15} ${chimneyX - sandwichHalfWidthPx} ${upkTopY} L${chimneyX + sandwichHalfWidthPx} ${upkTopY} C${chimneyX + sandwichHalfWidthPx} ${upkTopY + 15} ${chimneyX + 25} ${upkRightBaseY - 8} ${chimneyX + upkHalfWidth} ${upkRightBaseY} Z`}
          className="scheme-roof-upk-collar"
        />
      </g>

      <line x1={chimneyX - 34} y1={minimumTerminationY} x2={chimneyX + 34} y2={minimumTerminationY} className="scheme-target-line" />
      <g className="scheme-termination" aria-hidden="true">
        <rect x={chimneyX - 10} y={terminationY - 10} width="20" height="10" />
        <path d={`M${chimneyX - 10} ${terminationY - 10} L${chimneyX - 16} ${terminationY - 22} L${chimneyX + 16} ${terminationY - 22} L${chimneyX + 10} ${terminationY - 10} Z`} />
        <rect x={chimneyX - 17} y={terminationY - 27} width="34" height="6" rx="1" />
        <rect x={chimneyX - 14} y={terminationY - 40} width="28" height="13" rx="2" />
        <path d={`M${chimneyX - 17} ${terminationY - 40} Q${chimneyX} ${terminationY - 47} ${chimneyX + 17} ${terminationY - 40} L${chimneyX + 14} ${terminationY - 37} L${chimneyX - 14} ${terminationY - 37} Z`} />
      </g>

      <line x1="18" y1={floorY} x2="18" y2={ridgeDimensionY} className="scheme-dimension" />
      <line x1="13" y1={floorY} x2="23" y2={floorY} className="scheme-dimension" />
      <line x1="13" y1={ridgeDimensionY} x2="23" y2={ridgeDimensionY} className="scheme-dimension" />
      <text
        x="10"
        y={(floorY + ridgeDimensionY) / 2}
        transform={`rotate(-90 10 ${(floorY + ridgeDimensionY) / 2})`}
        textAnchor="middle"
        className="scheme-dimension-label"
      >{calculation.ridgeHeightMm ? `${ridgeDimensionMm} мм до внутренней грани конька` : `${ridgeDimensionMm} мм от чистого пола`}</text>

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
      <g transform="translate(38 732)">
        <rect x="0" y="-5" width="8" height="8" fill="url(#building-floor-insulation-pattern)" className="scheme-floor-insulation" />
        <text x="14" y="2" className="scheme-legend">зазор до древесины · каменная вата · размер требует подтверждения</text>
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
  const detailRoofSectionPath = (startX: number, endX: number) => (
    `M${startX} ${detailRoofYAt(startX, roofOuterAtPipeY)} `
    + `L${endX} ${detailRoofYAt(endX, roofOuterAtPipeY)} `
    + `L${endX} ${detailRoofYAt(endX, roofInnerAtPipeY)} `
    + `L${startX} ${detailRoofYAt(startX, roofInnerAtPipeY)} Z`
  );
  const roofClampY = 116;

  return (
    <section className="configurator-node-details" aria-labelledby="passage-details-title">
      <div className="configurator-node-details-head">
        <span>Узлы вертикальной трассы</span>
        <strong id="passage-details-title">Что войдёт в комплект</strong>
      </div>
      <article className="configurator-node-card">
        <div className="configurator-node-card-title">
          <span>01</span>
          <div>
            <strong>Проход перекрытия</strong>
            <small>{calculation.hasAttic ? "Верхнее перекрытие перед чердаком" : "Повторяется для каждого перекрытия"}</small>
          </div>
        </div>
        <svg viewBox="0 0 380 244" role="img" aria-labelledby="floor-node-title floor-node-description">
          <title id="floor-node-title">Состав узла прохода перекрытия</title>
          <desc id="floor-node-description">Сэндвич-труба проходит через стакан в перекрытии. Отдельные фланцы установлены с обеих сторон. Декоративная юбка устанавливается со стороны помещения, но не со стороны холодного чердака. Внутри показаны симметричный хомут, зазор до деревянных конструкций и зона заполнения каменной ватой.</desc>
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
          <rect x="90" y="78" width="140" height="8" rx="2" className="scheme-node-flange" />
          <rect x="90" y="148" width="140" height="8" rx="2" className="scheme-node-flange" />
          {!calculation.hasAttic ? <path d="M120 78 L145 62 L175 62 L200 78 Z" className="scheme-node-decorative-skirt" /> : null}
          <path d="M120 156 L145 172 L175 172 L200 156 Z" className="scheme-node-decorative-skirt" />
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
          <line x1="145" y1={calculation.hasAttic ? 82 : 66} x2="82" y2="52" className="scheme-node-leader" />
          <text x="16" y="51" className="scheme-node-label">{calculation.hasAttic ? "Чердак: без юбки" : "Юбка сверху"}</text>
          <line x1="145" y1="168" x2="82" y2="178" className="scheme-node-leader" />
          <text x="16" y="181" className="scheme-node-label">Юбка снизу</text>
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
        <svg viewBox="0 0 380 280" role="img" aria-labelledby="roof-node-title roof-node-description">
          <title id="roof-node-title">Состав узла прохода кровли</title>
          <desc id="roof-node-description">Вертикальная сэндвич-труба проходит через кровельный пирог под измеренным углом. Вата показана по обеим сторонам трубы в проёме между стропилами. Хомут в перекрытие установлен ровно поперёк вертикальной трубы, а его боковые ушки закреплены к стропилам. УПК показан снаружи на верхней поверхности, широкий внутренний фланец перекрывает края проёма на нижней поверхности.</desc>
          <defs>
            <pattern id="roof-insulation-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M-2 8 L8 -2 M2 10 L10 2" className="scheme-node-hatch" />
            </pattern>
          </defs>
          <path d={detailRoofCakePath} className="scheme-node-roof-cake" />
          <path d={detailRoofSectionPath(88, 116)} className="scheme-node-rafter" />
          <path d={detailRoofSectionPath(204, 232)} className="scheme-node-rafter" />
          <path d={detailRoofSectionPath(116, 145)} fill="url(#roof-insulation-pattern)" className="scheme-node-roof-insulation" />
          <path d={detailRoofSectionPath(175, 204)} fill="url(#roof-insulation-pattern)" className="scheme-node-roof-insulation" />
          <path d={`M${roofStartX} ${roofOuterStartY} L${roofEndX} ${roofOuterEndY}`} className="scheme-node-roof-surface is-outer" />
          <path d={`M${roofStartX} ${roofInnerStartY} L${roofEndX} ${roofInnerEndY}`} className="scheme-node-roof-surface is-inner" />
          <rect x="145" y="14" width="30" height="202" className="scheme-node-pipe" />
          <g className="scheme-node-roof-clamp" aria-hidden="true">
            <rect x="112" y={roofClampY - 4} width="25" height="8" className="scheme-node-clamp-ear" />
            <rect x="183" y={roofClampY - 4} width="25" height="8" className="scheme-node-clamp-ear" />
            <rect x="137" y={roofClampY - 9} width="46" height="18" className="scheme-node-clamp" />
            <circle cx="119" cy={roofClampY} r="2.5" className="scheme-node-clamp-bolt" />
            <circle cx="201" cy={roofClampY} r="2.5" className="scheme-node-clamp-bolt" />
          </g>
          <rect
            x="108"
            y={roofOuterAtPipeY - 5}
            width="104"
            height="10"
            className="scheme-node-upk"
            transform={`rotate(${-drawnRoofAngleDeg} 160 ${roofOuterAtPipeY})`}
          />
          <path
            d={`M${160 - detailUpkHalfWidth} ${detailUpkLeftBaseY} C132 ${detailUpkLeftBaseY - 8} 145 ${detailUpkTopY + 17} 145 ${detailUpkTopY} L175 ${detailUpkTopY} C175 ${detailUpkTopY + 17} 188 ${detailUpkRightBaseY - 8} ${160 + detailUpkHalfWidth} ${detailUpkRightBaseY} Z`}
            className="scheme-node-upk-collar"
          />
          <rect
            x="98"
            y={roofInnerAtPipeY - 3.5}
            width="124"
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
          <line x1="205" y1={roofOuterAtPipeY - 4} x2="252" y2="78" className="scheme-node-leader" />
          <text x="258" y="81" className="scheme-node-label">УПК по углу</text>
          <line x1="188" y1={detailRoofYAt(188, 116)} x2="252" y2="108" className="scheme-node-leader" />
          <text x="258" y="111" className="scheme-node-label">Вата по бокам</text>
          <line x1="183" y1={roofClampY} x2="252" y2="138" className="scheme-node-leader" />
          <text x="258" y="141" className="scheme-node-label">Хомут в перекрытие</text>
          <line x1="198" y1={roofInnerAtPipeY} x2="252" y2="168" className="scheme-node-leader" />
          <text x="258" y="171" className="scheme-node-label">{roofType === "flat" ? "Внутренний фланец" : "Фланец под углом"}</text>
          {roofType === "flat" ? (
            <>
              <line x1="172" y1={detailSkirtNeckY} x2="252" y2="194" className="scheme-node-leader" />
              <text x="258" y="197" className="scheme-node-label">Юбка (опция)</text>
            </>
          ) : null}
          <line x1="119" y1={roofClampY} x2="54" y2="218" className="scheme-node-leader" />
          <text x="16" y="234" className="scheme-node-label">Ушки закреплены</text>
          <text x="16" y="247" className="scheme-node-label">к стропилам</text>
          <line x1="135" y1={roofInnerAtPipeY + 10} x2="150" y2="230" className="scheme-node-leader" />
          <text x="154" y="247" className="scheme-node-label">Фланец из помещения</text>
          <text x="160" y="272" textAnchor="middle" className="scheme-node-note">
            Кровельный пирог: {roofThicknessMm ? `${roofThicknessMm} мм` : "нужен замер"}
          </text>
        </svg>
      </article>
    </section>
  );
}

export function ChimneyConfigurator({ assetBasePath = "" }: ChimneyConfiguratorProps) {
  const searchParams = useSearchParams();
  const requestedProfileId = searchParams.get("profile") ?? "";
  const [transferredDraft, setTransferredDraft] = useState<ScenarioConfiguratorDraft | null>(null);
  const [calculationProfiles, setCalculationProfiles] = useState<CalculationProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const transferredDetails = useMemo(() => scenarioDraftSummary(transferredDraft), [transferredDraft]);
  const [route, setRoute] = useState<RouteType>("ceiling");
  const [stove, setStove] = useState<StoveType>("bania");
  const [outlet, setOutlet] = useState<OutletType>("vertical");
  const [distanceM, setDistanceM] = useState(1.5);
  const [floors, setFloors] = useState(1);
  const [hasAttic, setHasAttic] = useState(false);
  const [roof, setRoof] = useState<RoofType>("pitched");
  const [heightM, setHeightM] = useState(5);
  const [warmupLengthMm, setWarmupLengthMm] = useState(1000);
  const rotaryDamperHeightMm = ROTARY_DAMPER_EFFECTIVE_LENGTH_MM;
  const [supportCapLengthMm, setSupportCapLengthMm] = useState(70);
  const [passageWoolKits, setPassageWoolKits] = useState(3);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [removedBomKeys, setRemovedBomKeys] = useState<string[]>([]);
  const [stoveModel, setStoveModel] = useState(searchParams.get("stoveModel") ?? "");
  const [catalogMatches, setCatalogMatches] = useState<Record<string, CatalogEstimateMatch>>({});
  const [catalogMatchStatus, setCatalogMatchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "generating" | "error">("idle");

  useEffect(() => {
    try {
      const profiles = readCalculationProfiles(window.localStorage);
      const requestedProfile = requestedProfileId
        ? profiles.find((profile) => profile.id === requestedProfileId)
        : undefined;
      const storedProfileId = window.localStorage.getItem(ACTIVE_CALCULATION_PROFILE_KEY) ?? "";
      const storedProfile = storedProfileId
        ? profiles.find((profile) => profile.id === storedProfileId)
        : undefined;
      const nextProfile = requestedProfile ?? storedProfile;
      setCalculationProfiles(profiles);
      if (nextProfile) {
        setTransferredDraft(nextProfile.draft);
        setActiveProfileId(nextProfile.id);
        saveConfiguratorDraft(window.sessionStorage, nextProfile.draft);
        window.localStorage.setItem(ACTIVE_CALCULATION_PROFILE_KEY, nextProfile.id);
        setProfileNotice(`Открыт замер «${nextProfile.name}».`);
      } else {
        setTransferredDraft(null);
        setActiveProfileId("");
      }
      if (requestedProfileId && !requestedProfile) {
        setProfileNotice("Этот профиль не найден в текущем браузере. Выберите другой профиль или создайте новый.");
      }
    } catch {
      setTransferredDraft(null);
      setProfileNotice("Не удалось прочитать сохранённые замеры на этом устройстве.");
    }
  }, [requestedProfileId]);

  useEffect(() => {
    if (!transferredDraft) return;

    if (transferredDraft.route !== "unknown") {
      setRoute(transferredDraft.route === "wall-direct" ? "wall" : transferredDraft.route);
    }
    if (transferredDraft.outlet) setOutlet(transferredDraft.outlet === "top" ? "vertical" : "horizontal");

    const draftStove = transferredDraft.equipmentType
      || (transferredDraft.scenario === "banya" ? "bania" : "pech");
    setStove(draftStove as StoveType);

    const draftFloors = Number(transferredDraft.levels);
    if (Number.isFinite(draftFloors) && draftFloors >= 1 && draftFloors <= 3) setFloors(draftFloors);
    setHasAttic(Boolean(transferredDraft.hasAttic));
    const draftWarmup = Number(transferredDraft.warmupLength);
    if (Number.isFinite(draftWarmup) && draftWarmup >= 0) setWarmupLengthMm(draftWarmup);
    const draftSupportCap = Number(transferredDraft.supportCapHeight);
    if (Number.isFinite(draftSupportCap) && draftSupportCap >= 0) setSupportCapLengthMm(draftSupportCap);
    const draftPassageWoolKits = Number(transferredDraft.passageWoolKits);
    if (Number.isFinite(draftPassageWoolKits) && draftPassageWoolKits >= 1 && draftPassageWoolKits <= 30) {
      setPassageWoolKits(Math.round(draftPassageWoolKits));
    }

    if (transferredDraft.route !== "ceiling") {
      const draftHeight = Number(transferredDraft.outdoorHeight);
      if (Number.isFinite(draftHeight) && draftHeight >= 1 && draftHeight <= 20) setHeightM(draftHeight);
    }

    const rawDraftDistance = Number(transferredDraft.wallDistance);
    const draftDistance = rawDraftDistance > 20 ? rawDraftDistance / 1000 : rawDraftDistance;
    if (Number.isFinite(draftDistance) && draftDistance >= 0.1 && draftDistance <= 6) setDistanceM(draftDistance);

    if (!searchParams.get("stoveModel")) {
      const connection = [
        transferredDraft.manufacturer.trim(),
        transferredDraft.model.trim(),
        transferredDraft.diameter ? `патрубок ${transferredDraft.diameter} мм` : "",
        transferredDraft.outlet === "rear" && transferredDraft.rearOutletBottomHeight
          ? `нижняя кромка патрубка ${transferredDraft.rearOutletBottomHeight} мм от пола`
          : transferredDraft.connectionHeight ? `верх отопителя ${transferredDraft.connectionHeight} мм от пола` : "",
      ].filter(Boolean);
      if (connection.length) setStoveModel(connection.join(" · "));
    }
  }, [searchParams, transferredDraft]);

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
      routeHeight: transferredDraft.routeHeight,
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
      roofType: roof,
      warmupLengthMm,
      rotaryDamperHeightMm,
      supportCapLengthMm,
      draft: calculationDraft,
    }),
    [calculationDraft, distanceM, floors, heightM, outlet, roof, rotaryDamperHeightMm, route, supportCapLengthMm, warmupLengthMm],
  );
  const roofThicknessMm = calculation.roofThicknessMm;
  const selectedVariant = calculation.variants.find((variant) => variant.id === selectedVariantId)
    ?? calculation.selectedVariant;
  const svgValidationErrors = useMemo(() => {
    const issues = [...calculation.errors];
    if (!selectedVariant) issues.push("Нет проверенной раскладки труб.");
    if (calculation.diameterStatus !== "known") issues.push("Не подтверждён диаметр одностенной трубы.");
    if (calculation.routeKind === "ceiling") {
      if (!calculation.ridgeHeightMm) issues.push("Не указана высота до внутренней нижней грани конька.");
      if (roof === "pitched" && !calculation.ridgeHorizontalDistanceMm) issues.push("Не указано горизонтальное расстояние от оси дымохода до конька.");
      if (!calculation.roofThicknessMm) issues.push("Не указана толщина кровельного пирога.");
      if (roof === "pitched" && calculation.roofAngleDeg === null) issues.push("Не указан угол скатной кровли.");
      if (calculation.floorThicknessesMm.length < calculation.floors) issues.push("Не заполнены толщины всех перекрытий.");
    }
    return [...new Set(issues)];
  }, [calculation, roof, selectedVariant]);
  const completeBom = useMemo(
    () => bomForVariant(calculation, selectedVariant),
    [calculation, selectedVariant],
  );
  const selectedBom = useMemo(
    () => completeBom.filter((line) => !removedBomKeys.includes(line.key)),
    [completeBom, removedBomKeys],
  );
  const catalogLookupSignature = useMemo(() => JSON.stringify(
    selectedBom
      .filter((line) => line.requiresSku)
      .map((line) => [
        line.key,
        line.productKind,
        line.nominalLengthMm ?? null,
        line.contour ?? null,
        line.insulationMm ?? null,
        line.catalogCategorySlug ?? null,
        line.catalogSearch ?? null,
        line.catalogDiameterMode ?? null,
        line.catalogLengthMode ?? null,
        line.materialPreference ?? null,
      ]),
  ), [selectedBom]);
  const rearSceneGraph = useMemo(() => (
    calculation.routeKind === "wall-rear" && catalogMatchStatus === "ready"
      ? buildExternalWallSceneGraph({ calculation, variant: selectedVariant, bom: selectedBom, catalogMatches })
      : null
  ), [calculation, catalogMatchStatus, catalogMatches, selectedBom, selectedVariant]);
  const diagramValidationErrors = useMemo(() => {
    const issues = [...svgValidationErrors];
    if (calculation.routeKind === "wall-rear") {
      if (catalogMatchStatus === "error") issues.push("Не удалось получить каталожные изделия для построения схемы.");
      if (catalogMatchStatus === "ready") issues.push(...(rearSceneGraph?.errors ?? ["Scene graph не сформирован."]));
    }
    return [...new Set(issues)];
  }, [calculation.routeKind, catalogMatchStatus, rearSceneGraph, svgValidationErrors]);
  const removedBom = useMemo(
    () => completeBom.filter((line) => line.removable && removedBomKeys.includes(line.key)),
    [completeBom, removedBomKeys],
  );
  const selectedPipeQuantity = selectedVariant?.pipes.length ?? 0;
  const selectedHorizontalPipeQuantity = selectedVariant?.pipes.filter((pipe) => pipe.axis === "horizontal").length ?? 0;
  const selectedVerticalPipeQuantity = selectedVariant?.pipes.filter((pipe) => pipe.axis === "vertical").length ?? 0;
  const selectedCoveredMm = selectedVariant
    ? selectedVariant.pipes.reduce((sum, pipe) => sum + pipe.effectiveMm, 0)
    : 0;
  const selectedTerminationMm = selectedVariant?.coveredEndMm ?? calculation.routeTargetMm;
  useEffect(() => {
    const diameter = calculation.diameterMm;
    if (!diameter || calculation.diameterStatus !== "known") {
      setCatalogMatches({});
      setCatalogMatchStatus("idle");
      return;
    }

    const controller = new AbortController();
    const diameterKinds = new Set(["труба", "отвод", "тройник", "заглушка", "оголовок", "шибер", "декоративная_юбка"]);
    setCatalogMatchStatus("loading");
    Promise.all(selectedBom.filter((line) => line.requiresSku).map(async (line) => {
      const params = new URLSearchParams({ limit: "24", offset: "0", product_kind: line.productKind });
      if (line.catalogCategorySlug) params.set("category", line.catalogCategorySlug);
      if (line.catalogSearch) params.set("q", line.catalogSearch);
      const exactDiameter = diameterKinds.has(line.productKind);
      const exactBySandwichOuterDiameter = line.catalogDiameterMode === "sandwich-outer-exact";
      const rangeBySandwichOuterDiameter = line.catalogDiameterMode === "sandwich-outer-range";
      const exactByFields = exactDiameter || exactBySandwichOuterDiameter || rangeBySandwichOuterDiameter;
      if (exactDiameter) {
        const outerDiameter = line.insulationMm !== undefined
          ? diameter + line.insulationMm * 2
          : null;
        params.set("diameter", exactBySandwichOuterDiameter
          ? `${diameter + 100}:`
          : `${diameter}:${outerDiameter ?? ""}`);
      }
      if (rangeBySandwichOuterDiameter) {
        params.set("preferred_diameter", `:${diameter + 100}`);
      }
      if (line.materialPreference === "stainless-standard") {
        params.set("preferred_material", "stainless");
        params.set("preferred_steel_grade", "AISI 304");
        if (line.contour === "сэндвич") {
          params.set("preferred_outer_material", "stainless");
          params.set("preferred_outer_steel_grade", "AISI 304");
        }
      }
      if (line.nominalLengthMm) params.set("length_mm", String(line.nominalLengthMm));
      if (line.contour) params.set("contour", line.contour);
      if (line.insulationMm !== undefined) params.set("insulation_mm", String(line.insulationMm));
      if (line.productKind === "отвод" || line.productKind === "тройник") params.set("angle_deg", "90");
      const fetchProducts = async (requestParams: URLSearchParams) => {
        const response = await fetch(`${assetBasePath}/api/v1/products?${requestParams.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error("catalog request failed");
        return response.json() as Promise<ProductListResponse>;
      };
      const payload = await fetchProducts(params);
      if (payload.items[0]) {
        return [line.key, {
          item: payload.items[0],
          exactByFields,
          lengthMatch: line.nominalLengthMm ? "exact" as const : undefined,
          requestedLengthMm: line.nominalLengthMm,
        }] as const;
      }
      if (line.catalogLengthMode !== "nearest" || !line.nominalLengthMm) return null;

      const nearestParams = new URLSearchParams(params);
      nearestParams.delete("length_mm");
      nearestParams.set("preferred_length_mm", String(line.nominalLengthMm));
      const nearestPayload = await fetchProducts(nearestParams);
      const nearestItem = nearestPayload.items
        .filter((item) => item.length_mm !== null)
        .sort((left, right) => (
          Math.abs((left.length_mm ?? 0) - line.nominalLengthMm!)
          - Math.abs((right.length_mm ?? 0) - line.nominalLengthMm!)
          || (left.length_mm ?? 0) - (right.length_mm ?? 0)
          || (left.article ?? "").localeCompare(right.article ?? "", "ru")
        ))[0];
      return nearestItem ? [line.key, {
        item: nearestItem,
        exactByFields,
        lengthMatch: "nearest" as const,
        requestedLengthMm: line.nominalLengthMm,
      }] as const : null;
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
  // Quantity changes do not alter a catalog SKU. Keep the existing matches and
  // refetch only when fields that participate in catalog lookup have changed.
  }, [assetBasePath, calculation.diameterMm, calculation.diameterStatus, catalogLookupSignature]);

  const totalQty = selectedBom.reduce((sum, item) => sum + item.quantity, 0);
  const stoveLabel = STOVE_OPTIONS.find((option) => option.id === stove)?.label ?? "Источник";
  const sceneTitle = route === "ceiling"
    ? "Схема: через перекрытие и кровлю"
    : calculation.routeKind === "wall-rear"
      ? "Схема: горизонтально через стену"
      : "Схема: наружный монтаж по стене";
  const activeProfile = calculationProfiles.find((profile) => profile.id === activeProfileId);
  const measurementsHref = activeProfile
    ? calculationProfileMeasurementsHref(activeProfile.id)
    : "/zamery?edit=1";
  const estimateMeasurements = useMemo<EstimateMeasurement[]>(() => {
    const base: EstimateMeasurement[] = [
      { label: "Маршрут", value: route === "ceiling" ? "Через дом, перекрытия и кровлю" : "Через стену, наружный монтаж" },
      { label: "Источник тепла", value: stoveLabel },
      { label: "Модель / патрубок", value: stoveModel.trim() || "не указаны" },
      { label: "Диаметр дымового канала", value: calculation.diameterMm === null ? "требует уточнения" : `Ø ${calculation.diameterMm} мм` },
      { label: "Расчётная отметка устья", value: `${calculation.routeTargetMm} мм` },
      { label: "Фактическая отметка выбранной раскладки", value: `${selectedTerminationMm} мм` },
      { label: "Раскладка труб", value: selectedVariant?.label ?? "не найдена" },
      { label: "Запас раскладки", value: `${selectedVariant?.reserveMm ?? 0} мм` },
    ];
    if (route === "ceiling") {
      base.push(
        { label: "Этажность", value: String(floors) },
        { label: "Тип кровли", value: roof === "pitched" ? "скатная" : "плоская" },
        { label: "Угол кровли", value: calculation.roofAngleDeg === null ? "требует уточнения" : `${calculation.roofAngleDeg}°` },
        { label: "Кровельный пирог", value: calculation.roofThicknessMm === null ? "требует уточнения" : `${calculation.roofThicknessMm} мм` },
        { label: "Высота до конька", value: calculation.ridgeHeightMm === null ? "требует уточнения" : `${calculation.ridgeHeightMm} мм` },
        { label: "Ось трубы от конька", value: calculation.ridgeHorizontalDistanceMm === null ? "требует уточнения" : `${calculation.ridgeHorizontalDistanceMm} мм` },
        { label: "Толщины перекрытий", value: calculation.floorThicknessesMm.length ? `${calculation.floorThicknessesMm.join(" / ")} мм` : "требуют уточнения" },
      );
    } else {
      base.push(
        { label: "Выход отопителя", value: outlet === "vertical" ? "вертикальный" : "горизонтальный" },
        { label: "Удалённость от стены", value: `${distanceM.toFixed(1)} м` },
        { label: "Высота наружного участка", value: `${heightM.toFixed(1)} м` },
      );
    }
    const existingLabels = new Set(base.map((item) => item.label));
    transferredDetails.forEach((detail) => {
      const separator = detail.indexOf(":");
      const label = separator > 0 ? detail.slice(0, separator).trim() : "Дополнительные данные";
      const value = separator > 0 ? detail.slice(separator + 1).trim() : detail;
      if (!existingLabels.has(label)) {
        base.push({ label, value });
        existingLabels.add(label);
      }
    });
    return base;
  }, [calculation, distanceM, floors, heightM, outlet, roof, route, selectedTerminationMm, selectedVariant, stoveLabel, stoveModel, transferredDetails]);
  const estimate = useMemo(() => buildChimneyEstimate({
    selectedBom,
    matches: catalogMatches,
    measurements: estimateMeasurements,
    profileName: activeProfile?.name ?? "Текущий несохранённый расчёт",
    removedLabels: removedBom.map((line) => line.label),
    reviewItems: calculation.reviewItems,
    calculationErrors: calculation.errors,
  }), [activeProfile?.name, calculation.errors, calculation.reviewItems, catalogMatches, estimateMeasurements, removedBom, selectedBom]);

  const loadCalculationProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    if (!profileId) {
      setTransferredDraft(null);
      setProfileNotice("Выберите сохранённый замер или создайте новый.");
      try {
        window.localStorage.removeItem(ACTIVE_CALCULATION_PROFILE_KEY);
      } catch {
        // The empty state still works when browser storage is unavailable.
      }
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
      window.localStorage.setItem(ACTIVE_CALCULATION_PROFILE_KEY, profile.id);
    } catch {
      // The loaded values still remain available for the current render.
    }
    setProfileNotice(`Открыт замер «${profile.name}».`);
  };
  async function savePdf() {
    if (pdfStatus === "generating") return;
    setPdfStatus("generating");
    try {
      await downloadChimneyEstimatePdf({ ...estimate, generatedAt: new Date() });
      setPdfStatus("idle");
    } catch {
      setPdfStatus("error");
    }
  }

  return (
    <div className="chimney-configurator" aria-label="Результат расчёта дымохода по сохранённым замерам">
      <div className="configurator-header">
        <div>
          <h3>{activeProfile ? activeProfile.name : "Расчёт дымохода по сохранённым замерам"}</h3>
          <p>
            Выберите замер, чтобы открыть рассчитанную схему, состав комплекта и PDF-смету.
            Изменение размеров выполняется на отдельной странице замеров.
          </p>
        </div>
        {activeProfile ? (
          <div className="configurator-count" aria-live="polite">
            <strong>{totalQty}</strong>
            <span>деталей в комплекте</span>
          </div>
        ) : null}
      </div>

      <div className="configurator-profile-bar">
        <label className="configurator-profile-select">
          <span>Замеры объекта</span>
          <select value={activeProfileId} onChange={(event) => loadCalculationProfile(event.target.value)}>
            <option value="">Выберите сохранённый замер</option>
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
              ? "Выберите объект — результат откроется без дополнительных полей."
              : "На этом устройстве пока нет сохранённых замеров.")}
          </p>
          <div className="configurator-profile-actions">
            {activeProfile ? <Link href={measurementsHref}>Изменить замеры</Link> : null}
            <Link className="is-primary" href="/zamery?edit=1">
              <Plus aria-hidden size={16} /> Новый замер
            </Link>
          </div>
        </div>
      </div>

      {!activeProfile ? (
        <div className="configurator-empty-state">
          <strong>{calculationProfiles.length ? "Выберите сохранённый замер" : "Сначала сделайте замеры объекта"}</strong>
          <p>
            {calculationProfiles.length
              ? "После выбора здесь появятся схема дымохода, BOM с ценами и кнопка скачивания PDF."
              : "Заполните размеры на странице замеров и сохраните профиль. Затем схема, комплект и смета появятся здесь автоматически."}
          </p>
          <Link href="/zamery?edit=1">
            <Plus aria-hidden size={17} /> Сделать новый замер
          </Link>
        </div>
      ) : (
      <>
      <div className="configurator-body is-results-only">
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
                  <span className="configurator-label">Одноконтурная труба, мм</span>
                  <input
                    inputMode="numeric"
                    min="0"
                    onChange={(event) => setWarmupLengthMm(Math.max(0, Number(event.target.value) || 0))}
                    type="number"
                    value={warmupLengthMm}
                  />
                </label>
                <label className="configurator-text-field">
                  <span className="configurator-label">Полезная длина поворотного шибера, мм</span>
                  <input
                    aria-readonly="true"
                    readOnly
                    type="number"
                    value={rotaryDamperHeightMm}
                  />
                  <small>Фиксировано: 130 мм уже с вставленным портом. Дополнительные 50 мм не прибавляются.</small>
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

          {route === "wall" ? (
            <div className="configurator-field">
              <div className="configurator-label">
                Высота наружного участка: {heightM.toFixed(1)} м
              </div>
              <input
                aria-label="Высота наружного участка дымохода"
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
          ) : (
            <div className="configurator-note">
              <strong>Высота вертикального дымохода рассчитывается автоматически</strong>
              <span>
                По положению относительно кровли: {calculation.roofTerminationRequirementMm ?? "нужны замеры"} мм.
                Итоговая минимальная отметка устья: {calculation.routeTargetMm} мм от чистого пола
                {calculation.roofTerminationRequirementMm === null ? "." : " — определяет положение относительно кровли."}
              </span>
            </div>
          )}

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
            <strong>
              {calculation.status === "invalid"
                ? "Есть конфликт"
                : calculation.routeKind === "wall-rear"
                  ? `Горизонталь ${selectedHorizontalPipeQuantity} · вертикаль ${selectedVerticalPipeQuantity}`
                  : `${selectedPipeQuantity} труб`}
            </strong>
          </div>
          <div className="configurator-svg-wrap">
            {diagramValidationErrors.length ? (
              <div className="configurator-svg-validation" role="alert">
                <strong>Инженерная схема не сформирована</strong>
                <span>Детерминированная проверка остановила рендер:</span>
                <ul>
                  {diagramValidationErrors.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              </div>
            ) : calculation.routeKind === "wall-rear" && catalogMatchStatus !== "ready" ? (
              <div className="configurator-svg-validation" role="status">
                <strong>Собираем расчётную сцену</strong>
                <span>Проверяем BOM и привязываем каждую отображаемую деталь к каталогу.</span>
              </div>
            ) : calculation.routeKind === "wall-rear" ? (
              <div className="configurator-wall-route-scheme">
                <DynamicWallTopScheme outlet="rear" variant={selectedVariant} />
              </div>
            ) : calculation.routeKind === "wall-top" ? (
              <div className="configurator-wall-route-scheme">
                <DynamicWallTopScheme variant={selectedVariant} />
              </div>
            ) : (
              <GeneratedChimneyScheme
                calculation={calculation}
                roofThicknessMm={roofThicknessMm}
                roofType={roof}
                variant={selectedVariant}
              />
            )}
          </div>
          {rearSceneGraph && !rearSceneGraph.errors.length ? (
            <details className="configurator-note">
              <summary><strong>Промежуточный инженерный расчёт</strong></summary>
              <p>
                Система координат: патрубок X=0, ось тройника X={rearSceneGraph.horizontalRunMm} мм,
                стена X={rearSceneGraph.wallPassage.startMm}–{rearSceneGraph.wallPassage.endMm} мм,
                оголовок Y={rearSceneGraph.verticalHeightMm} мм.
              </p>
              <ol>
                {rearSceneGraph.nodes.map((node) => (
                  <li key={`calculation-${node.id}`}>
                    {node.variant}{node.sku ? ` · SKU ${node.sku}` : ""}: X={node.xMm} мм, Y={node.yMm} мм; ветвь {node.branch};
                    положение получено из расчёта и строки BOM «{node.bomKey}».
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
          {calculation.routeKind === "ceiling" && !diagramValidationErrors.length ? (
            <VerticalPassageDetails
              calculation={calculation}
              roofType={roof}
            />
          ) : null}
          <div className="configurator-height-badge">
            Минимум {calculation.routeTargetMm} мм · фактическое устье {selectedTerminationMm} мм
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
              const estimateLine = estimate.lines.find((line) => line.key === part.key);
              const materialLabel = catalogMatch ? catalogMaterialLabel(catalogMatch.item) : null;
              const catalogProductImage = catalogMatch?.item.primary_image
                ? {
                  src: catalogMediaUrl(catalogMatch.item.primary_image.thumbnail_url ?? catalogMatch.item.primary_image.url, assetBasePath),
                  alt: catalogMatch.item.primary_image.alt ?? "",
                  width: catalogMatch.item.primary_image.width ?? undefined,
                  height: catalogMatch.item.primary_image.height ?? undefined,
                }
                : null;
              const productImage = catalogProductImage;
              const nearestLengthLabel = catalogMatch?.lengthMatch === "nearest" && catalogMatch.item.length_mm !== null
                ? `Одностенная труба-разгон ${catalogMatch.item.length_mm} мм`
                : part.label;
              return (
                <div key={part.key} className="configurator-spec-row">
                  <div
                    className="configurator-spec-media"
                    aria-hidden={!productImage}
                  >
                    {productImage ? (
                      <img
                        src={productImage.src}
                        alt={productImage.alt}
                        width={productImage.width}
                        height={productImage.height}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <PackageCheck aria-hidden size={20} />
                    )}
                  </div>
                  <div>
                    <strong>{nearestLengthLabel}</strong>
                    <small>{part.selectionReason}</small>
                    {catalogMatch?.lengthMatch === "nearest" ? (
                      <small>Ближайшая стандартная длина к расчётным {catalogMatch.requestedLengthMm} мм; разницу нужно учесть при проверке итоговой высоты.</small>
                    ) : null}
                    {part.quantityNote ? <small>{part.quantityNote}</small> : null}
                    {catalogMatch ? (
                      <>
                        <span className="configurator-spec-parameters">
                          {catalogMatch.item.diameter_mm !== null ? `Ø ${catalogMatch.item.diameter_mm}${catalogMatch.item.outer_diameter_mm !== null ? `/${catalogMatch.item.outer_diameter_mm}` : ""} мм` : null}
                          {catalogMatch.item.length_mm !== null ? ` · L ${catalogMatch.item.length_mm} мм` : null}
                          {catalogMatch.item.insulation_mm !== null ? ` · изоляция ${catalogMatch.item.insulation_mm} мм` : null}
                          {materialLabel ? ` · ${materialLabel}` : null}
                          {` · ${formatCatalogPrice(catalogMatch.item.price_rub)}`}
                        </span>
                        <Link className="configurator-spec-sku" href={productSelectionPath(catalogMatch.item.slug, catalogMatch.item, catalogMatch.item.selected_sku)}>
                          {catalogMatch.item.article || catalogMatch.item.name}
                          {catalogMatch.lengthMatch === "nearest"
                            ? ` · ближайшая длина к ${catalogMatch.requestedLengthMm} мм`
                            : !catalogMatch.exactByFields ? " · кандидат по типу, проверить размер" : " · точное исполнение"}
                        </Link>
                      </>
                    ) : null}
                  </div>
                  <div className="configurator-spec-actions">
                    <em>×{part.quantity}</em>
                    <span className="configurator-spec-line-total">
                      {estimateLine?.lineTotalRub === null || estimateLine?.lineTotalRub === undefined
                        ? "по запросу"
                        : formatRub(estimateLine.lineTotalRub)}
                    </span>
                    {part.removable ? (
                      <button
                        aria-label={`Удалить «${part.label}» из комплекта`}
                        className="configurator-spec-remove"
                        onClick={() => setRemovedBomKeys((current) => current.includes(part.key) ? current : [...current, part.key])}
                        type="button"
                      >Удалить</button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {removedBom.length ? (
            <div className="configurator-spec-removed" aria-live="polite">
              <strong>Удалено из комплекта</strong>
              {removedBom.map((part) => (
                <div key={part.key}>
                  <span>{part.label}</span>
                  <button
                    aria-label={`Вернуть «${part.label}» в комплект`}
                    onClick={() => setRemovedBomKeys((current) => current.filter((key) => key !== part.key))}
                    type="button"
                  >Вернуть</button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="configurator-estimate-summary" aria-live="polite">
            <div>
              <span>{estimate.unpricedLineCount ? "Итого по известным ценам" : "Итого по комплекту"}</span>
              <strong>{formatRub(estimate.knownSubtotalRub)}</strong>
              <small>
                {estimate.pricedLineCount} из {estimate.lines.length} позиций с ценой
                {estimate.unpricedLineCount ? ` · ${estimate.unpricedLineCount} требуют уточнения` : ""}
              </small>
            </div>
            <button
              disabled={!selectedBom.length || catalogMatchStatus === "loading" || pdfStatus === "generating"}
              onClick={savePdf}
              type="button"
            >
              <Download aria-hidden size={17} />
              {pdfStatus === "generating" ? "Формируем PDF…" : "Скачать PDF-смету"}
            </button>
            {pdfStatus === "error" ? (
              <p role="alert">Не удалось сформировать PDF. Попробуйте ещё раз.</p>
            ) : null}
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
          <strong>Комплект рассчитан по замерам</strong>
          <span>{estimate.unpricedLineCount ? `Предварительный итог ${formatRub(estimate.knownSubtotalRub)} · ${estimate.unpricedLineCount} поз. без цены.` : `Итого ${formatRub(estimate.knownSubtotalRub)}.`}</span>
        </div>
        <button disabled={!selectedBom.length || catalogMatchStatus === "loading" || pdfStatus === "generating"} type="button" onClick={savePdf}>
          <Download aria-hidden size={16} /> {pdfStatus === "generating" ? "Формируем…" : "Сохранить PDF"}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
