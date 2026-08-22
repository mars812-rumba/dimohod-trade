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
  return wallRouteConsoleQuantity(outdoorPipeLengthMm);
}

export function wallRouteFacadeConsolePositions(outdoorPipeLengthMm: number): number[] {
  const normalizedLengthMm = Math.max(0, Math.round(outdoorPipeLengthMm));
  if (!normalizedLengthMm) return [];

  const quantity = Math.ceil(normalizedLengthMm / WALL_CONSOLE_SPACING_MM);
  return Array.from({ length: quantity }, (_, index) => (
    normalizedLengthMm - (quantity - index - 1) * WALL_CONSOLE_SPACING_MM
  ));
}

export function wallRouteConsoleQuantity(outdoorPipeLengthMm: number): number {
  return 1 + wallRouteFacadeConsolePositions(outdoorPipeLengthMm).length;
}

export function wallTopRouteFacadeConsolePositions(outdoorPipeLengthMm: number): number[] {
  return wallRouteFacadeConsolePositions(outdoorPipeLengthMm);
}

export function wallTopRouteFacadeConsoleQuantity(outdoorPipeLengthMm: number): number {
  return wallTopRouteFacadeConsolePositions(outdoorPipeLengthMm).length;
}
