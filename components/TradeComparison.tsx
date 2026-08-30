"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Info, Plus, RotateCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TradeComparisonPosition } from "@/lib/tradeComparison/types";
import type { SandboxMarketFairnessResult } from "@/lib/tradeComparison/sandboxMarketFairnessCalibration";

type PlayerOption = {
  playerId: string;
  name: string | null;
  position: TradeComparisonPosition | null;
  nflTeam: string | null;
  injuryStatus?: string | null;
  avatar?: string | null;
  byeWeek?: number | null;
};
type FranchiseOption = {
  franchiseId: string;
  franchiseName: string;
  available: boolean;
  avatar?: string | null;
  players: PlayerOption[];
  availableFaab?: number | null;
};
type Participant = {
  participantId: string;
  franchiseId: string;
  selected: string[];
  faabAmount: number;
  faabDestination: string;
};
type MarketContext = {
  totalAuctionConsensus: number | null;
  auctionCoverage: string;
  medianAdp: number | null;
  bestAdp: number | null;
  adpCoverage: string;
};
type RoutingResult = {
  status: "READY" | "INVALID";
  mode: "LEAGUE_TRADE" | "SANDBOX";
  errors: { code: string; message: string }[];
  participants: Array<{
    participantId: string;
    franchiseId: string;
    sends: Array<{ player: PlayerOption; destinationFranchiseId: string }>;
    receives: Array<{ player: PlayerOption; sourceFranchiseId: string }>;
    rosterContext: "CURRENT_FACT" | "HYPOTHETICAL_RESULT";
    positionalBefore: Record<string, number>;
    positionalAfter: Record<string, number>;
    market: { sent: MarketContext; received: MarketContext };
    faabSent: { senderFranchiseId: string; receiverFranchiseId: string; amount: number } | null;
    faabReceived: { senderFranchiseId: string; receiverFranchiseId: string; amount: number }[];
  }>;
  sandboxMarketFairness: SandboxMarketFairnessResult | null;
};

function automaticDestination(
  participants: Participant[],
  participant: Participant,
) {
  if (participants.length !== 2) return "";
  return participants.find(
    (candidate) =>
      candidate.participantId !== participant.participantId &&
      candidate.franchiseId,
  )?.franchiseId ?? "";
}

function teamLabel(index: number) {
  return `Team ${String.fromCharCode(65 + index)}`;
}

const POSITION_ORDER: Array<TradeComparisonPosition | "UNKNOWN"> = [
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
  "UNKNOWN",
];
const POSITION_STYLES: Record<string, string> = {
  QB: "border-rose-200 bg-rose-50 text-rose-800",
  RB: "border-emerald-200 bg-emerald-50 text-emerald-800",
  WR: "border-sky-200 bg-sky-50 text-sky-800",
  TE: "border-amber-200 bg-amber-50 text-amber-800",
  K: "border-violet-200 bg-violet-50 text-violet-800",
  DEF: "border-slate-300 bg-slate-100 text-slate-800",
  UNKNOWN: "border-slate-200 bg-slate-50 text-slate-600",
};
const FALLBACK_IMAGE = "/River City FFL Logo.JPG";
function playerImage(player: PlayerOption) {
  if (player.position === "DEF") return FALLBACK_IMAGE;
  return player.avatar
    ? `https://sleepercdn.com/avatars/thumbs/${player.avatar}`
    : `https://sleepercdn.com/content/nfl/players/${player.playerId}.jpg`;
}
function playerName(player: PlayerOption) {
  return player.name ?? "Player name unavailable";
}
function position(player: PlayerOption) {
  return player.position ?? "UNKNOWN";
}
function marketMoney(value: number | null) {
  return value === null ? "Unavailable" : `$${value.toFixed(1)}`;
}

function formatFaab(amount: number) {
  return `$${amount} FAAB`;
}

function PositionBadge({ player }: { player: PlayerOption }) {
  const label = position(player);
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-md border px-2 text-[10px] font-black tracking-wider ${POSITION_STYLES[label] ?? POSITION_STYLES.UNKNOWN}`}
    >
      {label}
    </span>
  );
}

function PlayerRow({
  player,
  selected,
  onToggle,
  disabled,
}: {
  player: PlayerOption;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={`flex min-h-[68px] w-full items-center gap-3 rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-orange-500 bg-orange-50 shadow-sm" : "border-slate-200 bg-white hover:border-orange-300"}`}
    >
      <img
        src={playerImage(player)}
        alt=""
        aria-hidden="true"
        onError={(event) => {
          event.currentTarget.src = FALLBACK_IMAGE;
        }}
        className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-black text-slate-950">
          {playerName(player)}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <PositionBadge player={player} />
          <span>{player.nflTeam ?? "NFL team unavailable"}</span>
          {player.byeWeek !== null && player.byeWeek !== undefined && (
            <span>Bye {player.byeWeek}</span>
          )}
          {player.injuryStatus && (
            <span className="text-amber-700">{player.injuryStatus}</span>
          )}
        </span>
      </span>
      <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-orange-700">
        {selected ? "Selected" : "Select"}
      </span>
    </button>
  );
}

