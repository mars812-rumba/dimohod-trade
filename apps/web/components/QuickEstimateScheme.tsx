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

type SchemeDetail = {
  marker: number;
  title: string;
  description: string;
  status: "user" | "assumed" | "review";
};

const statusLabels: Record<SchemeDetail["status"], string> = {
  user: "Указано вами",
  assumed: "Принято предварительно",
  review: "Нужно уточнить",
};

function meters(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

function pipeQuantity(bom: ChimneyBomLine[], contour: ChimneyBomLine["contour"]) {
  return bom
    .filter((line) => line.productKind === "труба" && line.contour === contour && !line.key.includes("tee-lower"))
    .reduce((sum, line) => sum + line.quantity, 0);
}

function Marker({ number, x, y }: { number: number; x: number; y: number }) {
  return <g className={styles.marker} transform={`translate(${x} ${y})`} aria-hidden="true">
    <circle r="15" />
    <text textAnchor="middle" dominantBaseline="central">{number}</text>
  </g>;
}

function DetailList({ items }: { items: SchemeDetail[] }) {
  return <ol className={styles.details} aria-label="Параметры предварительной схемы">
    {items.map((item) => <li key={item.marker}>
      <span className={styles.detailMarker}>{item.marker}</span>
      <span className={styles.detailCopy}>
        <strong>{item.title}</strong>
        <span>{item.description}</span>
      </span>
      <span className={`${styles.detailStatus} ${styles[item.status]}`}>{statusLabels[item.status]}</span>
    </li>)}
  </ol>;
}

function CeilingScheme({ answers, bom }: QuickEstimateSchemeProps) {
  const floorBottom = 426;
  const roofBase = answers.hasAttic ? 120 : 160;
  const roomTop = answers.hasAttic ? 218 : roofBase;
  const roomHeight = floorBottom - roomTop;
  const storeyHeight = roomHeight / answers.floors;
  const chimneyX = answers.outlet === "rear" ? 236 : 188;
  const heaterX = answers.outlet === "rear" ? 78 : chimneyX - 34;
  const pipeStartY = floorBottom - 72;
  const transitionY = pipeStartY - 72;
  const terminationY = 58;
  const sandwichQuantity = pipeQuantity(bom, "сэндвич");
  const segmentCount = Math.max(1, Math.min(8, sandwichQuantity));
  const segmentHeight = (transitionY - terminationY) / segmentCount;
  const diameter = answers.diameterMm ?? QUICK_ESTIMATE_DEFAULT_DIAMETER_MM;
  const details: SchemeDetail[] = [
    {
      marker: 1,
      title: answers.outlet === "rear" ? "Заднее подключение" : "Разгонная труба",
      description: answers.outlet === "rear"
        ? "Шибер, отвод 90° и разгон 1000 мм · сталь 0,8 мм"
        : "1000 мм · сталь 0,8 мм · шибер и опорная заглушка",
      status: "assumed",
    },
    {
      marker: 2,
      title: "Проходы через перекрытия",
      description: `${answers.floors} эт. × ${QUICK_ESTIMATE_FLOOR_HEIGHT_MM} мм · перекрытие ${QUICK_ESTIMATE_FLOOR_THICKNESS_MM} мм`,
      status: "assumed",
    },
    {
      marker: 3,
      title: `Сэндвич Ø${diameter}/${diameter + 100}`,
      description: `${sandwichQuantity} шт. по 1000 мм · первая 0,8 мм, остальные 0,5 мм`,
      status: answers.diameterMm === null ? "assumed" : "user",
    },
    {
      marker: 4,
      title: "Выход над кровлей",
      description: `${QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM} мм · угол кровли и положение конька проверит менеджер`,
      status: "review",
    },
  ];

  return <>
    <div className={styles.drawing}>
      <svg className={styles.svg} viewBox="0 0 440 490" role="img" aria-labelledby="quick-ceiling-title quick-ceiling-desc">
        <title id="quick-ceiling-title">Предварительная схема дымохода через перекрытия и кровлю</title>
        <desc id="quick-ceiling-desc">Условный разрез дома с отопителем, разгоном, сэндвич-трубами и перекрытиями толщиной 200 миллиметров.</desc>
        <rect className={styles.paper} width="440" height="490" rx="12" />
        <path className={styles.roof} d="M54 160 L220 58 L386 160" />
        <path className={styles.roofInner} d="M68 168 L220 76 L372 168" />
        <line className={styles.wall} x1="62" y1={roofBase} x2="62" y2={floorBottom} />
        <line className={styles.wall} x1="378" y1={roofBase} x2="378" y2={floorBottom} />
        <line className={styles.floorLine} x1="46" y1={floorBottom} x2="394" y2={floorBottom} />
        {answers.hasAttic ? <>
          <rect className={styles.attic} x="62" y={roofBase} width="316" height={roomTop - roofBase} />
          <text className={styles.zoneLabel} x="78" y="146">ХОЛОДНЫЙ ЧЕРДАК</text>
        </> : null}
        {Array.from({ length: answers.floors - 1 }, (_, index) => {
          const y = roomTop + storeyHeight * (index + 1);
          return <g key={`floor-${index}`}>
            <rect className={styles.slab} x="62" y={y - 7} width="316" height="14" />
            <line className={styles.slabEdge} x1="62" y1={y - 7} x2="378" y2={y - 7} />
            <line className={styles.slabEdge} x1="62" y1={y + 7} x2="378" y2={y + 7} />
          </g>;
        })}
        <rect className={styles.slab} x="62" y={roomTop - 7} width="316" height="14" />
        <rect className={styles.heater} x={heaterX} y={floorBottom - 72} width="68" height="72" rx="5" />
        <rect className={styles.heaterDoor} x={heaterX + 18} y={floorBottom - 47} width="32" height="24" rx="2" />
        <text className={styles.heaterLabel} x={heaterX + 34} y={floorBottom + 23} textAnchor="middle">ОТОПИТЕЛЬ</text>
        {answers.outlet === "rear" ? <>
          <line className={styles.singlePipe} x1={heaterX + 68} y1={pipeStartY} x2={chimneyX - 9} y2={pipeStartY} />
          <path className={styles.singleElbow} d={`M${chimneyX - 9} ${pipeStartY} Q${chimneyX} ${pipeStartY} ${chimneyX} ${pipeStartY - 9}`} />
          <circle className={styles.damper} cx={heaterX + 84} cy={pipeStartY} r="8" />
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
        <line className={styles.defaultDimension} x1="28" y1={roomTop} x2="28" y2={floorBottom} />
        <line className={styles.tick} x1="22" y1={roomTop} x2="34" y2={roomTop} />
        <line className={styles.tick} x1="22" y1={floorBottom} x2="34" y2={floorBottom} />
        <text className={styles.dimensionText} x="17" y={(roomTop + floorBottom) / 2} transform={`rotate(-90 17 ${(roomTop + floorBottom) / 2})`} textAnchor="middle">{answers.floors} эт. × 2,5 м</text>
        <line className={styles.defaultDimension} x1="406" y1="58" x2="406" y2={roofBase} />
        <line className={styles.tick} x1="400" y1="58" x2="412" y2="58" />
        <line className={styles.tick} x1="400" y1={roofBase} x2="412" y2={roofBase} />
        <text className={styles.dimensionText} x="419" y={(58 + roofBase) / 2} transform={`rotate(-90 419 ${(58 + roofBase) / 2})`} textAnchor="middle">1,5 м</text>
        <Marker number={1} x={answers.outlet === "rear" ? heaterX + 105 : chimneyX + 34} y={pipeStartY + 22} />
        <Marker number={2} x={92} y={roomTop + 24} />
        <Marker number={3} x={chimneyX + 38} y={112} />
        <Marker number={4} x={370} y={88} />
      </svg>
    </div>
    <DetailList items={details} />
  </>;
}

function WallScheme({ answers }: QuickEstimateSchemeProps) {
  const heaterX = 56;
  const heaterY = 342;
  const wallX = 218;
  const stackX = 326;
  const horizontalY = answers.outlet === "rear" ? heaterY + 24 : 278;
  const outdoorQuantity = Math.max(1, Math.ceil(answers.outdoorHeightM));
  const visibleQuantity = Math.min(8, outdoorQuantity);
  const stackTop = 70;
  const segmentHeight = (horizontalY - stackTop) / visibleQuantity;
  const distance = answers.wallDistanceM ?? 1.5;
  const diameter = answers.diameterMm ?? QUICK_ESTIMATE_DEFAULT_DIAMETER_MM;
  const details: SchemeDetail[] = [
    { marker: 1, title: answers.outlet === "top" ? "Разгон и отвод 90°" : "Заднее подключение", description: answers.outlet === "top" ? "Разгон 1000 мм и отвод 90° · сталь 0,8 мм" : "Шибер и опорная заглушка", status: "assumed" },
    { marker: 2, title: "Стартовый сэндвич", description: "1 шт. × 1000 мм · внутренняя труба 0,8 мм", status: "assumed" },
    { marker: 3, title: `Фасадный сэндвич Ø${diameter}/${diameter + 100}`, description: `${outdoorQuantity} шт. по 1000 мм · внутренняя труба 0,5 мм`, status: answers.diameterMm === null ? "assumed" : "user" },
    { marker: 4, title: "Проход через стену", description: `До стены ${meters(distance)} м · толщину стены и вынос кровли проверит менеджер`, status: answers.wallDistanceM === null ? "review" : "user" },
  ];

  return <>
    <div className={styles.drawing}>
      <svg className={styles.svg} viewBox="0 0 440 490" role="img" aria-labelledby="quick-wall-title quick-wall-desc">
        <title id="quick-wall-title">Предварительная схема дымохода через стену и по фасаду</title>
        <desc id="quick-wall-desc">Условный боковой вид отопителя, прохода через стену и наружной вертикальной колонны сэндвич-дымохода.</desc>
        <rect className={styles.paper} width="440" height="490" rx="12" />
        <rect className={styles.room} x="34" y="42" width={wallX - 34} height="382" />
        <rect className={styles.wallMass} x={wallX} y="42" width="24" height="382" />
        <line className={styles.ground} x1="26" y1="424" x2="410" y2="424" />
        <text className={styles.zoneLabel} x="48" y="68">ПОМЕЩЕНИЕ</text>
        <text className={styles.zoneLabel} x="270" y="68">ФАСАД</text>
        <rect className={styles.heater} x={heaterX} y={heaterY} width="68" height="82" rx="5" />
        <rect className={styles.heaterDoor} x={heaterX + 18} y={heaterY + 26} width="32" height="26" rx="2" />
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
            <rect className={styles.sandwich} x={stackX - 17} y={y} width="34" height={segmentHeight} />
            {index < visibleQuantity - 1 ? <line className={styles.joint} x1={stackX - 20} y1={y} x2={stackX + 20} y2={y} /> : null}
          </g>;
        })}
        <path className={styles.termination} d={`M${stackX - 21} ${stackTop} L${stackX} ${stackTop - 17} L${stackX + 21} ${stackTop} Z`} />
        <line className={styles.console} x1={stackX - 42} y1={horizontalY - 42} x2={stackX + 22} y2={horizontalY - 42} />
        <line className={styles.consoleBrace} x1={stackX - 42} y1={horizontalY - 42} x2={stackX - 17} y2={horizontalY - 18} />
        <line className={styles.userDimension} x1="396" y1={stackTop} x2="396" y2={horizontalY} />
        <line className={styles.userTick} x1="390" y1={stackTop} x2="402" y2={stackTop} />
        <line className={styles.userTick} x1="390" y1={horizontalY} x2="402" y2={horizontalY} />
        <text className={styles.userDimensionText} x="414" y={(stackTop + horizontalY) / 2} transform={`rotate(-90 414 ${(stackTop + horizontalY) / 2})`} textAnchor="middle">{meters(answers.outdoorHeightM)} м</text>
        <line className={answers.wallDistanceM === null ? styles.defaultDimension : styles.userDimension} x1={heaterX + 34} y1="454" x2={wallX} y2="454" />
        <line className={answers.wallDistanceM === null ? styles.tick : styles.userTick} x1={heaterX + 34} y1="448" x2={heaterX + 34} y2="460" />
        <line className={answers.wallDistanceM === null ? styles.tick : styles.userTick} x1={wallX} y1="448" x2={wallX} y2="460" />
        <text className={answers.wallDistanceM === null ? styles.dimensionText : styles.userDimensionText} x={(heaterX + 34 + wallX) / 2} y="478" textAnchor="middle">{meters(distance)} м</text>
        <Marker number={1} x={answers.outlet === "top" ? heaterX + 58 : heaterX + 88} y={answers.outlet === "top" ? horizontalY + 20 : horizontalY - 28} />
        <Marker number={2} x={268} y={horizontalY + 28} />
        <Marker number={3} x={366} y={118} />
        <Marker number={4} x={236} y={horizontalY - 36} />
      </svg>
    </div>
    <DetailList items={details} />
  </>;
}

