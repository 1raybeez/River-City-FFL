import type {
  FairnessMarketCoverage,
  FairnessMarketIntelligence,
  FairnessMarketPackage,
  FairnessMarketPackageContext,
  FairnessMarketReasoningFactor,
  FairnessMarketSignal,
  FairnessMarketSignalEdge,
  FairnessSignalAgreement,
  FairnessSignalDisposition,
} from "./types";

export type FairnessCorePackageContext = {
  packageId: string;
  netValue: number;
  deltaTalent: number;
  deltaSurplus: number;
};

const SIGNAL_TOLERANCE = 0.01;

function finite(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nearlyEqual(first: number, second: number) {
  return Math.abs(first - second) <= SIGNAL_TOLERANCE;
}

function coverage(known: number, total: number): FairnessMarketCoverage {
  if (total === 0 || known === 0) return "UNAVAILABLE";
  return known === total ? "COMPLETE" : "PARTIAL";
}

function median(values: readonly number[]) {
  const ordered = [...values].sort((first, second) => first - second);
  if (ordered.length === 0) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function packageContext(pkg: FairnessMarketPackage): FairnessMarketPackageContext {
  const auctionValues = pkg.players.map((player) => player.auctionConsensus).filter(finite);
  const adpValues = pkg.players.map((player) => player.averageAdp).filter(finite);
  return {
    packageId: pkg.packageId,
    totalAuctionConsensus:
      auctionValues.length > 0 ? auctionValues.reduce((sum, value) => sum + value, 0) : null,
    auctionConsensusCoverage: coverage(auctionValues.length, pkg.players.length),
    completeAuctionContextCount: auctionValues.length,
    totalPlayerCount: pkg.players.length,
    medianAdp: median(adpValues),
    bestAdp: adpValues.length > 0 ? Math.min(...adpValues) : null,
    adpCoverage: coverage(adpValues.length, pkg.players.length),
    completeAdpContextCount: adpValues.length,
  };
}

type DirectionalMetric = { value: number | null; coverage: FairnessMarketCoverage };

function directionalEdge(
  signal: FairnessMarketSignal,
  packages: readonly FairnessMarketPackageContext[],
  metric: (pkg: FairnessMarketPackageContext) => DirectionalMetric,
): Omit<FairnessMarketSignalEdge, "disposition"> & { metricAvailable: boolean } {
  if (packages.length < 2) return { signal, strongerPackageId: null, metricAvailable: false };
  const metrics = packages.map((pkg) => ({ pkg, ...metric(pkg) }));
  if (metrics.some(({ coverage: metricCoverage }) => metricCoverage !== "COMPLETE")) {
    return { signal, strongerPackageId: null, metricAvailable: false };
  }
  const ranked = [...metrics].sort((first, second) => (second.value ?? 0) - (first.value ?? 0));
  if (ranked.some(({ value }) => value === null) || ranked.length < 2) {
    return { signal, strongerPackageId: null, metricAvailable: false };
  }
  if (nearlyEqual(ranked[0].value as number, ranked[1].value as number)) {
    return { signal, strongerPackageId: null, metricAvailable: true };
  }
  return { signal, strongerPackageId: ranked[0].pkg.packageId, metricAvailable: true };
}

function coreEdge(
  signal: "MODEL_TALENT" | "ACQUISITION_SURPLUS",
  core: readonly FairnessCorePackageContext[],
  metric: (pkg: FairnessCorePackageContext) => number,
) {
  if (core.length < 2) return { signal, strongerPackageId: null, metricAvailable: false };
  const ranked = [...core].sort((first, second) => metric(second) - metric(first));
  if (nearlyEqual(metric(ranked[0]), metric(ranked[1]))) {
    return { signal, strongerPackageId: null, metricAvailable: true };
  }
  return { signal, strongerPackageId: ranked[0].packageId, metricAvailable: true };
}

function disposition(
  strongerPackageId: string | null,
  modelPackageId: string | null,
  metricAvailable: boolean,
): FairnessSignalDisposition {
  if (!metricAvailable) return "UNAVAILABLE";
  if (!strongerPackageId) return "NEUTRAL";
  return strongerPackageId === modelPackageId ? "AGREES" : "OPPOSES";
}

function buildAgreement(
  packages: readonly FairnessMarketPackageContext[],
  core: readonly FairnessCorePackageContext[],
): FairnessSignalAgreement {
  const modelOrder = [...core].sort((first, second) => second.netValue - first.netValue);
  const modelPackageId =
    modelOrder.length > 1 && !nearlyEqual(modelOrder[0].netValue, modelOrder[1].netValue)
      ? modelOrder[0].packageId
      : null;
  const rawSignals = [
    coreEdge("MODEL_TALENT", core, (pkg) => pkg.deltaTalent),
    coreEdge("ACQUISITION_SURPLUS", core, (pkg) => pkg.deltaSurplus),
    directionalEdge("AUCTION_CONSENSUS", packages, (pkg) => ({
      value: pkg.totalAuctionConsensus,
      coverage: pkg.auctionConsensusCoverage,
    })),
    directionalEdge("ADP", packages, (pkg) => ({
      value: pkg.medianAdp === null ? null : -pkg.medianAdp,
      coverage: pkg.adpCoverage,
    })),
  ];
  const supportingSignals = rawSignals.map((signal) => ({
    signal: signal.signal,
    strongerPackageId: signal.strongerPackageId,
    disposition: disposition(signal.strongerPackageId, modelPackageId, signal.metricAvailable),
  }));
  const agreeing = supportingSignals.filter((signal) => signal.disposition === "AGREES").length;
  const opposing = supportingSignals.filter((signal) => signal.disposition === "OPPOSES").length;
  let state: FairnessSignalAgreement["state"] = "INSUFFICIENT_DATA";
  if (modelPackageId && agreeing > 0 && opposing > 0) state = "MIXED";
  else if (modelPackageId && agreeing >= 3) state = "STRONG_AGREEMENT";
  else if (modelPackageId && agreeing === 2) state = "MODERATE_AGREEMENT";
  else if (modelPackageId && agreeing === 1) state = "LIMITED_AGREEMENT";
  return { state, modelPackageId, supportingSignals };
}

function buildReasoning(
  packages: readonly FairnessMarketPackageContext[],
  core: readonly FairnessCorePackageContext[],
  agreement: FairnessSignalAgreement,
): FairnessMarketReasoningFactor[] {
  const factors: FairnessMarketReasoningFactor[] = [];
  for (const pkg of core) {
    if (pkg.deltaTalent !== 0) factors.push({ packageId: pkg.packageId, source: "CORE_MODEL", code: "HIGHER_MODEL_TALENT" });
    if (pkg.deltaSurplus !== 0) factors.push({ packageId: pkg.packageId, source: "CORE_MODEL", code: "HIGHER_ACQUISITION_SURPLUS" });
  }
  for (const signal of agreement.supportingSignals) {
    if (signal.disposition === "UNAVAILABLE" || signal.disposition === "NEUTRAL" || !signal.strongerPackageId) continue;
    if (signal.signal === "AUCTION_CONSENSUS") factors.push({ packageId: signal.strongerPackageId, source: "MARKET_INTELLIGENCE", code: "STRONGER_AUCTION_CONTEXT" });
    if (signal.signal === "ADP") factors.push({ packageId: signal.strongerPackageId, source: "MARKET_INTELLIGENCE", code: "EARLIER_ADP_ASSET" });
    if (signal.disposition === "OPPOSES" && agreement.modelPackageId) factors.push({ packageId: agreement.modelPackageId, source: "MARKET_INTELLIGENCE", code: "MARKET_DISAGREEMENT" });
  }
  return packages.length > 0 ? factors : [];
}

export function buildFairnessMarketIntelligence({
  packages,
  core,
}: {
  packages: readonly FairnessMarketPackage[];
  core: readonly FairnessCorePackageContext[];
}): FairnessMarketIntelligence {
  const contexts = packages.map(packageContext);
  const signalAgreement = buildAgreement(contexts, core);
  return {
    packages: contexts,
    signalAgreement,
    reasoning: buildReasoning(contexts, core, signalAgreement),
  };
}
