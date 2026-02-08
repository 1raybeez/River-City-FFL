"use client";

import React from "react";
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Scale, 
  TrendingDown, 
  Users 
} from "lucide-react";

export interface TeamSummary {
  teamName: string;
  ownerName: string;
  valueSent: number;
  valueReceived: number;
  netSurplus: number;
  surplusSent: number;
  surplusReceived: number;
  faabNet: number;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  teamSummaries: TeamSummary[];
  fairnessScore: number | null;
  verdict: string;
};

export default function TradeSummaryModal({
  isOpen,
  onClose,
  teamSummaries,
  fairnessScore,
  verdict
}: Props) {
  if (!isOpen) return null;

  const isApproved = fairnessScore !== null && fairnessScore >= 80;
  const sealSrc = isApproved ? "/logos/Trade Approval Seal.png" : "/logos/Trade Declined Seal.png";

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-4xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-orange-500 hover:bg-white/10 transition-all z-210"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh] custom-scrollbar">
          
          <div className="flex flex-col items-center text-center mb-10">
             {fairnessScore !== null && (
               <div className="flex flex-col items-center">
                 <img
                   src={sealSrc}
                   alt={isApproved ? "Approved" : "Declined"}
                   className="w-48 h-48 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                 />
                 <div className={`mt-6 px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border ${
                   isApproved ? "bg-green-600/20 border-green-500 text-green-400" : "bg-red-600/20 border-red-500 text-red-400"
                 }`}>
                   {isApproved ? "DECREE GRANTED" : "DECREE DENIED"}
                 </div>
               </div>
             )}
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mt-6 mb-1 text-white">
              Trade <span className="text-orange-600">Verdict</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-stretch">
            <div className="lg:col-span-1 bg-black/40 p-8 rounded-4xl border border-white/5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Fairness Rating</span>
              <span className={`text-6xl font-black leading-none ${isApproved ? "text-green-500" : "text-orange-500"}`}>
                {fairnessScore?.toFixed(0) || "0"}
              </span>
            </div>

            <div className="lg:col-span-2 flex flex-col justify-center bg-white/2 p-8 rounded-4xl border border-white/5 text-left">
              <div className="flex items-start gap-4 mb-4">
                {isApproved ? <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" /> : <AlertCircle className="w-6 h-6 text-orange-500 shrink-0" />}
                <p className="text-lg font-bold text-white leading-tight">{verdict}</p>
              </div>
              <div className="p-5 bg-black/40 border-l-2 border-orange-600 rounded-r-2xl italic text-gray-400 text-sm">
                "{isApproved ? "By decree of the Assistant to the Commish, this trade shall pass." : "By decree of the Assistant to the Commish, this trade is declined."}"
              </div>
            </div>
          </div>

          <div className="mb-12 text-left">
             <div className="flex items-center gap-3 mb-6">
                <Info size={16} className="text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Analysis Breakdown</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/20 p-5 rounded-3xl border border-white/5">
                   <div className="flex items-center gap-2 mb-2">
                      <Scale size={14} className="text-gray-500" />
                      <span className="text-[9px] font-black uppercase text-gray-400">Talent Gap</span>
                   </div>
                   <p className="text-sm font-black text-white">{fairnessScore && fairnessScore < 60 ? "Significant" : "Stable"}</p>
                </div>
                <div className="bg-black/20 p-5 rounded-3xl border border-white/5">
                   <div className="flex items-center gap-2 mb-2">
                      <TrendingDown size={14} className="text-gray-500" />
                      <span className="text-[9px] font-black uppercase text-gray-400">Roster Tax</span>
                   </div>
                   <p className="text-sm font-black text-white">Applied</p>
                </div>
                <div className="bg-black/20 p-5 rounded-3xl border border-white/5">
                   <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-gray-500" />
                      <span className="text-[9px] font-black uppercase text-gray-400">History</span>
                   </div>
                   <p className={`text-sm font-black ${isApproved ? "text-green-500" : "text-red-500"}`}>{isApproved ? "Standard" : "Anomaly"}</p>
                </div>
             </div>
          </div>

          <div className={`grid gap-6 ${teamSummaries.length > 2 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}>
            {teamSummaries.map((team, idx) => (
              <div key={idx} className="bg-black/40 rounded-3xl p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between text-left">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${team.netSurplus >= 0 ? "bg-green-500" : "bg-red-500/50"}`} />
                <div>
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1">{team.teamName}</h3>
                  <p className="text-xs font-black truncate text-white mb-6">{team.ownerName}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-gray-500 uppercase">Impact</span>
                    <span className={`text-sm font-black ${team.netSurplus >= 0 ? "text-green-500" : "text-red-400"}`}>
                      {team.netSurplus > 0 ? "+" : ""}{team.netSurplus.toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${team.netSurplus >= 0 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min(Math.abs(team.netSurplus) * 3, 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}