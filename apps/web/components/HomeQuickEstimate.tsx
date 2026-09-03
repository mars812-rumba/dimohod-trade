"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowRight as ArrowRight,
  IconRefresh as Refresh,
} from "@tabler/icons-react";
import type { ProductListResponse } from "@/lib/api";
import {
  bomForVariant,
  calculateChimney,
  type ChimneyBomLine,
} from "@/lib/chimneyCalculation";
import {
  buildChimneyEstimate,
  formatRub,
  type CatalogEstimateMatch,
} from "@/lib/chimneyEstimate";
import { CHIMNEY_ENGINEERING_RULES } from "@/lib/configuratorEngineeringRules";
import {
  MEASUREMENTS_INTAKE_STORAGE_KEY,
  saveConfiguratorDraft,
  type EquipmentStatus,
} from "@/lib/configuratorDraft";
import { METRIKA_GOALS } from "@/lib/metrika";
import {
  applyQuickEstimateBomRules,
  quickEstimateAssumptions,
  quickEstimateDraft,
  quickEstimateHeightM,
  type QuickEstimateAnswers,
  type QuickEstimateEquipment,
  type QuickEstimateObject,
  type QuickEstimateOutlet,
  type QuickEstimateRoute,
} from "@/lib/homeQuickEstimate";
import styles from "./HomeQuickEstimate.module.css";
import { EstimateLeadDialog } from "./EstimateLeadDialog";

type Step = 0 | 1 | 2 | 3 | 4;
type MatchStatus = "idle" | "loading" | "ready" | "error";

const objectChoices = [
  { id: "banya" as const, label: "Баня", icon: "/images/measurements/icons/object-bathhouse.webp" },
  { id: "house" as const, label: "Дом", icon: "/images/measurements/icons/object-house.webp" },
];

const heaterChoices: Array<{ id: QuickEstimateEquipment; label: string; icon: string }> = [
  { id: "bania", label: "Банная печь", icon: "/images/measurements/icons/heater-sauna.webp" },
  { id: "pech", label: "Печь", icon: "/images/measurements/icons/heater-stove.webp" },
  { id: "tt-kotel", label: "ТТ-котёл", icon: "/images/measurements/icons/heater-solid-fuel.webp" },
  { id: "gaz", label: "Газовый котёл", icon: "/images/measurements/icons/heater-gas.webp" },
  { id: "diesel", label: "Дизельный котёл", icon: "/images/measurements/icons/heater-diesel.webp" },
];

const statusChoices: Array<{ id: EquipmentStatus; label: string }> = [
  { id: "installed", label: "Уже установлен" },
  { id: "selected", label: "Выбран" },
  { id: "not-selected", label: "Пока не выбран" },
];

const outletChoices = [
  { id: "top" as const, label: "Сверху", icon: "/images/measurements/icons/outlet-top.webp" },
  { id: "rear" as const, label: "Сзади", icon: "/images/measurements/icons/outlet-rear.webp" },
];

const routeChoices = [
  { id: "ceiling" as const, label: "Через перекрытия и кровлю", image: "/images/home/quick-estimate/route-through-roof.webp" },
  { id: "wall" as const, label: "Через стену и вверх по фасаду", image: "/images/home/quick-estimate/route-along-facade.webp" },
];

const diameterOptions = [100, 110, 120, 130, 140, 150, 160, 180, 200, 250, 280, 300];

function withBase(path: string, base: string) {
  return `${base}${path}`;
}

