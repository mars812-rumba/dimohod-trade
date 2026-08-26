"use client";

import Link from "next/link";
import { IconArrowRight as ArrowRight, IconChevronDown as ChevronDown } from "@tabler/icons-react";
import { type ReactNode, useEffect, useState } from "react";
import {
  calculationProfileConfiguratorHref,
  readCalculationProfiles,
  saveCalculationProfile,
} from "@/lib/calculationProfiles";
import {
  CONFIGURATOR_DIAMETERS_MM,
  createEmptyScenarioDraft,
  draftFieldStatus,
  facadeOffsetFromRoofOverhang,
  mergeConfiguratorDraft,
  readConfiguratorDraft,
  saveConfiguratorDraft,
  scenarioDraftConfiguratorHref,
  type ScenarioConfiguratorDraft,
  type DraftFieldStatus,
} from "@/lib/configuratorDraft";
import type { ScenarioPageContent } from "@/lib/scenarioPages";
import { RouteImageViewer } from "./RouteImageViewer";
import styles from "./ScenarioPageTemplate.module.css";

type BanyaIntakeFlowProps = {
  content: ScenarioPageContent;
  assetBasePath?: string;
  initialProfileId?: string;
  initialRoute?: string;
  initialObjectType?: ScenarioConfiguratorDraft["objectType"];
  onProfileSaved?: () => void;
};

function normalizeIntakeDraft(draft: ScenarioConfiguratorDraft): ScenarioConfiguratorDraft {
  const objectType = draft.objectType === "banya" ? "banya" : "house";
  const equipmentType = draft.equipmentType === "bania"
    || draft.equipmentType === "pech"
    || draft.equipmentType === "kamin"
    || draft.equipmentType === "tt-kotel"
    || draft.equipmentType === "gaz"
    || draft.equipmentType === "diesel"
    ? draft.equipmentType
    : "";
  const legacyDiameter = !draft.diameter
    && ((draft.diameterX && !draft.diameterY)
      || (!draft.diameterX && draft.diameterY)
      || (draft.diameterX && draft.diameterX === draft.diameterY))
    ? draft.diameterX || draft.diameterY
    : "";
  const diameterCandidate = draft.diameter || legacyDiameter;
  const diameter = CONFIGURATOR_DIAMETERS_MM.includes(
    Number(diameterCandidate) as (typeof CONFIGURATOR_DIAMETERS_MM)[number],
  ) ? diameterCandidate : "";
  const diameterSource = draft.diameterSource === "passport"
    ? diameter ? "measured" : "unknown"
    : draft.diameterSource;

  return {
    ...draft,
    objectType,
    scenario: objectType === "banya" ? "banya" : "dom",
    equipmentType,
    diameter,
    diameterX: "",
    diameterY: "",
    diameterSource,
    facadeOffset: facadeOffsetFromRoofOverhang(draft.roofOverhang),
  };
}

const statusLabels: Record<DraftFieldStatus, string> = {
  known: "✓ известно",
  measure: "○ нужно измерить",
  later: "? уточнить позже",
};

type MeasurementFieldProps = {
  draft: ScenarioConfiguratorDraft;
  field: keyof ScenarioConfiguratorDraft;
  label: string;
  placeholder: string;
  unit?: string;
  numeric?: boolean;
  required?: boolean;
  allowDefer?: boolean;
  onChange: (field: keyof ScenarioConfiguratorDraft, value: string) => void;
  onDefer: (field: keyof ScenarioConfiguratorDraft) => void;
  children?: ReactNode;
};

