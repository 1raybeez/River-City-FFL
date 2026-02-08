"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, ArrowRightLeft, X, Search, Trash2, Plus, 
  Scale, LayoutGrid, Database, RotateCcw 
} from "lucide-react";
import { getLeagueRosters, getAllPlayers, LEAGUE_ID } from "@/lib/sleeper";
import TradeSummaryModal from "./transactions/TradeSummaryModal";
import { evaluateTrade } from "@/lib/tradeFairnessEngine";

// POSITIONAL BRANDING & SORT ORDER
const POS_ORDER: Record<string, number> = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DEF: 6 };
const POS_COLORS: Record<string, string> = {
  QB: "bg-[#ff2a6d]",
  RB: "bg-[#00ceb8]",
  WR: "bg-[#58a7ff]",
  TE: "bg-[#ffae58]",
  K: "bg-[#bd7af5]",
  DEF: "bg-[#81a1c1]"
};

const managers = [
  { name: "Aaron Hawkins", id: "583513420586848256" },
  { name: "Brian Stevens", id: "343129212162523136" },
  { name: "David Besedich", id: "466663208728391680" },
  { name: "Doug Fordham", id: "73400761740312576" },
  { name: "JD Dowling", id: "342850391018356736" },
  { name: "Jordan & Landon", id: "341412060426436608" },
  { name: "Ray & Jeffrey", id: "342828350391230464" },
  { name: "Rashad Gresham", id: "864186418971418624" },
  { name: "Stan Schoppe", id: "1260048448384667648" },
  { name: "Travis Miller", id: "342831451382841344" },
  { name: "Tommy Moore", id: "342849293037608960" },
  { name: "Wade Cameron", id: "342838548870762496" }
];

