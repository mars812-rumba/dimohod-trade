type DimensionValue = number | string | null;

type DimensionSchemeProps = {
  title: string;
  dimensions: {
    L: DimensionValue;
    D: DimensionValue;
    d: DimensionValue;
    S: DimensionValue;
    insulation: DimensionValue;
  };
  steelGrade: string | null;
  material: string | null;
  compact?: boolean;
};

function dimensionLabel(name: string, value: DimensionValue) {
  if (value === null || value === "") {
    return `${name} —`;
  }

  return `${name} ${String(value).replace(".", ",")} мм`;
}

function insulationLabel(value: DimensionValue) {
  if (value === null || value === "") {
    return "Утепление —";
  }

  return `Утепление — ${String(value).replace(".", ",")} мм`;
}

export function DimensionScheme({
  title,
  dimensions,
  steelGrade,
  material,
  compact = false,
}: DimensionSchemeProps) {
  const description = [
    dimensionLabel("L", dimensions.L),
    dimensionLabel("D", dimensions.D),
    dimensionLabel("d", dimensions.d),
    dimensionLabel("S", dimensions.S),
    dimensionLabel("утепление", dimensions.insulation),
    steelGrade ? `сталь ${steelGrade}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <svg
      className={`dimension-scheme-svg${compact ? " dimension-scheme-svg-compact" : ""}`}
      viewBox="0 0 480 480"
      role={compact ? "presentation" : "img"}
      aria-hidden={compact ? "true" : undefined}
      aria-labelledby={compact ? undefined : "deflector-scheme-title deflector-scheme-description"}
      xmlns="http://www.w3.org/2000/svg"
    >
      {compact ? null : <title id="deflector-scheme-title">Размерная схема: {title}</title>}
      {compact ? null : <desc id="deflector-scheme-description">{description}</desc>}

      <rect width="480" height="480" fill="#f8fafb" />
      <path d="M24 24H456V456H24Z" fill="none" stroke="#dce2e6" />

      <g
        className="dimension-scheme-object"
        stroke="#26343d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      >
        <path d="M135 105H365V225H135Z" fill="#e9eef0" />
        <path d="M135 132H365M135 198H365" fill="none" stroke="#65747c" strokeWidth="1.5" />

        <path d="M205 225H295L325 282H175Z" fill="#e9eef0" />
        <path d="M175 282H325V344H175Z" fill="#e9eef0" />
        <path d="M175 312H325" fill="none" stroke="#65747c" strokeWidth="1.5" />
        <path d="M200 344H300V380H200Z" fill="#e9eef0" />

      </g>

      <g className="dimension-scheme-dimensions" fill="none" stroke="#e56835" strokeWidth="1.5">
        <path d="M135 90V54M365 90V54M135 64H365" />
        <path d="M135 64L145 59V69ZM365 64L355 59V69Z" fill="#e56835" stroke="none" />

        <path d="M120 105H78M200 418H78M88 105V418" />
        <path d="M88 105L83 115H93ZM88 418L83 408H93Z" fill="#e56835" stroke="none" />

        <path d="M200 418V440M300 418V440M200 430H300" />
        <path d="M200 430L210 425V435ZM300 430L290 425V435Z" fill="#e56835" stroke="none" />

        <path d="M325 350H385L408 322" />
        <circle cx="325" cy="350" r="3" fill="#e56835" stroke="none" />
      </g>

      <g className="dimension-scheme-labels" fill="#1f2d35" fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
        <text x="250" y="48" textAnchor="middle" fontSize="15" fontWeight="700">
          {dimensionLabel("D", dimensions.D)}
        </text>
        <text x="68" y="262" textAnchor="middle" fontSize="15" fontWeight="700" transform="rotate(-90 68 262)">
          {dimensionLabel("L", dimensions.L)}
        </text>
        <text x="250" y="454" textAnchor="middle" fontSize="15" fontWeight="700">
          {dimensionLabel("d", dimensions.d)}
        </text>
        <text x="414" y="313" textAnchor="end" fontSize="13" fontWeight="700">
          {dimensionLabel("S", dimensions.S)}
        </text>
        <text x="414" y="400" textAnchor="end" fontSize="12" fontWeight="700">
          {insulationLabel(dimensions.insulation)}
        </text>
      </g>

      {compact ? (
        <g>
          <rect x="324" y="24" width="132" height="34" fill="#26343d" />
          <text x="390" y="46" fill="#ffffff" fontSize="13" fontWeight="800" textAnchor="middle" letterSpacing="1.2">
            СХЕМА
          </text>
        </g>
      ) : (
        <g className="dimension-scheme-caption">
          <rect x="112" y="83" width="276" height="27" rx="2" fill="#26343d" />
          <text x="250" y="101" fill="#ffffff" fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" fontSize="11" fontWeight="700" textAnchor="middle">
            {[steelGrade, material].filter(Boolean).join(" · ") || "Материал не указан"}
          </text>
        </g>
      )}
    </svg>
  );
}
