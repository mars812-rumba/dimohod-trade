import styles from "./ConnectionRouteScheme.module.css";

export type ConnectionRouteSchemeVariant = "through-roof" | "through-wall" | "through-wall-direct";

type ConnectionRouteSchemeProps = {
  className?: string;
  variant: ConnectionRouteSchemeVariant;
};

const routeTitles: Record<ConnectionRouteSchemeVariant, string> = {
  "through-roof": "Вертикальное подключение через перекрытие и кровлю",
  "through-wall": "Верхнее подключение с поворотом через стену",
  "through-wall-direct": "Заднее подключение напрямую через стену",
};

export function isConnectionRouteScheme(value: string): value is ConnectionRouteSchemeVariant {
  return value === "through-roof" || value === "through-wall" || value === "through-wall-direct";
}

function Heater({ x = 74, y = 292 }: { x?: number; y?: number }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width="66" height="64" rx="3" className={styles.heater} />
      <rect x={x + 12} y={y + 17} width="42" height="28" rx="2" className={styles.heaterDoor} />
      <line x1={x + 13} y1={y + 53} x2={x + 53} y2={y + 53} className={styles.leader} />
    </g>
  );
}

function NumberedLabel({
  anchorX,
  anchorY,
  index,
  label,
  labelX,
  labelY,
}: {
  anchorX: number;
  anchorY: number;
  index: number;
  label: string;
  labelX: number;
  labelY: number;
}) {
  const elbowX = labelX - 15;
  return (
    <g aria-hidden="true">
      <path d={`M${anchorX} ${anchorY} L${elbowX - 8} ${anchorY} L${elbowX} ${labelY}`} className={styles.leader} />
      <circle cx={labelX} cy={labelY} r="9" className={styles.nodeNumber} />
      <text x={labelX} y={labelY + 0.5} textAnchor="middle" dominantBaseline="central" className={styles.nodeNumberText}>{index}</text>
      <text x={labelX + 14} y={labelY + 0.5} dominantBaseline="central" className={styles.label}>{label}</text>
    </g>
  );
}

function RoofRoute() {
  return (
    <>
      <path d="M30 118 L220 44 L226 61 L36 135 Z" className={styles.roofCake} />
      <rect x="40" y="135" width="180" height="221" className={styles.room} />
      <rect x="40" y="219" width="180" height="30" className={styles.structureCut} />
      <rect x="48" y="228" width="57" height="13" className={styles.structure} />
      <rect x="175" y="228" width="37" height="13" className={styles.structure} />
      <text x="51" y="154" className={styles.zone}>ПОМЕЩЕНИЕ</text>
      <text x="51" y="210" className={styles.zone}>ПЕРЕКРЫТИЕ</text>

      <Heater x={108} y={292} />
      <rect x="130" y="265" width="22" height="27" className={styles.pipeSingle} />
      <rect x="124" y="257" width="34" height="8" className={styles.fitting} />
      <circle cx="141" cy="257" r="3.2" className={styles.joint} />
      <rect x="124" y="169" width="34" height="88" className={styles.pipe} />
      <circle cx="141" cy="169" r="3.2" className={styles.joint} />
      <rect x="124" y="90" width="34" height="79" className={styles.pipe} />
      <circle cx="141" cy="90" r="3.2" className={styles.joint} />
      <rect x="124" y="70" width="34" height="20" className={styles.fitting} />
      <path d="M124 70 L132 53 L150 53 L158 70 Z" className={styles.fitting} />

      <rect x="109" y="216" width="64" height="36" rx="2" className={styles.insulation} />
      <rect x="100" y="216" width="82" height="6" className={styles.metal} />
      <rect x="100" y="246" width="82" height="6" className={styles.metal} />
      <rect x="70" y="231" width="54" height="7" className={styles.metal} />
      <rect x="158" y="231" width="54" height="7" className={styles.metal} />

      <rect x="105" y="105" width="72" height="8" className={styles.fitting} transform="rotate(-21 141 109)" />
      <path d="M124 109 L131 84 L151 84 L158 109 Z" className={styles.fitting} />
      <rect x="109" y="126" width="64" height="6" className={styles.metal} transform="rotate(-21 141 129)" />

      <NumberedLabel anchorX={158} anchorY={61} index={1} label="Оголовок" labelX={246} labelY={48} />
      <NumberedLabel anchorX={169} anchorY={105} index={2} label="УПК" labelX={246} labelY={104} />
      <NumberedLabel anchorX={173} anchorY={234} index={3} label="Проход" labelX={246} labelY={220} />
      <NumberedLabel anchorX={158} anchorY={279} index={4} label="Разгон" labelX={246} labelY={280} />
      <NumberedLabel anchorX={174} anchorY={322} index={5} label="Печь" labelX={246} labelY={338} />
      <text x="28" y="382" className={styles.note}>Трасса идёт вертикально внутри здания</text>
    </>
  );
}

