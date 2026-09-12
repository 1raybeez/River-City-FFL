export type PredictorOutcomeFields = {
  projectedWins: number | null;
  projectedLosses: number | null;
  projectedFinish: number | null;
  playoffProbability: number | null;
  championshipProbability: number | null;
  likelySeed: number | null;
  confidence: "CALIBRATING" | "READY" | null;
  evidenceAsOf: string | null;
};

export const calibratingOutcome: PredictorOutcomeFields = {
  projectedWins: null,
  projectedLosses: null,
  projectedFinish: null,
  playoffProbability: null,
  championshipProbability: null,
  likelySeed: null,
  confidence: "CALIBRATING",
  evidenceAsOf: null,
};
