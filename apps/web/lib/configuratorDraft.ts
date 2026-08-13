export type DraftFieldStatus = "known" | "measure" | "later";
export type DraftRoute = "ceiling" | "wall" | "unknown";

export type BanyaConfiguratorDraft = {
  scenario: "banya";
  manufacturer: string;
  model: string;
  outlet: "" | "top" | "rear";
  diameter: string;
  connectionHeight: string;
  connectionDetails: string;
  route: DraftRoute;
  ceilingHeight: string;
  floorThickness: string;
  levels: string;
  routeHeight: string;
  roofAngle: string;
  wallExitHeight: string;
  wallDistance: string;
  outdoorHeight: string;
  photosReady: boolean;
  deferredFields: string[];
};

export const emptyBanyaDraft: BanyaConfiguratorDraft = {
  scenario: "banya",
  manufacturer: "",
  model: "",
  outlet: "",
  diameter: "",
  connectionHeight: "",
  connectionDetails: "",
  route: "unknown",
  ceilingHeight: "",
  floorThickness: "",
  levels: "",
  routeHeight: "",
  roofAngle: "",
  wallExitHeight: "",
  wallDistance: "",
  outdoorHeight: "",
  photosReady: false,
  deferredFields: [],
};

export function draftFieldStatus(
  draft: BanyaConfiguratorDraft,
  field: keyof BanyaConfiguratorDraft,
): DraftFieldStatus {
  const value = draft[field];
  if (typeof value === "boolean" ? value : Array.isArray(value) ? value.length > 0 : Boolean(value)) {
    return "known";
  }
  return draft.deferredFields.includes(field) ? "later" : "measure";
}

export function banyaDraftConfiguratorHref(draft: BanyaConfiguratorDraft): string {
  const params = new URLSearchParams({ scenario: draft.scenario });
  if (draft.route !== "unknown") params.set("route", draft.route);
  if (draft.outlet) params.set("outlet", draft.outlet === "top" ? "vertical" : "horizontal");

  const connection = [
    draft.manufacturer.trim(),
    draft.model.trim(),
    draft.diameter ? `патрубок ${draft.diameter} мм` : "",
    draft.connectionHeight ? `точка подключения ${draft.connectionHeight} мм` : "",
    draft.connectionDetails.trim(),
  ].filter(Boolean);
  if (connection.length) params.set("stoveModel", connection.join(" · "));

  const height = draft.route === "wall" ? draft.outdoorHeight : draft.routeHeight;
  if (height && Number.isFinite(Number(height))) params.set("heightM", height);
  if (draft.wallDistance && Number.isFinite(Number(draft.wallDistance))) {
    params.set("distanceM", draft.wallDistance);
  }
  const levelsCount = draft.levels.match(/\d+/)?.[0];
  if (levelsCount) params.set("floors", levelsCount);

  params.set("draft", JSON.stringify(draft));
  return `/?${params.toString()}#calculator`;
}

export function parseBanyaDraft(value: string | null): BanyaConfiguratorDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<BanyaConfiguratorDraft>;
    if (parsed.scenario !== "banya") return null;
    return { ...emptyBanyaDraft, ...parsed, scenario: "banya" };
  } catch {
    return null;
  }
}
