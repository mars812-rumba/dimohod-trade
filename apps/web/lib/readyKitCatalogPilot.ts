// Owner-approved preview for one kit group and its three diameter variants.
// Enabled by the normal release; other routes and heights keep their existing view.
export function readyKitCatalogPilot(route: string, height: number) {
  return route === "roof" && height === 4;
}
