// ---------------------------------------------------------
// File: /components/TradeAnalyzer.tsx
// REFACTORED – SAD BUDDY JESUS EDITION (Option A)
// ---------------------------------------------------------

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Plus,
  Scale,
  Home,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { getLeagueRosters, getAllPlayers, LEAGUE_ID } from "@/lib/sleeper";
import TradeSummaryModal from "./transactions/TradeSummaryModal";
import { evaluateTrade } from "@/lib/tradeFairnessEngine";
import { calculatePlayerValue } from "@/lib/trade/playerValuations";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// ----------------------------------------------------------------------
// TYPES & CONSTANTS
// ----------------------------------------------------------------------

interface PlayerData {
  player_id?: string;
  full_name?: string;
  name?: string;
  position?: string;
  team?: string;
  totalValueScore?: number;
  keeperCost?: number;
  value?: number;
}

interface TradeAsset {
  playerId: string;
  toTeam: number;
}

interface TradeSideState {
  sending: TradeAsset[];
  faabSent: number;
}

interface HistoricalPercentiles {
  p05: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

interface EvaluatedPlayer {
  playerId: string;
  totalValueScore: number;
  keeperCost: number;
  toTeam: number;
  pos: string;
  full_name: string;
}

interface TradeSideInput {
  teamIndex: number;
  faabSent: number;
  players: EvaluatedPlayer[];
}

interface TeamMeta {
  teamName: string;
  ownerName: string;
  avatar: string | null;
}

interface ReceivedPlayer {
  name: string;
  pos: string;
  value: number;
}

interface TeamSummary {
  teamName: string;
  ownerName: string;
  avatar: string | null;

  valueSent: number;
  valueReceived: number;
  surplusSent: number;
  surplusReceived: number;
  faabNet: number;
  netSurplus: number;

  playersReceived?: ReceivedPlayer[];

  [key: string]: any;
}

interface TradeComponents {
  perTeam: any[];
  global: any;
  timeline?: any;
  [key: string]: any;
}

interface TradeEvaluationResult {
  teamSummaries: TeamSummary[];
  fairnessScore: number;
  verdict: string;
  isSadBuddyJesus: boolean;
  components: TradeComponents;
}

const POS_ORDER: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

const POS_COLORS: Record<string, string> = {
  QB: "bg-[#ff2a6d]",
  RB: "bg-[#00ceb8]",
  WR: "bg-[#58a7ff]",
  TE: "bg-[#ffae58]",
  K: "bg-[#bd7af5]",
  DEF: "bg-[#81a1c1]",
};

// ----------------------------------------------------------------------
// SMALL PRESENTATIONAL SUBCOMPONENTS
// ----------------------------------------------------------------------

interface ThemeToggleProps {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme }) => (
  <div className="inline-flex items-center gap-1 px-1 py-1 rounded-full bg-slate-800 dark:bg-white/10 border border-white/20 shadow-lg">
    <button
      onClick={() => setTheme("light")}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition ${
        theme === "light" ? "bg-white text-black shadow-md" : "text-gray-400"
      }`}
    >
      <Sun className="w-4 h-4" />
    </button>
    <button
      onClick={() => setTheme("dark")}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition ${
        theme === "dark" ? "bg-white text-black shadow-md" : "text-gray-400"
      }`}
    >
      <Moon className="w-4 h-4" />
    </button>
    <button
      onClick={() => setTheme("system")}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition ${
        theme === "system" ? "bg-white text-black shadow-md" : "text-gray-400"
      }`}
    >
      <Monitor className="w-4 h-4" />
    </button>
  </div>
);

interface TeamHeaderProps {
  idx: number;
  mode: "league" | "custom";
  teamNameLabel: string;
  ownerNameLabel: string;
  avatar?: string | null;
}

const TeamHeader: React.FC<TeamHeaderProps> = ({
  idx,
  mode,
  teamNameLabel,
  ownerNameLabel,
  avatar,
}) => (
  <div className="flex items-center gap-4">
    {mode === "league" && avatar ? (
      <img
        src={`https://sleepercdn.com/avatars/${avatar}`}
        className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg object-cover"
        alt="avatar"
      />
    ) : (
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">
        Team {idx + 1}
      </div>
    )}
    <div>
      <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight uppercase italic">
        {teamNameLabel}
      </h2>
      <p className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
        {ownerNameLabel}
      </p>
    </div>
  </div>
);

interface LeagueTeamSelectProps {
  users: any[];
  rosters: any[];
  value: string;
  onChange: (val: string) => void;
}