export function QuickEstimateScheme(props: QuickEstimateSchemeProps) {
  const { answers } = props;
  const routeTitle = answers.route === "ceiling" ? "Через перекрытия и кровлю" : "Через стену и по фасаду";
  const assumptions = answers.route === "ceiling"
    ? [`высота отопителя ${QUICK_ESTIMATE_HEATER_HEIGHT_MM} мм`, ...(answers.hasAttic ? [`чердак ${QUICK_ESTIMATE_ATTIC_HEIGHT_MM} мм`] : [])]
    : [];

  return <section className={styles.panel} aria-labelledby="quick-scheme-heading">
    <header className={styles.header}>
      <h4 id="quick-scheme-heading">Предварительная схема дымохода</h4>
      <p>Построена только для быстрого расчёта. Это не монтажный проект.</p>
    </header>
    <h5 className={styles.routeTitle}>{routeTitle}</h5>
    <div className={styles.schemeLayout}>
      {answers.route === "ceiling" ? <CeilingScheme {...props} /> : <WallScheme {...props} />}
    </div>
    {assumptions.length ? <p className={styles.assumptions}>
      <strong>Дополнительно приняли:</strong> {assumptions.join(" · ")}. Остальные размеры проверит менеджер.
    </p> : <p className={styles.assumptions}>Остальные размеры и окончательный состав проверит менеджер.</p>}
  </section>;
}
