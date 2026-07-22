"use client";

import { useMemo, useState } from "react";

type SourceType = "bania" | "kamin" | "gaz" | "tt";
type RoofType = "pitched" | "flat";
type PartType =
  | "start_cap"
  | "pipe"
  | "pipe_short"
  | "tee"
  | "ceiling_passage"
  | "roof_flashing_pitch"
  | "roof_flashing_flat"
  | "storm_collar"
  | "cap";

type KitPart = {
  key: string;
  type: PartType;
};

type ChimneyConfiguratorProps = {
  assetBasePath?: string;
};

const PART_HEIGHT_CM: Record<PartType, number> = {
  start_cap: 92,
  pipe: 180,
  pipe_short: 100,
  tee: 140,
  ceiling_passage: 56,
  roof_flashing_pitch: 60,
  roof_flashing_flat: 50,
  storm_collar: 30,
  cap: 88,
};

const PART_LABELS: Record<PartType, { label: string; note: string }> = {
  start_cap: { label: "Стартовый адаптер", note: "переход от патрубка печи к системе" },
  pipe: { label: "Труба-сэндвич 1000 мм", note: "наружный участок, утепление 50 мм" },
  pipe_short: { label: "Труба-сэндвич 500 мм", note: "добор высоты без лишнего реза" },
  tee: { label: "Тройник 90° с ревизией", note: "узел прочистки и обслуживания" },
  ceiling_passage: { label: "Потолочно-проходной узел", note: "разделка и безопасный отступ от дерева" },
  roof_flashing_pitch: { label: "Кровельная разделка для ската", note: "герметизация прохода через кровлю" },
  roof_flashing_flat: { label: "Кровельная разделка плоская", note: "стакан / фланец для плоской кровли" },
  storm_collar: { label: "Юбка / хомут гидроизоляции", note: "защита от воды над кровельной разделкой" },
  cap: { label: "Оголовок с искрогасителем", note: "верхний элемент дымохода" },
};

const SOURCE_OPTIONS: Array<{ id: SourceType; label: string; hint: string }> = [
  { id: "bania", label: "Банная печь", hint: "жар, дерево, проходка" },
  { id: "kamin", label: "Камин", hint: "ревизия и стабильная тяга" },
  { id: "gaz", label: "Газовый котёл", hint: "герметичность и конденсат" },
  { id: "tt", label: "ТТ котёл", hint: "температура и сажа" },
];

const ROOF_OPTIONS: Array<{ id: RoofType; label: string }> = [
  { id: "pitched", label: "Скатная кровля" },
  { id: "flat", label: "Плоская кровля" },
];

function buildKit(source: SourceType, heightM: number, roof: RoofType): KitPart[] {
  const parts: KitPart[] = [{ key: "start_cap", type: "start_cap" }];
  const needsRevisionTee = source !== "bania";

  if (needsRevisionTee) {
    parts.push({ key: "tee", type: "tee" });
  }

  const usedM = (PART_HEIGHT_CM.start_cap + (needsRevisionTee ? PART_HEIGHT_CM.tee : 0)) / 100;
  const remainingM = Math.max(heightM - usedM, 1);
  const fullPipes = Math.floor(remainingM);
  const needsHalfPipe = remainingM - fullPipes >= 0.4;
  const passageAfter = Math.max(1, Math.floor(fullPipes * 0.55));

  for (let index = 0; index < fullPipes; index += 1) {
    parts.push({ key: `pipe_${index}`, type: "pipe" });

    if (index + 1 === passageAfter) {
      parts.push({ key: "ceiling_passage", type: "ceiling_passage" });
    }
  }

  if (needsHalfPipe) {
    parts.push({ key: "pipe_half", type: "pipe_short" });
  }

  parts.push({
    key: "roof_flashing",
    type: roof === "pitched" ? "roof_flashing_pitch" : "roof_flashing_flat",
  });
  parts.push({ key: "storm_collar", type: "storm_collar" });
  parts.push({ key: "cap", type: "cap" });

  return parts;
}

