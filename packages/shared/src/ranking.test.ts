import { describe, expect, it } from "vitest";
import { aggregateScores, bayesianScore, weightedRawScore } from "./ranking.js";

const perfect = {
  cleanliness: 5,
  privacy: 5,
  availability: 5,
  overall: 5,
};

describe("ranking", () => {
  it("weights overall more heavily than availability", () => {
    expect(
      weightedRawScore({
        cleanliness: 3,
        privacy: 3,
        availability: 5,
        overall: 1,
      }),
    ).toBeLessThan(
      weightedRawScore({
        cleanliness: 3,
        privacy: 3,
        availability: 1,
        overall: 5,
      }),
    );
  });

  it("does not let a single perfect vote become an S rank", () => {
    const summary = aggregateScores([perfect]);
    expect(summary.voteCount).toBe(1);
    expect(summary.rankLetter).not.toBe("S");
    expect(summary.confidence).toBe("low");
    expect(summary.bayesianScore).toBeCloseTo(bayesianScore(5, 1), 3);
  });

  it("can reach S after many consistently high votes", () => {
    const summary = aggregateScores(Array.from({ length: 20 }, () => perfect));
    expect(summary.rankLetter).toBe("S");
    expect(summary.confidence).toBe("high");
  });

  it("returns an unranked summary with no votes", () => {
    expect(aggregateScores([])).toMatchObject({
      voteCount: 0,
      bayesianScore: null,
      rankLetter: null,
      confidence: "none",
    });
  });
});