function MeasurementField({ draft, field, label, placeholder, unit, numeric = true, required = false, allowDefer = true, onChange, onDefer, children }: MeasurementFieldProps) {
  const value = typeof draft[field] === "string" ? String(draft[field]) : "";
  const status = draftFieldStatus(draft, field);
  return (
    <div className={styles.measurementField}>
      <label className={styles.field}>
        <span>{label}{unit ? `, ${unit}` : ""}{required ? " · обязательно" : ""}</span>
        <input
          aria-required={required || undefined}
          inputMode={numeric ? "decimal" : undefined}
          min={numeric ? "0" : undefined}
          onChange={(event) => onChange(field, event.target.value)}
          placeholder={placeholder}
          required={required}
          type={numeric ? "number" : "text"}
          value={value}
        />
      </label>
      <div className={styles.fieldMeta}>
        <span data-status={status}>{statusLabels[status]}</span>
        {allowDefer && status !== "known" ? (
          <button onClick={() => onDefer(field)} type="button">
            {status === "later" ? "Вернуть к замеру" : "Уточнить позже"}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function DiameterSelectField({
  draft,
  onChange,
  onDefer,
  children,
}: {
  draft: ScenarioConfiguratorDraft;
  onChange: (field: keyof ScenarioConfiguratorDraft, value: string) => void;
  onDefer: (field: keyof ScenarioConfiguratorDraft) => void;
  children?: ReactNode;
}) {
  const selectedDiameter = CONFIGURATOR_DIAMETERS_MM.includes(
    Number(draft.diameter) as (typeof CONFIGURATOR_DIAMETERS_MM)[number],
  ) ? draft.diameter : "";
  const status: DraftFieldStatus = selectedDiameter
    ? "known"
    : draft.deferredFields.includes("diameter") ? "later" : "measure";

  return (
    <div className={styles.measurementField}>
      <label className={styles.field}>
        <span>Наружный диаметр патрубка, мм</span>
        <select
          aria-label="Наружный диаметр патрубка"
          onChange={(event) => onChange("diameter", event.target.value)}
          value={selectedDiameter}
        >
          <option value="">Выберите диаметр</option>
          {CONFIGURATOR_DIAMETERS_MM.map((diameter) => (
            <option key={diameter} value={diameter}>{diameter} мм</option>
          ))}
        </select>
      </label>
      <div className={styles.fieldMeta}>
        <span data-status={status}>{statusLabels[status]}</span>
        {status !== "known" ? (
          <button onClick={() => onDefer("diameter")} type="button">
            {status === "later" ? "Вернуть к выбору" : "Уточнить позже"}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

type MeasurementScheme = {
  src: string;
  alt: string;
  title: string;
};

function MeasurementHelp({
  title,
  children,
  scheme,
  showSchemePlaceholder = true,
}: {
  title?: string;
  children: ReactNode;
  scheme?: MeasurementScheme;
  showSchemePlaceholder?: boolean;
}) {
  const singleColumn = Boolean(scheme) || !showSchemePlaceholder;
  return (
    <details className={styles.measureHelp}>
      <summary>
        <span>{title ?? "Как измерить?"}</span>
        <ChevronDown size={17} aria-hidden />
      </summary>
      <div className={`${styles.measureHelpBody} ${singleColumn ? styles.measureHelpBodyWithScheme : ""}`}>
        <div>{children}</div>
        {scheme ? (
          <RouteImageViewer
            alt={scheme.alt}
            previewClassName={styles.measureScheme}
            previewSizes="(max-width: 720px) calc(100vw - 48px), 520px"
            quality={86}
            src={scheme.src}
            title={scheme.title}
          />
        ) : showSchemePlaceholder ? (
          <div className={styles.schemePlaceholder} aria-label="Место для схемы замера">
            <span>Схема замера</span>
            <small>будет добавлена после проверки специалистом</small>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function BanyaIntakeFlow({
  content,
  assetBasePath = "",
  initialProfileId = "",
  initialRoute = "",
  initialObjectType,
  onProfileSaved,
}: BanyaIntakeFlowProps) {
  const initialScenario = initialObjectType && initialObjectType !== "banya"
    ? "dom"
    : content.slug === "dom" ? "dom" : "banya";
  const emptyDraft = normalizeIntakeDraft({
    ...createEmptyScenarioDraft(initialScenario),
    ...(initialObjectType ? { objectType: initialObjectType } : {}),
  });
  const storageKey = "dimohod-trade:measurements-intake:v2";
  const requestedProfileId = initialProfileId;
  const requestedRoute = initialRoute;
  const [intake, setIntake] = useState<ScenarioConfiguratorDraft>(emptyDraft);
  const [isReady, setIsReady] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [profileDirty, setProfileDirty] = useState(true);
  const scenario = intake.scenario;
  const isHome = intake.objectType !== "banya";
  const schemes = {
    stoveHeight: {
      src: `${assetBasePath}/images/measurements/stove-height-mobile.webp`,
      alt: "Вертикальная схема замера от чистового пола до верхней грани патрубка отопителя",
      title: "Как измерить высоту до патрубка",
    },
    rearOutletHeight: {
      src: `${assetBasePath}/images/measurements/rear-outlet-bottom-height-mobile.webp`,
      alt: "Вертикальная схема замера от чистового пола до нижней наружной кромки заднего патрубка",
      title: "Как измерить высоту заднего патрубка",
    },
    outletDiameter: {
      src: `${assetBasePath}/images/measurements/stove-outlet-outer-diameter-guide.webp`,
      alt: "Наружный диаметр патрубка измеряется через центр от одной внешней стенки до другой",
      title: "Как измерить наружный диаметр патрубка",
    },
    roomHeight: {
      src: `${assetBasePath}/images/measurements/finished-room-height-mobile.webp`,
      alt: "Вертикальная схема замера чистовой высоты от пола до потолка",
      title: "Как измерить чистовую высоту помещения",
    },
    floorThickness: {
      src: `${assetBasePath}/images/measurements/floor-thickness-mobile.webp`,
      alt: "Вертикальная схема замера полной толщины межэтажного перекрытия",
      title: "Как измерить толщину перекрытия",
    },
    atticRoof: {
      src: `${assetBasePath}/images/measurements/attic-roof-angle-mobile.webp`,
      alt: "Вертикальная схема замера высоты чердака и угла кровли",
      title: "Как измерить чердак и угол кровли",
    },
    ridgeHeight: {
      src: `${assetBasePath}/images/measurements/ridge-height.svg`,
      alt: "Вертикальная схема замера от чистового пола первого этажа до внутренней нижней грани конька",
      title: "Как измерить высоту дома в коньке",
    },
    ridgeHorizontalDistance: {
      src: `${assetBasePath}/images/measurements/ridge-horizontal-distance.svg`,
      alt: "Схема вида сверху с горизонтальным расстоянием от оси дымохода до линии конька",
      title: "Как измерить расстояние от оси дымохода до конька",
    },
    topOutletWall: {
      src: `${assetBasePath}/images/measurements/top-outlet-wall-measurements-mobile.webp`,
      alt: "Вертикальная схема замеров при верхнем патрубке и выводе через стену",
      title: "Замеры при верхнем патрубке и выводе через стену",
    },
    rearOutletWall: {
      src: `${assetBasePath}/images/measurements/rear-outlet-wall-measurements-mobile.webp`,
      alt: "Вертикальная схема замеров при заднем патрубке и прямом выводе через стену",
      title: "Замеры при заднем патрубке и выводе через стену",
    },
    exteriorRoute: {
      src: `${assetBasePath}/images/measurements/exterior-route-measurements-mobile.webp`,
      alt: "Вертикальная схема замеров наружной части дымохода вдоль фасада",
      title: "Как измерить наружную часть трассы",
    },
  } satisfies Record<string, MeasurementScheme>;

  useEffect(() => {
    try {
      const profiles = readCalculationProfiles(window.localStorage);
      const requestedProfile = requestedProfileId
        ? profiles.find((profile) => profile.id === requestedProfileId)
        : undefined;
      const saved = window.sessionStorage.getItem(storageKey);
      const savedDraft = saved
        ? JSON.parse(saved) as Partial<ScenarioConfiguratorDraft>
        : null;
      const sharedDraft = readConfiguratorDraft(window.sessionStorage);
      const mergedDraft = requestedProfile?.draft ?? mergeConfiguratorDraft(sharedDraft, {
          ...savedDraft,
          scenario: initialScenario,
          ...(initialObjectType ? { objectType: initialObjectType } : {}),
        });
      const route = requestedRoute === "ceiling" || requestedRoute === "wall" || requestedRoute === "wall-direct"
        ? requestedRoute
        : mergedDraft.route;
      setIntake(normalizeIntakeDraft({
        ...mergedDraft,
        route,
        floorThickness: mergedDraft.floorThickness || emptyDraft.floorThickness,
      }));
      if (requestedProfile) {
        setActiveProfileId(requestedProfile.id);
        setProfileName(requestedProfile.name);
        setProfileStatus(`Загружен профиль «${requestedProfile.name}».`);
        setProfileDirty(false);
      } else if (requestedProfileId) {
        setProfileStatus("Профиль не найден в этом браузере. Начните новый профиль или откройте ссылку на устройстве, где он был сохранён.");
      }
    } catch {
      // The form remains usable when browser storage is unavailable.
    }
    setIsReady(true);
  }, [initialObjectType, initialScenario, requestedProfileId, requestedRoute]);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(intake));
      saveConfiguratorDraft(window.sessionStorage, intake);
    } catch {
      // Values still remain available for the current render.
    }
  }, [intake, isReady]);

  const configuratorHref = activeProfileId && !profileDirty
    ? calculationProfileConfiguratorHref(activeProfileId)
    : scenarioDraftConfiguratorHref(intake);

  const markProfileDirty = () => {
    setProfileDirty(true);
    setProfileStatus(activeProfileId ? "В профиле есть несохранённые изменения." : "");
  };

  const update = <Key extends keyof ScenarioConfiguratorDraft>(key: Key, value: ScenarioConfiguratorDraft[Key]) => {
    markProfileDirty();
    setIntake((current) => ({ ...current, [key]: value }));
  };

  const updateMeasurement = (field: keyof ScenarioConfiguratorDraft, value: string) => {
    markProfileDirty();
    setIntake((current) => ({
      ...current,
      [field]: value,
      ...(field === "roofOverhang" ? { facadeOffset: facadeOffsetFromRoofOverhang(value) } : {}),
      deferredFields: current.deferredFields.filter((item) => item !== field),
    }));
  };

  const toggleDeferred = (field: keyof ScenarioConfiguratorDraft) => {
    markProfileDirty();
    setIntake((current) => ({
      ...current,
      [field]: "",
      ...(field === "roofOverhang" ? { facadeOffset: "" } : {}),
      deferredFields: current.deferredFields.includes(field)
        ? current.deferredFields.filter((item) => item !== field)
        : [...current.deferredFields, field],
    }));
  };

  const saveProfile = () => {
    if (intake.route === "ceiling" && !(Number(intake.ridgeHeight) > 0)) {
      setProfileError("Укажите высоту дома в коньке в миллиметрах — без неё вертикальный чертёж нельзя считать привязанным к зданию.");
      return;
    }
    if (intake.route === "ceiling" && !(Number(intake.ridgeHorizontalDistance) > 0)) {
      setProfileError("Укажите горизонтальное расстояние от оси дымохода до конька — оно определяет требуемую высоту трубы над кровлей.");
      return;
    }
    const name = profileName.trim();
    if (!name) {
      setProfileError("Введите название, чтобы сохранить замеры.");
      return;
    }

    try {
      const profile = saveCalculationProfile(window.localStorage, {
        id: activeProfileId || undefined,
        name,
        draft: intake,
      });
      setActiveProfileId(profile.id);
      setProfileName(profile.name);
      setProfileError("");
      setProfileStatus(`Профиль «${profile.name}» сохранён в этом браузере.`);
      setProfileDirty(false);
      onProfileSaved?.();
    } catch {
      setProfileError("Не удалось сохранить профиль в браузере. Проверьте настройки хранения данных и повторите попытку.");
    }
  };

  const startProfileCopy = () => {
    setActiveProfileId("");
    setProfileName("");
    setProfileError("");
    setProfileStatus("Измените маршрут или размеры, затем сохраните их под новым названием.");
    setProfileDirty(true);
  };

  return (
    <section className={styles.intakeSection} id="scenario-intake" aria-labelledby="intake-title">
      <div className={styles.shell}>
        <div className={styles.intakeIntro} id="source-data">
          <h2 id="intake-title">Начните с того, что уже знаете</h2>
          <p>Поля можно заполнять не по порядку. Неизвестные данные оставьте пустыми и добавьте позже.</p>
        </div>

        <div className={styles.intakeSteps}>
          <section className={styles.intakeStep} aria-labelledby="stove-step-title">
            <div className={styles.stepHeading}>
              <span>Шаг 1</span>
              <div>
                <h3 id="stove-step-title">
                  Объект и отопитель
                </h3>
                <p>
                  Сначала укажите объект и то, насколько точно уже известен отопитель.
                </p>
              </div>
            </div>
            <fieldset className={styles.choiceFieldset}>
              <legend>Какой объект измеряем?</legend>
              <div className={styles.choiceRow}>
                {[
                  ["banya", "Баня"],
                  ["house", "Дом"],
                ].map(([value, label]) => (
                  <label key={value}>
                    <input
                      checked={intake.objectType === value}
                      name="measurement-object"
                      onChange={() => {
                        markProfileDirty();
                        setIntake((current) => ({
                          ...current,
                          objectType: value as ScenarioConfiguratorDraft["objectType"],
                          scenario: value === "banya" ? "banya" : "dom",
                        }));
                      }}
                      type="radio"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.choiceFieldset}>
              <legend>Отопитель</legend>
              <div className={styles.choiceRow}>
                {[
                  ["installed", "Уже установлен"],
                  ["selected", "Выбран, но не установлен"],
                  ["not-selected", "Пока не выбран"],
                ].map(([value, label]) => (
                  <label key={value}>
                    <input
                      checked={intake.equipmentStatus === value}
                      name="equipment-status"
                      onChange={() => update("equipmentStatus", value as ScenarioConfiguratorDraft["equipmentStatus"])}
                      type="radio"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {intake.equipmentStatus !== "not-selected" ? (
              <fieldset className={styles.choiceFieldset}>
                <legend>Тип отопителя</legend>
                <div className={styles.choiceRow}>
                  {[
                    ["bania", "Банная печь"],
                    ["pech", "Печь"],
                    ["tt-kotel", "Твердотопливный котёл"],
                    ["gaz", "Газовый котёл"],
                    ["diesel", "Дизельный котёл"],
                  ].map(([value, label]) => (
                    <label key={label}>
                      <input
                        checked={intake.equipmentType === value}
                        name="home-equipment"
                        onChange={() => update("equipmentType", value as ScenarioConfiguratorDraft["equipmentType"])}
                        type="radio"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            {intake.equipmentStatus === "not-selected" ? (
              <p className={styles.choiceContext}>Можно продолжить с замерами здания. Данные отопителя добавите после выбора оборудования.</p>
            ) : null}
          </section>

          {intake.equipmentStatus !== "not-selected" ? <section className={styles.intakeStep} aria-labelledby="outlet-step-title">
            <div className={styles.stepHeading}>
              <span>Шаг 2</span>
              <div>
                <h3 id="outlet-step-title">Печь и подключение дымохода</h3>
                <p>Укажите положение патрубка и контрольные размеры отопителя.</p>
              </div>
            </div>

            <fieldset className={styles.choiceFieldset}>
              <legend>Положение патрубка отопителя</legend>
              <div className={styles.choiceRow}>
                <label>
                  <input checked={intake.outlet === "top"} name={`${scenario}-outlet`} onChange={() => {
                    markProfileDirty();
                    setIntake((current) => ({
                      ...current,
                      outlet: "top",
                      route: current.route === "wall-direct" ? "wall" : current.route,
                    }));
                  }} type="radio" />
                  <span>Сверху</span>
                </label>
                <label>
                  <input checked={intake.outlet === "rear"} name={`${scenario}-outlet`} onChange={() => {
                    markProfileDirty();
                    setIntake((current) => ({
                      ...current,
                      outlet: "rear",
                      route: current.route === "unknown" ? "unknown" : "wall-direct",
                    }));
                  }} type="radio" />
                  <span>Сзади</span>
                </label>
              </div>
            </fieldset>

            <div className={styles.fieldGrid}>
              {intake.outlet === "top" ? <MeasurementField draft={intake} field="connectionHeight" label="Высота до верхней грани патрубка" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="От чистового пола" unit="мм">
                <MeasurementHelp scheme={schemes.stoveHeight}>
                  <p>Измерьте расстояние от чистового пола до верхней грани штатного патрубка отопителя. Патрубок входит в размер, установленная сверху дымовая труба — нет.</p>
                </MeasurementHelp>
              </MeasurementField> : null}
              {intake.outlet === "rear" ? <MeasurementField draft={intake} field="rearOutletBottomHeight" label="Высота нижней кромки патрубка" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="От чистового пола" unit="мм">
                <MeasurementHelp scheme={schemes.rearOutletHeight}>
                  <p>Измерьте вертикально от чистового пола до самой нижней точки наружной кромки заднего патрубка.</p>
                </MeasurementHelp>
              </MeasurementField> : null}
              <fieldset className={`${styles.choiceFieldset} ${styles.fieldWide}`}>
                <legend>Откуда известен диаметр?</legend>
                <div className={styles.choiceRow}>
                  {[["measured", "Измерен"], ["unknown", "Пока неизвестен"]].map(([value, label]) => (
                    <label key={value}>
                      <input checked={intake.diameterSource === value} name="diameter-source" onChange={() => update("diameterSource", value as ScenarioConfiguratorDraft["diameterSource"])} type="radio" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {intake.diameterSource !== "unknown" ? <>
              <DiameterSelectField draft={intake} onChange={updateMeasurement} onDefer={toggleDeferred}>
                <MeasurementHelp scheme={schemes.outletDiameter}>
                  <p>Приложите рулетку через центр патрубка и измерьте расстояние от одной наружной кромки до другой. Внутреннее отверстие не измеряйте.</p>
                </MeasurementHelp>
              </DiameterSelectField>
              </> : null}
            </div>
          </section> : null}

          <section className={styles.intakeStep} aria-labelledby="route-step-title">
            <div className={styles.stepHeading}>
              <span>Шаг 3</span>
              <div>
                <h3 id="route-step-title">Как пойдёт дымоход?</h3>
                <p>Выберите наиболее похожий вариант. Его можно изменить позже.</p>
              </div>
            </div>
            <fieldset className={styles.routeChoices}>
              <legend className={styles.visuallyHidden}>Маршрут дымохода</legend>
              {content.routeOptions
                .map((option, index) => {
                  const value = option.slug === "through-wall-direct"
                    ? "wall-direct" as const
                    : index === 0
                      ? "ceiling" as const
                      : "wall" as const;
                  const selected = intake.route === value;
                  return (
                    <div className={styles.routeChoice} data-selected={selected || undefined} key={option.slug}>
                    {option.image ? (
                      <RouteImageViewer
                        alt={`Схема маршрута: ${option.title}`}
                        previewClassName={styles.routeChoiceImage}
                        previewSizes="(max-width: 620px) calc(100vw - 64px), 33vw"
                        quality={72}
                        src={`${assetBasePath}${option.image}`}
                        title={option.title}
                      />
                    ) : null}
                    <label className={styles.routeChoiceBody}>
                      <input
                        checked={selected}
                        name={`${scenario}-route`}
                        onChange={() => {
                          markProfileDirty();
                          setIntake((current) => ({
                            ...current,
                            route: value,
                            outlet: value === "wall-direct" ? "rear" : "top",
                          }));
                        }}
                        type="radio"
                        value={value}
                      />
                      <strong>{option.title}</strong>
                      <small>{option.description}</small>
                    </label>
                    </div>
                  );
                })}
              <label className={`${styles.routeChoice} ${styles.routeChoiceUnknown}`} data-selected={intake.route === "unknown" || undefined}>
                <input checked={intake.route === "unknown"} name={`${scenario}-route`} onChange={() => update("route", "unknown")} type="radio" value="unknown" />
                <span className={styles.routeChoiceBody}>
                  <strong>Пока не знаю</strong>
                  <small>Сохраните данные об отопителе и патрубке. Маршрут можно выбрать после замеров или консультации.</small>
                </span>
              </label>
            </fieldset>
          </section>

          {intake.route !== "unknown" ? (
            <section className={styles.intakeStep} aria-labelledby="measurements-step-title">
              <div className={styles.stepHeading}>
                <span>Шаг 4</span>
                <div>
                  <h3 id="measurements-step-title">Замеры для выбранного маршрута</h3>
                  <p>Здесь только те параметры здания и трассы, которые относятся к выбранному варианту.</p>
                </div>
              </div>

              {intake.route === "ceiling" ? (
                <>
                  <fieldset className={styles.choiceFieldset}>
                    <legend>Количество этажей по пути дымохода</legend>
                    <div className={styles.choiceRow}>
                      {[
                        ["1", "1 этаж"],
                        ["2", "2 этажа"],
                        ["3", "3 и более"],
                      ].map(([value, label]) => (
                        <label key={value}>
                          <input
                            checked={intake.levels === value}
                            name={`${scenario}-levels`}
                            onChange={() => updateMeasurement("levels", value)}
                            type="radio"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    <MeasurementHelp showSchemePlaceholder={false} title="Как определить этажность?">
                      <p>Считайте только уровни здания, через которые фактически пройдёт вертикальная трасса. Чердак отметьте отдельно ниже.</p>
                    </MeasurementHelp>
                  </fieldset>

                  <div className={styles.fieldGrid}>
                    <MeasurementField draft={intake} field="ceilingHeight" label="Высота помещения на 1 этаже" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 2400" unit="мм">
                      <MeasurementHelp scheme={schemes.roomHeight}>
                        {isHome ? (
                          <p>Измерьте расстояние от чистового пола до нижней поверхности чистового потолка.</p>
                        ) : (
                          <>
                            <p>Измерьте расстояние от чистового пола до нижней поверхности чистового потолка.</p>
                            <p>Если пол или потолок ещё будут подшиваться либо облицовываться, вычтите толщину будущей отделки из общей высоты.</p>
                            <p><strong>Чистовая высота = общая высота − отделка пола − отделка потолка.</strong></p>
                          </>
                        )}
                      </MeasurementHelp>
                    </MeasurementField>
                    <MeasurementField draft={intake} field="floorThickness" label="Толщина перекрытия над 1 этажом" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="200" unit="мм">
                      <MeasurementHelp scheme={schemes.floorThickness}>
                        {isHome ? (
                          <p>Уточните фактическую толщину перекрытия по проекту или доступному открытому участку конструкции.</p>
                        ) : (
                          <>
                            <p>Обычно перекрытие принимают равным 200 мм, поэтому это значение указано в поле по умолчанию.</p>
                            <p>Для точного размера измерьте видимую толщину перекрытия в проёме лестницы между первым и вторым этажами. Если над первым этажом находится чердак и есть люк, снимите этот размер в проёме люка.</p>
                          </>
                        )}
                      </MeasurementHelp>
                    </MeasurementField>
                    {Number(intake.levels) >= 2 ? <>
                      <MeasurementField draft={intake} field="secondCeilingHeight" label="Высота помещения на 2 этаже" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 2400" unit="мм">
                        <MeasurementHelp scheme={schemes.roomHeight}><p>Измерьте отдельную чистовую высоту второго этажа. Если она совпадает с первым, всё равно укажите значение — оно задаёт точную координату следующего перекрытия.</p></MeasurementHelp>
                      </MeasurementField>
                      <MeasurementField draft={intake} field="secondFloorThickness" label="Толщина перекрытия над 2 этажом" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 200" unit="мм">
                        <MeasurementHelp scheme={schemes.floorThickness}><p>Укажите толщину именно второго перекрытия. Внутри этого интервала конфигуратор запретит стыки труб.</p></MeasurementHelp>
                      </MeasurementField>
                    </> : null}
                    {Number(intake.levels) >= 3 ? <>
                      <MeasurementField draft={intake} field="thirdCeilingHeight" label="Высота помещения на 3 этаже" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 2400" unit="мм">
                        <MeasurementHelp scheme={schemes.roomHeight}><p>Измерьте чистовую высоту третьего этажа для расчёта абсолютной отметки прохода.</p></MeasurementHelp>
                      </MeasurementField>
                      <MeasurementField draft={intake} field="thirdFloorThickness" label="Толщина перекрытия над 3 этажом" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 200" unit="мм">
                        <MeasurementHelp scheme={schemes.floorThickness}><p>Укажите полную толщину третьего перекрытия. Стык внутри этого диапазона будет считаться ошибкой.</p></MeasurementHelp>
                      </MeasurementField>
                    </> : null}
                    <MeasurementField allowDefer={false} draft={intake} field="ridgeHeight" label="Высота дома в коньке" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 5200" required unit="мм">
                      <MeasurementHelp scheme={schemes.ridgeHeight}>
                        <p>Измерьте вертикальную отметку от чистового пола первого этажа до внутренней нижней грани конька.</p>
                        <p>На чертеже эта отметка задаёт положение конька. Правый скат показывается пунктиром как контур здания, а рабочая трасса располагается слева.</p>
                      </MeasurementHelp>
                    </MeasurementField>
                    <MeasurementField allowDefer={false} draft={intake} field="ridgeHorizontalDistance" label="От оси дымохода до конька" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 3500" required unit="мм">
                      <MeasurementHelp scheme={schemes.ridgeHorizontalDistance}>
                        <p>Измерьте горизонтальное расстояние в плане от вертикальной оси будущего дымохода до пика конька. Не измеряйте по поверхности ската.</p>
                        <p>До 1,5 м, от 1,5 до 3 м и свыше 3 м применяются разные правила определения минимальной отметки устья.</p>
                      </MeasurementHelp>
                    </MeasurementField>
                    <MeasurementField draft={intake} field="roofAngle" label="Угол кровли" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Если известен" unit="°">
                      <MeasurementHelp scheme={schemes.atticRoof}><p>Если угол указан в проекте дома, используйте это значение. Иначе оставьте поле для последующего замера — нормативные выводы по углу здесь не делаются.</p></MeasurementHelp>
                    </MeasurementField>
                    <MeasurementField draft={intake} field="roofThickness" label="Толщина кровельного пирога" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="По линии прохода" unit="мм">
                      <MeasurementHelp scheme={schemes.atticRoof}><p>Укажите толщину кровельной конструкции по линии трубы. Этот диапазон станет отдельной зоной, внутри которой стыки запрещены.</p></MeasurementHelp>
                    </MeasurementField>
                    {intake.hasAttic ? <MeasurementField draft={intake} field="atticHeight" label="Высота чердака по пути трассы" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="По вертикали" unit="мм">
                      <MeasurementHelp scheme={schemes.atticRoof}><p>Измерьте вертикальное расстояние внутри чердака в предполагаемом месте прохождения дымохода.</p></MeasurementHelp>
                    </MeasurementField> : null}
                    <div className={`${styles.measurementField} ${styles.fieldWide}`}>
                      <label className={styles.checkField}>
                        <input
                          checked={intake.hasAttic}
                          onChange={(event) => update("hasAttic", event.target.checked)}
                          type="checkbox"
                        />
                        <span>
                          <strong>Есть чердак</strong>
                          <small>Отметьте, если трасса проходит через чердачное пространство.</small>
                        </span>
                      </label>
                      <MeasurementHelp scheme={schemes.atticRoof} title="Как определить наличие чердака?">
                        <p>Отметьте чердак, если между потолком верхнего помещения и кровлей есть отдельное пространство, через которое пройдёт трасса.</p>
                      </MeasurementHelp>
                    </div>
                  </div>
                </>
              ) : intake.route === "wall" ? (
                <div className={styles.fieldGrid}>
                  <MeasurementField draft={intake} field="verticalRise" label="Подъём от печи до поворота" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Вертикальный участок" unit="мм">
                    <MeasurementHelp scheme={schemes.topOutletWall}><p>Измерьте вертикальный участок от верхней грани печи до предполагаемого поворота в сторону стены.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="wallExitHeight" label="Высота точки выхода через стену" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="От уровня пола" unit="м">
                    <MeasurementHelp scheme={schemes.topOutletWall}><p>Измерьте предполагаемую точку центра прохода от чистового пола и зафиксируйте материал стены для последующей проверки.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="wallDistance" label="От оси патрубка до внутренней стены" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="По горизонтали" unit="мм">
                    <MeasurementHelp scheme={schemes.topOutletWall}><p>Измерьте горизонтально от оси патрубка до внутренней поверхности стены по предполагаемой линии дымохода.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="wallThickness" label="Толщина стены" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Полная толщина" unit="мм">
                    <MeasurementHelp scheme={schemes.exteriorRoute}><p>Измерьте полную толщину стены от внутренней до наружной поверхности в месте предполагаемого прохода.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="roofOverhang" label="От фасада до края выноса кровли" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Горизонтальный размер" unit="мм">
                    <MeasurementHelp scheme={schemes.exteriorRoute}>
                      <p>Измерьте горизонтально от плоскости фасада до наружного края свеса кровли.</p>
                      <p><strong>Вынос оси трубы рассчитаем автоматически: размер выноса кровли + 100 мм.</strong></p>
                    </MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="outdoorHeight" label="Высота наружной трассы" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Ориентировочно" unit="м">
                    <MeasurementHelp scheme={schemes.exteriorRoute}><p>Укажите известную вертикальную длину наружного участка. Окончательную геометрию и условия крепления проверяет специалист.</p></MeasurementHelp>
                  </MeasurementField>
                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span>Материал стены</span>
                    <input onChange={(event) => updateMeasurement("wallMaterial", event.target.value)} placeholder="Например, дерево, кирпич или газобетон" value={intake.wallMaterial} />
                  </label>
                </div>
              ) : (
                <div className={styles.fieldGrid}>
                  <MeasurementField draft={intake} field="wallDistance" label="От края патрубка до внутренней стены" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="По оси выхода" unit="мм">
                    <MeasurementHelp scheme={schemes.rearOutletWall}><p>Измерьте по оси выхода от наружной кромки заднего патрубка до внутренней поверхности стены.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="wallThickness" label="Толщина стены" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Полная толщина" unit="мм">
                    <MeasurementHelp scheme={schemes.exteriorRoute}><p>Измерьте полную толщину стены от внутренней до наружной поверхности в месте предполагаемого прохода.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="roofOverhang" label="От фасада до края выноса кровли" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Горизонтальный размер" unit="мм">
                    <MeasurementHelp scheme={schemes.exteriorRoute}>
                      <p>Измерьте горизонтально от плоскости фасада до наружного края свеса кровли.</p>
                      <p><strong>Вынос оси трубы рассчитаем автоматически: размер выноса кровли + 100 мм.</strong></p>
                    </MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="outdoorHeight" label="Высота наружной трассы" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Ориентировочно" unit="м">
                    <MeasurementHelp scheme={schemes.exteriorRoute}><p>Измерьте вертикальную длину наружной части трассы. Окончательную геометрию и крепления проверяет специалист.</p></MeasurementHelp>
                  </MeasurementField>
                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span>Материал стены</span>
                    <input onChange={(event) => updateMeasurement("wallMaterial", event.target.value)} placeholder="Например, дерево, кирпич или газобетон" value={intake.wallMaterial} />
                  </label>
                </div>
              )}
              <div className={styles.fieldGrid}>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Особенности маршрута</span>
                  <input onChange={(event) => updateMeasurement("routeNotes", event.target.value)} placeholder="Балки, обходы, выступы или другие важные детали" value={intake.routeNotes} />
                </label>
              </div>
            </section>
          ) : null}

          <section className={styles.intakeStep} aria-labelledby="photos-step-title">
            <div className={styles.stepHeading}>
              <span>{intake.route === "unknown" ? "Шаг 4" : "Шаг 5"}</span>
              <div>
                <h3 id="photos-step-title">Фото места установки</h3>
                <p>Желательно подготовить общий вид отопителя, патрубка и предполагаемых мест прохода. Это не обязательно для продолжения.</p>
              </div>
            </div>
            <label className={styles.photoReady}>
              <input checked={intake.photosReady} onChange={(event) => update("photosReady", event.target.checked)} type="checkbox" />
              <span>
                <strong>Фотографии подготовлены</strong>
                <small>Файлы можно будет приложить при отправке расчёта специалисту.</small>
              </span>
            </label>
          </section>
        </div>

        <div className={styles.intakeHandoff}>
          <div className={styles.profileSavePanel}>
            <div>
              <h3>{activeProfileId ? "Сохраните изменения" : "Сохраните замеры"}</h3>
              <p>Замеры останутся только в этом браузере. На другом устройстве список будет пустым.</p>
            </div>
            <label className={styles.profileNameField}>
              <span>Название профиля</span>
              <input
                aria-describedby="profile-save-message"
                aria-invalid={Boolean(profileError)}
                maxLength={80}
                onChange={(event) => {
                  setProfileName(event.target.value);
                  setProfileError("");
                  markProfileDirty();
                }}
                placeholder="Например, Баня — через перекрытия"
                required
                value={profileName}
              />
            </label>
            <div className={styles.profileActions}>
              <button className={styles.primaryButton} onClick={saveProfile} type="button">
                {activeProfileId ? "Сохранить изменения" : "Сохранить замеры"}
              </button>
              {activeProfileId ? (
                <button className={styles.profileCopyButton} onClick={startProfileCopy} type="button">
                  Создать другой вариант
                </button>
              ) : null}
            </div>
            <p
              className={profileError ? styles.profileError : styles.profileStatus}
              id="profile-save-message"
              role={profileError ? "alert" : "status"}
            >
              {profileError || profileStatus || "Введите понятное название, чтобы позже выбрать эти замеры в конфигураторе."}
            </p>
          </div>
          <div className={styles.profileContinue}>
            {activeProfileId && !profileDirty ? (
              <Link className={styles.primaryButton} href={configuratorHref}>
                Открыть в конфигураторе
                <ArrowRight size={18} aria-hidden />
              </Link>
            ) : (
              <button aria-describedby="profile-save-message" className={styles.primaryButton} disabled type="button">
                Сначала сохраните замеры
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
