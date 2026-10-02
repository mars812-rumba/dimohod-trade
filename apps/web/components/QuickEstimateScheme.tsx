import type { ChimneyBomLine } from "@/lib/chimneyCalculation";
import {
  QUICK_ESTIMATE_ATTIC_HEIGHT_MM,
  QUICK_ESTIMATE_DEFAULT_DIAMETER_MM,
  QUICK_ESTIMATE_FLOOR_HEIGHT_MM,
  QUICK_ESTIMATE_FLOOR_THICKNESS_MM,
  QUICK_ESTIMATE_HEATER_HEIGHT_MM,
  QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM,
  type QuickEstimateAnswers,
} from "@/lib/homeQuickEstimate";
import styles from "./QuickEstimateScheme.module.css";

type QuickEstimateSchemeProps = {
  answers: QuickEstimateAnswers;
  bom: ChimneyBomLine[];
};

function meters(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

function pipeQuantity(bom: ChimneyBomLine[], contour: ChimneyBomLine["contour"]) {
  return bom
    .filter((line) => line.productKind === "труба" && line.contour === contour && !line.key.includes("tee-lower"))
    .reduce((sum, line) => sum + line.quantity, 0);
}

function CeilingScheme({ answers, bom }: QuickEstimateSchemeProps) {
  const floorTop = 448;
  const roofBase = answers.hasAttic ? 120 : 160;
  const roomTop = answers.hasAttic ? 218 : roofBase;
  const roomHeight = floorTop - roomTop;
  const storeyHeight = roomHeight / answers.floors;
  const chimneyX = answers.outlet === "rear" ? 222 : 166;
  const heaterX = answers.outlet === "rear" ? 92 : chimneyX - 32;
  const pipeStartY = floorTop - 64;
  const transitionY = pipeStartY - 76;
  const terminationY = 54;
  const sandwichQuantity = pipeQuantity(bom, "сэндвич");
  const segmentCount = Math.max(1, Math.min(8, sandwichQuantity));
  const segmentHeight = (transitionY - terminationY) / segmentCount;
  const diameter = answers.diameterMm ?? QUICK_ESTIMATE_DEFAULT_DIAMETER_MM;

  return (
    <svg className={styles.svg} viewBox="0 0 440 540" role="img" aria-labelledby="quick-ceiling-title quick-ceiling-desc">
      <title id="quick-ceiling-title">Предварительная схема дымохода через перекрытия и кровлю</title>
      <desc id="quick-ceiling-desc">
        Условный разрез дома с отопителем, одноконтурным разгоном, сэндвич-трубами, перекрытиями толщиной 200 миллиметров и кровельным проходом. Неполученные размеры отмечены как принятые предварительно.
      </desc>
      <rect className={styles.paper} width="440" height="540" rx="12" />

      <g aria-hidden="true">
        <path className={styles.roof} d="M54 160 L222 54 L390 160" />
        <path className={styles.roofInner} d="M68 168 L222 72 L376 168" />
        <line className={styles.wall} x1="62" y1={roofBase} x2="62" y2={floorTop} />
        <line className={styles.wall} x1="382" y1={roofBase} x2="382" y2={floorTop} />
        <line className={styles.floorLine} x1="48" y1={floorTop} x2="396" y2={floorTop} />
        {answers.hasAttic ? <>
          <rect className={styles.attic} x="62" y={roofBase} width="320" height={roomTop - roofBase} />
          <text className={styles.zoneLabel} x="78" y="145">ХОЛОДНЫЙ ЧЕРДАК</text>
        </> : null}
        {Array.from({ length: answers.floors - 1 }, (_, index) => {
          const y = roomTop + storeyHeight * (index + 1);
          return <g key={`floor-${index}`}>
            <rect className={styles.slab} x="62" y={y - 7} width="320" height="14" />
            <line className={styles.slabEdge} x1="62" y1={y - 7} x2="382" y2={y - 7} />
            <line className={styles.slabEdge} x1="62" y1={y + 7} x2="382" y2={y + 7} />
          </g>;
        })}
        <rect className={styles.slab} x="62" y={roomTop - 7} width="320" height="14" />
      </g>

      <g>
        <rect className={styles.heater} x={heaterX} y={floorTop - 64} width="64" height="64" rx="5" />
        <rect className={styles.heaterDoor} x={heaterX + 17} y={floorTop - 42} width="30" height="22" rx="2" />
        <text className={styles.heaterLabel} x={heaterX + 32} y={floorTop + 21} textAnchor="middle">ОТОПИТЕЛЬ</text>

        {answers.outlet === "rear" ? <>
          <line className={styles.singlePipe} x1={heaterX + 64} y1={pipeStartY} x2={chimneyX - 9} y2={pipeStartY} />
          <path className={styles.singleElbow} d={`M${chimneyX - 9} ${pipeStartY} Q${chimneyX} ${pipeStartY} ${chimneyX} ${pipeStartY - 9}`} />
          <circle className={styles.damper} cx={heaterX + 80} cy={pipeStartY} r="8" />
        </> : null}
        <line className={styles.singlePipe} x1={chimneyX} y1={pipeStartY} x2={chimneyX} y2={transitionY} />
        {answers.outlet === "top" ? <circle className={styles.damper} cx={chimneyX} cy={pipeStartY - 20} r="8" /> : null}
        <path className={styles.transition} d={`M${chimneyX - 9} ${transitionY + 12} L${chimneyX + 9} ${transitionY + 12} L${chimneyX + 16} ${transitionY} L${chimneyX - 16} ${transitionY} Z`} />

        {Array.from({ length: segmentCount }, (_, index) => {
          const y = transitionY - segmentHeight * (index + 1);
          return <g key={`sandwich-${index}`}>
            <rect className={index === segmentCount - 1 ? styles.sandwichFirst : styles.sandwich} x={chimneyX - 16} y={y} width="32" height={segmentHeight} />
            {index < segmentCount - 1 ? <line className={styles.joint} x1={chimneyX - 19} y1={y} x2={chimneyX + 19} y2={y} /> : null}
          </g>;
        })}
        <path className={styles.termination} d={`M${chimneyX - 20} ${terminationY} L${chimneyX} ${terminationY - 16} L${chimneyX + 20} ${terminationY} Z`} />
      </g>

      <g className={styles.callouts}>
        <line className={styles.leader} x1={chimneyX + 18} y1={transitionY + 34} x2="260" y2={transitionY + 34} />
        <text x="268" y={transitionY + 29}>Разгон 1000 мм · 0,8 мм</text>
        <text className={styles.secondaryText} x="268" y={transitionY + 47}>{answers.outlet === "rear" ? "шибер + отвод 90°" : "шибер + опорная заглушка"}</text>
        <line className={styles.leader} x1={chimneyX + 18} y1="104" x2="260" y2="104" />
        <text x="268" y="99">Сэндвич Ø{diameter}/{diameter + 100}</text>
        <text className={styles.secondaryText} x="268" y="117">{sandwichQuantity} шт. по 1000 мм</text>
      </g>

      <g className={styles.dimensions}>
        <line className={styles.defaultDimension} x1="24" y1={roomTop} x2="24" y2={floorTop} />
        <line className={styles.tick} x1="18" y1={roomTop} x2="30" y2={roomTop} />
        <line className={styles.tick} x1="18" y1={floorTop} x2="30" y2={floorTop} />
        <text className={styles.dimensionText} x="15" y={(roomTop + floorTop) / 2} transform={`rotate(-90 15 ${(roomTop + floorTop) / 2})`} textAnchor="middle">
          {answers.floors} эт. × {QUICK_ESTIMATE_FLOOR_HEIGHT_MM} мм · принято
        </text>
        <text className={styles.defaultLabel} x="76" y={roomTop - 16}>Перекрытие {QUICK_ESTIMATE_FLOOR_THICKNESS_MM} мм · стандарт</text>
        {answers.hasAttic ? <text className={styles.defaultLabel} x="76" y="190">Чердак {QUICK_ESTIMATE_ATTIC_HEIGHT_MM} мм · принято</text> : null}
        <text className={styles.defaultLabel} x="268" y="146">Над кровлей {QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM} мм · принято</text>
        <text className={styles.unknownLabel} x="268" y="166">Угол и конёк · уточнить</text>
      </g>
    </svg>
  );
}

function WallScheme({ answers, bom }: QuickEstimateSchemeProps) {
  const heaterX = 58;
  const heaterY = 386;
  const wallX = 222;
  const stackX = 330;
  const horizontalY = answers.outlet === "rear" ? heaterY + 22 : 310;
  const outdoorQuantity = Math.max(1, pipeQuantity(bom, "сэндвич"));
  const visibleQuantity = Math.min(8, outdoorQuantity);
  const stackTop = 74;
  const segmentHeight = (horizontalY - stackTop) / visibleQuantity;
  const distance = answers.wallDistanceM ?? 1.5;
  const diameter = answers.diameterMm ?? QUICK_ESTIMATE_DEFAULT_DIAMETER_MM;

  return (
    <svg className={styles.svg} viewBox="0 0 440 540" role="img" aria-labelledby="quick-wall-title quick-wall-desc">
      <title id="quick-wall-title">Предварительная схема дымохода через стену и по фасаду</title>
      <desc id="quick-wall-desc">
        Условный боковой вид отопителя, прохода через стену и наружного сэндвич-дымохода. Пользовательские размеры показаны отдельно от значений, принятых предварительно.
      </desc>
      <rect className={styles.paper} width="440" height="540" rx="12" />
      <rect className={styles.room} x="34" y="42" width={wallX - 34} height="430" />
      <rect className={styles.wallMass} x={wallX} y="42" width="24" height="430" />
      <line className={styles.ground} x1="26" y1="472" x2="410" y2="472" />
      <text className={styles.zoneLabel} x="48" y="68">ПОМЕЩЕНИЕ</text>
      <text className={styles.zoneLabel} x="272" y="68">ФАСАД</text>

      <rect className={styles.heater} x={heaterX} y={heaterY} width="68" height="86" rx="5" />
      <rect className={styles.heaterDoor} x={heaterX + 18} y={heaterY + 28} width="32" height="26" rx="2" />
      {answers.outlet === "top" ? <>
        <line className={styles.singlePipe} x1={heaterX + 34} y1={heaterY} x2={heaterX + 34} y2={horizontalY} />
        <path className={styles.singleElbow} d={`M${heaterX + 34} ${horizontalY} Q${heaterX + 34} ${horizontalY - 10} ${heaterX + 44} ${horizontalY - 10}`} />
        <line className={styles.singlePipe} x1={heaterX + 44} y1={horizontalY - 10} x2={wallX} y2={horizontalY - 10} />
        <circle className={styles.damper} cx={heaterX + 34} cy={heaterY - 24} r="8" />
      </> : <>
        <line className={styles.singlePipe} x1={heaterX + 68} y1={horizontalY} x2={wallX} y2={horizontalY} />
        <circle className={styles.damper} cx={heaterX + 84} cy={horizontalY} r="8" />
      </>}
      <rect className={styles.wallPassage} x={wallX - 4} y={horizontalY - 19} width="32" height="38" />
      <line className={styles.sandwichHorizontal} x1={wallX + 24} y1={horizontalY} x2={stackX} y2={horizontalY} />
      <path className={styles.tee} d={`M${stackX - 17} ${horizontalY + 22} L${stackX - 17} ${horizontalY - 16} L${stackX + 17} ${horizontalY - 16} L${stackX + 17} ${horizontalY + 22} Z`} />

      {Array.from({ length: visibleQuantity }, (_, index) => {
        const y = horizontalY - segmentHeight * (index + 1);
        return <g key={`outdoor-${index}`}>
          <rect className={index === visibleQuantity - 1 ? styles.sandwichFirst : styles.sandwich} x={stackX - 17} y={y} width="34" height={segmentHeight} />
          {index < visibleQuantity - 1 ? <line className={styles.joint} x1={stackX - 20} y1={y} x2={stackX + 20} y2={y} /> : null}
        </g>;
      })}
      <path className={styles.termination} d={`M${stackX - 21} ${stackTop} L${stackX} ${stackTop - 17} L${stackX + 21} ${stackTop} Z`} />
      <line className={styles.console} x1={stackX - 42} y1={horizontalY - 42} x2={stackX + 22} y2={horizontalY - 42} />
      <line className={styles.consoleBrace} x1={stackX - 42} y1={horizontalY - 42} x2={stackX - 17} y2={horizontalY - 18} />

      <g className={styles.callouts}>
        <line className={styles.leader} x1={stackX + 20} y1="125" x2="378" y2="125" />
        <text x="386" y="120" textAnchor="end">Сэндвич Ø{diameter}/{diameter + 100}</text>
        <text className={styles.secondaryText} x="386" y="138" textAnchor="end">{outdoorQuantity} шт. по 1000 мм</text>
        <line className={styles.leader} x1={heaterX + 34} y1={heaterY - 52} x2="142" y2={heaterY - 52} />
        <text x="150" y={heaterY - 57}>{answers.outlet === "top" ? "Разгон + отвод 90°" : "Шибер + заглушка"}</text>
        <text className={styles.secondaryText} x="150" y={heaterY - 39}>{answers.outlet === "top" ? "одностенная труба · 0,8 мм" : "заднее подключение"}</text>
      </g>

      <g className={styles.dimensions}>
        <line className={styles.userDimension} x1="396" y1={stackTop} x2="396" y2={horizontalY} />
        <line className={styles.userTick} x1="390" y1={stackTop} x2="402" y2={stackTop} />
        <line className={styles.userTick} x1="390" y1={horizontalY} x2="402" y2={horizontalY} />
        <text className={styles.userDimensionText} x="410" y={(stackTop + horizontalY) / 2} transform={`rotate(-90 410 ${(stackTop + horizontalY) / 2})`} textAnchor="middle">
          Высота {meters(answers.outdoorHeightM)} м · указано
        </text>
        <line className={answers.wallDistanceM === null ? styles.defaultDimension : styles.userDimension} x1={heaterX + 34} y1="504" x2={wallX} y2="504" />
        <text className={answers.wallDistanceM === null ? styles.dimensionText : styles.userDimensionText} x={(heaterX + 34 + wallX) / 2} y="525" textAnchor="middle">
          До стены {meters(distance)} м · {answers.wallDistanceM === null ? "принято" : "указано"}
        </text>
        <text className={styles.unknownLabel} x="48" y="92">Толщина стены и вынос кровли · уточнить</text>
      </g>
    </svg>
  );
}

export function QuickEstimateScheme(props: QuickEstimateSchemeProps) {
  const { answers } = props;
  const assumedItems = answers.route === "ceiling"
    ? [
      `высота этажа ${QUICK_ESTIMATE_FLOOR_HEIGHT_MM} мм`,
      `перекрытие ${QUICK_ESTIMATE_FLOOR_THICKNESS_MM} мм`,
      `высота отопителя ${QUICK_ESTIMATE_HEATER_HEIGHT_MM} мм`,
      ...(answers.hasAttic ? [`чердак ${QUICK_ESTIMATE_ATTIC_HEIGHT_MM} мм`] : []),
      `выход над кровлей ${QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM} мм`,
    ]
    : [
      ...(answers.wallDistanceM === null ? ["до стены 1,5 м"] : []),
      `диаметр Ø${answers.diameterMm ?? QUICK_ESTIMATE_DEFAULT_DIAMETER_MM} мм${answers.diameterMm === null ? "" : " (указан)"}`,
    ];

  return (
    <section className={styles.panel} aria-labelledby="quick-scheme-heading">
      <header className={styles.header}>
        <div>
          <h4 id="quick-scheme-heading">Предварительная схема дымохода</h4>
          <p>Построена только для быстрого расчёта. Это не монтажный проект.</p>
        </div>
        <span className={styles.status}>Схема открыта</span>
      </header>

      <div className={styles.frame}>
        {answers.route === "ceiling" ? <CeilingScheme {...props} /> : <WallScheme {...props} />}
      </div>

      <div className={styles.legend} aria-label="Обозначения схемы">
        <span><i className={styles.userKey} />Указано вами</span>
        <span><i className={styles.defaultKey} />Принято предварительно</span>
      </div>
      {assumedItems.length ? <p className={styles.assumptions}>
        <strong>Приняли для схемы:</strong> {assumedItems.join(" · ")}. Остальные размеры проверит менеджер.
      </p> : null}
    </section>
  );
}
