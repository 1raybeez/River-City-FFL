"use client";

import React, { useState } from "react";
import { X, Info, TrendingUp, TrendingDown, Award, CheckCircle2, ShieldAlert, ScrollText } from "lucide-react";

export interface TeamSummary {
  teamName: string;
  ownerName: string;
  valueSent: number;
  valueReceived: number;
  netSurplus: number;
  surplusSent: number;
  surplusReceived: number;
  faabNet: number;
  avatar?: string | null; 
  playersReceived?: { name: string; pos: string; value: number }[];
}

export interface TeamComponentBreakdown {
  deltaTalent: number;
  deltaSurplus: number;
  deltaFaab: number;
  rosterTax: number;
  netValue: number;
}

export interface GlobalComponentSummary {
  imbalanceGap: number;
  biggestWinnerIndex: number;
  biggestLoserIndex: number;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  teamSummaries: TeamSummary[];
  fairnessScore: number | null;
  verdict: string;
  isBlackKnight: boolean;
  components: {
    global: GlobalComponentSummary;
    perTeam: TeamComponentBreakdown[];
  };
};

export default function TradeSummaryModal({
  isOpen,
  onClose,
  teamSummaries,
  fairnessScore,
  verdict,
  isBlackKnight,
  components,
}: Props) {
  const [showLegend, setShowLegend] = useState(false);

  if (!isOpen) return null;

  const { global, perTeam } = components;
  const sealSrc = !isBlackKnight
    ? "/logos/Trade Approval Seal.png"
    : "/logos/Trade Declined Seal.png";

  const getDetailedAnalysis = () => {
    const winner = teamSummaries[global.biggestWinnerIndex];
    const gap = global.imbalanceGap || 0;
    if (isBlackKnight) return `The Black Knight rejects this proposal. ${winner?.teamName || 'The beneficiary'} is extracting roughly ${gap.toFixed(1)} points of uncompensated value.`;
    return `${winner?.teamName || 'One side'} wins the talent acquisition phase, but the other side is likely prioritizing future flexibility. Buddy Jesus sees a path to victory for both sides.`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="bg-[#0f111a] border rounded-[2.5rem] shadow-2xl w-full max-w-4xl mx-4 overflow-hidden relative border-white/10">
        
        <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white z-50">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-10 overflow-y-auto max-h-[90vh] custom-scrollbar">
          
          <div className="flex flex-col md:flex-row items-center gap-8 mb-10 p-6 bg-white/5 rounded-3xl border border-white/5">
            <img src={sealSrc} alt="Verdict" className="w-32 h-32 object-contain rounded-xl" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-xl font-black uppercase tracking-widest ${!isBlackKnight ? "text-green-500" : "text-red-500"}`}>
                  {!isBlackKnight ? "Decree Granted" : "Injunction Issued"}
                </h2>
                <span className="text-xs font-mono bg-black/40 px-3 py-1 rounded-full border border-white/10 text-gray-400">
                  FAIRNESS <span className={!isBlackKnight ? "text-green-400" : "text-red-400"}>{Number(fairnessScore || 0).toFixed(0)}%</span>
                </span>
              </div>
              <div className="flex gap-3 text-gray-200 italic font-medium leading-snug text-sm md:text-base">
                <ScrollText className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                <p>{getDetailedAnalysis()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teamSummaries.map((team, idx) => {
              const comp = perTeam[idx];
              const avatarUrl = team.avatar 
                ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}`
                : `https://sleepercdn.com/images/v2/icons/player_default.webp`;

              return (
                <div key={idx} className="bg-[#161826] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <img 
                          src={avatarUrl} 
                          className="w-12 h-12 rounded-full border-2 border-blue-500/30 object-cover bg-gray-800" 
                          alt="Team Logo" 
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                        />
                        <div>
                          <h3 className="font-bold text-white truncate w-32">{team.teamName}</h3>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">{team.ownerName}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowLegend(true)} className="text-gray-500 hover:text-white"><Info size={18} /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-gray-500 uppercase block mb-1">Net Value</span>
                        <span className={`text-xl font-mono font-bold ${comp.netValue >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {comp.netValue > 0 ? "+" : ""}{comp.netValue.toFixed(1)}
                        </span>
                      </div>
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-gray-500 uppercase block mb-1">Impact Delta</span>
                        <div className="flex items-center justify-center gap-2 font-mono font-bold text-blue-400 text-xl">
                          {team.netSurplus > 0 ? "+" : ""}{team.netSurplus.toFixed(1)}
                          {team.netSurplus >= 0 ? <TrendingUp size={16} className="text-green-500" /> : <TrendingDown size={16} className="text-red-500" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-black/20 flex-1">
                    <h4 className="text-[10px] font-black uppercase text-gray-500 mb-4 flex items-center gap-2 tracking-widest">
                      <Award size={12} /> Roster Receipt (Acquisitions)
                    </h4>
                    
                    <div className="space-y-2 min-h-[80px]">
                      {team.playersReceived && team.playersReceived.length > 0 ? (
                        team.playersReceived.map((p, i) => (
                          <div key={i} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-xs hover:border-blue-500/50 transition-all cursor-help">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded leading-none">{p.pos}</span>
                              <span className="text-gray-200 font-medium">{p.name}</span>
                            </div>
                            <span className="font-mono text-gray-400">+{p.value.toFixed(1)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 opacity-40">
                          <p className="text-[10px] uppercase font-black tracking-tighter">No Players Tracked</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase">Imbalance Gap</p>
                <p className="text-lg font-mono font-bold text-orange-500">{global.imbalanceGap.toFixed(1)}</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase">Biggest Winner</p>
                <p className="text-sm font-bold text-green-400">{teamSummaries[global.biggestWinnerIndex]?.teamName}</p>
              </div>
            </div>
            <button onClick={onClose} className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-[0.2em] rounded-full transition-all shadow-lg">
              Close Verdict
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}