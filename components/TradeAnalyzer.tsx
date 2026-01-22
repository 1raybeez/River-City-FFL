import React, { useState, useEffect, useMemo } from "react";
import { Users, ArrowRightLeft, X } from "lucide-react";
import { getLeagueRosters, getAllPlayers, LEAGUE_IDS } from "@/lib/sleeper";
import TradeSummaryModal from "./transactions/TradeSummaryModal";

const managers = [
  { name: "Aaron Dogg", id: "583513420586848256" },
  { name: "Brian Stevens", id: "343129212162523136" },
  { name: "Doug Fordham", id: "73400761740312576" },
  { name: "JD Dowling", id: "342850391018356736" },
  { name: "Jordan Maslyn", id: "341412060426436608" },
  { name: "Ray Long", id: "342828350391230464" },
  { name: "Tommy Moore", id: "342849293037608960" },
  { name: "Travis Miller", id: "342831451382841344" },
  { name: "Wade Cameron", id: "342838548870762496" }
];

type TradeSide = {
  sending: string[];
  receiving: string[];
  faabSent: number;
  faabReceived: number;
};

type TeamSummary = {
  teamIndex: number;
  managerName: string | null;
  valueSent: number;
  valueReceived: number;
  keeperSent: number;
  keeperReceived: number;
  surplusSent: number;
  surplusReceived: number;
  netValue: number;
  netSurplus: number;
  faabSent: number;
  faabReceived: number;
  faabNet: number;
};

type Mode = "league" | "custom";

