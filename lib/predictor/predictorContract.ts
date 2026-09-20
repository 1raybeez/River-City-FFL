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

export type PredictorReadiness = "CALIBRATING" | "SHADOW_READY" | "PRODUCTION_READY";
export type ProjectedStandingsStatus = "UNAVAILABLE" | "READY";
export type ProbabilityStatus = "CALIBRATING" | "SHADOW_ONLY" | "READY";

export type PredictorCalibrationProgress = Readonly<{
  readiness: PredictorReadiness;
  projectedStandingsStatus: ProjectedStandingsStatus;
  probabilityStatus: ProbabilityStatus;
  playerSamples: number;
  playerSampleTarget: 50;
  teamSamples: number;
  teamSampleTarget: 12;
  eligibleWeeks: readonly number[];
  excludedWeeks: readonly Readonly<{ week: number; reason: string }>[];
  projectionBaselines: readonly Readonly<{ week: number; status: "CAPTURED" | "MISSING" }>[];
  actualEvidence: readonly Readonly<{ week: number; status: "CAPTURED" | "WAITING" | "MISSING" }>[];
  residualEvidence: readonly Readonly<{ week: number; status: "PAIRED" | "MISSING" }>[];
  positionCoverage: Readonly<Record<string, number>>;
  bucketCoverage: Readonly<Record<string, number>>;
  latestEvidenceAt: string | null;
  nextEvent: string;
  explanation: string;
}>;

export type PredictorOutcome = Readonly<{
  readiness: PredictorReadiness;
  projectedStandingsStatus: ProjectedStandingsStatus;
  probabilityStatus: ProbabilityStatus;
  projectedStandings: readonly Readonly<{ franchiseId: string; teamName: string; projectedWins: number; projectedLosses: number; projectedFinish: number }>[];
  playoffProbability: Readonly<Record<string, number>> | null;
  championshipProbability: Readonly<Record<string, number>> | null;
  confidence: "CALIBRATING" | "SHADOW_ONLY" | "READY";
  evidenceAsOf: string | null;
}>;

export function buildPredictorCalibrationProgress(input: Omit<PredictorCalibrationProgress, "nextEvent" | "explanation">): PredictorCalibrationProgress {
  const nextEvent = input.readiness === "CALIBRATING"
    ? input.actualEvidence.some(row => row.status === "WAITING") ? "Waiting for the next finalized Sleeper week"
      : "Capture and pair the next valid projection and actual evidence"
    : input.readiness === "SHADOW_READY" ? "Commissioner validation and explicit production promotion"
      : "Refresh after finalized evidence, roster, or schedule changes";
  const explanation = input.probabilityStatus === "READY"
    ? "Approved production simulation output is available."
    : input.readiness === "SHADOW_READY"
      ? "The sample thresholds are met, but probability output remains commissioner-only until promotion."
      : "Probabilities remain hidden until valid residual evidence satisfies the approved calibration policy.";
  return { ...input, nextEvent, explanation };
}

export function adaptPredictorOutcome(input: {
  progress: PredictorCalibrationProgress;
  projectedStandings?: PredictorOutcome["projectedStandings"];
  production?: Pick<PredictorOutcome, "playoffProbability" | "championshipProbability" | "evidenceAsOf"> | null;
}): PredictorOutcome {
  const production = input.progress.readiness === "PRODUCTION_READY" ? input.production : null;
  return {
    readiness: input.progress.readiness,
    projectedStandingsStatus: input.progress.projectedStandingsStatus,
    probabilityStatus: production ? "READY" : input.progress.readiness === "SHADOW_READY" ? "SHADOW_ONLY" : "CALIBRATING",
    projectedStandings: input.progress.projectedStandingsStatus === "READY" ? input.projectedStandings ?? [] : [],
    playoffProbability: production?.playoffProbability ?? null,
    championshipProbability: production?.championshipProbability ?? null,
    confidence: production ? "READY" : input.progress.readiness === "SHADOW_READY" ? "SHADOW_ONLY" : "CALIBRATING",
    evidenceAsOf: production?.evidenceAsOf ?? input.progress.latestEvidenceAt,
  };
}

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
