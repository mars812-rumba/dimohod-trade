// Catalog presentation approved for all four published kit groups.
export function readyKitCatalogPilot(route: string, height: number) {
  return (route === "roof" && (height === 4 || height === 6))
    || (route === "wall" && (height === 3 || height === 6));
}
