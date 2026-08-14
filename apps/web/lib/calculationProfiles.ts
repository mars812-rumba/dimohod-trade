import {
  parseScenarioDraft,
  type MeasurementObjectType,
  type ScenarioConfiguratorDraft,
} from "./configuratorDraft";

export type CeilingRouteMeasurements = {
  kind: "ceiling";
  ceilingHeight: string;
  floorThickness: string;
  secondCeilingHeight: string;
  secondFloorThickness: string;
  thirdCeilingHeight: string;
  thirdFloorThickness: string;
  levels: string;
  hasAttic: boolean;
  atticHeight: string;
  routeHeight: string;
  roofAngle: string;
  roofThickness: string;
  warmupLength: string;
  supportCapHeight: string;
};

export type TopWallRouteMeasurements = {
  kind: "wall-top";
  verticalRise: string;
  wallExitHeight: string;
  wallDistance: string;
  wallThickness: string;
  wallMaterial: string;
  facadeOffset: string;
  roofOverhang: string;
  outdoorHeight: string;
};

export type RearWallRouteMeasurements = {
  kind: "wall-rear";
  rearOutletBottomHeight: string;
  wallExitHeight: string;
  wallDistance: string;
  wallThickness: string;
  wallMaterial: string;
  facadeOffset: string;
  roofOverhang: string;
  outdoorHeight: string;
};

export type UnknownRouteMeasurements = { kind: "unknown" };

export type TypedRouteMeasurements =
  | CeilingRouteMeasurements
  | TopWallRouteMeasurements
  | RearWallRouteMeasurements
  | UnknownRouteMeasurements;

export type CalculationProfile = {
  schemaVersion: 2;
  id: string;
  name: string;
  objectType: MeasurementObjectType;
  draft: ScenarioConfiguratorDraft;
  routeMeasurements: TypedRouteMeasurements;
  createdAt: string;
  updatedAt: string;
};

export const CALCULATION_PROFILES_STORAGE_KEY = "dimohod-trade:calculation-profiles:v2";
const LEGACY_PROFILES_STORAGE_KEY = "dimohod-trade:calculation-profiles:v1";

type ProfileStorage = Pick<Storage, "getItem" | "setItem">;

export function routeMeasurementsFromDraft(draft: ScenarioConfiguratorDraft): TypedRouteMeasurements {
  if (draft.route === "ceiling") {
    return {
      kind: "ceiling",
      ceilingHeight: draft.ceilingHeight,
      floorThickness: draft.floorThickness,
      secondCeilingHeight: draft.secondCeilingHeight,
      secondFloorThickness: draft.secondFloorThickness,
      thirdCeilingHeight: draft.thirdCeilingHeight,
      thirdFloorThickness: draft.thirdFloorThickness,
      levels: draft.levels,
      hasAttic: draft.hasAttic,
      atticHeight: draft.atticHeight,
      routeHeight: draft.routeHeight,
      roofAngle: draft.roofAngle,
      roofThickness: draft.roofThickness,
      warmupLength: draft.warmupLength,
      supportCapHeight: draft.supportCapHeight,
    };
  }
  if (draft.route === "wall") {
    return {
      kind: "wall-top",
      verticalRise: draft.verticalRise,
      wallExitHeight: draft.wallExitHeight,
      wallDistance: draft.wallDistance,
      wallThickness: draft.wallThickness,
      wallMaterial: draft.wallMaterial,
      facadeOffset: draft.facadeOffset,
      roofOverhang: draft.roofOverhang,
      outdoorHeight: draft.outdoorHeight,
    };
  }
  if (draft.route === "wall-direct") {
    return {
      kind: "wall-rear",
      rearOutletBottomHeight: draft.rearOutletBottomHeight,
      wallExitHeight: draft.wallExitHeight,
      wallDistance: draft.wallDistance,
      wallThickness: draft.wallThickness,
      wallMaterial: draft.wallMaterial,
      facadeOffset: draft.facadeOffset,
      roofOverhang: draft.roofOverhang,
      outdoorHeight: draft.outdoorHeight,
    };
  }
  return { kind: "unknown" };
}

function parseProfile(value: unknown): CalculationProfile | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as Partial<CalculationProfile> & { draft?: unknown };
  const draft = parseScenarioDraft(JSON.stringify(profile.draft));
  if (
    typeof profile.id !== "string"
    || typeof profile.name !== "string"
    || typeof profile.createdAt !== "string"
    || typeof profile.updatedAt !== "string"
    || !draft
  ) {
    return null;
  }

  return {
    schemaVersion: 2,
    id: profile.id,
    name: profile.name,
    objectType: draft.objectType,
    draft,
    routeMeasurements: routeMeasurementsFromDraft(draft),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function parseProfileList(raw: string | null): CalculationProfile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseProfile).filter((profile): profile is CalculationProfile => Boolean(profile));
  } catch {
    return [];
  }
}

export function readCalculationProfiles(storage: Pick<Storage, "getItem"> & Partial<Pick<Storage, "setItem">>): CalculationProfile[] {
  const currentRaw = storage.getItem(CALCULATION_PROFILES_STORAGE_KEY);
  if (currentRaw !== null) {
    return parseProfileList(currentRaw).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  const legacy = parseProfileList(storage.getItem(LEGACY_PROFILES_STORAGE_KEY));
  if (legacy.length && storage.setItem) {
    storage.setItem(CALCULATION_PROFILES_STORAGE_KEY, JSON.stringify(legacy));
  }
  return legacy.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function saveCalculationProfile(
  storage: ProfileStorage,
  input: { id?: string; name: string; draft: ScenarioConfiguratorDraft },
): CalculationProfile {
  const profiles = readCalculationProfiles(storage);
  const now = new Date().toISOString();
  const existing = input.id ? profiles.find((profile) => profile.id === input.id) : undefined;
  const profile: CalculationProfile = {
    schemaVersion: 2,
    id: existing?.id ?? createProfileId(),
    name: input.name.trim(),
    objectType: input.draft.objectType,
    draft: input.draft,
    routeMeasurements: routeMeasurementsFromDraft(input.draft),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  storage.setItem(
    CALCULATION_PROFILES_STORAGE_KEY,
    JSON.stringify([profile, ...profiles.filter((item) => item.id !== profile.id)]),
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dimohod-trade:measurement-profiles-changed"));
  }
  return profile;
}

export function deleteCalculationProfile(storage: ProfileStorage, profileId: string): void {
  const profiles = readCalculationProfiles(storage).filter((profile) => profile.id !== profileId);
  storage.setItem(CALCULATION_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dimohod-trade:measurement-profiles-changed"));
  }
}

export function duplicateCalculationProfile(
  storage: ProfileStorage,
  profileId: string,
): CalculationProfile | null {
  const source = readCalculationProfiles(storage).find((profile) => profile.id === profileId);
  if (!source) return null;
  return saveCalculationProfile(storage, {
    name: `${source.name} — вариант`,
    draft: source.draft,
  });
}

export function calculationProfileConfiguratorHref(profileId: string): string {
  const params = new URLSearchParams({ profile: profileId });
  return `/?${params.toString()}#calculator`;
}

export function calculationProfileMeasurementsHref(profileId: string): string {
  const params = new URLSearchParams({ profile: profileId, edit: "1" });
  return `/zamery?${params.toString()}`;
}

function createProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
