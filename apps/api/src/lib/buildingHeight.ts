/** A typical storey on UBC's campus, used when only a floor count is known. */
const METRES_PER_FLOOR = 3.8;

/**
 * A building's height in metres for the 3D map, from UBC's open data.
 *
 * BLDG_HEIGHT is measured and covers almost every building; MAX_FLOORS fills
 * most of the rest. Anything else is unknown rather than guessed here, and the
 * map picks its own fallback.
 */
export function buildingHeight(height?: number | null, floors?: number | null): number | null {
  if (typeof height === "number" && height > 0) {
    return Math.round(height * 10) / 10;
  }
  if (typeof floors === "number" && floors > 0) {
    return Math.round(floors * METRES_PER_FLOOR * 10) / 10;
  }
  return null;
}
