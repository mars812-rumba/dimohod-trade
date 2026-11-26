import assert from "node:assert/strict";
import test from "node:test";
import { routeComparisonKits, routeKitPriceDate, routeKitTotalKopecks } from "./guideRouteComparison.ts";

test("dated kit prices reproduce the owner's comparison with exact kopeck arithmetic", () => {
  const [wall, roof] = routeComparisonKits;
  assert.equal(routeKitPriceDate, "2026-11-24");
  assert.equal(wall.slug, "cherez-stenu-6m-d115");
  assert.equal(roof.slug, "cherez-perekrytie-6m-d115");
  assert.equal(routeKitTotalKopecks(wall), 6138570);
  assert.equal(routeKitTotalKopecks(roof), 4709282);
  assert.equal(routeKitTotalKopecks(wall) - routeKitTotalKopecks(roof), 1429288);
  for (const kit of routeComparisonKits) {
    assert.equal(kit.diameterMm, 115);
    assert.equal(kit.heightM, 6);
    const metreSections = kit.lines.filter(line => line.article.startsWith("DT-SW") && line.lengthMm === 1000);
    assert.equal(metreSections.reduce((sum, line) => sum + line.quantity, 0), 6);
  }
});
