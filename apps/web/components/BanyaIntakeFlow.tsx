"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import {
  createEmptyScenarioDraft,
  draftFieldStatus,
  scenarioDraftConfiguratorHref,
  type ScenarioConfiguratorDraft,
  type DraftFieldStatus,
} from "@/lib/configuratorDraft";
import type { ScenarioPageContent } from "@/lib/scenarioPages";
import styles from "./ScenarioPageTemplate.module.css";

type BanyaIntakeFlowProps = {
  content: ScenarioPageContent;
  assetBasePath?: string;
};

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
  onChange: (field: keyof ScenarioConfiguratorDraft, value: string) => void;
  onDefer: (field: keyof ScenarioConfiguratorDraft) => void;
  children?: ReactNode;
};

function MeasurementField({ draft, field, label, placeholder, unit, numeric = true, onChange, onDefer, children }: MeasurementFieldProps) {
  const value = typeof draft[field] === "string" ? String(draft[field]) : "";
  const status = draftFieldStatus(draft, field);
  return (
    <div className={styles.measurementField}>
      <label className={styles.field}>
        <span>{label}{unit ? `, ${unit}` : ""}</span>
        <input
          inputMode={numeric ? "decimal" : undefined}
          min={numeric ? "0" : undefined}
          onChange={(event) => onChange(field, event.target.value)}
          placeholder={placeholder}
          type={numeric ? "number" : "text"}
          value={value}
        />
      </label>
      <div className={styles.fieldMeta}>
        <span data-status={status}>{statusLabels[status]}</span>
        {status !== "known" ? (
          <button onClick={() => onDefer(field)} type="button">
            {status === "later" ? "Вернуть к замеру" : "Уточнить позже"}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function MeasurementHelp({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <details className={styles.measureHelp}>
      <summary>
        <span>{title ?? "Как измерить?"}</span>
        <ChevronDown size={17} aria-hidden />
      </summary>
      <div className={styles.measureHelpBody}>
        <div>{children}</div>
        <div className={styles.schemePlaceholder} aria-label="Место для схемы замера">
          <span>Схема замера</span>
          <small>будет добавлена после проверки специалистом</small>
        </div>
      </div>
    </details>
  );
}

export function BanyaIntakeFlow({ content, assetBasePath = "" }: BanyaIntakeFlowProps) {
  const scenario = content.slug === "dom" ? "dom" : "banya";
  const emptyDraft = createEmptyScenarioDraft(scenario);
  const isHome = scenario === "dom";
  const storageKey = `dimohod-trade:${scenario}-intake`;
  const [intake, setIntake] = useState<ScenarioConfiguratorDraft>(emptyDraft);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      if (saved) {
        const savedDraft = JSON.parse(saved) as Partial<ScenarioConfiguratorDraft>;
        setIntake({
          ...emptyDraft,
          ...savedDraft,
          floorThickness: savedDraft.floorThickness || emptyDraft.floorThickness,
          scenario,
        });
      }
    } catch {
      // The form remains usable when browser storage is unavailable.
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(intake));
    } catch {
      // Values still remain available for the current render.
    }
  }, [intake, isReady]);

  const configuratorHref = scenarioDraftConfiguratorHref(intake);

  const update = <Key extends keyof ScenarioConfiguratorDraft>(key: Key, value: ScenarioConfiguratorDraft[Key]) => {
    setIntake((current) => ({ ...current, [key]: value }));
  };

  const updateMeasurement = (field: keyof ScenarioConfiguratorDraft, value: string) => {
    setIntake((current) => ({
      ...current,
      [field]: value,
      deferredFields: current.deferredFields.filter((item) => item !== field),
    }));
  };

  const toggleDeferred = (field: keyof ScenarioConfiguratorDraft) => {
    setIntake((current) => ({
      ...current,
      [field]: "",
      deferredFields: current.deferredFields.includes(field)
        ? current.deferredFields.filter((item) => item !== field)
        : [...current.deferredFields, field],
    }));
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
                  {isHome ? "Какой у вас отопитель?" : "Какая у вас печь?"}
                </h3>
                <p>
                  {isHome
                    ? "Тип, модель и паспорт отопителя дают исходные требования производителя к подключению дымохода."
                    : "Модель и паспорт печи дают исходные требования производителя к подключению дымохода."}
                </p>
              </div>
            </div>
            {isHome ? (
              <fieldset className={styles.choiceFieldset}>
                <legend>Тип отопителя</legend>
                <div className={styles.choiceRow}>
                  {[
                    ["pech", "Отопительная печь"],
                    ["kamin", "Камин"],
                    ["tt-kotel", "Твердотопливный котёл"],
                    ["gaz", "Газовый котёл"],
                    ["", "Пока не выбран"],
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
                <p className={styles.choiceContext}>
                  {intake.equipmentType === "gaz" ? (
                    <>
                      Для газового котла сначала откройте{" "}
                      <Link href="/solutions/gazovyy-kotel">отдельный сценарий</Link>:
                      допустимый вариант подключения проверяется по документации модели.
                    </>
                  ) : (
                    <>
                      Подробные вопросы по оборудованию: <Link href="/solutions/pech">печь</Link>,{" "}
                      <Link href="/solutions/kamin">камин</Link> или{" "}
                      <Link href="/solutions/tverdotoplivny-kotel">твердотопливный котёл</Link>.
                    </>
                  )}
                </p>
              </fieldset>
            ) : null}
            <div className={styles.fieldGrid}>
              <div className={styles.measurementField}>
                <label className={styles.field}>
                  <span>Производитель</span>
                  <input autoComplete="organization" onChange={(event) => updateMeasurement("manufacturer", event.target.value)} placeholder="Укажите, если известен" value={intake.manufacturer} />
                </label>
                <div className={styles.fieldMeta}>
                  <span data-status={draftFieldStatus(intake, "manufacturer")}>{statusLabels[draftFieldStatus(intake, "manufacturer")]}</span>
                </div>
              </div>
              <div className={styles.measurementField}>
                <label className={styles.field}>
                  <span>Модель</span>
                  <input onChange={(event) => updateMeasurement("model", event.target.value)} placeholder="Можно указать позже" value={intake.model} />
                </label>
                <div className={styles.fieldMeta}>
                  <span data-status={draftFieldStatus(intake, "model")}>{statusLabels[draftFieldStatus(intake, "model")]}</span>
                  {draftFieldStatus(intake, "model") !== "known" ? <button onClick={() => toggleDeferred("model")} type="button">{draftFieldStatus(intake, "model") === "later" ? "Вернуть к уточнению" : "Уточнить позже"}</button> : null}
                </div>
              </div>
            </div>
            <details className={styles.inlineHelp}>
              <summary>
                <span>Зачем нужна точная модель?</span>
                <ChevronDown size={19} aria-hidden />
              </summary>
              <div>
                <p>В паспорте конкретного оборудования проверяют разрешённое топливо, размер, форму и направление выходного патрубка, а также требования производителя к дымовому каналу и его обслуживанию.</p>
                <p>Если модель ещё не выбрана, маршрут можно начать собирать сейчас, а соединительные параметры оставить для уточнения.</p>
              </div>
            </details>
          </section>

          <section className={styles.intakeStep} aria-labelledby="building-step-title">
            <div className={styles.stepHeading}>
              <span>Шаг 2</span>
              <div>
                <h3 id="building-step-title">Параметры здания</h3>
                <p>Укажите этажность и основные высоты по предполагаемому пути дымохода.</p>
              </div>
            </div>

            <fieldset className={styles.choiceFieldset}>
              <legend>Количество этажей</legend>
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
              <MeasurementHelp title="Как определить этажность?">
                <p>Схему подсчёта этажей по пути дымохода добавим сюда после загрузки и проверки изображения.</p>
              </MeasurementHelp>
            </fieldset>

            <div className={styles.fieldGrid}>
              <MeasurementField draft={intake} field="ceilingHeight" label="Высота от пола до потолка" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 2400" unit="мм">
                <MeasurementHelp><p>Схему замера высоты помещения добавим сюда после загрузки и проверки изображения.</p></MeasurementHelp>
              </MeasurementField>
              <MeasurementField draft={intake} field="floorThickness" label="Высота перекрытия" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="200" unit="мм">
                <MeasurementHelp><p>Сейчас подставлено начальное значение 200 мм. После загрузки схемы здесь будет показано, между какими точками снимать фактический размер.</p></MeasurementHelp>
              </MeasurementField>
              <div className={`${styles.measurementField} ${styles.fieldWide}`}>
                <label className={styles.checkField}>
                  <input
                    checked={intake.hasAttic}
                    onChange={(event) => update("hasAttic", event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <strong>Есть чердак</strong>
                    <small>Отметьте, если над помещением есть чердачное пространство.</small>
                  </span>
                </label>
                <MeasurementHelp title="Как определить наличие чердака?">
                  <p>Схему с вариантами здания добавим сюда после загрузки и проверки изображения.</p>
                </MeasurementHelp>
              </div>
            </div>
          </section>

          <section className={styles.intakeStep} aria-labelledby="outlet-step-title">
            <div className={styles.stepHeading}>
              <span>Шаг 3</span>
              <div>
                <h3 id="outlet-step-title">Печь и подключение дымохода</h3>
                <p>Укажите положение патрубка и контрольные размеры отопителя.</p>
              </div>
            </div>

            <fieldset className={styles.choiceFieldset}>
              <legend>Положение патрубка отопителя</legend>
              <div className={styles.choiceRow}>
                <label>
                  <input checked={intake.outlet === "top"} name={`${scenario}-outlet`} onChange={() => update("outlet", "top")} type="radio" />
                  <span>Сверху</span>
                </label>
                <label>
                  <input checked={intake.outlet === "rear"} name={`${scenario}-outlet`} onChange={() => update("outlet", "rear")} type="radio" />
                  <span>Сзади / сбоку</span>
                </label>
              </div>
              <MeasurementHelp title="Как определить положение патрубка?">
                <p>Схему верхнего, заднего и бокового подключения добавим сюда после загрузки и проверки изображения.</p>
              </MeasurementHelp>
            </fieldset>

            <div className={styles.fieldGrid}>
              <MeasurementField draft={intake} field="connectionHeight" label={isHome ? "Высота отопителя или точки подключения" : "Высота печи или точки подключения"} onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Укажите контрольный размер" unit="мм">
                <MeasurementHelp><p>Схему замера высоты печи и точки подключения добавим сюда после загрузки и проверки изображения.</p></MeasurementHelp>
              </MeasurementField>
              <MeasurementField draft={intake} field="diameter" label="Контрольный замер диаметра патрубка" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Фактический диаметр" unit="мм">
                <MeasurementHelp><p>Схему контрольного замера диаметра патрубка добавим сюда после загрузки и проверки изображения.</p></MeasurementHelp>
              </MeasurementField>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Форма и особенности соединения</span>
                <input onChange={(event) => update("connectionDetails", event.target.value)} placeholder="Например, овальный выход или переход — если известно" value={intake.connectionDetails} />
              </label>
            </div>
          </section>

          <section className={styles.intakeStep} aria-labelledby="route-step-title">
            <div className={styles.stepHeading}>
              <span>Шаг 4</span>
              <div>
                <h3 id="route-step-title">Как пойдёт дымоход?</h3>
                <p>Выберите наиболее похожий вариант. Его можно изменить позже.</p>
              </div>
            </div>
            <fieldset className={styles.routeChoices}>
              <legend className={styles.visuallyHidden}>Маршрут дымохода</legend>
              {content.routeOptions.map((option, index) => {
                const value = index === 0 ? "ceiling" as const : "wall" as const;
                const selected = intake.route === value;
                return (
                  <label className={styles.routeChoice} data-selected={selected || undefined} key={option.slug}>
                    <input
                      checked={selected}
                      name={`${scenario}-route`}
                      onChange={() => update("route", value)}
                      type="radio"
                      value={value}
                    />
                    {option.image ? (
                      <span className={styles.routeChoiceImage}>
                        <Image
                          alt={`Схема маршрута: ${option.title}`}
                          fill
                          loading="lazy"
                          quality={72}
                          sizes="(max-width: 620px) calc(100vw - 64px), 50vw"
                          src={`${assetBasePath}${option.image}`}
                        />
                      </span>
                    ) : null}
                    <span className={styles.routeChoiceBody}>
                      <strong>{option.title}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
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
                <span>Шаг 5</span>
                <div>
                  <h3 id="measurements-step-title">Размеры выбранного маршрута</h3>
                  <p>Показываем только те замеры, которые относятся к выбранному варианту.</p>
                </div>
              </div>

              {intake.route === "ceiling" ? (
                <div className={styles.fieldGrid}>
                  <MeasurementField draft={intake} field="routeHeight" label="Ориентировочная высота всей трассы" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Можно уточнить позже" unit="м">
                    <MeasurementHelp><p>Сложите известные вертикальные участки от точки подключения до предполагаемого завершения трассы. Это исходный размер, не окончательная высота системы.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="roofAngle" label="Угол кровли" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Если известен" unit="°">
                    <MeasurementHelp><p>Если угол указан в проекте дома, используйте это значение. Иначе оставьте поле для последующего замера — нормативные выводы по углу здесь не делаются.</p></MeasurementHelp>
                  </MeasurementField>
                </div>
              ) : (
                <div className={styles.fieldGrid}>
                  <MeasurementField draft={intake} field="wallExitHeight" label="Высота точки выхода через стену" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="От уровня пола" unit="м">
                    <MeasurementHelp><p>Измерьте предполагаемую точку центра прохода от понятного уровня пола и зафиксируйте материал стены для последующей проверки.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="wallDistance" label="Расстояние от печи до стены" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="По предполагаемой оси" unit="м">
                    <MeasurementHelp><p>Измерьте горизонтальный участок от точки подключения до предполагаемого выхода. Повороты и особенности соединения отметьте в поле патрубка.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="outdoorHeight" label="Высота наружной трассы" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Ориентировочно" unit="м">
                    <MeasurementHelp><p>Укажите известную вертикальную длину наружного участка. Окончательную геометрию и условия крепления проверяет специалист.</p></MeasurementHelp>
                  </MeasurementField>
                </div>
              )}
            </section>
          ) : null}

          <section className={styles.intakeStep} aria-labelledby="photos-step-title">
            <div className={styles.stepHeading}>
              <span>{intake.route === "unknown" ? "Шаг 5" : "Шаг 6"}</span>
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
          <div>
            <h3>Известные данные уже сохранены</h3>
            <p>Продолжите построение трассы в едином конфигураторе. Перед заказом состав проверит специалист.</p>
          </div>
          <Link className={styles.primaryButton} href={configuratorHref}>
            Продолжить в конфигураторе
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