async function matchBomLine({
  line,
  diameter,
  equipmentType,
  assetBasePath,
  signal,
}: {
  line: ChimneyBomLine;
  diameter: number;
  equipmentType: QuickEstimateEquipment;
  assetBasePath: string;
  signal: AbortSignal;
}): Promise<readonly [string, CatalogEstimateMatch] | null> {
  const params = new URLSearchParams({ limit: "24", offset: "0", product_kind: line.productKind });
  if (line.catalogCategorySlug) params.set("category", line.catalogCategorySlug);
  if (line.catalogSearch) params.set("q", line.catalogSearch);
  if (line.catalogBaseSize) params.set("base_size", line.catalogBaseSize);
  const diameterKinds = new Set(["труба", "отвод", "тройник", "заглушка", "оголовок", "шибер", "декоративная_юбка"]);
  const exactDiameter = diameterKinds.has(line.productKind);
  const exactOuter = line.catalogDiameterMode === "sandwich-outer-exact";
  const rangeOuter = line.catalogDiameterMode === "sandwich-outer-range";
  const exactByFields = exactDiameter || exactOuter || rangeOuter;
  if (exactDiameter) {
    const outerDiameter = line.insulationMm === undefined ? null : diameter + line.insulationMm * 2;
    params.set("diameter", exactOuter ? `${diameter + 100}:` : `${diameter}:${outerDiameter ?? ""}`);
  }
  if (rangeOuter) params.set("preferred_diameter", `:${diameter + 100}`);
  if (line.preferredSteelGrade || line.materialPreference === "stainless-standard") {
    const combustionSteel = CHIMNEY_ENGINEERING_RULES.combustionMaterials.applianceTypes.includes(
      equipmentType as "gaz" | "diesel",
    );
    params.set("material", "stainless");
    params.set("steel_grade", line.preferredSteelGrade ?? (combustionSteel
      ? CHIMNEY_ENGINEERING_RULES.combustionMaterials.innerSteelGrade
      : CHIMNEY_ENGINEERING_RULES.standardMaterials.innerSteelGrade));
    if (line.contour === "сэндвич") {
      params.set("outer_material", "stainless");
      params.set("outer_steel_grade", line.preferredOuterSteelGrade ?? (combustionSteel
        ? CHIMNEY_ENGINEERING_RULES.combustionMaterials.outerSteelGrade
        : CHIMNEY_ENGINEERING_RULES.standardMaterials.outerSteelGrade));
    }
    if (line.thicknessProfile) {
      params.set("wall_thickness_mm", String(line.thicknessProfile === "first-floor-0.8"
        ? CHIMNEY_ENGINEERING_RULES.standardMaterials.firstFloorInnerThicknessMm
        : CHIMNEY_ENGINEERING_RULES.standardMaterials.upperAndOutdoorInnerThicknessMm));
      if (line.contour === "сэндвич") {
        params.set("outer_wall_thickness_mm", String(CHIMNEY_ENGINEERING_RULES.standardMaterials.outerThicknessMm));
      }
    }
  }
  if (line.nominalLengthMm) params.set("length_mm", String(line.nominalLengthMm));
  if (line.contour) params.set("contour", line.contour);
  if (line.insulationMm !== undefined) params.set("insulation_mm", String(line.insulationMm));
  if (line.productKind === "отвод" || line.productKind === "тройник") params.set("angle_deg", "90");

  const fetchProducts = async (request: URLSearchParams) => {
    const response = await fetch(`${assetBasePath}/api/v1/products?${request.toString()}`, { signal });
    if (!response.ok) throw new Error("catalog request failed");
    return response.json() as Promise<ProductListResponse>;
  };
  const payload = await fetchProducts(params);
  if (payload.items[0]) {
    return [line.key, {
      item: payload.items[0],
      exactByFields,
      lengthMatch: line.nominalLengthMm ? "exact" : undefined,
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
    .sort((left, right) => Math.abs((left.length_mm ?? 0) - line.nominalLengthMm!)
      - Math.abs((right.length_mm ?? 0) - line.nominalLengthMm!))[0];
  return nearestItem ? [line.key, {
    item: nearestItem,
    exactByFields,
    lengthMatch: "nearest",
    requestedLengthMm: line.nominalLengthMm,
  }] as const : null;
}

export function HomeQuickEstimate({ assetBasePath = "" }: { assetBasePath?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [objectType, setObjectType] = useState<QuickEstimateObject | null>(null);
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentStatus | null>(null);
  const [equipmentType, setEquipmentType] = useState<QuickEstimateEquipment>("");
  const [outlet, setOutlet] = useState<QuickEstimateOutlet | null>(null);
  const [diameter, setDiameter] = useState<string>("unknown");
  const [route, setRoute] = useState<QuickEstimateRoute | null>(null);
  const [floors, setFloors] = useState(1);
  const [hasAttic, setHasAttic] = useState(false);
  const [outdoorHeight, setOutdoorHeight] = useState("");
  const [wallDistance, setWallDistance] = useState("");
  const [matches, setMatches] = useState<Record<string, CatalogEstimateMatch>>({});
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const availableHeaterChoices = objectType === "banya"
    ? heaterChoices.filter((choice) => choice.id === "bania")
    : heaterChoices;

  const answers = useMemo<QuickEstimateAnswers | null>(() => {
    if (!objectType || !equipmentStatus || !outlet || !route) return null;
    const height = Number(outdoorHeight);
    return {
      objectType,
      equipmentStatus,
      equipmentType,
      outlet,
      diameterMm: diameter === "unknown" ? null : Number(diameter),
      route,
      floors,
      hasAttic,
      outdoorHeightM: route === "wall" && Number.isFinite(height) && height > 0 ? height : 0,
      wallDistanceM: wallDistance === "unknown" ? null : Number(wallDistance),
    };
  }, [diameter, equipmentStatus, equipmentType, floors, hasAttic, objectType, outlet, outdoorHeight, route, wallDistance]);

  const draft = useMemo(() => answers ? quickEstimateDraft(answers) : null, [answers]);
  const calculation = useMemo(() => answers && draft ? calculateChimney({
    route: answers.route,
    outlet: answers.outlet === "top" ? "vertical" : "horizontal",
    floors: answers.floors,
    heightM: quickEstimateHeightM(answers),
    distanceM: answers.route === "wall" ? (answers.wallDistanceM ?? 1.5) : 0,
    roofType: "pitched",
    draft,
  }) : null, [answers, draft]);
  const bom = useMemo(() => calculation && answers
    ? applyQuickEstimateBomRules(bomForVariant(calculation, calculation.selectedVariant), answers)
    : [], [answers, calculation]);

  useEffect(() => {
    if (step !== 4 || !answers || !bom.length) return;
    const controller = new AbortController();
    setMatchStatus("loading");
    const diameterMm = answers.diameterMm ?? 120;
    Promise.all(bom.filter((line) => line.requiresSku).map((line) => matchBomLine({
      line,
      diameter: diameterMm,
      equipmentType: answers.equipmentType,
      assetBasePath,
      signal: controller.signal,
    }))).then((entries) => {
      setMatches(Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))));
      setMatchStatus("ready");
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMatches({});
      setMatchStatus("error");
    });
    return () => controller.abort();
  }, [answers, assetBasePath, bom, step]);

  useEffect(() => {
    if (step !== 4) setLeadSubmitted(false);
  }, [step]);

  const estimate = useMemo(() => calculation && answers ? buildChimneyEstimate({
    selectedBom: bom,
    matches,
    measurements: quickEstimateAssumptions(answers).map((value, index) => ({ label: `Допущение ${index + 1}`, value })),
    profileName: "Быстрый предварительный расчёт",
    removedLabels: [],
    reviewItems: calculation.reviewItems,
    calculationErrors: calculation.errors,
  }) : null, [answers, bom, calculation, matches]);

  const canContinue = step === 0 ? Boolean(objectType)
    : step === 1 ? Boolean(equipmentStatus && outlet)
    : step === 2 ? Boolean(route)
        : route === "ceiling" || (Number(outdoorHeight) > 0 && Number(wallDistance) > 0);

  function goExact() {
    if (!draft || !answers) return;
    window.sessionStorage.setItem(MEASUREMENTS_INTAKE_STORAGE_KEY, JSON.stringify(draft));
    saveConfiguratorDraft(window.sessionStorage, draft);
    const params = new URLSearchParams({
      edit: "1",
      object: answers.objectType,
      route: answers.route === "wall" && answers.outlet === "rear" ? "wall-direct" : answers.route,
    });
    router.push(`/zamery?${params.toString()}`);
  }

  function restart() {
    setStep(0);
    setMatches({});
    setMatchStatus("idle");
    setLeadSubmitted(false);
  }

  return (
    <section className={styles.section} id="quick-estimate" aria-labelledby="quick-estimate-title">
      <div className={styles.shell}>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>Прикинуть бюджет</p>
            <h2 id="quick-estimate-title">Не знаете размеры? Быстрый расчёт</h2>
          </div>
          <p>Без замеров, около 2 минут. Покажем порядок бюджета с ориентировочной точностью ±30%.</p>
        </div>

        <div className={styles.quiz}>
          <div className={styles.topbar}>
            <button className={styles.back} disabled={step === 0} onClick={() => setStep((step - 1) as Step)} type="button">Назад</button>
            <div className={styles.progress} aria-label={`Шаг ${step + 1} из 5`}>
              <div className={styles.track}><i style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
              <span>Шаг {step + 1} из 5</span>
            </div>
            <span className={styles.quickMark}>Быстро</span>
          </div>

          <div className={styles.body} aria-live="polite">
            {step === 0 ? <>
              <div className={styles.heading}><small>Объект</small><h3>Где нужен дымоход?</h3></div>
              <div className={styles.choices}>
                {objectChoices.map((choice) => <button className={`${styles.choice} ${objectType === choice.id ? styles.selected : ""}`} key={choice.id} onClick={() => {
                  setObjectType(choice.id);
                  if (choice.id === "banya") setEquipmentType("bania");
                }} type="button" aria-pressed={objectType === choice.id}>
                  <Image alt="" aria-hidden height={96} src={withBase(choice.icon, assetBasePath)} unoptimized width={96} />
                  {choice.label}
                </button>)}
              </div>
            </> : null}

            {step === 1 ? <>
              <div className={styles.heading}><small>Отопитель</small><h3>Что уже известно?</h3><p>Если модель ещё не выбрана, оставьте тип пустым — точные параметры уточним позже.</p></div>
              <div className={styles.compactChoices}>
                {statusChoices.map((choice) => <button className={`${styles.choice} ${equipmentStatus === choice.id ? styles.selected : ""}`} key={choice.id} onClick={() => setEquipmentStatus(choice.id)} type="button" aria-pressed={equipmentStatus === choice.id}>{choice.label}</button>)}
              </div>
              <p className={styles.subheading}>Тип отопителя</p>
              <div className={`${styles.choices} ${styles.heaterChoices}`}>
                {availableHeaterChoices.map((choice) => <button className={`${styles.choice} ${equipmentType === choice.id ? styles.selected : ""}`} key={choice.id} onClick={() => setEquipmentType(equipmentType === choice.id ? "" : choice.id)} type="button" aria-pressed={equipmentType === choice.id}>
                  <Image alt="" aria-hidden height={64} src={withBase(choice.icon, assetBasePath)} unoptimized width={64} />{choice.label}
                </button>)}
              </div>
              <div className={styles.fieldGrid} style={{ marginTop: 18 }}>
                <div>
                  <p className={styles.subheading}>Выход патрубка</p>
                  <div className={styles.choices}>
                    {outletChoices.map((choice) => <button className={`${styles.choice} ${outlet === choice.id ? styles.selected : ""}`} key={choice.id} onClick={() => setOutlet(choice.id)} type="button" aria-pressed={outlet === choice.id}>
                      <Image alt="" aria-hidden height={72} src={withBase(choice.icon, assetBasePath)} unoptimized width={72} />{choice.label}
                    </button>)}
                  </div>
                </div>
                <label className={styles.field}>Диаметр патрубка
                  <select value={diameter} onChange={(event) => setDiameter(event.target.value)}>
                    <option value="unknown">Не знаю — считаем Ø120 мм</option>
                    {diameterOptions.map((value) => <option key={value} value={value}>Ø {value} мм</option>)}
                  </select>
                </label>
              </div>
            </> : null}

            {step === 2 ? <>
              <div className={styles.heading}><small>Маршрут</small><h3>Как пойдёт дымоход?</h3></div>
              <div className={styles.choices}>
                {routeChoices.map((choice) => <button className={`${styles.choice} ${styles.routeChoice} ${route === choice.id ? styles.selected : ""}`} key={choice.id} onClick={() => setRoute(choice.id)} type="button" aria-pressed={route === choice.id}>
                  <Image alt={choice.label} height={826} src={withBase(choice.image, assetBasePath)} unoptimized width={1100} />{choice.label}
                </button>)}
              </div>
            </> : null}

            {step === 3 && route === "ceiling" ? <>
              <div className={styles.heading}><small>Размеры трассы</small><h3>Сколько этажей?</h3><p>Для быстрого расчёта принимаем 2,5 м на этаж и 1,5 м наружного участка.</p></div>
              <div className={`${styles.choices} ${styles.choicesThree}`}>
                {[1, 2, 3].map((value) => <button className={`${styles.choice} ${floors === value ? styles.selected : ""}`} key={value} onClick={() => setFloors(value)} type="button" aria-pressed={floors === value}>{value}<small>{value === 1 ? "этаж" : "этажа"}</small></button>)}
              </div>
              <p className={styles.subheading}>Есть холодный чердак?</p>
              <div className={styles.choices}>
                <button className={`${styles.choice} ${hasAttic ? styles.selected : ""}`} onClick={() => setHasAttic(true)} type="button" aria-pressed={hasAttic}>Да, добавляем 1,5 м</button>
                <button className={`${styles.choice} ${!hasAttic ? styles.selected : ""}`} onClick={() => setHasAttic(false)} type="button" aria-pressed={!hasAttic}>Нет</button>
              </div>
            </> : null}

            {step === 3 && route === "wall" ? <>
              <div className={styles.heading}><small>Размеры трассы</small><h3>Наружный участок</h3><p>Укажите примерную высоту и расстояние от патрубка до стены.</p></div>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>Высота наружного дымохода
                  <select value={outdoorHeight} onChange={(event) => setOutdoorHeight(event.target.value)}>
                    <option value="">Выберите высоту</option>
                    {[3, 4, 5, 6, 7, 8].map((value) => <option key={value} value={value}>{value} м</option>)}
                  </select>
                </label>
                <label className={styles.field}>Расстояние от патрубка до стены
                  <select value={wallDistance} onChange={(event) => setWallDistance(event.target.value)}>
                    <option value="">Выберите расстояние</option>
                    {[0.5, 1, 1.5, 2].map((value) => <option key={value} value={value}>{String(value).replace(".", ",")} м</option>)}
                  </select>
                </label>
              </div>
            </> : null}

            {step === 4 ? <>
              <div className={styles.heading}><small>Предварительный результат</small><h3>Ориентировочный состав комплекта</h3><p>Быстрый расчёт показывает порядок бюджета с возможным отклонением ±30%. Это не финальная смета для заказа.</p></div>
              {matchStatus === "loading" ? <p className={styles.status} role="status">Подбираем реальные SKU каталога и считаем стоимость…</p> : null}
              {matchStatus === "error" ? <p className={styles.status} role="status">Каталог временно не ответил. BOM уже рассчитан, стоимость уточним после замеров.</p> : null}
              {estimate && !leadSubmitted ? (
                <div aria-busy={matchStatus === "loading"} className={styles.leadGate}>
                  <div>
                    <h4>Куда отправить результат?</h4>
                    <p>Оставьте контакт — заявка вместе с предварительным BOM попадёт менеджеру. После отправки сразу покажем стоимость и состав комплекта.</p>
                  </div>
                  <EstimateLeadDialog
                    buttonLabel="Получить расчёт"
                    description="Укажите удобный способ связи. Сохраним заявку с предварительным BOM в системе менеджера и сразу откроем результат на этой странице."
                    disabled={matchStatus !== "ready" && matchStatus !== "error"}
                    estimate={estimate}
                    heading="Получить стоимость и BOM"
                    metrikaGoal={METRIKA_GOALS.quickEstimateContactSent}
                    onSubmitted={() => setLeadSubmitted(true)}
                    source="chimney-quick-estimate"
                    submitLabel="Отправить и показать результат"
                    triggerClassName={styles.gateButton}
                  />
                  <small>Контакт нужен только для обработки расчёта. Согласие на обработку данных подтверждается в форме.</small>
                </div>
              ) : null}
              {estimate && leadSubmitted ? <div className={styles.resultGrid}>
                <div>
                  <div className={styles.priceCard}>
                    <small>{estimate.unpricedLineCount ? "Стоимость найденных позиций · ±30%" : "Ориентировочная стоимость · ±30%"}</small>
                    <strong>{matchStatus === "loading" ? "…" : formatRub(estimate.knownSubtotalRub)}</strong>
                    <p>{estimate.lines.length} позиций · {estimate.totalUnits} изделий{estimate.unpricedLineCount ? ` · без цены: ${estimate.unpricedLineCount}` : ""}</p>
                  </div>
                  {answers ? <div className={styles.assumptions}><strong>Что приняли в расчёте</strong><ul>{quickEstimateAssumptions(answers).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                </div>
                <div>
                  <ul className={styles.bom} aria-label="Состав комплекта">
                    {estimate.lines.slice(0, 10).map((line) => <li key={line.key}><span>{line.skuName ?? line.label}</span><strong>{line.quantity} шт.</strong></li>)}
                  </ul>
                  {estimate.lines.length > 10 ? <p className={styles.status}>Ещё {estimate.lines.length - 10} позиций будут в полной смете.</p> : null}
                </div>
              </div> : null}
              {leadSubmitted ? <p className={styles.precisionNotice}><strong>Нужна сумма для заказа?</strong> Уточните размеры — пересчитаем комплект по вашим данным и подготовим точную смету после проверки менеджером.</p> : null}
              {leadSubmitted ? <div className={styles.resultFooter}>
                <button className={styles.exactLink} onClick={goExact} type="button">Уточнить размеры и получить точную смету <ArrowRight aria-hidden size={18} /></button>
                <small>Тип отопителя, выход и диаметр уже перенесём в полный замер — повторно вводить их не придётся.</small>
              </div> : null}
            </> : null}

            {step < 4 ? <div className={styles.footer}>
              <button className={styles.next} disabled={!canContinue} onClick={() => setStep((step + 1) as Step)} type="button">Продолжить <ArrowRight aria-hidden size={18} /></button>
            </div> : <div className={styles.footer}>
              <button className={styles.back} onClick={restart} type="button"><Refresh aria-hidden size={16} /> Заново</button>
            </div>}
          </div>
        </div>
      </div>
    </section>
  );
}
