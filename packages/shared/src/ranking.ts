import { RANK_LETTERS } from "./constants.js";

export type ScoreInput = {
  cleanliness: number;
  privacy: number;
  availability: number;
  overall: number;
};

export type RankLetter = (typeof RANK_LETTERS)[number];

export type RankSummary = {
  voteCount: number;
  bayesianScore: number | null;
  rankLetter: RankLetter | null;
  confidence: "none" | "low" | "medium" | "high";
  breakdown: {
    cleanliness: number | null;
    privacy: number | null;
    availability: number | null;
    overall: number | null;
  };
};

const WEIGHTS = {
  overall: 0.4,
  cleanliness: 0.25,
  privacy: 0.2,
  availability: 0.15,
} as const;

const PRIOR_MEAN = 3;
const PRIOR_STRENGTH = 8;

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function letterForScore(score: number): RankLetter {
  if (score >= 4.4) return "S";
  if (score >= 3.9) return "A";
  if (score >= 3.3) return "B";
  if (score >= 2.6) return "C";
  return "D";
}

function confidenceForCount(voteCount: number): RankSummary["confidence"] {
  if (voteCount === 0) return "none";
  if (voteCount < 5) return "low";
  if (voteCount < 15) return "medium";
  return "high";
}

export function weightedRawScore(score: ScoreInput): number {
  return (
    score.overall * WEIGHTS.overall +
    score.cleanliness * WEIGHTS.cleanliness +
    score.privacy * WEIGHTS.privacy +
    score.availability * WEIGHTS.availability
  );
}

export function bayesianScore(rawAverage: number, voteCount: number): number {
  return (
    (PRIOR_STRENGTH * PRIOR_MEAN + voteCount * rawAverage) /
    (PRIOR_STRENGTH + voteCount)
  );
}

export function aggregateScores(scores: ScoreInput[]): RankSummary {
  const voteCount = scores.length;

  if (voteCount === 0) {
    return {
      voteCount: 0,
      bayesianScore: null,
      rankLetter: null,
      confidence: "none",
      breakdown: {
        cleanliness: null,
        privacy: null,
        availability: null,
        overall: null,
      },
    };
  }

  const rawAverage =
    scores.reduce((sum, score) => sum + weightedRawScore(score), 0) / voteCount;
  const score = bayesianScore(rawAverage, voteCount);

  return {
    voteCount,
    bayesianScore: Number(score.toFixed(3)),
    rankLetter: letterForScore(score),
    confidence: confidenceForCount(voteCount),
    breakdown: {
      cleanliness: average(scores.map((score) => score.cleanliness)),
      privacy: average(scores.map((score) => score.privacy)),
      availability: average(scores.map((score) => score.availability)),
      overall: average(scores.map((score) => score.overall)),
    },
  };
}
