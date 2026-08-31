import type { MultiTeamParticipantResult } from "../multiTeamTypes";
import type { MultiTeamMarketEntry } from "../multiTeamTypes";
import { evaluateFairness } from "./evaluateFairness";
import {
  MODEL_VALUE_UNAVAILABLE,
  POST_DRAFT_ACQUISITION_POLICY_UNDEFINED,
  type AcquisitionSnapshotRecord,
} from "./acquisitionSnapshot";
import type { FairnessResult } from "./types";
import type { FairnessProvenance } from "./sourceContracts";

export type TradeFairnessActivation = {
  status: "READY" | "UNAVAILABLE" | "NOT_APPLICABLE";
  result: FairnessResult | null;
  reason: string | null;
  affectedPlayerNames: string[];
};

const provenance: FairnessProvenance = {
  valueSource: "Published River City auction consensus",
  valueSourceVersion: "published-masterview-2026",
  acquisitionCostSource: "Sleeper finalized draft and post-draft provenance",
  acquisitionCostSourceVersion: "sleeper-2026-acquisition-provenance-v1",
  keeperCostSource: "Sleeper finalized draft metadata",
  keeperCostSourceVersion: "sleeper-2026-acquisition-provenance-v1",
};

function unavailable(reason: string, affectedPlayerNames: string[]): TradeFairnessActivation {
  return { status: "UNAVAILABLE", result: null, reason, affectedPlayerNames };
}

export function buildTwoTeamFairnessActivation({
  participants,
  acquisitionSnapshot,
  marketByPlayer,
  draftStatus,
}: {
  participants: readonly MultiTeamParticipantResult[];
  acquisitionSnapshot: ReadonlyMap<string, AcquisitionSnapshotRecord>;
  marketByPlayer: ReadonlyMap<string, MultiTeamMarketEntry>;
  draftStatus: string;
}): TradeFairnessActivation {
  if (participants.length !== 2) {
    return { status: "NOT_APPLICABLE", result: null, reason: "TWO_TEAM_ONLY", affectedPlayerNames: [] };
  }
  if (draftStatus !== "complete") return unavailable("AUCTION_NOT_COMPLETE", []);

  const selected = participants.flatMap((participant) =>
    participant.sends.map((asset) => ({ participant, asset })),
  );
  const blocked = selected.flatMap(({ participant, asset }) => {
    const key = `2026:${participant.franchiseId}:${asset.player.playerId}`;
    const record = acquisitionSnapshot.get(key);
    const market = marketByPlayer.get(asset.player.playerId);
    if (!record) return [{ name: asset.player.name ?? asset.player.playerId, reason: "ACQUISITION_PROVENANCE_UNRESOLVED" }];
    if (record.fairnessEligibility !== "ELIGIBLE") return [{ name: asset.player.name ?? asset.player.playerId, reason: record.unavailableReason ?? POST_DRAFT_ACQUISITION_POLICY_UNDEFINED }];
    if (typeof market?.value !== "number" || !Number.isFinite(market.value)) return [{ name: asset.player.name ?? asset.player.playerId, reason: MODEL_VALUE_UNAVAILABLE }];
    return [];
  });
  if (blocked.length > 0) {
    return unavailable(
      blocked.some((entry) => entry.reason === POST_DRAFT_ACQUISITION_POLICY_UNDEFINED)
        ? POST_DRAFT_ACQUISITION_POLICY_UNDEFINED
        : blocked[0].reason,
      [...new Set(blocked.map((entry) => entry.name))],
    );
  }

  const toFairnessPlayer = (participant: MultiTeamParticipantResult, playerId: string) => {
    const record = acquisitionSnapshot.get(`2026:${participant.franchiseId}:${playerId}`)!;
    const value = marketByPlayer.get(playerId)!.value!;
    const keeperCost = record.currentAcquisitionCost!;
    return {
      playerId,
      value,
      keeperCost,
      keeperCostStatus: keeperCost === 0 ? "KNOWN_ZERO" as const : "KNOWN_VALUE" as const,
    };
  };
  const sideA = participants[0];
  const sideB = participants[1];
  const result = evaluateFairness({
    sideA: {
      playersSent: sideA.sends.map((asset) => toFairnessPlayer(sideA, asset.player.playerId)),
      playersReceived: sideA.receives.map((asset) => toFairnessPlayer(sideB, asset.player.playerId)),
    },
    sideB: {
      playersSent: sideB.sends.map((asset) => toFairnessPlayer(sideB, asset.player.playerId)),
      playersReceived: sideB.receives.map((asset) => toFairnessPlayer(sideA, asset.player.playerId)),
    },
    valueSource: provenance.valueSource,
    provenance,
    faabMode: "NEUTRAL",
  });
  return { status: result.status, result, reason: result.status === "READY" ? null : "FAIRNESS_INPUTS_INCOMPLETE", affectedPlayerNames: [] };
}
