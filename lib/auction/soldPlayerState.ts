export type SoldPlayerKind = "sold" | "keeper";

export type SoldPlayerState = {
  kind: SoldPlayerKind;
  statusLabel: "SOLD" | "KEEPER";
  teamName: string;
  managerName: string | null;
  price: number | null;
  sourceLabel: string;
  marketValueDifference: number | null;
  expectedSaleDifference: number | null;
  recommendationCeilingDifference: number | null;
};

function finiteDifference(
  actual: number | null,
  reference: number | null
) {
  return actual !== null &&
    reference !== null &&
    Number.isFinite(actual) &&
    Number.isFinite(reference)
    ? actual - reference
    : null;
}

export function buildSoldPlayerState({
  isKeeper,
  teamName,
  managerName,
  price,
  sourceLabel,
  marketValue,
  expectedSale,
  recommendationCeiling,
}: {
  isKeeper: boolean;
  teamName: string;
  managerName: string | null;
  price: number | null;
  sourceLabel: string;
  marketValue: number | null;
  expectedSale: number | null;
  recommendationCeiling: number | null;
}): SoldPlayerState {
  return {
    kind: isKeeper ? "keeper" : "sold",
    statusLabel: isKeeper ? "KEEPER" : "SOLD",
    teamName,
    managerName,
    price,
    sourceLabel,
    marketValueDifference: finiteDifference(price, marketValue),
    expectedSaleDifference: finiteDifference(price, expectedSale),
    recommendationCeilingDifference: finiteDifference(
      price,
      recommendationCeiling
    ),
  };
}

export function getSoldPlayerPrimaryState(
  state: SoldPlayerState | null,
  availableRecommendation: string
) {
  return state?.statusLabel ?? availableRecommendation;
}

export function suppressSoldPlayerLiveWarnings(
  state: SoldPlayerState | null,
  warnings: readonly string[]
) {
  return state ? [] : [...warnings];
}
