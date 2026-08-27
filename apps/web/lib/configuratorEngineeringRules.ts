/**
 * Confirmed engineering facts for the chimney calculation kernel.
 *
 * Keep measurements and product policy here. Geometry, SKU matching and price
 * allocation consume these facts but must not redefine them locally.
 */
export const CHIMNEY_ENGINEERING_RULES = {
  socketOverlapMm: 50,
  rotaryDamper: {
    nominalMm: 200,
    effectiveMm: 150,
  },
  supportCap: {
    nominalMm: 90,
    effectiveMm: 40,
  },
  singleWallElbow90: {
    effectiveMm: 50,
  },
  initialSingleWallPipe: {
    nominalMm: 1000,
    effectiveMm: 950,
  },
  wallRoute: {
    firstSandwichPipe: {
      nominalMm: 1000,
      effectiveMm: 950,
    },
    teeLowerSandwichPipe: {
      nominalMm: 250,
      effectiveMm: 200,
      innerSteelGrade: "AISI 304",
      outerSteelGrade: "AISI 430",
      innerThicknessMm: 0.5,
      outerThicknessMm: 0.5,
    },
  },
  standardMaterials: {
    innerSteelGrade: "AISI 304",
    outerSteelGrade: "AISI 430",
    firstFloorInnerThicknessMm: 0.8,
    upperAndOutdoorInnerThicknessMm: 0.5,
    outerThicknessMm: 0.5,
  },
  combustionMaterials: {
    applianceTypes: ["gaz", "diesel"],
    innerSteelGrade: "AISI 316",
    outerSteelGrade: "AISI 430",
  },
  passageKit: {
    sourceUnitPriceRub: 1760,
    flangeQuantityPerPassage: 2,
    flangeBaseSize: "600×600 мм",
    flangeSteelGrade: "AISI 430",
  },
} as const;

export type ChimneyThicknessProfile = "first-floor-0.8" | "upper-outdoor-0.5";
