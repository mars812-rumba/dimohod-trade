export type PitchedRoofPassageInput = {
  ridgeInnerHeightMm: number | null;
  chimneyToRidgeHorizontalMm: number | null;
  roofAngleDeg: number | null;
  roofThicknessAlongChimneyMm: number | null;
};

export type PitchedRoofPassage = {
  innerHeightAtChimneyMm: number;
  outerHeightAtChimneyMm: number;
};

/**
 * Returns the roof passage on the vertical chimney axis.
 * Ridge height is measured to the inner lower ridge edge; roof thickness is
 * measured along the same vertical axis, matching the measurement wizard.
 */
export function calculatePitchedRoofPassage(
  input: PitchedRoofPassageInput,
): PitchedRoofPassage | null {
  const {
    ridgeInnerHeightMm,
    chimneyToRidgeHorizontalMm,
    roofAngleDeg,
    roofThicknessAlongChimneyMm,
  } = input;
  if (
    ridgeInnerHeightMm === null
    || chimneyToRidgeHorizontalMm === null
    || roofAngleDeg === null
    || roofThicknessAlongChimneyMm === null
    || ridgeInnerHeightMm <= 0
    || chimneyToRidgeHorizontalMm < 0
    || roofAngleDeg <= 0
    || roofAngleDeg >= 90
    || roofThicknessAlongChimneyMm <= 0
  ) return null;

  const innerHeightAtChimneyMm = Math.round(
    ridgeInnerHeightMm
      - chimneyToRidgeHorizontalMm * Math.tan(roofAngleDeg * Math.PI / 180),
  );
  if (innerHeightAtChimneyMm <= 0) return null;

  return {
    innerHeightAtChimneyMm,
    outerHeightAtChimneyMm: innerHeightAtChimneyMm + Math.round(roofThicknessAlongChimneyMm),
  };
}
