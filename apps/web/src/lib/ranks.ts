import type { RankLetter } from "@ubc-access-map/shared";

/**
 * Tier colours run red (D) to green (S).
 *
 * Colour is deliberately redundant: every badge also carries its letter, so the
 * ramp never becomes the only way to read a rank. Keep these in sync with the
 * --rank-* custom properties in index.css.
 */
export const RANK_COLORS: Record<RankLetter, string> = {
  S: "#35d07f",
  A: "#a3d939",
  B: "#f2c53d",
  C: "#f0883a",
  D: "#e5484d",
};

export const UNRANKED_COLOR = "#8b9196";

export function rankColor(letter: RankLetter | null | undefined): string {
  return letter ? RANK_COLORS[letter] : UNRANKED_COLOR;
}
