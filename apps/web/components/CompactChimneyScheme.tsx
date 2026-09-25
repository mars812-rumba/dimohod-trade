import type { ChimneyCalculation, PipeLayoutVariant } from "@/lib/chimneyCalculation";

type CompactChimneySchemeProps = {
  calculation: ChimneyCalculation;
  className?: string;
  variant: PipeLayoutVariant | null;
};

function evenlySpacedMarks(count: number, start: number, end: number) {
  if (count <= 1) return [];
  return Array.from({ length: count - 1 }, (_, index) => (
    start + ((end - start) * (index + 1)) / count
  ));
}

export function CompactChimneyScheme({
  calculation,
  className,
  variant,
}: CompactChimneySchemeProps) {
  const ceilingRoute = calculation.routeKind === "ceiling";
  const rearOutlet = calculation.routeKind === "wall-rear";
  const verticalPipes = variant?.pipes.filter((pipe) => pipe.axis === "vertical") ?? [];
  const horizontalPipes = variant?.pipes.filter((pipe) => pipe.axis === "horizontal") ?? [];
  const routeLabel = ceilingRoute
    ? "Через перекрытия и кровлю"
    : rearOutlet ? "Через стену от заднего патрубка" : "Через стену от верхнего патрубка";
  const diameterLabel = calculation.diameterMm === null
    ? "Диаметр требует уточнения"
    : `Ø ${calculation.diameterMm}/${calculation.diameterMm + 100} мм`;

  if (ceilingRoute) {
    const joints = evenlySpacedMarks(verticalPipes.length, 205, 48);
    return (
      <svg
        aria-label={`Предварительная схема дымохода: ${routeLabel}`}
        className={className}
        role="img"
        viewBox="0 0 360 260"
      >
        <title>{routeLabel}</title>
        <desc>{`${diameterLabel}. В раскладке ${verticalPipes.length} труб.`}</desc>
        <rect fill="#f7f3ea" height="260" rx="16" width="360" />
        <path d="M42 92 L180 24 L318 92" fill="#e6d2bc" stroke="#7f5639" strokeLinejoin="round" strokeWidth="5" />
        <path d="M58 84 V226 H302 V84" fill="#fff" stroke="#b9aa98" strokeWidth="2" />
        {Array.from({ length: Math.max(0, calculation.floors - 1) }, (_, index) => {
          const y = 226 - ((index + 1) * 118) / calculation.floors;
          return <line key={y} stroke="#d5c8b8" strokeDasharray="5 5" x1="58" x2="302" y1={y} y2={y} />;
        })}
        <rect fill="#26343a" height="53" rx="5" width="48" x="112" y="173" />
        <rect fill="#111a1d" height="23" rx="3" width="30" x="121" y="184" />
        <path d="M136 190 C128 181 139 178 138 169 C149 179 148 186 144 192 Z" fill="#ed5b2a" />
        <path d="M136 173 V48" fill="none" stroke="#b8c2c4" strokeWidth="15" />
        <path d="M136 173 V48" fill="none" stroke="#f7f9f8" strokeWidth="5" />
        {joints.map((y) => <line key={y} stroke="#596a70" strokeWidth="2" x1="127" x2="145" y1={y} y2={y} />)}
        <path d="M122 48 H150 L144 34 H128 Z" fill="#aebabc" stroke="#596a70" strokeWidth="2" />
        <g fill="#173d4c" fontFamily="system-ui, sans-serif">
          <text fontSize="13" fontWeight="750" x="184" y="126">{routeLabel}</text>
          <text fill="#607278" fontSize="12" x="184" y="148">{diameterLabel}</text>
          <text fill="#607278" fontSize="12" x="184" y="168">{verticalPipes.length || "—"} труб в раскладке</text>
        </g>
      </svg>
    );
  }

  const verticalJoints = evenlySpacedMarks(verticalPipes.length, 205, 48);
  const horizontalJoints = evenlySpacedMarks(horizontalPipes.length, 151, 258);
  const indoorRiseTop = rearOutlet ? 190 : 126;

  return (
    <svg
      aria-label={`Предварительная схема дымохода: ${routeLabel}`}
      className={className}
      role="img"
      viewBox="0 0 360 260"
    >
      <title>{routeLabel}</title>
      <desc>{`${diameterLabel}. Горизонтальных труб ${horizontalPipes.length}, вертикальных ${verticalPipes.length}.`}</desc>
      <rect fill="#f7f3ea" height="260" rx="16" width="360" />
      <path d="M26 74 L126 24 L190 58" fill="#e6d2bc" stroke="#7f5639" strokeLinejoin="round" strokeWidth="5" />
      <path d="M42 68 V226 H172 V58" fill="#fff" stroke="#b9aa98" strokeWidth="2" />
      <rect fill="#26343a" height="53" rx="5" width="48" x="76" y="173" />
      <rect fill="#111a1d" height="23" rx="3" width="30" x="85" y="184" />
      {!rearOutlet ? (
        <>
          <path d={`M100 173 V${indoorRiseTop}`} fill="none" stroke="#b8c2c4" strokeWidth="14" />
          <path d={`M100 ${indoorRiseTop} H258`} fill="none" stroke="#b8c2c4" strokeWidth="14" />
        </>
      ) : (
        <path d="M124 190 H258" fill="none" stroke="#b8c2c4" strokeWidth="14" />
      )}
      <path d={`M258 ${rearOutlet ? 190 : indoorRiseTop} V48`} fill="none" stroke="#b8c2c4" strokeWidth="16" />
      <path d={`M258 ${rearOutlet ? 190 : indoorRiseTop} V48`} fill="none" stroke="#f7f9f8" strokeWidth="5" />
      {horizontalJoints.map((x) => (
        <line key={x} stroke="#596a70" strokeWidth="2" x1={x} x2={x} y1={(rearOutlet ? 190 : indoorRiseTop) - 9} y2={(rearOutlet ? 190 : indoorRiseTop) + 9} />
      ))}
      {verticalJoints.map((y) => <line key={y} stroke="#596a70" strokeWidth="2" x1="248" x2="268" y1={y} y2={y} />)}
      <path d="M244 48 H272 L266 34 H250 Z" fill="#aebabc" stroke="#596a70" strokeWidth="2" />
      <g fill="#173d4c" fontFamily="system-ui, sans-serif">
        <text fontSize="13" fontWeight="750" x="42" y="106">{rearOutlet ? "Задний выход" : "Верхний выход"}</text>
        <text fill="#607278" fontSize="12" x="42" y="126">{diameterLabel}</text>
        <text fill="#607278" fontSize="12" x="42" y="146">Труб: {horizontalPipes.length + verticalPipes.length || "—"}</text>
      </g>
    </svg>
  );
}
