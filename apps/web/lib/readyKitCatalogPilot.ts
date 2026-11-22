// Local design trial only. Keep production unchanged until the owner approves.
export function readyKitCatalogPilot(route: string, height: number) {
  return process.env.READY_KITS_CATALOG_PREVIEW === "1" && route === "roof" && height === 4;
}
