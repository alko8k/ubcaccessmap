import type { RankLetter } from "@ubc-access-map/shared";

/**
 * Tier colours run red (D) to green (S).
 *
 * Colour is deliberately redundant: every badge also carries its letter, so the
 * ramp never becomes the only way to read a rank. All six colours share one
 * luminance, chosen for the light theme: each is 3.7:1 against white (WCAG
 * 1.4.11) and RANK_INK on it is 5.1:1. Keep these in sync with the --rank-*
 * custom properties in index.css.
 */
export const RANK_COLORS: Record<RankLetter, string> = {
  S: "#249854",
  A: "#62931a",
  B: "#a58007",
  C: "#d46611",
  D: "#e35459",
};

export const UNRANKED_COLOR = "#868395";

/** The letter colour on every rank fill. */
export const RANK_INK = "#14111c";

export function rankColor(letter: RankLetter | null | undefined): string {
  return letter ? RANK_COLORS[letter] : UNRANKED_COLOR;
}
