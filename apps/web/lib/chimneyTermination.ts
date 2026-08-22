export const RIDGE_NEAR_DISTANCE_MM = 1500;
export const RIDGE_TEN_DEGREE_DISTANCE_MM = 3000;
export const RIDGE_NEAR_RISE_MM = 500;
export const RIDGE_CLEARANCE_ANGLE_DEG = 10;

export type RoofTerminationRule =
  | "flat-roof-plus-500"
  | "ridge-plus-500"
  | "ridge-level"
  | "ridge-ten-degree-line"
  | "missing-roof-measurements";

export type TerminationHeightInput = {
  roofType: "pitched" | "flat";
  ridgeHeightMm: number | null;
  ridgeHorizontalDistanceMm: number | null;
  roofOuterHeightAtChimneyMm: number | null;
};

export type TerminationHeightResult = {
  roofRule: RoofTerminationRule;
  roofRequirementMm: number | null;
  minimumHeightMm: number | null;
  tenDegreeLineHeightAtChimneyMm: number | null;
};

export function calculateMinimumTerminationHeight(
  input: TerminationHeightInput,
): TerminationHeightResult {
  let roofRule: RoofTerminationRule = "missing-roof-measurements";
  let roofRequirementMm: number | null = null;
  let tenDegreeLineHeightAtChimneyMm: number | null = null;

  if (input.roofType === "flat") {
    if (input.roofOuterHeightAtChimneyMm !== null) {
      roofRule = "flat-roof-plus-500";
      roofRequirementMm = Math.round(input.roofOuterHeightAtChimneyMm + RIDGE_NEAR_RISE_MM);
    }
  } else if (input.ridgeHeightMm !== null && input.ridgeHorizontalDistanceMm !== null) {
    if (input.ridgeHorizontalDistanceMm <= RIDGE_NEAR_DISTANCE_MM) {
      roofRule = "ridge-plus-500";
      roofRequirementMm = Math.round(input.ridgeHeightMm + RIDGE_NEAR_RISE_MM);
    } else if (input.ridgeHorizontalDistanceMm <= RIDGE_TEN_DEGREE_DISTANCE_MM) {
      roofRule = "ridge-level";
      roofRequirementMm = Math.round(input.ridgeHeightMm);
    } else {
      roofRule = "ridge-ten-degree-line";
      tenDegreeLineHeightAtChimneyMm = Math.round(
        input.ridgeHeightMm
          - input.ridgeHorizontalDistanceMm * Math.tan(RIDGE_CLEARANCE_ANGLE_DEG * Math.PI / 180),
      );
      roofRequirementMm = tenDegreeLineHeightAtChimneyMm;
    }
  }

  return {
    roofRule,
    roofRequirementMm,
    minimumHeightMm: roofRequirementMm,
    tenDegreeLineHeightAtChimneyMm,
  };
}