export default function TradeAnalyzer() {
  const [mode, setMode] = useState<Mode>("league");
  const [numTeams, setNumTeams] = useState(2);
  const [selections, setSelections] = useState<string[]>(Array(2).fill(""));

  const [season] = useState(2026);
  const [rosters, setRosters] = useState<any[]>([]);
  const [players, setPlayers] = useState<Record<string, any>>({});

  const [tradeState, setTradeState] = useState<TradeSide[]>(
    Array(2)
      .fill(null)
      .map(() => ({
        sending: [],
        receiving: [],
        faabSent: 0,
        faabReceived: 0
      }))
  );

  const [showFaab, setShowFaab] = useState<boolean[]>(Array(2).fill(false));
  const [searchTerms, setSearchTerms] = useState<string[]>(Array(2).fill(""));
  const [positionFilters, setPositionFilters] = useState<string[]>(
    Array(2).fill("ALL")
  );

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  useEffect(() => {
    const leagueId = LEAGUE_IDS[season];
    if (!leagueId) return;

    async function loadData() {
      try {
        const [rosterData, playerData] = await Promise.all([
          getLeagueRosters(leagueId),
          getAllPlayers()
        ]);

        setRosters(rosterData);
        setPlayers(playerData);
      } catch (err) {
        console.error("Error loading Sleeper data:", err);
      }
    }

    loadData();
  }, [season]);

  const updateNumTeams = (val: number) => {
    setNumTeams(val);
    setSelections(Array(val).fill(""));
    setTradeState(
      Array(val)
        .fill(null)
        .map(() => ({
          sending: [],
          receiving: [],
          faabSent: 0,
          faabReceived: 0
        }))
    );
    setShowFaab(Array(val).fill(false));
    setSearchTerms(Array(val).fill(""));
    setPositionFilters(Array(val).fill("ALL"));
  };

  const handleManagerSelect = (index: number, managerId: string) => {
    const newSelections = [...selections];
    newSelections[index] = managerId;
    setSelections(newSelections);
  };

  const getRosterForOwner = (ownerId: string) => {
    return rosters.find((r) => r.owner_id === ownerId);
  };

  const getPlayerBaseValue = (playerId: string): number => {
    const p = players[playerId];
    if (!p) return 0;
    return typeof p.value === "number" ? p.value : 0;
  };

  const getPlayerKeeperCost = (playerId: string): number => {
    const p = players[playerId];
    if (!p) return 0;
    return typeof p.keeper_cost === "number" ? p.keeper_cost : 0;
  };

  const getPlayerSurplus = (playerId: string): number => {
    const value = getPlayerBaseValue(playerId);
    const cost = getPlayerKeeperCost(playerId);
    return value - cost;
  };

  const allPlayersArray = useMemo(() => {
    return Object.entries(players).map(([id, p]) => ({
      id,
      ...p
    }));
  }, [players]);

  const teamSummaries: TeamSummary[] = useMemo(() => {
    const summaries: TeamSummary[] = [];

    for (let i = 0; i < numTeams; i++) {
      const side = tradeState[i];
      const managerId = selections[i] || null;
      const managerName =
        managers.find((m) => m.id === managerId)?.name ?? null;

      let valueSent = 0;
      let valueReceived = 0;
      let keeperSent = 0;
      let keeperReceived = 0;

      side.sending.forEach((pid) => {
        valueSent += getPlayerBaseValue(pid);
        keeperSent += getPlayerKeeperCost(pid);
      });

      side.receiving.forEach((pid) => {
        valueReceived += getPlayerBaseValue(pid);
        keeperReceived += getPlayerKeeperCost(pid);
      });

      const surplusSent = valueSent - keeperSent;
      const surplusReceived = valueReceived - keeperReceived;

      const netValue = valueReceived - valueSent;
      const netSurplus = surplusReceived - surplusSent;

      const faabSent = side.faabSent;
      const faabReceived = side.faabReceived;
      const faabNet = faabReceived - faabSent;

      summaries.push({
        teamIndex: i,
        managerName,
        valueSent,
        valueReceived,
        keeperSent,
        keeperReceived,
        surplusSent,
        surplusReceived,
        netValue,
        netSurplus,
        faabSent,
        faabReceived,
        faabNet
      });
    }

    return summaries;
  }, [numTeams, tradeState, selections, players]);

  const fairnessScore = useMemo(() => {
    if (teamSummaries.length === 0) return null;

    const nets = teamSummaries.map((t) => t.netSurplus + t.faabNet);
    const maxNet = Math.max(...nets);
    const minNet = Math.min(...nets);
    const spread = maxNet - minNet;

    const raw = 100 - spread;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [teamSummaries]);

  const addPlayerToSending = (teamIndex: number, playerId: string) => {
    setTradeState((prev) => {
      const next = [...prev];
      const side = { ...next[teamIndex] };
      if (!side.sending.includes(playerId)) {
        side.sending = [...side.sending, playerId];
      }
      next[teamIndex] = side;
      return next;
    });
  };

  const addPlayerToReceiving = (teamIndex: number, playerId: string) => {
    setTradeState((prev) => {
      const next = [...prev];
      const side = { ...next[teamIndex] };
      if (!side.receiving.includes(playerId)) {
        side.receiving = [...side.receiving, playerId];
      }
      next[teamIndex] = side;
      return next;
    });
  };

  const removePlayerFromSending = (teamIndex: number, playerId: string) => {
    setTradeState((prev) => {
      const next = [...prev];
      const side = { ...next[teamIndex] };
      side.sending = side.sending.filter((id) => id !== playerId);
      next[teamIndex] = side;
      return next;
    });
  };

  const removePlayerFromReceiving = (teamIndex: number, playerId: string) => {
    setTradeState((prev) => {
      const next = [...prev];
      const side = { ...next[teamIndex] };
      side.receiving = side.receiving.filter((id) => id !== playerId);
      next[teamIndex] = side;
      return next;
    });
  };

  const updateFaabSent = (teamIndex: number, value: number) => {
    setTradeState((prev) => {
      const next = [...prev];
      next[teamIndex] = { ...next[teamIndex], faabSent: value };
      return next;
    });
  };

  const updateFaabReceived = (teamIndex: number, value: number) => {
    setTradeState((prev) => {
      const next = [...prev];
      next[teamIndex] = { ...next[teamIndex], faabReceived: value };
      return next;
    });
  };

  const toggleFaabVisibility = (teamIndex: number) => {
    setShowFaab((prev) => {
      const next = [...prev];
      next[teamIndex] = !next[teamIndex];
      return next;
    });
  };

  const clearTeam = (teamIndex: number) => {
    setTradeState((prev) => {
      const next = [...prev];
      next[teamIndex] = {
        sending: [],
        receiving: [],
        faabSent: 0,
        faabReceived: 0
      };
      return next;
    });
    setShowFaab((prev) => {
      const next = [...prev];
      next[teamIndex] = false;
      return next;
    });
  };

  const updateSearchTerm = (teamIndex: number, value: string) => {
    setSearchTerms((prev) => {
      const next = [...prev];
      next[teamIndex] = value;
      return next;
    });
  };

  const updatePositionFilter = (teamIndex: number, value: string) => {
    setPositionFilters((prev) => {
      const next = [...prev];
      next[teamIndex] = value;
      return next;
    });
  };

  const renderPlayerChip = (playerId: string, onRemove: () => void) => {
    const p = players[playerId];
    if (!p) return null;

    return (
      <div
        key={playerId}
        className="flex items-center gap-2 bg-gray-100 dark:bg-black/30 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-200"
      >
        <span>
          {p.full_name || `${p.first_name} ${p.last_name}`} • {p.position} •{" "}
          {p.team}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-300 dark:bg-white/20 text-[9px]"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const positionOptions = ["ALL", "QB", "RB", "WR", "TE", "FLEX", "DST"];

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 relative">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-6 bg-white dark:bg-[#1e1e1e] p-8 rounded-[2.5rem] border dark:border-white/5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-2xl text-orange-600">
            <ArrowRightLeft size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic text-gray-900 dark:text-white leading-none">
              Multi-Team Analyzer
            </h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              Auction Value & Surplus Analysis
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-2 items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
              Mode
            </span>
            <div className="flex rounded-full bg-gray-100 dark:bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode("league")}
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  mode === "league"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "text-gray-500"
                }`}
              >
                League Rosters
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  mode === "custom"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "text-gray-500"
                }`}
              >
                Custom Players
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => updateNumTeams(n)}
                  className={`w-12 h-12 rounded-xl font-black transition-all ${
                    numTeams === n
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 dark:bg-white/5 text-gray-500"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="ml-3 self-center text-[10px] font-black uppercase text-gray-400 tracking-tighter">
                Teams
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsSummaryOpen(true)}
              className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-black"
            >
              View Summary
            </button>
          </div>
        </div>
      </div>

      {/* TEAM TOWERS */}
      <div className={`grid grid-cols-1 md:grid-cols-${numTeams} gap-6`}>
        {Array.from({ length: numTeams }).map((_, idx) => {
          const selectedId = selections[idx] || "";
          const roster =
            mode === "league" && selectedId
              ? getRosterForOwner(selectedId)
              : null;
          const side = tradeState[idx];
          const searchTerm = searchTerms[idx] || "";
          const posFilter = positionFilters[idx] || "ALL";

          const filteredPlayers =
            mode === "custom"
              ? allPlayersArray
                  .filter((p) => {
                    if (posFilter !== "ALL" && p.position !== posFilter) {
                      return false;
                    }
                    if (!searchTerm) return true;
                    const name =
                      p.full_name ||
                      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
                    return name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());
                  })
                  .slice(0, 50)
              : [];

          return (
            <div
              key={idx}
              className="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border dark:border-white/5 shadow-sm overflow-hidden flex flex-col"
            >
              {/* TEAM HEADER */}
              <div className="p-6 border-b dark:border-white/5 bg-gray-50/50 dark:bg-black/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest">
                    Team {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => clearTeam(idx)}
                    className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500"
                  >
                    Clear All
                  </button>
                </div>

                <select
                  className="w-full bg-white dark:bg-[#2c2c2c] text-gray-900 dark:text-white p-4 rounded-2xl font-black text-xs uppercase outline-none ring-2 ring-transparent focus:ring-orange-600 transition-all cursor-pointer"
                  value={selectedId}
                  onChange={(e) => handleManagerSelect(idx, e.target.value)}
                >
                  <option value="">-- Select Owner (Optional) --</option>
                  {managers.map((m) => {
                    const isTaken = selections.some(
                      (id, sIdx) => id === m.id && sIdx !== idx
                    );
                    return (
                      <option key={m.id} value={m.id} disabled={isTaken}>
                        {m.name} {isTaken ? "(Selected)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* BODY */}
              <div className="p-6 flex flex-col gap-6 flex-grow">
                {/* ROSTER / CUSTOM PLAYER PICKER */}
                <div className="border border-dashed dark:border-white/10 rounded-2xl p-4 max-h-64 overflow-y-auto">
                  {mode === "league" && (
                    <>
                      {!selectedId && (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                          <Users size={32} className="mb-2 opacity-40" />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            Awaiting Roster Selection
                          </p>
                        </div>
                      )}

                      {selectedId && !roster && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          No roster found for this owner.
                        </p>
                      )}

                      {selectedId && roster && roster.players?.length === 0 && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          No players on this roster yet.
                        </p>
                      )}

                      {selectedId && roster && roster.players?.length > 0 && (
                        <div className="space-y-3">
                          {roster.players.map((playerId: string) => {
                            const p = players[playerId];
                            if (!p) return null;

                            return (
                              <div
                                key={playerId}
                                className="flex items-center justify-between bg-gray-50 dark:bg.black/20 dark:bg-black/20 p-3 rounded-xl border dark:border-white/5"
                              >
                                <div>
                                  <p className="font-black text-xs uppercase text-gray-900 dark:text-white">
                                    {p.full_name ||
                                      `${p.first_name} ${p.last_name}`}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {p.position} • {p.team}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addPlayerToSending(idx, playerId)
                                    }
                                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-orange-600 text-white"
                                  >
                                    Add to Sending
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addPlayerToReceiving(idx, playerId)
                                    }
                                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-600 text-white"
                                  >
                                    Add to Receiving
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {mode === "custom" && (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 mb-2">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) =>
                            updateSearchTerm(idx, e.target.value)
                          }
                          placeholder="Search players by name..."
                          className="w-full bg-gray-50 dark:bg-black/30 border dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-600"
                        />
                        <div className="flex flex-wrap gap-1">
                          {positionOptions.map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() =>
                                updatePositionFilter(idx, pos)
                              }
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                                posFilter === pos
                                  ? "bg-orange-600 text-white"
                                  : "bg-gray-100 dark:bg-white/5 text-gray-500"
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredPlayers.length === 0 && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          No players match your search.
                        </p>
                      )}

                      {filteredPlayers.length > 0 && (
                        <div className="space-y-2">
                          {filteredPlayers.map((p: any) => {
                            const playerId = p.id;
                            const name =
                              p.full_name ||
                              `${p.first_name ?? ""} ${
                                p.last_name ?? ""
                              }`.trim();
                            return (
                              <div
                                key={playerId}
                                className="flex items-center justify-between bg-gray-50 dark:bg-black/20 p-3 rounded-xl border dark:border-white/5"
                              >
                                <div>
                                  <p className="font-black text-xs uppercase text-gray-900 dark:text-white">
                                    {name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {p.position} • {p.team}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addPlayerToSending(idx, playerId)
                                    }
                                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-orange-600 text-white"
                                  >
                                    Add to Sending
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addPlayerToReceiving(idx, playerId)
                                    }
                                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-600 text-white"
                                  >
                                    Add to Receiving
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TRADE LANES */}
                <div className="space-y-4">
                  {/* SENDING */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                        Sending
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[2rem]">
                      {side.sending.length === 0 && (
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          No players selected.
                        </span>
                      )}
                      {side.sending.map((playerId) =>
                        renderPlayerChip(playerId, () =>
                          removePlayerFromSending(idx, playerId)
                        )
                      )}
                    </div>
                  </div>

                  {/* RECEIVING */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                        Receiving
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[2rem]">
                      {side.receiving.length === 0 && (
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          No players selected.
                        </span>
                      )}
                      {side.receiving.map((playerId) =>
                        renderPlayerChip(playerId, () =>
                          removePlayerFromReceiving(idx, playerId)
                        )
                      )}
                    </div>
                  </div>

                  {/* FAAB TOGGLE + INPUTS */}
                  <div className="mt-2">
                    {!showFaab[idx] && (
                      <button
                        type="button"
                        onClick={() => toggleFaabVisibility(idx)}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                      >
                        + Add FAAB
                      </button>
                    )}

                    {showFaab[idx] && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">
                            FAAB Sent
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={side.faabSent}
                            onChange={(e) =>
                              updateFaabSent(
                                idx,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-full bg-gray-50 dark:bg-black/30 border dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-600"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">
                            FAAB Received
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={side.faabReceived}
                            onChange={(e) =>
                              updateFaabReceived(
                                idx,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-full bg-gray-50 dark:bg-black/30 border dark:border-white/10 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* INLINE TRADE SUMMARY */}
      <div className="mt-10 bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border dark:border-white/5 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Trade Summary
          </h3>
          {fairnessScore !== null && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Fairness Score
              </span>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full ${
                  fairnessScore >= 85
                    ? "bg-emerald-600/10 text-emerald-500"
                    : fairnessScore >= 70
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-red-600/10 text-red-500"
                }`}
              >
                {fairnessScore}/100
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {teamSummaries.map((t) => (
            <div
              key={t.teamIndex}
              className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border dark:border-white/5"
            >
              <div className="mb-2">
                <p className="text-[9px] text-orange-500">
                  Team {t.teamIndex + 1}
                </p>
                <p className="text-[11px] text-gray-900 dark:text-white">
                  {t.managerName || "Unassigned"}
                </p>
              </div>

              <div className="space-y-1">
                <p>
                  Value Sent:{" "}
                  <span className="text-gray-900 dark:text-white">
                    {t.valueSent.toFixed(1)}
                  </span>
                </p>
                <p>
                  Value Received:{" "}
                  <span className="text-gray-900 dark:text-white">
                    {t.valueReceived.toFixed(1)}
                  </span>
                </p>
                <p>
                  Surplus Sent:{" "}
                  <span className="text-gray-900 dark:text-white">
                    {t.surplusSent.toFixed(1)}
                  </span>
                </p>
                <p>
                  Surplus Received:{" "}
                  <span className="text-gray-900 dark:text-white">
                    {t.surplusReceived.toFixed(1)}
                  </span>
                </p>
                <p>
                  Net Surplus:{" "}
                  <span
                    className={
                      t.netSurplus >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    }
                  >
                    {t.netSurplus.toFixed(1)}
                  </span>
                </p>
                <p>
                  FAAB Net:{" "}
                  <span
                    className={
                      t.faabNet >= 0 ? "text-emerald-500" : "text-red-500"
                    }
                  >
                    {t.faabNet}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING SUMMARY BUTTON */}
      <button
        type="button"
        onClick={() => setIsSummaryOpen(true)}
        className="fixed bottom-6 right-6 z-40 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-orange-600 text-white shadow-lg shadow-orange-600/40"
      >
        View Summary
      </button>

      {/* MODAL SUMMARY */}
      <TradeSummaryModal
        open={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        summaries={teamSummaries}
        fairnessScore={fairnessScore}
      />
    </div>
  );
}
