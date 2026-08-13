"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import {
  banyaDraftConfiguratorHref,
  draftFieldStatus,
  emptyBanyaDraft,
  type BanyaConfiguratorDraft,
  type DraftFieldStatus,
} from "@/lib/configuratorDraft";
import type { ScenarioPageContent } from "@/lib/scenarioPages";
import styles from "./ScenarioPageTemplate.module.css";

type BanyaIntakeFlowProps = {
  content: ScenarioPageContent;
  assetBasePath?: string;
};

const STORAGE_KEY = "dimohod-trade:banya-intake";

const statusLabels: Record<DraftFieldStatus, string> = {
  known: "✓ известно",
  measure: "○ нужно измерить",
  later: "? уточнить позже",
};

type MeasurementFieldProps = {
  draft: BanyaConfiguratorDraft;
  field: keyof BanyaConfiguratorDraft;
  label: string;
  placeholder: string;
  unit?: string;
  numeric?: boolean;
  onChange: (field: keyof BanyaConfiguratorDraft, value: string) => void;
  onDefer: (field: keyof BanyaConfiguratorDraft) => void;
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
  const [intake, setIntake] = useState<BanyaConfiguratorDraft>(emptyBanyaDraft);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved) setIntake({ ...emptyBanyaDraft, ...JSON.parse(saved) });
    } catch {
      // The form remains usable when browser storage is unavailable.
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intake));
    } catch {
      // Values still remain available for the current render.
    }
  }, [intake, isReady]);

  const configuratorHref = banyaDraftConfiguratorHref(intake);

  const update = <Key extends keyof BanyaConfiguratorDraft>(key: Key, value: BanyaConfiguratorDraft[Key]) => {
    setIntake((current) => ({ ...current, [key]: value }));
  };

  const updateMeasurement = (field: keyof BanyaConfiguratorDraft, value: string) => {
    setIntake((current) => ({
      ...current,
      [field]: value,
      deferredFields: current.deferredFields.filter((item) => item !== field),
    }));
  };

  const toggleDeferred = (field: keyof BanyaConfiguratorDraft) => {
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
                <h3 id="stove-step-title">Какая у вас печь?</h3>
                <p>Модель и паспорт печи дают исходные требования производителя к подключению дымохода.</p>
              </div>
            </div>
            <div className={styles.fieldGrid}>
              <div className={styles.measurementField}>
                <label className={styles.field}>
                  <span>Производитель</span>
                  <input autoComplete="organization" onChange={(event) => updateMeasurement("manufacturer", event.target.value)} placeholder="Например, TMF" value={intake.manufacturer} />
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
                <p>В паспорте конкретной печи проверяют разрешённое топливо, размер, форму и направление выходного патрубка, а также требования производителя к дымовому каналу и его обслуживанию.</p>
                <p>Если модель ещё не выбрана, маршрут можно начать собирать сейчас, а соединительные параметры оставить для уточнения.</p>
              </div>
            </details>
          </section>

          <section className={styles.intakeStep} aria-labelledby="outlet-step-title">
            <div className={styles.stepHeading}>
              <span>Шаг 2</span>
              <div>
                <h3 id="outlet-step-title">Как расположен выход дымохода?</h3>
                <p>Укажите известные параметры патрубка и положение точки подключения.</p>
              </div>
            </div>

            <fieldset className={styles.choiceFieldset}>
              <legend>Направление выхода</legend>
              <div className={styles.choiceRow}>
                <label>
                  <input
                    checked={intake.outlet === "top"}
                    name="banya-outlet"
                    onChange={() => update("outlet", "top")}
                    type="radio"
                  />
                  <span>Сверху</span>
                </label>
                <label>
                  <input
                    checked={intake.outlet === "rear"}
                    name="banya-outlet"
                    onChange={() => update("outlet", "rear")}
                    type="radio"
                  />
                  <span>Сзади / сбоку</span>
                </label>
              </div>
            </fieldset>

            <div className={styles.fieldGrid}>
              <MeasurementField draft={intake} field="diameter" label="Диаметр патрубка" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="По паспорту печи" unit="мм" />
              <MeasurementField draft={intake} field="connectionHeight" label="Высота печи или точки подключения" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Если известна" unit="мм" />
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Форма и особенности соединения</span>
                <input
                  onChange={(event) => update("connectionDetails", event.target.value)}
                  placeholder="Например, овальный выход или переход — если известно"
                  value={intake.connectionDetails}
                />
              </label>
            </div>

            <details className={styles.inlineHelp}>
              <summary>
                <span>Как узнать диаметр?</span>
                <ChevronDown size={19} aria-hidden />
              </summary>
              <div>
                <p>Сначала найдите присоединительный размер в паспорте печи. Если его нет под рукой, зафиксируйте маркировку оборудования и измерьте доступные внутренний и наружный размеры на остывшем, неработающем оборудовании.</p>
                <p>Не уменьшайте сечение только ради подключения к существующим трубам. Размер и допустимость перехода проверяет специалист по документации печи и выбранной системе.</p>
              </div>
            </details>
          </section>

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
              {content.routeOptions.map((option, index) => {
                const value = index === 0 ? "ceiling" as const : "wall" as const;
                const selected = intake.route === value;
                return (
                  <label className={styles.routeChoice} data-selected={selected || undefined} key={option.slug}>
                    <input
                      checked={selected}
                      name="banya-route"
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
                <input checked={intake.route === "unknown"} name="banya-route" onChange={() => update("route", "unknown")} type="radio" value="unknown" />
                <span className={styles.routeChoiceBody}>
                  <strong>Пока не знаю</strong>
                  <small>Сохраните данные о печи и патрубке. Маршрут можно выбрать после замеров или консультации.</small>
                </span>
              </label>
            </fieldset>
          </section>

          {intake.route !== "unknown" ? (
            <section className={styles.intakeStep} aria-labelledby="measurements-step-title">
              <div className={styles.stepHeading}>
                <span>Шаг 4</span>
                <div>
                  <h3 id="measurements-step-title">Размеры выбранного маршрута</h3>
                  <p>Показываем только те замеры, которые относятся к выбранному варианту.</p>
                </div>
              </div>

              {intake.route === "ceiling" ? (
                <div className={styles.fieldGrid}>
                  <MeasurementField draft={intake} field="ceilingHeight" label="От пола до потолка" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Измерьте по вертикали" unit="м">
                    <MeasurementHelp><p>Зафиксируйте высоту помещения по предполагаемой оси дымохода. Если пол или потолок имеют перепад, отметьте это отдельно.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="floorThickness" label="Толщина перекрытия" onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Если доступна" unit="мм">
                    <MeasurementHelp><p>Укажите фактическую толщину конструкции в месте предполагаемого прохода. Состав конструкции и допустимый узел затем проверяет специалист.</p></MeasurementHelp>
                  </MeasurementField>
                  <MeasurementField draft={intake} field="levels" label="Этажи, перекрытия и чердак на пути" numeric={false} onChange={updateMeasurement} onDefer={toggleDeferred} placeholder="Например, 1 этаж и холодный чердак" />
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
              <span>{intake.route === "unknown" ? "Шаг 4" : "Шаг 5"}</span>
              <div>
                <h3 id="photos-step-title">Фото места установки</h3>
                <p>Желательно подготовить общий вид печи, патрубка и предполагаемых мест прохода. Это не обязательно для продолжения.</p>
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
