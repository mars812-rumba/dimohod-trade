export const WALL_REAR_CONNECTION_PIPE_NOMINAL_MM = 1000;
export const WALL_OUTDOOR_PIPE_NOMINAL_MM = 1000;
export const WALL_CONSOLE_SPACING_MM = 2000;

export type WallRearRoutePipePlan = {
  connectionPipeNominalMm: number;
  outdoorPipeNominalMm: number;
  outdoorPipeQuantity: number;
};

export function wallRearRoutePipePlan(outdoorHeightMm: number): WallRearRoutePipePlan {
  const normalizedHeightMm = Math.max(0, Math.round(outdoorHeightMm));

  return {
    connectionPipeNominalMm: WALL_REAR_CONNECTION_PIPE_NOMINAL_MM,
    outdoorPipeNominalMm: WALL_OUTDOOR_PIPE_NOMINAL_MM,
    outdoorPipeQuantity: Math.max(0, Math.ceil(normalizedHeightMm / 1000) - 1),
  };
}

export function wallRearRouteConsoleQuantity(
  outdoorPipeQuantity: number,
  outdoorPipeNominalMm = WALL_OUTDOOR_PIPE_NOMINAL_MM,
): number {
  const outdoorPipeLengthMm = Math.max(0, Math.round(outdoorPipeQuantity))
    * Math.max(0, Math.round(outdoorPipeNominalMm));
  const facadeConsoles = Math.ceil(outdoorPipeLengthMm / WALL_CONSOLE_SPACING_MM);
  return 1 + facadeConsoles;
}