export default function TradeAnalyzer() {
  const [mode, setMode] = useState<"league" | "custom">("league");
  const [numTeams, setNumTeams] = useState(2);
  const [selections, setSelections] = useState<string[]>(Array(4).fill(""));
  const [rosters, setRosters] = useState<any[]>([]);
  const [players, setPlayers] = useState<Record<string, any>>({});
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [searchTerms, setSearchTerms] = useState<string[]>(Array(4).fill(""));
  const [tradeState, setTradeState] = useState<any[]>(
    Array(4).fill(null).map(() => ({ sending: [], faabSent: 0 }))
  );

  useEffect(() => {
    async function loadData() {
      // Logic fix: using the current LEAGUE_ID variable for consistency
      const rosterData = await getLeagueRosters(LEAGUE_ID);
      const playerData = await getAllPlayers();
      setRosters(rosterData);
      setPlayers(playerData);
    }
    loadData();
  }, []);

  const allPlayersArray = useMemo(() => Object.values(players), [players]);

  const currentAnalysis = useMemo(() => {
    const sides = tradeState.slice(0, numTeams).map((side, i) => ({
      teamIndex: i,
      faabSent: side.faabSent || 0,
      players: side.sending.map((a: any) => ({
        playerId: a.playerId,
        totalValueScore: players[a.playerId]?.totalValueScore || players[a.playerId]?.value || 0,
        keeperCost: players[a.playerId]?.keeperCost || 0,
        toTeam: a.toTeam,
        pos: players[a.playerId]?.position || "BN"
      }))
    }));
    return evaluateTrade({ sides });
  }, [tradeState, players, numTeams]);

  const addPlayer = (teamIndex: number, playerId: string) => {
    setTradeState((prev) => {
      const next = [...prev];
      if (next[teamIndex].sending.some((a: any) => a.playerId === playerId)) return prev;
      const target = numTeams === 2 ? (teamIndex === 0 ? 1 : 0) : (teamIndex + 1) % numTeams;
      next[teamIndex] = {
        ...next[teamIndex],
        sending: [...next[teamIndex].sending, { playerId, toTeam: target }]
      };
      return next;
    });
  };

  const removePlayer = (teamIndex: number, playerId: string) => {
    setTradeState((prev) => {
      const next = [...prev];
      next[teamIndex] = {
        ...next[teamIndex],
        sending: next[teamIndex].sending.filter((a: any) => a.playerId !== playerId)
      };
      return next;
    });
  };

  const resetAll = () => {
    setTradeState(Array(4).fill(null).map(() => ({ sending: [], faabSent: 0 })));
    setSelections(Array(4).fill(""));
    setSearchTerms(Array(4).fill(""));
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-orange-500/30 pb-40">
      
      <div className="max-w-7xl mx-auto mb-10 pt-6 px-4 text-left">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 p-6 rounded-4xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-600 p-3 rounded-2xl shadow-lg">
              <Scale size={24} />
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Trade <span className="text-orange-500">Analyzer</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex bg-black/40 p-1.5 rounded-3xl border border-white/5">
                <button onClick={() => setMode("league")} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${mode === "league" ? "bg-orange-600" : "text-gray-500"}`}>Rosters</button>
                <button onClick={() => setMode("custom")} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${mode === "custom" ? "bg-orange-600" : "text-gray-500"}`}>Full Pool</button>
             </div>
             <button onClick={resetAll} className="p-3 bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-500 rounded-2xl border border-white/10 transition-all"><RotateCcw size={18} /></button>
          </div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${numTeams} gap-8 px-6`}>
        {Array.from({ length: numTeams }).map((_, idx) => (
          <div key={idx} className="bg-[#1e1e1e] border border-white/10 rounded-4xl overflow-hidden flex flex-col shadow-2xl">
            
            <div className="p-8 bg-black/40 border-b border-white/10 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black uppercase tracking-widest text-nowrap text-orange-500">Team 0{idx + 1}</span>
                   <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      currentAnalysis.teamNetValues[idx] >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                   }`}>
                      {currentAnalysis.teamNetValues[idx] > 0 ? "+" : ""}{currentAnalysis.teamNetValues[idx].toFixed(1)}
                   </span>
                </div>
                <Users size={16} className="text-white/10" />
              </div>
              <select 
                value={selections[idx]}
                onChange={(e) => { const s = [...selections]; s[idx] = e.target.value; setSelections(s); }}
                className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm font-black uppercase text-white outline-none focus:ring-1 focus:ring-orange-500 appearance-none cursor-pointer"
              >
                <option value="">Select Manager</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {/* Standardized max-height classes applied here */}
            <div className="p-8 grow space-y-8 max-h-125 overflow-y-auto custom-scrollbar relative z-40 text-left">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Sending Out</h4>
                <div className="space-y-2">
                  {tradeState[idx].sending.map((asset: any) => (
                    <div key={asset.playerId} className="flex items-center justify-between p-4 bg-[#2a2a2a] border border-white/5 rounded-2xl group">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-5 rounded-sm text-[9px] font-black flex items-center justify-center text-white ${POS_COLORS[players[asset.playerId]?.position] || "bg-gray-600"}`}>
                          {players[asset.playerId]?.position || "BN"}
                        </span>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold uppercase">{players[asset.playerId]?.full_name}</span>
                          <span className="text-[8px] font-black text-gray-500 uppercase">To Team {asset.toTeam + 1}</span>
                        </div>
                      </div>
                      <button onClick={() => removePlayer(idx, asset.playerId)} className="text-gray-500 hover:text-red-500 transition-colors pointer-events-auto relative z-50"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-white/10 relative z-50">
                <div className="relative mb-4">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                   <input 
                     placeholder="Find Asset..." 
                     value={searchTerms[idx]}
                     onChange={(e) => { const s = [...searchTerms]; s[idx] = e.target.value; setSearchTerms(s); }}
                     className="w-full bg-black/80 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-xs font-black uppercase text-white outline-none focus:border-orange-500"
                   />
                </div>
                
                {/* Standardized max-height classes applied here */}
                <div className="space-y-2 max-h-62.5 overflow-y-auto pr-2 custom-scrollbar pointer-events-auto relative z-60">
                  {(mode === "league" ? (rosters.find(r => r.owner_id === selections[idx])?.players || []) : allPlayersArray)
                    ?.map((p: any) => (typeof p === 'string' ? players[p] : p))
                    ?.filter((player: any) => player?.full_name?.toLowerCase().includes(searchTerms[idx].toLowerCase()))
                    .sort((a: any, b: any) => (POS_ORDER[a.position] || 99) - (POS_ORDER[b.position] || 99))
                    .slice(0, 40)
                    .map((player: any) => (
                        <button key={player.player_id} onClick={() => addPlayer(idx, player.player_id)} className="w-full text-left p-4 rounded-2xl bg-[#262626] hover:bg-orange-600/30 border border-white/10 transition-all flex items-center justify-between group cursor-pointer relative z-70">
                          <div className="flex items-center gap-3">
                             <span className={`w-8 h-5 rounded-sm text-[9px] font-black flex items-center justify-center text-white ${POS_COLORS[player.position] || "bg-gray-600"}`}>
                               {player.position}
                             </span>
                             <span className="text-[10px] font-black uppercase text-gray-100 group-hover:text-white">{player.full_name}</span>
                          </div>
                          <Plus size={14} className="text-orange-500" />
                        </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-black/40 border-t border-white/10 text-left">
              <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest block mb-3">FAAB Contribution</span>
              <input 
                type="number" 
                placeholder="$0"
                value={tradeState[idx].faabSent || ""}
                onChange={(e) => { 
                  const next = [...tradeState]; 
                  next[idx].faabSent = Number(e.target.value); 
                  setTradeState(next); 
                }}
                className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-xs font-black text-orange-500 outline-none focus:border-orange-500 transition-all" 
              />
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-100">
        <button 
          onClick={() => setIsSummaryOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-5 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 flex items-center gap-3 transition-all"
        >
          <ArrowRightLeft size={18} /> Analyze Trade
        </button>
      </div>

      <TradeSummaryModal 
        isOpen={isSummaryOpen} 
        onClose={() => setIsSummaryOpen(false)}
        teamSummaries={currentAnalysis.teamNetValues.map((v, i) => ({
           teamName: `Team ${i + 1}`,
           ownerName: managers.find(m => m.id === selections[i])?.name || `Team ${i + 1}`,
           valueSent: tradeState[i].sending.reduce((acc: number, a: any) => acc + (players[a.playerId]?.totalValueScore || players[a.playerId]?.value || 0), 0),
           valueReceived: tradeState.reduce((acc, otherSide) => {
              const receivedFromOther = otherSide.sending.filter((a: any) => a.toTeam === i).reduce((sum: number, a: any) => sum + (players[a.playerId]?.totalValueScore || players[a.playerId]?.value || 0), 0);
              return acc + receivedFromOther;
           }, 0),
           netSurplus: v,
           surplusSent: 0,
           surplusReceived: 0,
           faabNet: 0
        }))} 
        fairnessScore={currentAnalysis.fairnessScore}
        verdict={currentAnalysis.verdict}
      />
    </div>
  );
}