const LeagueTeamSelect: React.FC<LeagueTeamSelectProps> = ({
  users,
  rosters,
  value,
  onChange,
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-600"
  >
    <option value="">Select a team...</option>
    {users.map((u: any) => {
      const r = rosters.find((rost: any) => rost.owner_id === u.user_id);
      return (
        <option key={u.user_id} value={u.user_id}>
          {r?.metadata?.team_name || u.metadata?.team_name || u.display_name}
        </option>
      );
    })}
  </select>
);

interface CustomSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: PlayerData[];
  onSelectSuggestion: (playerId: string) => void;
}

const CustomSearchInput: React.FC<CustomSearchInputProps> = ({
  value,
  onChange,
  suggestions,
  onSelectSuggestion,
}) => (
  <div className="relative">
    <div className="flex items-center bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3">
      <Search size={16} className="text-gray-400 mr-2" />
      <input
        placeholder="Search NFL Player..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm font-bold outline-none w-full text-slate-900 dark:text-white"
      />
    </div>
    {value.length >= 2 && suggestions.length > 0 && (
      <div className="absolute z-20 mt-1 w-full rounded-xl bg-slate-900 border border-white/10 shadow-lg max-h-56 overflow-y-auto">
        {suggestions.map((p) => (
          <button
            key={p.player_id}
            type="button"
            onClick={() => p.player_id && onSelectSuggestion(p.player_id)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-8 h-4 rounded-sm text-[8px] font-black flex items-center justify-center text-white ${
                  POS_COLORS[p.position || ""] || "bg-gray-600"
                }`}
              >
                {p.position || "BN"}
              </span>
              <span className="font-bold">
                {p.full_name || p.name || "Unknown Player"}
              </span>
            </div>
            <span className="text-[10px] opacity-60">{p.team || "FA"}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

interface RosterListProps {
  roster: any | undefined;
  players: Record<string, PlayerData>;
  onSelectPlayer: (playerId: string) => void;
}

const RosterList: React.FC<RosterListProps> = ({
  roster,
  players,
  onSelectPlayer,
}) => {
  if (!roster) return null;

  const sorted = (roster.players || [])
    .slice()
    .sort(
      (a: string, b: string) =>
        (POS_ORDER[players[a]?.position || "BN"] || 99) -
        (POS_ORDER[players[b]?.position || "BN"] || 99)
    );

  return (
    <div className="space-y-2 mt-3">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
        Available Roster
      </p>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 p-2 custom-scrollbar">
        {sorted.map((pid: string) => {
          const p = players[pid] || {};
          return (
            <button
              key={pid}
              type="button"
              onClick={() => onSelectPlayer(pid)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5 rounded-lg mb-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-8 h-4 rounded-sm text-[8px] font-black flex items-center justify-center text-white ${
                    POS_COLORS[p.position || ""] || "bg-gray-600"
                  }`}
                >
                  {p.position || "BN"}
                </span>
                <span className="font-bold">
                  {p.full_name || "Unknown Player"}
                </span>
              </div>
              <span className="text-[10px] opacity-40">{p.team || "FA"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface TradeAssetRowProps {
  asset: TradeAsset;
  players: Record<string, PlayerData>;
  numTeams: number;
  teamIndex: number;
  onUpdateDestination: (toTeam: number) => void;
  onRemove: () => void;
}

const TradeAssetRow: React.FC<TradeAssetRowProps> = ({
  asset,
  players,
  numTeams,
  teamIndex,
  onUpdateDestination,
  onRemove,
}) => {
  const p = players[asset.playerId] || {};
  return (
    <div className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 rounded text-[9px] font-black text-white ${
            POS_COLORS[p.position || ""] || "bg-gray-500"
          }`}
        >
          {p.position || "BN"}
        </span>
        <span className="text-xs font-black text-slate-800 dark:text-white uppercase">
          {p.full_name || "Unknown Player"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={asset.toTeam}
          onChange={(e) => onUpdateDestination(Number(e.target.value))}
          className="bg-white dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-[9px] font-black text-slate-800 dark:text-white"
        >
          {Array.from({ length: numTeams }).map((_, tIdx) => (
            <option key={tIdx} value={tIdx} disabled={tIdx === teamIndex}>
              Route to Team {tIdx + 1}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-500 hover:scale-110 transition-transform"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

interface FaabControlProps {
  faabSent: number;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (amount: number) => void;
}

const FaabControl: React.FC<FaabControlProps> = ({
  faabSent,
  isOpen,
  onToggle,
  onChange,
}) => (
  <div className="pt-2 border-t border-slate-100 dark:border-white/5">
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-[10px] font-black uppercase py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
    >
      {faabSent > 0 ? `FAAB Sent: $${faabSent}` : "+ Include FAAB"}
    </button>
    {isOpen && (
      <input
        type="number"
        min={0}
        value={faabSent}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-2 w-full bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-600"
        placeholder="Amount..."
      />
    )}
  </div>
);

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export default function TradeAnalyzer() {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mode, setMode] = useState<"league" | "custom">("league");
  const [numTeams, setNumTeams] = useState<number>(2);
  const [selections, setSelections] = useState<string[]>(Array(4).fill(""));
  const [rosters, setRosters] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [players, setPlayers] = useState<Record<string, PlayerData>>({});
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [searchTerms, setSearchTerms] = useState<string[]>(Array(4).fill(""));
  const [faabOpen, setFaabOpen] = useState<boolean[]>(Array(4).fill(false));

  const [tradeState, setTradeState] = useState<TradeSideState[]>(
    Array(4)
      .fill(null)
      .map(() => ({ sending: [], faabSent: 0 }))
  );

  const [historicalPercentiles, setHistoricalPercentiles] =
    useState<HistoricalPercentiles | null>(null);

  const isGridLayout = numTeams >= 2;

  // -----------------------------
  // Helpers
  // -----------------------------

  const loadPlayerValue = async (playerId: string) => {
    try {
      const value = await calculatePlayerValue(playerId);
      setPlayers((prev: Record<string, PlayerData>) => ({
        ...prev,
        [playerId]: {
          ...(prev[playerId] || {}),
          totalValueScore: value.totalValueScore,
          keeperCost: value.keeperCost,
          value: value.value,
        },
      }));
    } catch (err) {
      console.error("Failed to load player value", err);
    }
  };

  const handleAddTeam = () => {
    setNumTeams((prev) => (prev >= 4 ? prev : prev + 1));
  };

  const handleRemoveTeam = (index: number) => {
    setNumTeams((prev) => (prev <= 2 ? prev : prev - 1));
    setTradeState((prev) =>
      prev.map((s, i) => (i === index ? { sending: [], faabSent: 0 } : s))
    );
  };

  const updateFaab = (teamIndex: number, amount: number) => {
    setTradeState((prev) =>
      prev.map((side, idx) =>
        idx === teamIndex
          ? { ...side, faabSent: Math.max(0, amount) }
          : side
      )
    );
  };

  const updateAssetDestination = (
    teamIndex: number,
    playerId: string,
    toTeam: number
  ) => {
    setTradeState((prev) =>
      prev.map((side, idx) => {
        if (idx !== teamIndex) return side;
        return {
          ...side,
          sending: side.sending.map((asset) =>
            asset.playerId === playerId ? { ...asset, toTeam } : asset
          ),
        };
      })
    );
  };

  const toggleFaab = (teamIndex: number) => {
    setFaabOpen((prev) =>
      prev.map((open, idx) => (idx === teamIndex ? !open : open))
    );
  };

  const handleSelectPlayer = (teamIndex: number, playerId: string) => {
    setTradeState((prev) =>
      prev.map((side, idx) => {
        if (idx !== teamIndex) return side;
        if (side.sending.some((a) => a.playerId === playerId)) return side;
        return {
          ...side,
          sending: [
            ...side.sending,
            { playerId, toTeam: (teamIndex + 1) % numTeams },
          ],
        };
      })
    );
    loadPlayerValue(playerId);
    setSearchTerms((prev) =>
      prev.map((t, i) => (i === teamIndex ? "" : t))
    );
  };

  const handleRemoveAsset = (teamIndex: number, playerId: string) => {
    setTradeState((prev) =>
      prev.map((side, idx) =>
        idx === teamIndex
          ? {
              ...side,
              sending: side.sending.filter((a) => a.playerId !== playerId),
            }
          : side
      )
    );
  };

  const filteredPlayers = (term: string): PlayerData[] => {
    if (!term || term.length < 2) return [];
    const lowerTerm = term.toLowerCase();
    return Object.values(players)
      .filter((p) => (p.full_name || "").toLowerCase().includes(lowerTerm))
      .slice(0, 8);
  };

  // -----------------------------
  // Data Loading
  // -----------------------------

  useEffect(() => {
    async function loadData() {
      try {
        const [uRes, rosterData, playerData] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`),
          getLeagueRosters(LEAGUE_ID),
          getAllPlayers(),
        ]);
        const uData = await uRes.json();
        const primaryUsers = uData.filter(
          (u: any) =>
            ![
              "JEFFHUDGE",
              "LANDONELLIOTT1",
              "DBUCCANEER12",
              "SHEADOWLING",
            ].includes(u.display_name?.toUpperCase())
        );
        setUsers(primaryUsers);
        setRosters(rosterData || []);
        setPlayers((prev: Record<string, PlayerData>) => ({
          ...playerData,
          ...prev, // keep enriched values
        }));
      } catch (e) {
        console.error("Trade data sync failed", e);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadHistoricalDistribution() {
      try {
        const distRef = doc(
          db,
          "historical_distribution",
          "imbalance_percentiles"
        );
        const snap = await getDoc(distRef);
        if (snap.exists()) {
          const data = snap.data() as { percentiles?: HistoricalPercentiles };
          if (data?.percentiles) setHistoricalPercentiles(data.percentiles);
        }
      } catch (e) {
        console.error("Failed to load historical distribution", e);
      }
    }
    loadHistoricalDistribution();
  }, []);

  // -----------------------------
  // ANALYSIS ENGINE
  // -----------------------------

  const currentAnalysis: TradeEvaluationResult | null = useMemo(() => {
    const sides: TradeSideInput[] = tradeState.slice(0, numTeams).map((side, i) => ({
      teamIndex: i,
      faabSent: side.faabSent || 0,
      players: side.sending.map((a) => {
        const p = players[a.playerId] || {};
        return {
          playerId: a.playerId,
          totalValueScore: p.totalValueScore || 0,
          keeperCost: p.keeperCost || 0,
          toTeam: a.toTeam,
          pos: p.position || "BN",
          full_name: p.full_name || p.name || "Unknown Player",
        };
      }),
    }));

    if (sides.every((s) => s.players.length === 0 && s.faabSent === 0)) {
      return null;
    }

    // Ensure all players in the trade have valuations loaded (lazy, on-demand)
    const allPlayerIds = sides.flatMap((s) =>
      s.players.map((p) => p.playerId)
    );
    allPlayerIds.forEach((pid) => {
      const p = players[pid];
      if (!p?.totalValueScore) {
        // fire and forget; state update will trigger re-render
        loadPlayerValue(pid);
      }
    });

    const teamMeta: TeamMeta[] = Array.from({ length: numTeams }).map(
      (_, idx) => {
        const teamSelection = selections[idx];
        const roster = rosters.find(
          (r: any) => r.owner_id === teamSelection
        );
        const user = users.find((u: any) => u.user_id === teamSelection);
        return {
          teamName:
            mode === "league"
              ? roster?.metadata?.team_name ||
                user?.metadata?.team_name ||
                `Team ${idx + 1}`
              : `Team ${idx + 1}`,
          ownerName:
            mode === "league"
              ? user?.display_name || "Unassigned"
              : "Custom Entry",
          avatar: mode === "league" ? user?.avatar || null : null,
        };
      }
    );

    const evaluation = evaluateTrade(
      sides,
      historicalPercentiles,
      teamMeta
    ) as TradeEvaluationResult | null;

    if (evaluation && evaluation.teamSummaries) {
      evaluation.teamSummaries = evaluation.teamSummaries.map(
        (summary, teamIdx) => {
          const received: ReceivedPlayer[] = [];
          sides.forEach((side) => {
            side.players.forEach((p) => {
              if (p.toTeam === teamIdx) {
                received.push({
                  name: p.full_name,
                  pos: p.pos,
                  value: p.totalValueScore,
                });
              }
            });
          });

          return {
            ...summary,
            playersReceived: received,
          };
        }
      );
    }

    return evaluation;
  }, [
    tradeState,
    numTeams,
    players,
    historicalPercentiles,
    selections,
    rosters,
    users,
    mode,
  ]);

  if (!mounted) return null;

  // -----------------------------
  // RENDER
  // -----------------------------

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4">
      {/* Top Navigation */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/league-info"
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 dark:bg-white/10 border border-white/20 text-white hover:bg-slate-700 dark:hover:bg-white/20 transition shadow-lg"
        >
          <Home className="w-5 h-5" />
        </Link>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-900/40">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic leading-none">
              Trade Analyzer
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">
              Linear Math Mode Enabled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition ${
              mode === "league"
                ? "bg-slate-800 text-white border-slate-800 dark:bg.white dark:text-black dark:border-white"
                : "bg-transparent text-gray-400 border-gray-600"
            }`}
            onClick={() => setMode("league")}
          >
            League
          </button>
          <button
            className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition ${
              mode === "custom"
                ? "bg-slate-800 text-white border-slate-800 dark:bg.white dark:text-black dark:border-white"
                : "bg-transparent text-gray-400 border-gray-600"
            }`}
            onClick={() => setMode("custom")}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Parties Count */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400 font-black">
          Parties: {numTeams} / 4
        </p>
        {numTeams < 4 && (
          <button
            type="button"
            onClick={handleAddTeam}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg hover:scale-105 transition-transform"
          >
            <Plus className="w-3 h-3" /> Add Team
          </button>
        )}
      </div>

      {/* Team Cards Grid */}
      <div
        className={
          isGridLayout
            ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
            : "flex flex-col gap-4"
        }
      >
        {Array.from({ length: numTeams }).map((_, idx) => {
          const teamSelection = selections[idx];
          const sending = tradeState[idx]?.sending || [];
          const faabSent = tradeState[idx]?.faabSent || 0;
          const roster = rosters.find(
            (r: any) => r.owner_id === teamSelection
          );
          const user = users.find((u: any) => u.user_id === teamSelection);

          const teamNameLabel =
            mode === "league"
              ? roster?.metadata?.team_name ||
                user?.metadata?.team_name ||
                `Team ${idx + 1}`
              : `Team ${idx + 1}`;
          const ownerNameLabel =
            mode === "league"
              ? user?.display_name || "Unassigned"
              : "Custom Search";

          const suggestions =
            mode === "custom" ? filteredPlayers(searchTerms[idx]) : [];

          return (
            <div
              key={idx}
              className="relative rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 p-6 space-y-4 shadow-xl"
            >
              {idx >= 2 && numTeams > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveTeam(idx)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-red-500 text-slate-500 hover:text-white transition flex items-center justify-center z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <TeamHeader
                idx={idx}
                mode={mode}
                teamNameLabel={teamNameLabel}
                ownerNameLabel={ownerNameLabel}
                avatar={mode === "league" ? user?.avatar : undefined}
              />

              {/* Selection Logic */}
              {mode === "league" ? (
                <LeagueTeamSelect
                  users={users}
                  rosters={rosters}
                  value={teamSelection}
                  onChange={(val) =>
                    setSelections((prev) =>
                      prev.map((v, i) => (i === idx ? val : v))
                    )
                  }
                />
              ) : (
                <CustomSearchInput
                  value={searchTerms[idx]}
                  onChange={(val) =>
                    setSearchTerms((prev) =>
                      prev.map((t, i) => (i === idx ? val : t))
                    )
                  }
                  suggestions={suggestions}
                  onSelectSuggestion={(playerId) =>
                    handleSelectPlayer(idx, playerId)
                  }
                />
              )}

              {/* Available Roster */}
              {mode === "league" && (
                <RosterList
                  roster={roster}
                  players={players}
                  onSelectPlayer={(pid) => handleSelectPlayer(idx, pid)}
                />
              )}

              {/* Assets in Trade */}
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Trading Away
                </p>
                {sending.length === 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-gray-500 italic">
                    No assets selected yet.
                  </p>
                )}
                {sending.map((asset) => (
                  <TradeAssetRow
                    key={asset.playerId}
                    asset={asset}
                    players={players}
                    numTeams={numTeams}
                    teamIndex={idx}
                    onUpdateDestination={(toTeam) =>
                      updateAssetDestination(idx, asset.playerId, toTeam)
                    }
                    onRemove={() => handleRemoveAsset(idx, asset.playerId)}
                  />
                ))}
              </div>

              {/* FAAB Control */}
              <FaabControl
                faabSent={faabSent}
                isOpen={faabOpen[idx]}
                onToggle={() => toggleFaab(idx)}
                onChange={(amount) => updateFaab(idx, amount)}
              />
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="pt-10 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => {
            setTradeState(
              Array(4)
                .fill(null)
                .map(() => ({ sending: [], faabSent: 0 }))
            );
            setSelections(Array(4).fill(""));
            setSearchTerms(Array(4).fill(""));
          }}
          className="px-8 py-3 rounded-full bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-gray-300 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-md"
        >
          Reset Trade
        </button>

        <button
          type="button"
          onClick={() => setIsSummaryOpen(true)}
          className="px-12 py-4 rounded-full bg-orange-600 text-white text-[13px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-transform"
        >
          Analyze Trade
        </button>
      </div>

      {isSummaryOpen && currentAnalysis && (
        <TradeSummaryModal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          teamSummaries={currentAnalysis.teamSummaries}
          fairnessScore={currentAnalysis.fairnessScore}
          verdict={currentAnalysis.verdict}
          isSadBuddyJesus={currentAnalysis.isSadBuddyJesus}
          components={currentAnalysis.components}
        />
      )}
    </div>
  );
}
