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
        fill="none"
        stroke="#26343d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      >
        <path
          d="M145 112C145 101 192 93 250 93C308 93 355 101 355 112V218H305L338 285V350C322 358 306 362 286 364V397C286 405 270 410 250 410C230 410 214 405 214 397V364C194 362 178 358 162 350V285L195 218H145Z"
          fill="#e9eef0"
        />
        <path
          d="M145 218H195C210 205 230 200 250 200C270 200 290 205 305 218H355"
          stroke="#65747c"
          strokeWidth="1.6"
        />
        <path
          d="M162 350C178 358 194 362 214 364M286 364C306 362 322 358 338 350"
          stroke="#65747c"
          strokeWidth="1.6"
        />
      </g>

      <g className="dimension-scheme-dimensions" fill="none" stroke="#e56835" strokeWidth="1.5">
        <path d="M145 90V54M355 90V54M145 64H355" />
        <path d="M145 64L155 59V69ZM355 64L345 59V69Z" fill="#e56835" stroke="none" />

        <path d="M120 112H78M214 410H78M88 112V410" />
        <path d="M88 112L83 122H93ZM88 410L83 400H93Z" fill="#e56835" stroke="none" />

        <path d="M214 410V434M286 410V434M214 424H286" />
        <path d="M214 424L224 419V429ZM286 424L276 419V429Z" fill="#e56835" stroke="none" />

        <path d="M338 333H385L408 310" />
        <circle cx="338" cy="333" r="3" fill="#e56835" stroke="none" />
      </g>

      <g className="dimension-scheme-labels" fill="#1f2d35" fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
        <text x="250" y="48" textAnchor="middle" fontSize="15" fontWeight="700">
          {dimensionLabel("D", dimensions.D)}
        </text>
        <text x="68" y="262" textAnchor="middle" fontSize="15" fontWeight="700" transform="rotate(-90 68 262)">
          {dimensionLabel("L", dimensions.L)}
        </text>
        <text x="250" y="447" textAnchor="middle" fontSize="15" fontWeight="700">
          {dimensionLabel("d", dimensions.d)}
        </text>
        <text x="414" y="301" textAnchor="end" fontSize="13" fontWeight="700">
          {dimensionLabel("S", dimensions.S)}
        </text>
        <text x="414" y="392" textAnchor="end" fontSize="12" fontWeight="700">
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
