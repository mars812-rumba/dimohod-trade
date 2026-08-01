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

      <path
        className="dimension-scheme-object"
        d="M150 112C150 101 195 93 250 93C305 93 350 101 350 112V201C350 214 332 221 315 224L299 244C296 250 307 255 318 261L340 316C347 320 350 327 350 334C350 343 337 349 315 353V389C315 396 304 401 286 404V418C286 426 270 431 250 431C230 431 214 426 214 418V404C196 401 185 396 185 389V353C163 349 150 343 150 334C150 327 153 320 160 316L182 261C193 255 204 250 201 244L185 224C168 221 150 214 150 201Z"
        fill="#e9eef0"
        stroke="#26343d"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />

      <g className="dimension-scheme-dimensions" fill="none" stroke="#e56835" strokeWidth="1.5">
        <path d="M150 90V54M350 90V54M150 64H350" />
        <path d="M150 64L160 59V69ZM350 64L340 59V69Z" fill="#e56835" stroke="none" />

        <path d="M120 112H78M214 431H78M88 112V431" />
        <path d="M88 112L83 122H93ZM88 431L83 421H93Z" fill="#e56835" stroke="none" />

        <path d="M214 431V448M286 431V448M214 440H286" />
        <path d="M214 440L224 435V445ZM286 440L276 435V445Z" fill="#e56835" stroke="none" />

        <path d="M315 365H385L408 328" />
        <circle cx="315" cy="365" r="3" fill="#e56835" stroke="none" />
        <path d="M301 382H385L408 405" />
        <circle cx="301" cy="382" r="3" fill="#e56835" stroke="none" />
      </g>

      <g className="dimension-scheme-labels" fill="#1f2d35" fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
        <text x="250" y="48" textAnchor="middle" fontSize="15" fontWeight="700">
          {dimensionLabel("D", dimensions.D)}
        </text>
        <text x="68" y="262" textAnchor="middle" fontSize="15" fontWeight="700" transform="rotate(-90 68 262)">
          {dimensionLabel("L", dimensions.L)}
        </text>
        <text x="250" y="470" textAnchor="middle" fontSize="15" fontWeight="700">
          {dimensionLabel("d", dimensions.d)}
        </text>
        <text x="414" y="319" textAnchor="end" fontSize="13" fontWeight="700">
          {dimensionLabel("S", dimensions.S)}
        </text>
        <text x="414" y="421" textAnchor="end" fontSize="12" fontWeight="700">
          {dimensionLabel("Утепление", dimensions.insulation)}
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
