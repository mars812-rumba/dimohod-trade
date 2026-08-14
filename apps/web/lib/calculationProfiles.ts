import {
  parseScenarioDraft,
  type ScenarioConfiguratorDraft,
} from "./configuratorDraft";

export type CalculationProfile = {
  id: string;
  name: string;
  draft: ScenarioConfiguratorDraft;
  createdAt: string;
  updatedAt: string;
};

export const CALCULATION_PROFILES_STORAGE_KEY = "dimohod-trade:calculation-profiles:v1";

type ProfileStorage = Pick<Storage, "getItem" | "setItem">;

function parseProfile(value: unknown): CalculationProfile | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as Partial<CalculationProfile>;
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
    id: profile.id,
    name: profile.name,
    draft,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function readCalculationProfiles(storage: Pick<Storage, "getItem">): CalculationProfile[] {
  const raw = storage.getItem(CALCULATION_PROFILES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseProfile)
      .filter((profile): profile is CalculationProfile => Boolean(profile))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

export function saveCalculationProfile(
  storage: ProfileStorage,
  input: {
    id?: string;
    name: string;
    draft: ScenarioConfiguratorDraft;
  },
): CalculationProfile {
  const profiles = readCalculationProfiles(storage);
  const now = new Date().toISOString();
  const existing = input.id ? profiles.find((profile) => profile.id === input.id) : undefined;
  const profile: CalculationProfile = {
    id: existing?.id ?? createProfileId(),
    name: input.name.trim(),
    draft: input.draft,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const nextProfiles = [profile, ...profiles.filter((item) => item.id !== profile.id)];
  storage.setItem(CALCULATION_PROFILES_STORAGE_KEY, JSON.stringify(nextProfiles));
  return profile;
}

export function calculationProfileConfiguratorHref(profileId: string): string {
  const params = new URLSearchParams({ profile: profileId });
  return `/?${params.toString()}#calculator`;
}

function createProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