function WallRoute({ direct }: { direct: boolean }) {
  const passageY = direct ? 302 : 232;
  const heaterX = direct ? 92 : 58;
  const heaterY = direct ? 276 : 292;
  const horizontalStart = direct ? heaterX + 66 : 91;
  const horizontalEnd = 224;
  const wallStart = 174;
  const wallEnd = 205;
  return (
    <>
      <rect x="28" y="80" width="152" height="276" className={styles.room} />
      <rect x="205" y="42" width="87" height="314" className={styles.outside} />
      <rect x={wallStart} y="80" width={wallEnd - wallStart} height="276" className={styles.structureCut} />
      <path d="M24 95 L194 30 L200 47 L30 112 Z" className={styles.roofCake} />
      <text x="38" y="125" className={styles.zone}>ПОМЕЩЕНИЕ</text>
      <text x="214" y="125" className={styles.zone}>ФАСАД</text>

      <Heater x={heaterX} y={heaterY} />
      {!direct ? (
        <path d={`M91 ${heaterY} L91 ${passageY + 13} Q91 ${passageY} 104 ${passageY} L112 ${passageY}`} className={styles.pipeRun} />
      ) : null}
      <rect x={horizontalStart} y={passageY - 11} width={horizontalEnd - horizontalStart} height="22" className={styles.pipeSingle} />
      <rect x={wallStart - 4} y={passageY - 27} width={wallEnd - wallStart + 8} height="54" className={styles.insulation} />
      <rect x={wallStart - 8} y={passageY - 17} width={wallEnd - wallStart + 16} height="34" className={styles.metal} />
      <circle cx={wallStart - 8} cy={passageY} r="3.2" className={styles.joint} />

      <path d={`M211 ${passageY - 13} L224 ${passageY - 13} L237 ${passageY} L224 ${passageY + 13} L211 ${passageY + 13} Z`} className={styles.fitting} />
      <rect x="211" y="70" width="26" height={passageY - 70} className={styles.pipe} />
      <circle cx="224" cy={passageY - 48} r="3.2" className={styles.joint} />
      <path d="M211 70 L217 55 L231 55 L237 70 Z" className={styles.fitting} />
      <rect x="205" y={passageY + 13} width="38" height="8" className={styles.metal} />
      <path d={`M208 ${passageY + 21} L240 ${passageY + 21} L252 ${passageY + 49} L243 ${passageY + 49} L233 ${passageY + 29} L208 ${passageY + 29} Z`} className={styles.metal} />
      <rect x="201" y="142" width="46" height="8" className={styles.metal} />
      <path d="M208 150 L241 150 L251 170 L243 170 L234 157 L208 157 Z" className={styles.metal} />

      <NumberedLabel anchorX={237} anchorY={62} index={1} label="Оголовок" labelX={263} labelY={54} />
      <NumberedLabel anchorX={247} anchorY={146} index={2} label="Крепление" labelX={263} labelY={142} />
      <NumberedLabel anchorX={235} anchorY={passageY} index={3} label="Тройник" labelX={263} labelY={direct ? 248 : 214} />
      <NumberedLabel anchorX={201} anchorY={passageY} index={4} label="Проход" labelX={263} labelY={direct ? 300 : 270} />
      <text x="28" y="382" className={styles.note}>
        {direct ? "Выход от заднего патрубка напрямую" : "Поворот от верхнего патрубка к стене"}
      </text>
    </>
  );
}

export function ConnectionRouteScheme({ className = "", variant }: ConnectionRouteSchemeProps) {
  const direct = variant === "through-wall-direct";
  return (
    <svg
      className={`${styles.scheme} ${className}`.trim()}
      viewBox="0 0 320 400"
      role="img"
      aria-label={routeTitles[variant]}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{routeTitles[variant]}</title>
      <desc>Принципиальный технический разрез маршрута дымохода с отопителем, конструкциями здания, проходами и наружными узлами.</desc>
      <rect width="320" height="400" className={styles.paper} />
      {variant === "through-roof" ? <RoofRoute /> : <WallRoute direct={direct} />}
    </svg>
  );
}
