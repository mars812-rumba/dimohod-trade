type SteelProfileSource = {
  steel_grade: string | null;
  attributes: Record<string, unknown>;
};

export type SteelSelectionProfile = {
  selectionTier: "economy" | "standard" | "premium" | null;
  fuelTypes: string[];
  condensateMode: "with" | "without" | null;
  operatingTemperatureC: number | null;
  maxTemperatureC: number | null;
  innerUseStatus: "limited" | "allowed" | null;
};

export type SteelBadge = {
  label: string;
  tone:
    | "economy"
    | "standard"
    | "premium"
    | "fuel"
    | "condensate-with"
    | "condensate-without"
    | "warning";
};

const tierLabels = {
  economy: "Эконом",
  standard: "Стандарт",
  premium: "Премиум",
} as const;

const fuelLabels: Record<string, string> = {
  wood: "Дрова",
  coal: "Уголь",
  gas: "Газ",
  diesel: "Дизель",
};

export function steelSelectionProfile(source: SteelProfileSource | null): SteelSelectionProfile | null {
  const raw = source?.attributes.steel_selection_profile;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const profile = raw as Record<string, unknown>;
  const selectionTier = profile.selection_tier;
  const condensateMode = profile.condensate_mode;
  const innerUseStatus = profile.inner_use_status;
  return {
    selectionTier:
      selectionTier === "economy" || selectionTier === "standard" || selectionTier === "premium"
        ? selectionTier
        : null,
    fuelTypes: Array.isArray(profile.fuel_types)
      ? profile.fuel_types.filter((value): value is string => typeof value === "string")
      : [],
    condensateMode: condensateMode === "with" || condensateMode === "without" ? condensateMode : null,
    operatingTemperatureC:
      typeof profile.operating_temperature_c === "number" ? profile.operating_temperature_c : null,
    maxTemperatureC: typeof profile.max_temperature_c === "number" ? profile.max_temperature_c : null,
    innerUseStatus: innerUseStatus === "limited" || innerUseStatus === "allowed" ? innerUseStatus : null,
  };
}

export function steelSelectionLabel(source: SteelProfileSource) {
  const profile = steelSelectionProfile(source);
  if (!source.steel_grade || !profile) {
    return source.steel_grade;
  }
  if (profile.selectionTier) {
    return `${source.steel_grade} · ${tierLabels[profile.selectionTier]}`;
  }
  const fuels = profile.fuelTypes.map((fuel) => fuelLabels[fuel]).filter(Boolean);
  return fuels.length > 0 ? `${source.steel_grade} · ${fuels.join(" / ")}` : source.steel_grade;
}

export function steelSelectionBadges(source: SteelProfileSource | null): SteelBadge[] {
  const profile = steelSelectionProfile(source);
  if (!profile) {
    return [];
  }
  const tierBadge: SteelBadge | null = profile.selectionTier
    ? { label: tierLabels[profile.selectionTier], tone: profile.selectionTier }
    : null;
  const condensateBadge: SteelBadge | null = profile.condensateMode
    ? {
        label: profile.condensateMode === "with" ? "С конденсатом" : "Без конденсата",
        tone: profile.condensateMode === "with" ? "condensate-with" : "condensate-without",
      }
    : null;
  if (profile.innerUseStatus === "limited") {
    const badges: SteelBadge[] = [];
    if (tierBadge) badges.push(tierBadge);
    if (condensateBadge) badges.push(condensateBadge);
    badges.push({ label: "С ограничениями", tone: "warning" });
    return badges;
  }
  const fuels = profile.fuelTypes.map((fuel) => fuelLabels[fuel]).filter(Boolean);
  const purposeBadge: SteelBadge | null = fuels.length > 0
    ? { label: fuels.join(" / "), tone: "fuel" }
    : null;
  const badges: SteelBadge[] = [];
  if (tierBadge) badges.push(tierBadge);
  if (purposeBadge) badges.push(purposeBadge);
  if (condensateBadge) badges.push(condensateBadge);
  return badges.slice(0, 3);
}
