"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Shield,
  Upload,
} from "lucide-react";
import SiteShell from "@/components/SiteShell";
import {
  adpSourceNeedsValidation,
  getAdpMaintenanceStatusLabel,
  getUploadedAdpSourceHash,
} from "@/lib/auction/adpMaintenanceState";
import { getAuctionAdpSourceRegistryEntries } from "@/lib/auction/adpSourceRegistry";
import type {
  AuctionAdpRefreshRunSummary,
  AuctionAdpStatusResponse,
} from "@/lib/auction/adpTypes";
import type { AuctionProductionHealthResponse } from "@/lib/auction/productionRuntime";
import { getProductionAuctionValueSourceRegistryEntries } from "@/lib/auction/valueSourceRegistry";
import type {
  AuctionValueRefreshRunSummary,
  AuctionValueSourceSummary,
  AuctionValueStatusResponse,
} from "@/lib/auction/valueRefreshTypes";

type OperationId =
  | "refresh-current-trades";

type OperationState = {
  loading: boolean;
  status: "idle" | "success" | "error";
  output: string;
};

type ValueActionState = {
  loading: boolean;
  status: "idle" | "success" | "error";
  output: string;
};

type DeploymentOverallState = "READY" | "PARTIAL" | "BLOCKED";

type Operation = {
  id: OperationId;
  title: string;
  description: string;
  endpoint: string;
  requiresConfirmation?: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

type UnmatchedReviewPlayer = {
  sourceKey: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  reason: string;
  suggestedMatch?: {
    sleeperPlayerId: string | null;
    playerName: string;
    position: string | null;
    nflTeam: string | null;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    evidence: string[];
  };
  candidateCount?: number;
  candidates?: Array<{
    sleeperPlayerId: string | null;
    playerName: string;
    position: string | null;
    nflTeam: string | null;
  }>;
  closestCandidate?: {
    playerName: string;
    position: string | null;
    nflTeam: string | null;
  };
};

type UnmatchedReviewSourceSummary = {
  sourceKey: string;
  unmatchedCount: number | null;
  unmatchedPlayers?: UnmatchedReviewPlayer[] | null;
  unmatchedDetailsStored?: boolean;
};

const operations: Operation[] = [
  {
    id: "refresh-current-trades",
    title: "Refresh current-season trade history",
    description: "Fetch 2026 Sleeper trades and store them in trade history.",
    endpoint: "/api/history/trades?season=2026",
    icon: RefreshCcw,
  },
];

const initialOperationState = operations.reduce<Record<OperationId, OperationState>>(
  (state, operation) => {
    state[operation.id] = {
      loading: false,
      status: "idle",
      output: "",
    };
    return state;
  },
  {} as Record<OperationId, OperationState>
);

const auctionValueSources = getProductionAuctionValueSourceRegistryEntries();
const auctionAdpSources = getAuctionAdpSourceRegistryEntries(2026);
const initialValueActionState: ValueActionState = {
  loading: false,
  status: "idle",
  output: "",
};

function formatOutput(data: unknown) {
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString()
    : "N/A";
}

function formatRunLabel(run: { status: string; runId: string } | null) {
  if (!run) return "None";
  return `${run.status.toUpperCase()} | ${run.runId}`;
}

function getSourceStatusClass(status: AuctionValueSourceSummary["status"]) {
  if (status === "validated") return "text-emerald-600";
  if (status === "blocked") return "text-red-600";
  if (status === "uploaded") return "text-orange-600";
  return "text-gray-500 dark:text-gray-400";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not checked";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSourceMode(value: string | null | undefined) {
  if (value === "firestore") return "Firestore";
  if (value === "local") return "Local fallback";
  return "Unknown";
}

function formatUnmatchedReason(reason: string) {
  if (reason === "no-sleeper-match") return "No Sleeper match";
  if (reason === "ambiguous-name-position") return "Ambiguous name/position";
  if (reason === "missing-position") return "Missing position";
  if (reason === "invalid-team") return "Invalid team";
  if (reason === "duplicate-player") return "Duplicate player";
  if (reason === "skipped-defense") return "Skipped defense";
  return "Other safe review reason";
}

function formatPlayerField(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "N/A";
}

function formatShortHash(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "no hash";
}

function formatUploadedFileVersion(
  summary: {
    fileName?: string | null;
    uploadedAt?: string | null;
    contentHash?: string | null;
    fileHash?: string | null;
  } | null
) {
  if (!summary?.fileName) return "No CSV uploaded";
  const uploadedAt = summary.uploadedAt
    ? `uploaded ${formatDateTime(summary.uploadedAt)}`
    : "uploaded time unknown";

  return `${summary.fileName} · ${uploadedAt} · ${formatShortHash(getUploadedAdpSourceHash(summary))}`;
}

function getAdpSourceStatusClass(statusLabel: string) {
  if (statusLabel === "VALIDATED") return "text-emerald-600";
  if (statusLabel === "BLOCKED") return "text-red-600";
  if (statusLabel === "UPLOADING") return "text-blue-600";
  if (statusLabel.startsWith("SELECTED")) return "text-orange-600";
  if (statusLabel.startsWith("UPLOADED")) return "text-orange-600";
  return "text-gray-500 dark:text-gray-400";
}

function UnmatchedPlayersReview({
  summary,
  panelKey,
  openPanelKey,
  onToggle,
}: {
  summary: UnmatchedReviewSourceSummary | null;
  panelKey: string;
  openPanelKey: string | null;
  onToggle: (panelKey: string | null) => void;
}) {
  const unmatchedCount = summary?.unmatchedCount;
  if (typeof unmatchedCount !== "number") return null;

  if (unmatchedCount === 0) {
    return (
      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">
        ALL PLAYERS MATCHED
      </p>
    );
  }

  const isOpen = openPanelKey === panelKey;
  const hasStoredDetails =
    summary?.unmatchedDetailsStored && summary.unmatchedPlayers !== undefined;
  const unmatchedPlayers = summary?.unmatchedPlayers ?? [];

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => onToggle(isOpen ? null : panelKey)}
        className="inline-flex h-9 items-center justify-center rounded-2xl border border-black/10 px-3 text-[10px] font-black uppercase tracking-widest transition hover:border-orange-600/40 hover:text-orange-600 dark:border-white/10"
      >
        VIEW {formatNumber(unmatchedCount)} UNMATCHED
      </button>

      {isOpen ? (
        <div className="mt-3 rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-black/30">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Unmatched Players
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">
              Excluded from consensus
            </p>
          </div>

          {!hasStoredDetails || unmatchedPlayers.length === 0 ? (
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Unmatched details were not stored for this run.
            </p>
          ) : (
            <div className="max-h-64 overflow-auto">
              <div className="grid gap-2">
                {unmatchedPlayers.map((player, index) => (
                  <div
                    key={`${player.sourceKey}-${player.playerName}-${index}`}
                    className="rounded-2xl border border-black/10 bg-white p-3 text-xs dark:border-white/10 dark:bg-[#121212]"
                  >
                    <div className="flex flex-wrap items-center gap-2 font-black uppercase tracking-widest">
                      <span>{player.playerName}</span>
                      <span className="text-gray-400">
                        {formatPlayerField(player.position)}
                      </span>
                      <span className="text-gray-400">
                        {formatPlayerField(player.nflTeam)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      {player.candidateCount && player.candidateCount > 1
                        ? `AMBIGUOUS — ${player.candidateCount} Sleeper candidates`
                        : formatUnmatchedReason(player.reason)}
                    </p>
                    {player.suggestedMatch ? (
                      <div className="mt-2 rounded-xl border border-emerald-600/20 bg-emerald-600/10 p-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        <p className="text-[9px] font-black uppercase tracking-widest">
                          Suggested
                        </p>
                        <p className="mt-1">
                          {player.suggestedMatch.playerName} /{" "}
                          {formatPlayerField(player.suggestedMatch.position)} /{" "}
                          {formatPlayerField(player.suggestedMatch.nflTeam)}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest">
                          {player.suggestedMatch.confidence} ·{" "}
                          {player.suggestedMatch.evidence.join(" · ")}
                        </p>
                      </div>
                    ) : null}
                    {player.candidates?.length ? (
                      <div className="mt-2 rounded-xl border border-orange-600/20 bg-orange-600/10 p-2 text-[11px] font-bold text-orange-700 dark:text-orange-300">
                        <p className="text-[9px] font-black uppercase tracking-widest">
                          Review Required
                        </p>
                        <div className="mt-1 grid gap-1">
                          {player.candidates.slice(0, 4).map((candidate) => (
                            <p
                              key={`${candidate.sleeperPlayerId ?? candidate.playerName}-${candidate.position}-${candidate.nflTeam}`}
                            >
                              {candidate.playerName} /{" "}
                              {formatPlayerField(candidate.position)} /{" "}
                              {formatPlayerField(candidate.nflTeam)}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {player.closestCandidate ? (
                      <p className="mt-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        Closest: {player.closestCandidate.playerName} /{" "}
                        {formatPlayerField(player.closestCandidate.position)} /{" "}
                        {formatPlayerField(player.closestCandidate.nflTeam)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-3 text-[11px] font-bold text-gray-500 dark:text-gray-400">
            Unmatched players are excluded from consensus calculations.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function formatHealthFlag(value: boolean | undefined) {
  if (value === true) return "Ready";
  if (value === false) return "Blocked";
  return "Not checked";
}

function getDeploymentStateClass(state: DeploymentOverallState) {
  if (state === "READY") return "bg-emerald-600 text-white";
  if (state === "PARTIAL") return "bg-orange-600 text-white";
  return "bg-red-600 text-white";
}

function getDeploymentOverallState({
  healthStatus,
  valueStatus,
  adpStatus,
}: {
  healthStatus: AuctionProductionHealthResponse | null;
  valueStatus: AuctionValueStatusResponse | null;
  adpStatus: AuctionAdpStatusResponse | null;
}): DeploymentOverallState {
  if (!healthStatus) return "PARTIAL";
  if (
    !healthStatus.firestoreReachable ||
    !healthStatus.storageReachable ||
    !healthStatus.sleeperRouteReady ||
    !healthStatus.auctionValueConfigReachable ||
    !healthStatus.auctionAdpConfigReachable
  ) {
    return "BLOCKED";
  }
  if (!valueStatus?.activeRun || !adpStatus?.activeRun) return "PARTIAL";

  return "READY";
}

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}\n${formatOutput(payload)}`
    );
  }

  return payload;
}

export default function MaintenancePage() {
  const [operationState, setOperationState] = useState(initialOperationState);
  const [valueStatus, setValueStatus] =
    useState<AuctionValueStatusResponse | null>(null);
  const [selectedValueFiles, setSelectedValueFiles] = useState<
    Record<string, File | null>
  >({});
  const [valueActionState, setValueActionState] = useState(initialValueActionState);
  const [isValueStatusLoading, setIsValueStatusLoading] = useState(false);
  const [adpStatus, setAdpStatus] =
    useState<AuctionAdpStatusResponse | null>(null);
  const [selectedAdpFiles, setSelectedAdpFiles] = useState<
    Record<string, File | null>
  >({});
  const [adpActionState, setAdpActionState] = useState(initialValueActionState);
  const [adpUploadingSourceKey, setAdpUploadingSourceKey] = useState<string | null>(
    null
  );
  const [isAdpStatusLoading, setIsAdpStatusLoading] = useState(false);
  const [healthStatus, setHealthStatus] =
    useState<AuctionProductionHealthResponse | null>(null);
  const [isHealthStatusLoading, setIsHealthStatusLoading] = useState(false);
  const [healthStatusError, setHealthStatusError] = useState<string | null>(null);
  const [openUnmatchedPanel, setOpenUnmatchedPanel] = useState<string | null>(
    null
  );
  const isAnyOperationRunning = Object.values(operationState).some(
    (state) => state.loading
  );
  const isValueActionRunning = valueActionState.loading || isValueStatusLoading;
  const isAdpActionRunning = adpActionState.loading || isAdpStatusLoading;
  const pendingRun = valueStatus?.pendingRun ?? null;
  const pendingAdpRun = adpStatus?.pendingRun ?? null;
  const hasSelectedAdpFiles = Object.values(selectedAdpFiles).some(Boolean);
  const hasUnvalidatedAdpSource =
    adpStatus?.sources.some((summary) => adpSourceNeedsValidation(summary)) ?? true;
  const canPublish =
    pendingRun?.status === "validated" && pendingRun.qualityGateStatus === "pass";
  const canPublishAdp =
    pendingAdpRun?.status === "validated" &&
    pendingAdpRun.qualityGateStatus === "pass" &&
    !hasSelectedAdpFiles &&
    !hasUnvalidatedAdpSource;
  const deploymentOverallState = getDeploymentOverallState({
    healthStatus,
    valueStatus,
    adpStatus,
  });

  const loadHealthStatus = useCallback(async () => {
    setIsHealthStatusLoading(true);
    setHealthStatusError(null);

    try {
      const payload = (await readJsonResponse(
        await fetch("/api/auction/health", {
          cache: "no-store",
        })
      )) as AuctionProductionHealthResponse;
      setHealthStatus(payload);
    } catch (error) {
      setHealthStatusError(
        error instanceof Error ? error.message : "Unable to load health status."
      );
    } finally {
      setIsHealthStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealthStatus();
  }, [loadHealthStatus]);

  const loadValueStatus = useCallback(async () => {
    setIsValueStatusLoading(true);

    try {
      const payload = (await readJsonResponse(
        await fetch("/api/auction/values/status?season=2026", {
          cache: "no-store",
        })
      )) as AuctionValueStatusResponse;
      setValueStatus(payload);
    } catch (error) {
      setValueActionState({
        loading: false,
        status: "error",
        output:
          error instanceof Error ? error.message : "Unable to load value status.",
      });
    } finally {
      setIsValueStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadValueStatus();
  }, [loadValueStatus]);

  const loadAdpStatus = useCallback(async () => {
    setIsAdpStatusLoading(true);

    try {
      const payload = (await readJsonResponse(
        await fetch("/api/auction/adp/status?season=2026", {
          cache: "no-store",
        })
      )) as AuctionAdpStatusResponse;
      setAdpStatus(payload);
    } catch (error) {
      setAdpActionState({
        loading: false,
        status: "error",
        output:
          error instanceof Error ? error.message : "Unable to load ADP status.",
      });
    } finally {
      setIsAdpStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdpStatus();
  }, [loadAdpStatus]);

  const setValueActionLoading = () => {
    setValueActionState({
      loading: true,
      status: "idle",
      output: "",
    });
  };

  const finishValueAction = (status: "success" | "error", output: unknown) => {
    setValueActionState({
      loading: false,
      status,
      output: formatOutput(output),
    });
  };

  const ensureValueRefreshRun = async () => {
    if (valueStatus?.pendingRun) return valueStatus.pendingRun.runId;

    const payload = (await readJsonResponse(
      await fetch("/api/auction/values/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ season: 2026 }),
      })
    )) as { run: AuctionValueRefreshRunSummary };

    return payload.run.runId;
  };

  const uploadValueSource = async (sourceKey: string) => {
    const file = selectedValueFiles[sourceKey];
    if (!file) return;

    setValueActionLoading();

    try {
      const runId = await ensureValueRefreshRun();
      const formData = new FormData();
      formData.append("sourceKey", sourceKey);
      formData.append("file", file);

      const payload = await readJsonResponse(
        await fetch(`/api/auction/values/runs/${runId}/upload`, {
          method: "POST",
          body: formData,
        })
      );
      finishValueAction("success", payload);
      await loadValueStatus();
    } catch (error) {
      finishValueAction(
        "error",
        error instanceof Error ? error.message : "Unable to upload value CSV."
      );
    }
  };

  const removeValueSource = async (sourceKey: string) => {
    if (!pendingRun) return;

    setValueActionLoading();

    try {
      const payload = await readJsonResponse(
        await fetch(
          `/api/auction/values/runs/${pendingRun.runId}/upload?sourceKey=${encodeURIComponent(sourceKey)}`,
          { method: "DELETE" }
        )
      );
      setSelectedValueFiles((current) => ({ ...current, [sourceKey]: null }));
      finishValueAction("success", payload);
      await loadValueStatus();
    } catch (error) {
      finishValueAction(
        "error",
        error instanceof Error ? error.message : "Unable to remove value CSV."
      );
    }
  };

  const validateValueRun = async () => {
    if (!pendingRun) return;

    setValueActionLoading();

    try {
      const payload = await readJsonResponse(
        await fetch(`/api/auction/values/runs/${pendingRun.runId}/validate`, {
          method: "POST",
        })
      );
      finishValueAction("success", payload);
      await loadValueStatus();
    } catch (error) {
      finishValueAction(
        "error",
        error instanceof Error ? error.message : "Unable to validate value run."
      );
    }
  };

  const publishValueRun = async () => {
    if (!pendingRun || !canPublish) return;
    if (!window.confirm("Publish these auction values to the War Room now?")) {
      return;
    }

    setValueActionLoading();

    try {
      const payload = await readJsonResponse(
        await fetch(`/api/auction/values/runs/${pendingRun.runId}/publish`, {
          method: "POST",
        })
      );
      finishValueAction("success", payload);
      await loadValueStatus();
    } catch (error) {
      finishValueAction(
        "error",
        error instanceof Error ? error.message : "Unable to publish value run."
      );
    }
  };

  const rollbackValueRun = async () => {
    if (!valueStatus?.previousRun) return;
    if (!window.confirm("Roll back to the previous published auction values?")) {
      return;
    }

    setValueActionLoading();

    try {
      const payload = await readJsonResponse(
        await fetch("/api/auction/values/rollback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ season: 2026 }),
        })
      );
      finishValueAction("success", payload);
      await loadValueStatus();
    } catch (error) {
      finishValueAction(
        "error",
        error instanceof Error ? error.message : "Unable to roll back values."
      );
    }
  };

  const setAdpActionLoading = () => {
    setAdpActionState({ loading: true, status: "idle", output: "" });
  };

  const finishAdpAction = (status: "success" | "error", output: unknown) => {
    setAdpActionState({
      loading: false,
      status,
      output: formatOutput(output),
    });
  };

  const ensureAdpRefreshRun = async () => {
    if (adpStatus?.pendingRun) return adpStatus.pendingRun.runId;

    const payload = (await readJsonResponse(
      await fetch("/api/auction/adp/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ season: 2026 }),
      })
    )) as { run: AuctionAdpRefreshRunSummary };

    return payload.run.runId;
  };

  const uploadAdpSource = async (sourceKey: string) => {
    const file = selectedAdpFiles[sourceKey];
    if (!file) return;

    setAdpActionLoading();
    setAdpUploadingSourceKey(sourceKey);

    try {
      const runId = await ensureAdpRefreshRun();
      const formData = new FormData();
      formData.append("sourceKey", sourceKey);
      formData.append("file", file);
      const payload = await readJsonResponse(
        await fetch(`/api/auction/adp/runs/${runId}/upload`, {
          method: "POST",
          body: formData,
        })
      );
      setSelectedAdpFiles((current) => ({ ...current, [sourceKey]: null }));
      finishAdpAction("success", payload);
      await loadAdpStatus();
    } catch (error) {
      finishAdpAction(
        "error",
        error instanceof Error ? error.message : "Unable to upload ADP CSV."
      );
    } finally {
      setAdpUploadingSourceKey(null);
    }
  };

  const removeAdpSource = async (sourceKey: string) => {
    if (!pendingAdpRun) return;

    setAdpActionLoading();

    try {
      const payload = await readJsonResponse(
        await fetch(
          `/api/auction/adp/runs/${pendingAdpRun.runId}/upload?sourceKey=${encodeURIComponent(sourceKey)}`,
          { method: "DELETE" }
        )
      );
      setSelectedAdpFiles((current) => ({ ...current, [sourceKey]: null }));
      finishAdpAction("success", payload);
      await loadAdpStatus();
    } catch (error) {
      finishAdpAction(
        "error",
        error instanceof Error ? error.message : "Unable to remove ADP CSV."
      );
    }
  };

  const validateAdpRun = async () => {
    if (!pendingAdpRun) return;

    setAdpActionLoading();

    try {
      const payload = await readJsonResponse(
        await fetch(`/api/auction/adp/runs/${pendingAdpRun.runId}/validate`, {
          method: "POST",
        })
      );
      finishAdpAction("success", payload);
      await loadAdpStatus();
    } catch (error) {
      finishAdpAction(
        "error",
        error instanceof Error ? error.message : "Unable to validate ADP run."
      );
      await loadAdpStatus();
    }
  };

  const publishAdpRun = async () => {
    if (!pendingAdpRun || !canPublishAdp) return;
    if (!window.confirm("Publish these ADP values to the War Room now?")) return;

    setAdpActionLoading();

    try {
      const payload = await readJsonResponse(
        await fetch(`/api/auction/adp/runs/${pendingAdpRun.runId}/publish`, {
          method: "POST",
        })
      );
      finishAdpAction("success", payload);
      await loadAdpStatus();
    } catch (error) {
      finishAdpAction(
        "error",
        error instanceof Error ? error.message : "Unable to publish ADP run."
      );
    }
  };

  const rollbackAdpRun = async () => {
    if (!adpStatus?.previousRun) return;
    if (!window.confirm("Roll back to the previous published ADP run?")) return;

    setAdpActionLoading();

    try {
      const payload = await readJsonResponse(
        await fetch("/api/auction/adp/rollback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ season: 2026 }),
        })
      );
      finishAdpAction("success", payload);
      await loadAdpStatus();
    } catch (error) {
      finishAdpAction(
        "error",
        error instanceof Error ? error.message : "Unable to roll back ADP run."
      );
    }
  };

  const runOperation = async (operation: Operation) => {
    if (
      operation.requiresConfirmation &&
      !window.confirm(`Run "${operation.title}" now?`)
    ) {
      return;
    }

    setOperationState((current) => ({
      ...current,
      [operation.id]: {
        loading: true,
        status: "idle",
        output: "",
      },
    }));

    try {
      const response = await fetch(operation.endpoint, {
        method: "POST",
      });
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      setOperationState((current) => ({
        ...current,
        [operation.id]: {
          loading: false,
          status: response.ok ? "success" : "error",
          output: response.ok
            ? formatOutput(payload)
            : `HTTP ${response.status} ${response.statusText}\n${formatOutput(payload)}`,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown maintenance error.";

      setOperationState((current) => ({
        ...current,
        [operation.id]: {
          loading: false,
          status: "error",
          output: message,
        },
      }));
    }
  };

  return (
    <SiteShell activePath="/commish">
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121212] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg">
                <Shield className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">
                  Commissioner Hub
                </p>
                <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter text-[#071a33] dark:text-white sm:text-5xl">
                  Maintenance
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-gray-400">
                  Protected checks, publishing, and data maintenance for River City operations.
                </p>
              </div>
            </div>
            <Link
              href="/commish"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#071a33] transition hover:border-orange-600 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/20 dark:text-white"
            >
              Return to Commissioner Hub
            </Link>
          </div>
        </header>

        <section aria-labelledby="maintenance-runtime-heading" className="mb-8 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
          <div className="border-b border-black/10 dark:border-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
                  Deployment Status
                </p>
                <h2 id="maintenance-runtime-heading" className="mt-1 text-2xl font-black uppercase italic tracking-tight">
                  Production Runtime
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  Verify Firebase, source modes, Sleeper readiness, and active
                  auction data before publishing or drafting.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex h-10 items-center rounded-2xl px-4 text-xs font-black uppercase tracking-wider ${getDeploymentStateClass(
                    deploymentOverallState
                  )}`}
                >
                  {deploymentOverallState}
                </span>
                <button
                  type="button"
                  onClick={loadHealthStatus}
                  disabled={isHealthStatusLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-black/10 px-4 text-xs font-black uppercase tracking-wider transition hover:border-orange-600/40 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                >
                  {isHealthStatusLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Run Health Check
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Firebase Project
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {healthStatus?.firebaseProjectId ?? "Not checked"}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Storage Bucket
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {healthStatus?.storageBucket ?? "Not checked"}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Value Source
                </p>
                <p className="mt-2 text-xs font-black uppercase">
                  {formatSourceMode(healthStatus?.valueSourceMode)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  ADP Source
                </p>
                <p className="mt-2 text-xs font-black uppercase">
                  {formatSourceMode(healthStatus?.adpSourceMode)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Active Values
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {valueStatus?.activeRun
                    ? valueStatus.activeRun.runId
                    : "Local fallback until publish"}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Active ADP
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {adpStatus?.activeRun
                    ? adpStatus.activeRun.runId
                    : "Local fallback until publish"}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Sleeper Snapshot
                </p>
                <p className="mt-2 text-xs font-black uppercase">
                  {formatHealthFlag(healthStatus?.sleeperRouteReady)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Last Health Check
                </p>
                <p className="mt-2 text-xs font-black uppercase">
                  {formatDateTime(healthStatus?.timestamp)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-xs font-bold text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
              <p>
                Initial production publish: upload the three auction-value CSVs
                and the two ADP CSVs below, validate each run, then publish.
                Until then, the War Room remains usable through local fallback
                labels.
              </p>
            </div>

            {healthStatus?.issues.length ? (
              <div className="mt-4 rounded-2xl border border-orange-600/20 bg-orange-600/10 p-3 text-xs font-bold text-orange-700 dark:text-orange-300">
                {healthStatus.issues[0]}
              </div>
            ) : null}

            {healthStatusError ? (
              <div className="mt-4 rounded-2xl border border-red-600/20 bg-red-600/10 p-3 text-xs font-bold text-red-700 dark:text-red-300">
                {healthStatusError}
              </div>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="maintenance-values-heading" className="mb-8 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
          <div className="border-b border-black/10 dark:border-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
                  Auction Value Refresh
                </p>
                <h2 id="maintenance-values-heading" className="mt-1 text-2xl font-black uppercase italic tracking-tight">
                  2026 Value Maintenance
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  Upload FantasyPros, RotoWire, and Lineup Experts CSVs, validate
                  the generated Masterview, then publish the active War Room values.
                </p>
              </div>
              <button
                type="button"
                onClick={loadValueStatus}
                disabled={isValueActionRunning}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-black/10 px-4 text-xs font-black uppercase tracking-wider transition hover:border-orange-600/40 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              >
                {isValueStatusLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Active Published
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {formatRunLabel(valueStatus?.activeRun ?? null)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Pending Run
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {formatRunLabel(pendingRun)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Previous Run
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {formatRunLabel(valueStatus?.previousRun ?? null)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:p-6">
            {auctionValueSources.map((source) => {
              const summary =
                valueStatus?.sources.find(
                  (item) => item.sourceKey === source.id
                ) ?? null;
              const selectedFile = selectedValueFiles[source.id] ?? null;

              return (
                <article
                  key={source.id}
                  className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black uppercase italic tracking-tight">
                          {source.displayName}
                        </h3>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest ${getSourceStatusClass(summary?.status ?? "empty")}`}
                        >
                          {summary?.status ?? "empty"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {summary?.fileName ?? "No CSV uploaded"}
                      </p>
                    </div>

                    <div className="grid gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 sm:grid-cols-4">
                      <span>Rows {formatNumber(summary?.rowCount)}</span>
                      <span>Matched {formatNumber(summary?.matchedCount)}</span>
                      <span>Unmatched {formatNumber(summary?.unmatchedCount)}</span>
                      <span>Errors {formatNumber(summary?.errorCount)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-black/10 px-4 text-xs font-black uppercase tracking-wider transition hover:border-orange-600/40 hover:text-orange-600 dark:border-white/10">
                        <Upload className="h-4 w-4" />
                        Choose
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="sr-only"
                          onChange={(event) =>
                            setSelectedValueFiles((current) => ({
                              ...current,
                              [source.id]: event.target.files?.[0] ?? null,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => uploadValueSource(source.id)}
                        disabled={!selectedFile || isValueActionRunning}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 text-xs font-black uppercase tracking-wider text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {selectedFile ? "Upload" : "No file"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeValueSource(source.id)}
                        disabled={!pendingRun || !summary?.storagePath || isValueActionRunning}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-black/10 px-4 text-xs font-black uppercase tracking-wider transition hover:border-red-600/40 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {selectedFile && (
                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                  <UnmatchedPlayersReview
                    summary={summary}
                    panelKey={`value:${source.id}`}
                    openPanelKey={openUnmatchedPanel}
                    onToggle={setOpenUnmatchedPanel}
                  />
                </article>
              );
            })}
          </div>

          <div className="border-t border-black/10 dark:border-white/10 p-5 sm:p-6">
            {pendingRun?.qualityGates?.length ? (
              <div className="mb-4 grid gap-2">
                {pendingRun.qualityGates.slice(0, 4).map((gate) => (
                  <div
                    key={gate.id}
                    className={`flex items-start gap-2 rounded-2xl border p-3 text-xs font-bold ${
                      gate.level === "fail"
                        ? "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-300"
                        : gate.level === "warning"
                          ? "border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300"
                          : "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {gate.level === "pass" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>
                      <span className="font-black uppercase">{gate.label}:</span>{" "}
                      {gate.detail}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <p className="basis-full rounded-2xl border border-orange-600/20 bg-orange-600/10 p-3 text-xs font-bold text-orange-700 dark:text-orange-300">
                Publishing and rollback are protected actions and require confirmation before changing the active War Room values.
              </p>
              <button
                type="button"
                onClick={validateValueRun}
                disabled={!pendingRun || isValueActionRunning}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-orange-600 dark:hover:text-white"
              >
                {valueActionState.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Validate All
              </button>
              <button
                type="button"
                onClick={publishValueRun}
                disabled={!canPublish || isValueActionRunning}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Publish
              </button>
              <button
                type="button"
                onClick={rollbackValueRun}
                disabled={!valueStatus?.previousRun || isValueActionRunning}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 px-5 text-xs font-black uppercase tracking-wider transition hover:border-red-600/40 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              >
                Roll Back
              </button>
            </div>

            {valueStatus?.fallbackWarning && (
              <p className="mt-4 rounded-2xl border border-orange-600/20 bg-orange-600/10 p-3 text-xs font-bold text-orange-700 dark:text-orange-300">
                {valueStatus.fallbackWarning}
              </p>
            )}

            {valueActionState.output && (
              <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-black/30">
                <div
                  className={`mb-3 text-[10px] font-black uppercase tracking-[0.2em] ${
                    valueActionState.status === "success"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {valueActionState.status}
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-black p-4 text-xs leading-relaxed text-white">
                  {valueActionState.output}
                </pre>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="maintenance-adp-heading" className="mb-8 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
          <div className="border-b border-black/10 dark:border-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
                  ADP Refresh
                </p>
                <h2 id="maintenance-adp-heading" className="mt-1 text-2xl font-black uppercase italic tracking-tight">
                  2026 Market Demand
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  Upload FantasyPros and RotoWire ADP CSVs, validate demand
                  pressure, then publish the active War Room ADP context.
                </p>
              </div>
              <button
                type="button"
                onClick={loadAdpStatus}
                disabled={isAdpActionRunning}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-black/10 px-4 text-xs font-black uppercase tracking-wider transition hover:border-orange-600/40 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              >
                {isAdpStatusLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Active Published
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {formatRunLabel(adpStatus?.activeRun ?? null)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Pending Run
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {formatRunLabel(pendingAdpRun)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Previous Run
                </p>
                <p className="mt-2 break-words text-xs font-black uppercase">
                  {formatRunLabel(adpStatus?.previousRun ?? null)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:p-6">
            {auctionAdpSources.map((source) => {
              const summary =
                adpStatus?.sources.find(
                  (item) => item.sourceKey === source.sourceKey
                ) ?? null;
              const selectedFile = selectedAdpFiles[source.sourceKey] ?? null;
              const isUploading = adpUploadingSourceKey === source.sourceKey;
              const statusLabel = getAdpMaintenanceStatusLabel({
                summary,
                hasSelectedFile: Boolean(selectedFile),
                isUploading,
              });

              return (
                <article
                  key={source.sourceKey}
                  className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black uppercase italic tracking-tight">
                          {source.displayName}
                        </h3>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest ${getAdpSourceStatusClass(statusLabel)}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {formatUploadedFileVersion(summary)}
                      </p>
                      {selectedFile ? (
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
                          NEW FILE SELECTED — NOT YET UPLOADED
                        </p>
                      ) : null}
                      {summary?.validationError ? (
                        <p className="mt-2 rounded-xl border border-red-600/20 bg-red-600/10 p-2 text-[11px] font-bold text-red-700 dark:text-red-300">
                          {summary.validationError.fileName ?? source.displayName} ·{" "}
                          {formatShortHash(summary.validationError.contentHash)} ·{" "}
                          {summary.validationError.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 sm:grid-cols-4">
                      <span>Rows {formatNumber(summary?.rowCount)}</span>
                      <span>Matched {formatNumber(summary?.matchedCount)}</span>
                      <span>Unmatched {formatNumber(summary?.unmatchedCount)}</span>
                      <span>Errors {formatNumber(summary?.errorCount)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-black/10 px-4 text-xs font-black uppercase tracking-wider transition hover:border-orange-600/40 hover:text-orange-600 dark:border-white/10">
                        <Upload className="h-4 w-4" />
                        Choose
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="sr-only"
                          onChange={(event) =>
                            {
                              setAdpActionState(initialValueActionState);
                              setSelectedAdpFiles((current) => ({
                                ...current,
                                [source.sourceKey]: event.target.files?.[0] ?? null,
                              }));
                            }
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => uploadAdpSource(source.sourceKey)}
                        disabled={!selectedFile || isAdpActionRunning}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 text-xs font-black uppercase tracking-wider text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        {isUploading ? "Uploading" : selectedFile ? "Upload" : "No file"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAdpSource(source.sourceKey)}
                        disabled={!pendingAdpRun || !summary?.storagePath || isAdpActionRunning}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-black/10 px-4 text-xs font-black uppercase tracking-wider transition hover:border-red-600/40 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {selectedFile && (
                    <p className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Selected: {selectedFile.name} · {selectedFile.size.toLocaleString()} bytes
                    </p>
                  )}
                  <UnmatchedPlayersReview
                    summary={summary}
                    panelKey={`adp:${source.sourceKey}`}
                    openPanelKey={openUnmatchedPanel}
                    onToggle={setOpenUnmatchedPanel}
                  />
                </article>
              );
            })}
          </div>

          <div className="border-t border-black/10 dark:border-white/10 p-5 sm:p-6">
            {pendingAdpRun?.qualityGates?.length ? (
              <div className="mb-4 grid gap-2">
                {pendingAdpRun.qualityGates.slice(0, 4).map((gate) => (
                  <div
                    key={gate.id}
                    className={`flex items-start gap-2 rounded-2xl border p-3 text-xs font-bold ${
                      gate.level === "fail"
                        ? "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-300"
                        : gate.level === "warning"
                          ? "border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300"
                          : "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {gate.level === "pass" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>
                      <span className="font-black uppercase">{gate.label}:</span>{" "}
                      {gate.detail}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <p className="basis-full rounded-2xl border border-orange-600/20 bg-orange-600/10 p-3 text-xs font-bold text-orange-700 dark:text-orange-300">
                Publishing and rollback are protected actions and require confirmation before changing the active War Room ADP context.
              </p>
              <button
                type="button"
                onClick={validateAdpRun}
                disabled={!pendingAdpRun || hasSelectedAdpFiles || isAdpActionRunning}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-orange-600 dark:hover:text-white"
              >
                {adpActionState.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Validate
              </button>
              <button
                type="button"
                onClick={publishAdpRun}
                disabled={!canPublishAdp || isAdpActionRunning}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Publish
              </button>
              <button
                type="button"
                onClick={rollbackAdpRun}
                disabled={!adpStatus?.previousRun || isAdpActionRunning}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 px-5 text-xs font-black uppercase tracking-wider transition hover:border-red-600/40 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              >
                Roll Back
              </button>
            </div>

            {hasSelectedAdpFiles ? (
              <p className="mt-3 rounded-2xl border border-orange-600/20 bg-orange-600/10 p-3 text-xs font-bold text-orange-700 dark:text-orange-300">
                Upload selected ADP files before validating or publishing.
              </p>
            ) : null}

            {adpStatus?.fallbackWarning && (
              <p className="mt-4 rounded-2xl border border-orange-600/20 bg-orange-600/10 p-3 text-xs font-bold text-orange-700 dark:text-orange-300">
                {adpStatus.fallbackWarning}
              </p>
            )}

            {adpActionState.output && (
              <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-black/30">
                <div
                  className={`mb-3 text-[10px] font-black uppercase tracking-[0.2em] ${
                    adpActionState.status === "success"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {adpActionState.status}
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-black p-4 text-xs leading-relaxed text-white">
                  {adpActionState.output}
                </pre>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="maintenance-operations-heading" className="grid gap-5">
          <h2 id="maintenance-operations-heading" className="sr-only">Maintenance operations</h2>
          {operations.map((operation) => {
            const state = operationState[operation.id];
            const Icon = operation.icon;
            const isDisabled = isAnyOperationRunning;

            return (
              <article
                key={operation.id}
                className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]"
              >
                <div className="p-5 sm:p-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black uppercase italic tracking-tight">
                        {operation.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {operation.description}
                      </p>
                      {operation.requiresConfirmation ? (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                          Confirmation required before running
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => runOperation(operation)}
                    disabled={isDisabled}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {state.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Run
                  </button>
                </div>

                {state.output && (
                  <div role="status" aria-live="polite" className="border-t border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-black/30 sm:p-6">
                    <div
                      className={`mb-3 text-[10px] font-black uppercase tracking-[0.2em] ${
                        state.status === "success"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {state.status}
                    </div>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-black text-xs leading-relaxed text-white p-4">
                      {state.output}
                    </pre>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </SiteShell>
  );
}
