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

      <g className="dimension-scheme-object" fill="none" stroke="#26343d" strokeWidth="2.5">
        <path d="M150 112V203" />
        <path d="M350 112V203" />
        <ellipse cx="250" cy="112" rx="100" ry="18" fill="#eef2f4" />
        <path d="M150 203C150 193 195 185 250 185C305 185 350 193 350 203" fill="#e4eaed" />
        <path d="M150 203C150 213 195 221 250 221C305 221 350 213 350 203" />

        <path d="M190 259C198 232 219 217 250 217C281 217 302 232 310 259" fill="#f8fafb" />
        <path d="M180 263C180 253 211 245 250 245C289 245 320 253 320 263" fill="#e4eaed" />
        <path d="M180 263C180 273 211 281 250 281C289 281 320 273 320 263" />

        <path d="M178 276L142 334" />
        <path d="M322 276L358 334" />
        <ellipse cx="250" cy="334" rx="108" ry="18" fill="#eef2f4" />
        <path d="M185 334V398" />
        <path d="M315 334V398" />
        <path d="M199 337V393" stroke="#7a878f" strokeWidth="1.5" />
        <path d="M301 337V393" stroke="#7a878f" strokeWidth="1.5" />
        <ellipse cx="250" cy="398" rx="65" ry="13" fill="#e4eaed" />
        <ellipse cx="250" cy="398" rx="51" ry="9" fill="#f8fafb" stroke="#7a878f" strokeWidth="1.5" />
        <path d="M199 337H185M301 337H315" stroke="#e56835" strokeWidth="4" />
      </g>

      <g className="dimension-scheme-dimensions" fill="none" stroke="#e56835" strokeWidth="1.5">
        <path d="M150 90V54M350 90V54M150 64H350" />
        <path d="M150 64L160 59V69ZM350 64L340 59V69Z" fill="#e56835" stroke="none" />

        <path d="M120 112H78M142 411H78M88 112V411" />
        <path d="M88 112L83 122H93ZM88 411L83 401H93Z" fill="#e56835" stroke="none" />

        <path d="M199 415V440M301 415V440M199 431H301" />
        <path d="M199 431L209 426V436ZM301 431L291 426V436Z" fill="#e56835" stroke="none" />

        <path d="M315 352H385L408 328" />
        <circle cx="315" cy="352" r="3" fill="#e56835" stroke="none" />
        <path d="M301 368H385L408 389" />
        <circle cx="301" cy="368" r="3" fill="#e56835" stroke="none" />
      </g>

      <g className="dimension-scheme-labels" fill="#1f2d35" fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">
        <text x="250" y="48" textAnchor="middle" fontSize="15" fontWeight="700">
          {dimensionLabel("D", dimensions.D)}
        </text>
        <text x="68" y="262" textAnchor="middle" fontSize="15" fontWeight="700" transform="rotate(-90 68 262)">
          {dimensionLabel("L", dimensions.L)}
        </text>
        <text x="250" y="458" textAnchor="middle" fontSize="15" fontWeight="700">
          {dimensionLabel("d", dimensions.d)}
        </text>
        <text x="414" y="319" textAnchor="end" fontSize="13" fontWeight="700">
          {dimensionLabel("S", dimensions.S)}
        </text>
        <text x="414" y="405" textAnchor="end" fontSize="12" fontWeight="700">
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