function MarketCard({
  label,
  context,
  assetCount,
}: {
  label: string;
  context: MarketContext;
  assetCount: number;
}) {
  const empty = assetCount === 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {empty ? (
        <p className="mt-2 text-xs font-bold text-slate-600">
          No players · market context not applicable.
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <span>
            <b className="block text-slate-500">Auction consensus</b>
            <span className="font-black text-slate-950">
              {marketMoney(context.totalAuctionConsensus)}
            </span>
          </span>
          <span>
            <b className="block text-slate-500">ADP</b>
            <span className="font-black text-slate-950">
              {context.medianAdp === null
                ? "Unavailable"
                : context.medianAdp.toFixed(1)}
            </span>
          </span>
        </div>
      )}
      {(!empty &&
        (context.auctionCoverage !== "COMPLETE" ||
          context.adpCoverage !== "COMPLETE")) && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Limited market data · Auction {context.auctionCoverage} · ADP {context.adpCoverage}
        </p>
      )}
    </div>
  );
}

function ParticipantPanel({
  participant,
  index,
  franchises,
  selectedFranchiseIds,
  mode,
  allPlayers,
  usedPlayers,
  destinations,
  allParticipants,
  setDestinations,
  onChangeFranchise,
  onToggle,
  onRemove,
  onClear,
  onFaabChange,
}: {
  participant: Participant;
  index: number;
  franchises: FranchiseOption[];
  selectedFranchiseIds: Set<string>;
  mode: "LEAGUE_TRADE" | "SANDBOX";
  allPlayers: PlayerOption[];
  usedPlayers: Set<string>;
  destinations: Record<string, string>;
  allParticipants: Participant[];
  setDestinations: (key: string, value: string) => void;
  onChangeFranchise: (value: string) => void;
  onToggle: (playerId: string) => void;
  onRemove: () => void;
  onClear: () => void;
  onFaabChange: (amount: number, destination: string) => void;
}) {
  const franchise = franchises.find(
    (candidate) => candidate.franchiseId === participant.franchiseId,
  );
  const sourcePlayers =
    mode === "SANDBOX"
      ? allPlayers.filter((player) =>
          participant.selected.includes(player.playerId),
        )
      : (franchise?.players ?? []);
  const groups = POSITION_ORDER.map((group) => ({
    group,
    players: sourcePlayers.filter(
      (player) =>
        position(player) === group &&
        (!usedPlayers.has(player.playerId) ||
          participant.selected.includes(player.playerId)),
    ),
  })).filter((group) => group.players.length > 0);
  return (
    <section
      aria-labelledby={`participant-${participant.participantId}`}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {franchise && (
            <img
              src={
                franchise.avatar
                  ? `https://sleepercdn.com/avatars/thumbs/${franchise.avatar}`
                  : FALLBACK_IMAGE
              }
              alt=""
              aria-hidden="true"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_IMAGE;
              }}
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
              {teamLabel(index)}
            </p>
            {franchise && (
              <h3
                id={`participant-${participant.participantId}`}
                className="mt-1 break-words text-lg font-black uppercase tracking-tight text-slate-950"
              >
                {franchise.franchiseName}
              </h3>
            )}
          </div>
        </div>
        {index > 1 && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${franchise?.franchiseName ?? teamLabel(index)}`}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <label
        htmlFor={`franchise-${participant.participantId}`}
        className="mt-4 block text-xs font-black uppercase tracking-wider text-slate-600"
      >
        Franchise
      </label>
      <select
        id={`franchise-${participant.participantId}`}
        value={participant.franchiseId}
        onChange={(event) => onChangeFranchise(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
      >
        <option value="">Choose a franchise</option>
        {franchises.map((candidate) => (
          <option
            key={candidate.franchiseId}
            value={candidate.franchiseId}
            disabled={
              (selectedFranchiseIds.has(candidate.franchiseId) &&
                candidate.franchiseId !== participant.franchiseId) ||
              (mode === "LEAGUE_TRADE" && !candidate.available)
            }
          >
            {candidate.franchiseName}
          </option>
        ))}
      </select>
      {franchise && (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Outgoing package
            </h4>
            {participant.selected.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-[10px] font-black uppercase tracking-wider text-orange-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                Clear package
              </button>
            )}
          </div>
          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
              <label htmlFor={`faab-${participant.participantId}`} className="block text-[10px] font-black uppercase tracking-wider text-slate-700">FAAB to send</label>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-black text-slate-700">$</span>
                <input id={`faab-${participant.participantId}`} aria-label={`${teamLabel(index)} FAAB to send`} type="number" inputMode="numeric" min="0" step="1" max={mode === "LEAGUE_TRADE" && franchise.availableFaab !== null && franchise.availableFaab !== undefined ? franchise.availableFaab : undefined} value={participant.faabAmount} onChange={(event) => onFaabChange(Math.max(0, Number(event.target.value) || 0), participant.faabDestination)} className="min-h-10 w-28 rounded-lg border border-slate-300 bg-white px-2 text-sm font-bold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200" />
                {allParticipants.length === 2 ? <span className="text-xs font-bold text-slate-600">→ {teamLabel(allParticipants.findIndex((candidate) => candidate.participantId !== participant.participantId))}</span> : participant.faabAmount > 0 ? <select aria-label={`${teamLabel(index)} FAAB destination`} value={participant.faabDestination} onChange={(event) => onFaabChange(participant.faabAmount, event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"><option value="">Choose destination</option>{allParticipants.filter((candidate) => candidate.participantId !== participant.participantId && candidate.franchiseId).map((candidate) => <option key={candidate.participantId} value={candidate.franchiseId}>{teamLabel(allParticipants.indexOf(candidate))}</option>)}</select> : <span className="text-xs font-bold text-slate-500">No transfer</span>}
              </div>
              {mode === "LEAGUE_TRADE" ? <p className="mt-2 text-[10px] font-bold text-slate-600">Available: {franchise.availableFaab === null || franchise.availableFaab === undefined ? "Unavailable" : formatFaab(franchise.availableFaab)}</p> : <p className="mt-2 text-[10px] font-bold text-slate-600">Hypothetical FAAB · no real balance applied</p>}
            </div>
            {groups.map(({ group, players }) => (
              <fieldset key={group} className="space-y-2">
                <legend className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {group}
                </legend>
                {players.map((player) => {
                  const selected = participant.selected.includes(
                    player.playerId,
                  );
                  const destinationKey = `${participant.participantId}:${player.playerId}`;
                  return (
                    <div key={player.playerId} className="space-y-2">
                      <PlayerRow
                        player={player}
                        selected={selected}
                        disabled={!selected && usedPlayers.has(player.playerId)}
                        onToggle={() => onToggle(player.playerId)}
                      />
                      {selected && (
                        <label className="ml-12 block text-xs font-bold text-slate-600">
                          Destination
                          <select
                            aria-label={`Destination for ${playerName(player)}`}
                            value={
                              destinations[destinationKey] ??
                              automaticDestination(allParticipants, participant)
                            }
                            onChange={(event) =>
                              setDestinations(
                                destinationKey,
                                event.target.value,
                              )
                            }
                            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-bold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                          >
                            <option value="">Choose destination</option>
                            {franchises
                              .filter(
                                (candidate) =>
                                  allParticipants.some(
                                    (selected) =>
                                      selected.franchiseId === candidate.franchiseId,
                                  ) &&
                                  candidate.franchiseId !== participant.franchiseId,
                              )
                              .map((candidate) => (
                                <option
                                  key={candidate.franchiseId}
                                  value={candidate.franchiseId}
                                >
                                  {candidate.franchiseName}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </div>
                  );
                })}
              </fieldset>
            ))}
            {groups.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
                {mode === "SANDBOX"
                  ? "Search the player directory to add a player."
                  : franchise?.available
                    ? "No player identities are available."
                    : "Choose a franchise with available roster data."}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function SearchPanel({
  players,
  usedPlayers,
  participants,
  onAdd,
}: {
  players: PlayerOption[];
  usedPlayers: Set<string>;
  participants: Participant[];
  onAdd: (playerId: string, participantId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      players
        .filter(
          (player) =>
            !usedPlayers.has(player.playerId) &&
            `${player.name ?? ""} ${player.position ?? ""} ${player.nflTeam ?? ""}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        )
        .slice(0, 12),
    [players, query, usedPlayers],
  );
  return (
    <section
      aria-labelledby="sandbox-search-title"
      className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <Search size={17} aria-hidden="true" className="text-orange-700" />
        <h3
          id="sandbox-search-title"
          className="text-sm font-black uppercase tracking-wider text-slate-950"
        >
          Sandbox player search
        </h3>
      </div>
      <label htmlFor="sandbox-player-search" className="sr-only">
        Search the server-owned player directory
      </label>
      <input
        id="sandbox-player-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search player, position, or NFL team"
        className="mt-3 min-h-11 w-full rounded-xl border border-orange-200 bg-white px-3 text-sm font-semibold text-slate-950 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
      />
      {query && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {results.map((player) => (
            <li key={player.playerId}>
              <div className="flex min-h-12 w-full flex-wrap items-center gap-2 rounded-lg border border-orange-100 bg-white p-2 text-left">
                <img
                  src={playerImage(player)}
                  alt=""
                  aria-hidden="true"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                  className="h-8 w-8 rounded object-cover"
                />
                <span className="min-w-0 flex-1 break-words text-xs font-black text-slate-950">
                  {playerName(player)}{" "}
                  <span className="font-semibold text-slate-500">
                    {position(player)} ·{" "}
                    {player.nflTeam ?? "NFL team unavailable"}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {participants
                    .filter((participant) => participant.franchiseId)
                    .map((participant, index) => (
                      <button
                        key={participant.participantId}
                        type="button"
                        aria-label={`Add ${playerName(player)} to ${teamLabel(index)}`}
                        onClick={() => {
                          onAdd(player.playerId, participant.participantId);
                          setQuery("");
                        }}
                        className="inline-flex min-h-8 items-center gap-1 rounded-md bg-orange-600 px-2 text-[9px] font-black uppercase tracking-wider text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                      >
                        <Plus size={12} aria-hidden="true" /> {teamLabel(index)}
                      </button>
                    ))}
                </span>
              </div>
            </li>
          ))}
          {results.length === 0 && (
            <li className="text-sm font-semibold text-slate-600">
              No matching server-known player.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function formatAssetNames(
  assets: Array<{ player: PlayerOption }>,
  direction: "sent" | "received",
) {
  if (assets.length === 0)
    return direction === "received" ? "No players received" : "No players sent";
  const labels = assets.map((asset) => playerName(asset.player));
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function ResultView({
  result,
  franchises,
}: {
  result: RoutingResult;
  franchises: FranchiseOption[];
}) {
  const names = new Map(
    franchises.map((franchise) => [
      franchise.franchiseId,
      franchise.franchiseName,
    ]),
  );
  const summaryRows = result.participants.map((participant, index) => {
    const name = names.get(participant.franchiseId) ?? participant.franchiseId;
    const sends = formatAssetNames(participant.sends, "sent");
    const receives = formatAssetNames(participant.receives, "received");
    const faabSent = participant.faabSent ? ` + ${formatFaab(participant.faabSent.amount)}` : "";
    const faabReceived = participant.faabReceived.length ? ` + ${participant.faabReceived.map((transfer) => formatFaab(transfer.amount)).join(" + ")}` : "";
    return { participant, name, sends: `${sends}${faabSent}`, receives: `${receives}${faabReceived}`, label: teamLabel(index) };
  });
  const hasFaab = result.participants.some((participant) => participant.faabSent !== null);
  const hasIncompleteMarketData = result.participants.some((participant) =>
    [participant.market.sent, participant.market.received].some(
      (market, index) => {
        const assets = index === 0 ? participant.sends : participant.receives;
        return assets.length > 0 &&
          (market.auctionCoverage !== "COMPLETE" || market.adpCoverage !== "COMPLETE");
      },
    ),
  );
  return (
    <section
      aria-labelledby="trade-result-title"
      className="space-y-5"
      aria-live="polite"
    >
      {result.mode === "SANDBOX" && result.participants.length === 2 && result.sandboxMarketFairness && (
        <section
          aria-labelledby="sandbox-market-fairness-title"
          className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm sm:p-6"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
            Sandbox analysis
          </p>
          <h2 id="sandbox-market-fairness-title" className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950">
            Sandbox market fairness
          </h2>
          {result.sandboxMarketFairness.status === "READY" ? (
            <>
              <p className="mt-4 text-3xl font-black text-slate-950">
                {result.sandboxMarketFairness.fairnessScore?.toFixed(1)} / 100
              </p>
              <p className="mt-1 text-sm font-black uppercase tracking-wider text-orange-700">
                {result.sandboxMarketFairness.verdict}
              </p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Market value edge</dt>
                  <dd className="mt-1 font-black text-slate-950">
                    {result.sandboxMarketFairness.higherValuePackage === "EVEN"
                      ? "Even"
                      : teamLabel(result.sandboxMarketFairness.higherValuePackage === "A" ? 1 : 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Evidence</dt>
                  <dd className="mt-1 font-black text-slate-950">{result.sandboxMarketFairness.evidence}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Current market value split</dt>
                  <dd className="mt-1 font-black text-slate-950">
                    Team A {result.sandboxMarketFairness.splitA?.toFixed(1)}% · Team B {result.sandboxMarketFairness.splitB?.toFixed(1)}%
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-6 text-slate-700">
                Fairness measures how closely the current market value of both packages matches. Market Value Edge identifies which team receives the package with slightly more current market value.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-700">
                This Sandbox model evaluates current market value only. Actual River City acquisition costs, keeper economics, ownership, roster fit, team need, and future performance are not included.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm font-semibold leading-6 text-amber-900">
              {result.sandboxMarketFairness.warning}
            </p>
          )}
        </section>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
          Trade summary
        </p>
        <h2
          id="trade-result-title"
          className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950"
        >
          {result.mode === "SANDBOX" ? "Hypothetical trade" : "League trade"}
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {summaryRows.map(({ participant, name, sends, receives, label }) => (
            <p key={participant.participantId}>
              <span className="font-black text-slate-950">{label}</span>{" "}
              <span className="text-slate-600">({name})</span> sends{" "}
              {sends}
              {participant.sends.length > 0 && " to "}
              {participant.sends.length > 0 &&
                participant.sends
                  .map(
                    (asset) =>
                      names.get(asset.destinationFranchiseId) ??
                      asset.destinationFranchiseId,
                  )
                  .filter(
                    (value, index, values) => values.indexOf(value) === index,
                  )
                  .join(" and ")}{" "}
              and receives {receives}
              {participant.receives.length > 0 && " from "}
              {participant.receives.length > 0 &&
                participant.receives
                  .map(
                    (asset) =>
                      names.get(asset.sourceFranchiseId) ??
                      asset.sourceFranchiseId,
                  )
                  .filter(
                    (value, index, values) => values.indexOf(value) === index,
                  )
                  .join(" and ")}
              .
            </p>
          ))}
      </div>
      {hasFaab && <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs font-semibold leading-5 text-sky-900">FAAB is included in the trade package but is not currently assigned a market-value conversion in the fairness score.</p>}
    </div>
      {result.mode === "LEAGUE_TRADE" && <section
        aria-labelledby="river-analysis-title"
        className="rounded-2xl border border-orange-200 bg-orange-50 p-5"
      >
        <h3
          id="river-analysis-title"
          className="text-sm font-black uppercase tracking-wider text-slate-950"
        >
          River City analysis
        </h3>
        <p className="mt-3 text-sm font-bold text-slate-900">
          River City Fairness Model · Available after the 2026 Auction
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Final keeper and auction acquisition costs are required before
          calibrated fairness scoring can be calculated.
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-700">
          After the auction, eligible two-team trades can use River City Model
          Edge, calibrated fairness scoring, signal agreement, and factual
          participant reasoning from server-owned model values, actual
          acquisition costs, five-source auction consensus, five-source ADP, and
          historical trade calibration.
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-700">
          For three- and four-team trades, future analysis may report
          participant net results, Model Spread, and the largest River City
          Model Edge; the historical two-team calibration does not apply to
          multi-team trades.
        </p>
      </section>}
      <section aria-labelledby="package-details-title">
        <h3
          id="package-details-title"
          className="text-sm font-black uppercase tracking-wider text-slate-700"
        >
          Package details
        </h3>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {result.participants.map((participant) => (
            <article
              key={participant.participantId}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h4 className="break-words text-base font-black uppercase text-slate-950">
                {teamLabel(result.participants.indexOf(participant))}{" "}
                <span className="text-slate-600">· {names.get(participant.franchiseId) ?? participant.franchiseId}</span>
              </h4>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Sends
                  </p>
                  {participant.sends.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-600">
                      No players sent
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {participant.sends.map((asset) => (
                        <li
                          key={asset.player.playerId}
                          className="rounded-lg bg-slate-50 p-2 text-xs"
                        >
                          <b className="block break-words text-slate-950">
                            {playerName(asset.player)}
                          </b>
                          <span className="text-slate-600">
                            {position(asset.player)} →{" "}
                            {names.get(asset.destinationFranchiseId) ??
                              asset.destinationFranchiseId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {participant.faabSent && participant.faabSent.amount > 0 && (
                    <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs">
                      <b className="block text-orange-900">{formatFaab(participant.faabSent.amount)}</b>
                      <span className="text-orange-800">→ {names.get(participant.faabSent.receiverFranchiseId) ?? participant.faabSent.receiverFranchiseId}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Receives
                  </p>
                  {participant.receives.length === 0 ? (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-600">
                      No players received
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {participant.receives.map((asset) => (
                        <li
                          key={asset.player.playerId}
                          className="rounded-lg bg-slate-50 p-2 text-xs"
                        >
                          <b className="block break-words text-slate-950">
                            {playerName(asset.player)}
                          </b>
                          <span className="text-slate-600">
                            {position(asset.player)} ←{" "}
                            {names.get(asset.sourceFranchiseId) ??
                              asset.sourceFranchiseId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {participant.faabReceived.filter((transfer) => transfer.amount > 0).map((transfer) => (
                    <div key={`${transfer.senderFranchiseId}:${transfer.amount}`} className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs">
                      <b className="block text-orange-900">{formatFaab(transfer.amount)}</b>
                      <span className="text-orange-800">← {names.get(transfer.senderFranchiseId) ?? transfer.senderFranchiseId}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <MarketCard
                  label="Sends market context"
                  context={participant.market.sent}
                  assetCount={participant.sends.length}
                />
                <MarketCard
                  label="Receives market context"
                  context={participant.market.received}
                  assetCount={participant.receives.length}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
      {result.mode === "LEAGUE_TRADE" && <section aria-labelledby="roster-impact-title">
        <h3
          id="roster-impact-title"
          className="text-sm font-black uppercase tracking-wider text-slate-700"
        >
          Roster impact
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {result.participants.map((participant) => (
            <article
              key={participant.participantId}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <h4 className="break-words text-sm font-black text-slate-950">
                {names.get(participant.franchiseId) ?? participant.franchiseId}
              </h4>
              <p className="mt-2 text-xs font-semibold text-slate-600">
                {participant.rosterContext === "CURRENT_FACT"
                  ? "Current roster fact"
                  : "Hypothetical result"}
              </p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-[360px] w-full text-xs">
                  <caption className="sr-only">
                    Position counts before and after for{" "}
                    {names.get(participant.franchiseId) ??
                      participant.franchiseId}
                  </caption>
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left">
                        Position
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Before
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        After
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {POSITION_ORDER.map((slot) => {
                      const before = participant.positionalBefore[slot] ?? 0;
                      const after = participant.positionalAfter[slot] ?? 0;
                      const changed = before !== after;
                      return (
                        <tr
                          key={slot}
                          className={
                            changed
                              ? "border-t border-slate-100 font-black text-slate-950"
                              : "border-t border-slate-100 text-slate-600"
                          }
                        >
                          <th scope="row" className="px-3 py-2 text-left">
                            {slot}
                          </th>
                          <td className="px-3 py-2 text-right">{before}</td>
                          <td className="px-3 py-2 text-right">{after}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </section>}
      {hasIncompleteMarketData && (
        <section
          aria-labelledby="data-warning-title"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
        >
          <h3 id="data-warning-title" className="text-sm font-black uppercase tracking-wider text-amber-950">
            Limited market data
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
            Auction or ADP consensus is unavailable for one or more selected players.
            Missing data is not treated as zero.
          </p>
        </section>
      )}
    </section>
  );
}

export default function TradeComparison() {
  const [memberState, setMemberState] = useState<
    "loading" | "ready" | "anonymous" | "error"
  >("loading");
  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  const [sandboxPlayers, setSandboxPlayers] = useState<PlayerOption[]>([]);
  const [mode, setMode] = useState<"LEAGUE_TRADE" | "SANDBOX">("LEAGUE_TRADE");
  const [showSandboxHelp, setShowSandboxHelp] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    { participantId: "participant-1", franchiseId: "", selected: [], faabAmount: 0, faabDestination: "" },
    { participantId: "participant-2", franchiseId: "", selected: [], faabAmount: 0, faabDestination: "" },
  ]);
  const [destinations, setDestinationsState] = useState<Record<string, string>>(
    {},
  );
  const [result, setResult] = useState<RoutingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/current-member", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("Member state unavailable")),
      )
      .then((payload: { authenticated?: boolean }) => {
        if (!payload.authenticated) {
          setMemberState("anonymous");
          return null;
        }
        return fetch("/api/trade-comparison", {
          cache: "no-store",
          signal: controller.signal,
        });
      })
      .then((response) => {
        if (!response) return null;
        if (!response.ok)
          throw new Error("Current roster data is temporarily unavailable.");
        return response.json();
      })
      .then(
        (
          payload: {
            success?: boolean;
            franchises?: FranchiseOption[];
            sandboxPlayers?: PlayerOption[];
            error?: string;
          } | null,
        ) => {
          if (!payload) return;
          if (!payload.success || !Array.isArray(payload.franchises))
            throw new Error(
              payload.error ??
                "Trade comparison data is temporarily unavailable.",
            );
          setFranchises(payload.franchises);
          setSandboxPlayers(payload.sandboxPlayers ?? []);
          setMemberState("ready");
        },
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setMemberState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Trade comparison data is unavailable.",
        );
      });
    return () => controller.abort();
  }, []);
  const usedPlayers = useMemo(
    () => new Set(participants.flatMap((participant) => participant.selected)),
    [participants],
  );
  const selectedFranchiseIds = useMemo(
    () =>
      new Set(
        participants
          .map((participant) => participant.franchiseId)
          .filter(Boolean),
      ),
    [participants],
  );
  const canAddTeam = participants.length < 4;
  const allSelectedHaveDestinations = participants.every((participant) =>
    participant.selected.every((playerId) =>
      Boolean(
        destinations[`${participant.participantId}:${playerId}`] ??
          automaticDestination(participants, participant),
      ),
    ),
  );
  const allFaabHaveDestinations = participants.every((participant) => participant.faabAmount === 0 || Boolean(participant.faabDestination || automaticDestination(participants, participant)));
  useEffect(() => {
    if (participants.length !== 2) return;
    setDestinationsState((current) => {
      const next = { ...current };
      let changed = false;
      participants.forEach((participant) => {
        const destination = automaticDestination(participants, participant);
        if (!destination) return;
        participant.selected.forEach((playerId) => {
          const key = `${participant.participantId}:${playerId}`;
          if (!next[key]) {
            next[key] = destination;
            changed = true;
          }
        });
      });
      return changed ? next : current;
    });
  }, [participants]);
  const canSubmit =
    memberState === "ready" &&
    participants.every(
      (participant) =>
        participant.franchiseId && participant.selected.length > 0,
    ) &&
    new Set(
      participants
        .map((participant) => participant.franchiseId)
        .filter(Boolean),
    ).size === participants.length &&
    allSelectedHaveDestinations &&
    allFaabHaveDestinations &&
    !isSubmitting;
  const setDestinations = (key: string, value: string) => {
    setDestinationsState((current) => ({ ...current, [key]: value }));
    setResult(null);
  };
  const setFaab = (participantId: string, amount: number, destination: string) => {
    setResult(null);
    setParticipants((current) => current.map((participant) => participant.participantId === participantId ? { ...participant, faabAmount: amount, faabDestination: destination } : participant));
  };
  const changeMode = (nextMode: "LEAGUE_TRADE" | "SANDBOX") => {
    setMode(nextMode);
    setResult(null);
    setErrorMessage(null);
    setParticipants((current) =>
      current.map((participant) => ({ ...participant, selected: [], faabAmount: 0, faabDestination: "" })),
    );
    setDestinationsState({});
  };
  const changeFranchise = (participantId: string, franchiseId: string) => {
    setResult(null);
    setParticipants((current) =>
      current.map((participant) =>
        participant.participantId === participantId
          ? {
              ...participant,
              franchiseId,
              selected: mode === "SANDBOX" ? participant.selected : [],
              faabDestination: "",
            }
          : participant,
      ),
    );
    if (mode === "LEAGUE_TRADE") {
      setDestinationsState((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([key]) => !key.startsWith(`${participantId}:`),
          ),
        ),
      );
    }
  };
  const togglePlayer = (participantId: string, playerId: string) => {
    setResult(null);
    setParticipants((current) =>
      current.map((participant) =>
        participant.participantId === participantId
          ? {
              ...participant,
              selected: participant.selected.includes(playerId)
                ? participant.selected.filter((id) => id !== playerId)
                : [...participant.selected, playerId],
            }
          : participant,
      ),
    );
  };
  const addTeam = () => {
    if (canAddTeam)
      setParticipants((current) => [
        ...current,
        {
          participantId: `participant-${current.length + 1}`,
          franchiseId: "",
          selected: [],
          faabAmount: 0,
          faabDestination: "",
        },
      ]);
  };
  const removeTeam = (participantId: string) => {
    setParticipants((current) =>
      current.filter(
        (participant) => participant.participantId !== participantId,
      ),
    );
    setDestinationsState((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([key]) => !key.startsWith(`${participantId}:`),
        ),
      ),
    );
    setResult(null);
  };
  const resetTrade = () => {
    setParticipants([
      { participantId: "participant-1", franchiseId: "", selected: [], faabAmount: 0, faabDestination: "" },
      { participantId: "participant-2", franchiseId: "", selected: [], faabAmount: 0, faabDestination: "" },
    ]);
    setDestinationsState({});
    setResult(null);
    setErrorMessage(null);
  };
  const randomTrade = () => {
    const choices =
      mode === "SANDBOX"
        ? franchises
        : franchises.filter(
            (franchise) => franchise.available && franchise.players.length > 0,
          );
    const playerPool =
      mode === "SANDBOX"
        ? sandboxPlayers
        : choices.flatMap((franchise) => franchise.players);
    if (choices.length < 2 || playerPool.length < 2) return;
    const chosen = choices.slice(0, 2);
    const selectedPlayers =
      mode === "SANDBOX"
        ? [
            playerPool[Math.floor(Math.random() * playerPool.length)],
            playerPool[Math.floor(Math.random() * playerPool.length)],
          ]
        : chosen.map(
            (franchise) =>
              franchise.players[
                Math.floor(Math.random() * franchise.players.length)
              ],
          );
    if (
      !selectedPlayers[0] ||
      !selectedPlayers[1] ||
      selectedPlayers[0].playerId === selectedPlayers[1].playerId
    )
      return;
    const next = participants
      .slice(0, 2)
      .map((participant, index) => ({
        ...participant,
        franchiseId: chosen[index].franchiseId,
        selected: [selectedPlayers[index].playerId],
      }));
    const nextDestinations: Record<string, string> = {};
    next.forEach((participant, index) => {
      nextDestinations[
        `${participant.participantId}:${participant.selected[0]}`
      ] = next[1 - index].franchiseId;
    });
    setParticipants(next.map((participant) => ({ ...participant, faabAmount: 0, faabDestination: "" })));
    setDestinationsState(nextDestinations);
    setResult(null);
    setErrorMessage(null);
  };
  const compare = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);
    try {
      const payload = {
        version: "m10",
        mode,
        season: 2026,
        participants: participants.map((participant) => ({
          participantId: participant.participantId,
          franchiseId: participant.franchiseId,
          outgoing: participant.selected.map((playerId) => ({
            playerId,
            destinationFranchiseId:
              destinations[`${participant.participantId}:${playerId}`] ??
              automaticDestination(participants, participant),
          })),
          faab: { amount: participant.faabAmount, destinationFranchiseId: participant.faabDestination || automaticDestination(participants, participant) },
        })),
      };
      const response = await fetch("/api/trade-comparison/multi-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        success?: boolean;
        routing?: RoutingResult;
        error?: string;
      };
      if (response.status === 401) {
        setMemberState("anonymous");
        return;
      }
      if (!response.ok || !body.routing)
        throw new Error(
          body.error ?? "Trade analysis is temporarily unavailable.",
        );
      if (body.routing.status !== "READY")
        throw new Error(
          body.routing.errors.map((error) => error.message).join(" ") ||
            "Trade request is invalid.",
        );
      setResult(body.routing);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Trade analysis is temporarily unavailable.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  if (memberState === "loading")
    return (
      <section
        aria-label="Trade Comparison loading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <p className="text-sm font-bold text-slate-600">
          Loading member access...
        </p>
      </section>
    );
  if (memberState === "anonymous")
    return (
      <section
        aria-labelledby="trade-login-title"
        className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm sm:p-8"
      >
        <h2
          id="trade-login-title"
          className="text-lg font-black uppercase tracking-tight text-slate-950"
        >
          League Member Login required
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-700">
          Sign in to build factual current or hypothetical trade packages.
        </p>
        <Link
          href="/member/login?returnTo=%2Fleague-info%2Fanalyzer"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
        >
          League Member Login
        </Link>
      </section>
    );
  if (memberState === "error")
    return (
      <section
        role="alert"
        aria-label="Trade Comparison unavailable"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
      >
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-950">
          Trade Comparison unavailable
        </h2>
        <p className="mt-2 text-sm font-semibold text-amber-900">
          {errorMessage ?? "Trade comparison data is temporarily unavailable."}
        </p>
      </section>
    );
  return (
    <section
      aria-labelledby="trade-comparison-title"
      className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="trade-comparison-title"
            className="text-xl font-black uppercase tracking-tight text-slate-950"
          >
            Trade builder
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Build a 2–4 team trade with explicit destinations. League Trade
            validates current ownership; Trade Sandbox uses the server-owned
            player directory for hypothetical packages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetTrade}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
          >
            <RotateCcw size={14} aria-hidden="true" /> Reset Trade
          </button>
          <button
            type="button"
            onClick={randomTrade}
            className="min-h-10 rounded-lg border border-orange-300 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
          >
            Try a Random Trade
          </button>
        </div>
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Trade mode"
      >
        <button
          type="button"
          aria-pressed={mode === "LEAGUE_TRADE"}
          onClick={() => changeMode("LEAGUE_TRADE")}
          className={`min-h-11 rounded-xl px-4 text-xs font-black uppercase tracking-wider focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 ${mode === "LEAGUE_TRADE" ? "bg-orange-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
        >
          League Trade
        </button>
        <span className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-pressed={mode === "SANDBOX"}
            onClick={() => changeMode("SANDBOX")}
            className={`min-h-11 rounded-xl px-4 text-xs font-black uppercase tracking-wider focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 ${mode === "SANDBOX" ? "bg-orange-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          >
            Trade Sandbox
          </button>
          <button
            type="button"
            aria-label="What is Trade Sandbox?"
            aria-expanded={showSandboxHelp}
            aria-controls="trade-sandbox-help"
            onClick={() => setShowSandboxHelp((current) => !current)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
          >
            <Info size={16} aria-hidden="true" />
          </button>
        </span>
      </div>
      {showSandboxHelp && (
        <div
          id="trade-sandbox-help"
          role="status"
          className="relative rounded-xl border border-slate-200 bg-white p-3 pr-10 text-sm leading-6 text-slate-700 shadow-sm"
        >
          <p>
            Trade Sandbox lets you compare hypothetical player packages without
            requiring the players to be on their current River City rosters.
            Use League Trade when you want to evaluate a trade using actual
            current franchise ownership.
          </p>
          <button
            type="button"
            aria-label="Close Trade Sandbox help"
            onClick={() => setShowSandboxHelp(false)}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}
      {mode === "SANDBOX" && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-900">
          Sandbox selection is ownership-independent, but player identity,
          market context, and any future analysis remain server-owned.
        </p>
      )}
      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"
        >
          {errorMessage}
        </p>
      )}
      {mode === "SANDBOX" && (
        <SearchPanel
          players={sandboxPlayers}
          usedPlayers={usedPlayers}
          participants={participants}
          onAdd={(playerId, participantId) => {
            togglePlayer(participantId, playerId);
          }}
        />
      )}
      <div
        className={`grid gap-5 ${participants.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-4"}`}
      >
        {participants.map((participant, index) => (
          <ParticipantPanel
            key={participant.participantId}
            participant={participant}
            index={index}
            franchises={franchises}
            selectedFranchiseIds={selectedFranchiseIds}
            mode={mode}
            allPlayers={sandboxPlayers}
            usedPlayers={usedPlayers}
            destinations={destinations}
            allParticipants={participants}
            setDestinations={setDestinations}
            onChangeFranchise={(value) =>
              changeFranchise(participant.participantId, value)
            }
            onToggle={(playerId) =>
              togglePlayer(participant.participantId, playerId)
            }
            onRemove={() => removeTeam(participant.participantId)}
            onClear={() =>
              setParticipants((current) =>
                current.map((candidate) =>
                  candidate.participantId === participant.participantId
                    ? { ...candidate, selected: [], faabAmount: 0, faabDestination: "" }
                    : candidate,
                ),
              )
            }
            onFaabChange={(amount, destination) => setFaab(participant.participantId, amount, destination)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={addTeam}
        disabled={!canAddTeam}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-orange-400 bg-white px-4 text-xs font-black uppercase tracking-wider text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={16} aria-hidden="true" /> Add Participant{" "}
        {participants.length + 1}
      </button>
      <button
        type="button"
        onClick={compare}
        disabled={!canSubmit}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-orange-600 px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
      >
        {isSubmitting ? "Building analysis..." : "Analyze Trade"}
      </button>
      {result && <ResultView result={result} franchises={franchises} />}
    </section>
  );
}