function groupParts(parts: KitPart[]) {
  const grouped = new Map<PartType, number>();

  parts.forEach((part) => {
    grouped.set(part.type, (grouped.get(part.type) ?? 0) + 1);
  });

  return Array.from(grouped.entries()).map(([type, qty]) => ({ type, qty, ...PART_LABELS[type] }));
}

export function ChimneyConfigurator({ assetBasePath = "" }: ChimneyConfiguratorProps) {
  const [source, setSource] = useState<SourceType>("bania");
  const [heightM, setHeightM] = useState(5);
  const [roof, setRoof] = useState<RoofType>("pitched");

  const kit = useMemo(() => buildKit(source, heightM, roof), [source, heightM, roof]);
  const groupedParts = useMemo(() => groupParts(kit), [kit]);
  const selectedSource = SOURCE_OPTIONS.find((option) => option.id === source);

  const assetUrl = (part: PartType) => `${assetBasePath}/images/configurator/${part}.png`;

  return (
    <div className="chimney-configurator" aria-label="Интерактивный конфигуратор комплекта дымохода">
      <div className="configurator-header">
        <div>
          <p className="eyebrow">Живой расчёт · MVP</p>
          <h3>Соберите базовую схему дымохода за 30 секунд.</h3>
          <p>
            Это визуальный прототип расчёта. Он показывает состав комплекта и логику деталей;
            финальный расчёт подключим к правилам совместимости и SKU в PostgreSQL.
          </p>
        </div>
        <div className="configurator-count" aria-live="polite">
          <strong>{kit.length}</strong>
          <span>деталей в комплекте</span>
        </div>
      </div>

      <div className="configurator-body">
        <div className="configurator-controls">
          <div className="configurator-field">
            <div className="configurator-label">Источник тепла</div>
            <div className="configurator-segmented configurator-segmented-grid">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === source ? "active" : ""}
                  onClick={() => setSource(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="configurator-field">
            <div className="configurator-label">Высота тракта: {heightM.toFixed(1)} м</div>
            <input
              aria-label="Высота тракта"
              className="configurator-range"
              type="range"
              min="3"
              max="9"
              step="0.5"
              value={heightM}
              onChange={(event) => setHeightM(Number(event.target.value))}
            />
            <div className="configurator-ticks">
              <span>3 м</span>
              <span>9 м</span>
            </div>
          </div>

          <div className="configurator-field">
            <div className="configurator-label">Кровля</div>
            <div className="configurator-segmented">
              {ROOF_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={option.id === roof ? "active" : ""}
                  onClick={() => setRoof(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="configurator-note">
            <strong>{selectedSource?.label}</strong>
            <span>
              По улице и в холодной зоне в расчёте используем только сэндвич. Диаметр, сталь и
              конкретные артикулы подтянем из базы на следующем шаге.
            </span>
          </div>
        </div>

        <div className="configurator-schematic-pane">
          <div className="configurator-schematic-top">
            <span>Схема из PNG-оттисков деталей</span>
            <strong>{heightM.toFixed(1)} м</strong>
          </div>
          <div className="configurator-sheet" aria-hidden="true">
            {kit.map((part) => (
              <img key={part.key} src={assetUrl(part.type)} alt="" />
            ))}
          </div>
        </div>

        <div className="configurator-spec">
          <div className="configurator-spec-head">
            <span>Спецификация</span>
            <strong>{groupedParts.length} типов деталей</strong>
          </div>
          <div className="configurator-spec-list">
            {groupedParts.map((part) => (
              <div key={part.type} className="configurator-spec-row">
                <span className="configurator-spec-dot" />
                <div>
                  <strong>{part.label}</strong>
                  <small>{part.note}</small>
                </div>
                <em>×{part.qty}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
