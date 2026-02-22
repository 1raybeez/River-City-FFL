"use client";

import Image from "next/image";
import { teamColors } from "@/lib/themes/teamColors";
import { contactIcons } from "@/lib/themes/contactIcons";

interface ManagerCardsProps {
  managers: any[];
  isRetired?: boolean;
}

export default function ManagerCards({ managers, isRetired = false }: ManagerCardsProps) {
  
  // 🎨 HELPER: Logic to pick the color based on the score
  const getAggressionColor = (score: number) => {
    if (score >= 8) return "#4ade80"; // Green
    if (score >= 5) return "#facc15"; // Yellow/Orange
    return "#ef4444"; // Red
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {managers.map((m) => {
        // Fallback colors to ensure card visibility
        const colors = teamColors[m.favoriteTeam] || { primary: "#222", secondary: "#444" };

        return (
          <div key={m.shortName} className="relative group perspective-1000 h-[550px] w-full">
            <div className="relative w-full h-full transition-transform duration-700 preserve-3d group-hover:rotate-y-180 shadow-2xl rounded-3xl">
              
              {/* FRONT OF CARD */}
              <div 
                className="absolute inset-0 backface-hidden rounded-3xl p-6 flex flex-col border-2 overflow-hidden z-20 shadow-inner"
                style={{ backgroundColor: colors.primary, borderColor: colors.secondary }}
              >
                {/* FLIP BUTTON OVERLAY */}
                <div className="absolute top-4 right-4 z-30 bg-white/10 p-2.5 rounded-full backdrop-blur-md border border-white/20 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
                  </svg>
                </div>

                {/* LOGO WATERMARK */}
                <div className="absolute inset-0 opacity-[0.05] text-[180px] font-black flex items-center justify-center select-none pointer-events-none uppercase text-white">
                    {m.favoriteTeam}
                </div>

                <div className="relative z-10 h-full flex flex-col text-white">
                  {/* HEADER AREA */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-black/20 flex items-center justify-center shrink-0">
                      {m.photo ? (
                        <Image src={m.photo} alt={m.fullName} width={64} height={64} className="object-cover h-full w-full shadow-lg" />
                      ) : (
                        <span className="text-3xl font-black opacity-40">{m.shortName?.[0]}</span>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h2 className="text-xl font-black tracking-tighter leading-none truncate uppercase italic">{m.teamName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[12px] font-bold text-white/80">{m.fullName}</p>
                        {m.role && (
                          <span className="bg-white text-black text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">
                            {m.role}
                          </span>
                        )}
                      </div>
                      {m.coOwner && <p className="text-[10px] opacity-60 font-bold italic">w/ {m.coOwner.fullName}</p>}
                    </div>
                  </div>

                  {/* KEY STAT PILLS (FRONT) */}
                  <div className={`grid ${isRetired ? 'grid-cols-3' : 'grid-cols-4'} gap-2 mb-8 text-center uppercase`}>
                    {!isRetired && (
                      <div className="bg-white/10 rounded-xl py-2 border border-white/5">
                        <p className="text-[7px] font-bold opacity-50 mb-0.5">Mode</p>
                        <p className="text-[10px] font-black">{m.mode || 'N/A'}</p>
                      </div>
                    )}
                    <div className="bg-white/10 rounded-xl py-2 border border-white/5">
                      <p className="text-[7px] font-bold opacity-50 mb-0.5">Champs</p>
                      <p className="text-[10px] font-black text-yellow-500">🏆 {m.championships ?? 0}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl py-2 border border-white/5">
                      <p className="text-[7px] font-bold opacity-50 mb-0.5">Podiums</p>
                      <p className="text-[10px] font-black">🎖 {m.podiums ?? 0}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl py-2 border border-white/5">
                      <p className="text-[7px] font-bold opacity-50 mb-0.5">Best</p>
                      <p className="text-[10px] font-black">{m.bestFinish || 'N/A'}</p>
                    </div>
                  </div>

                  {/* IDENTITY BOXES GRID */}
                  {!isRetired && (
                    <div className="grid grid-cols-4 gap-2 mb-6">
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-[8px] font-bold opacity-40 uppercase">Contact</span>
                          <div className="w-full h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                            {contactIcons[m.preferredContact] && <Image src={contactIcons[m.preferredContact]} width={22} height={22} alt="icon" />}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-[8px] font-bold opacity-40 uppercase">POS</span>
                          <div className="w-full h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-[11px] font-black uppercase">
                            {m.valuePosition}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-[8px] font-bold opacity-40 uppercase">TEAM</span>
                          <div className="w-full h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-[11px] font-black uppercase">
                            {m.favoriteTeam}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-[8px] font-bold opacity-40 uppercase">Player</span>
                          <div className="w-full h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                            <Image src={`https://sleepercdn.com/content/nfl/players/${m.favoritePlayer}.jpg`} width={32} height={32} alt="p" className="object-cover" />
                          </div>
                        </div>
                    </div>
                  )}

                  {/* RIVAL SECTION */}
                  {!isRetired && (
                    <div className="bg-black/20 rounded-2xl p-3 flex items-center justify-between border border-white/5 mb-3">
                      <span className="text-[9px] font-black opacity-40 tracking-widest uppercase italic">The Rivalry</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black">{m.rival?.name}</span>
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-white/20 bg-black/40">
                          <Image src={m.rival?.image || "/managers/default.png"} width={32} height={32} alt="r" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ⚡ CORRECTED: DYNAMIC SOLID COLOR METER */}
                  {!isRetired && typeof m.tradeAggression === "number" && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black opacity-50 tracking-widest uppercase italic text-white">
                          Trade Aggression
                        </span>
                        <span className="text-[10px] font-black italic text-white">
                          {m.tradeAggression}/10
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-black/30 p-[2px] border border-white/10 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${Math.min(100, (m.tradeAggression / 10) * 100)}%`,
                            backgroundColor: getAggressionColor(m.tradeAggression),
                            boxShadow: m.tradeAggression >= 8 ? '0 0 10px rgba(74, 222, 128, 0.5)' : 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-center text-[10px] italic opacity-80 py-3 border-t border-white/10 mt-auto text-white">
                    "{m.philosophy}"
                  </div>
                </div>
              </div>

              {/* BACK OF CARD */}
              <div 
                className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl p-8 flex flex-col border-2 shadow-2xl overflow-hidden z-10"
                style={{ backgroundColor: colors.secondary, borderColor: colors.primary }}
              >
                <div className="relative z-10 h-full flex flex-col text-white text-left">
                  <h3 className="text-xl font-black mb-8 uppercase tracking-tighter border-b border-white/20 pb-2 italic text-white">Career Snapshot</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-white/5 pb-1 text-sm">
                      <span className="opacity-50 uppercase font-black text-[10px] text-white tracking-widest">All-Time Record</span>
                      <span className="font-black text-xl text-white italic">{m.record || "0-0"}</span>
                    </div>

                    <div className="flex justify-between items-end border-b border-white/5 pb-1 text-sm">
                      <span className="opacity-50 uppercase font-black text-[10px] text-white tracking-widest">Championships</span>
                      <span className="font-black text-xl text-yellow-500 italic">🏆 {m.championships ?? 0}</span>
                    </div>

                    <div className="flex justify-between items-end border-b border-white/5 pb-1 text-sm">
                      <span className="opacity-50 uppercase font-black text-[10px] text-white tracking-widest">Podiums</span>
                      <span className="font-black text-xl text-blue-400 italic">🎖 {m.podiums ?? 0}</span>
                    </div>

                    <div className="flex justify-between items-end border-b border-white/5 pb-1 text-sm">
                      <span className="opacity-50 uppercase font-black text-[10px] text-white tracking-widest">Best Finish</span>
                      <span className="font-black text-xl text-white italic">{m.bestFinish || "N/A"}</span>
                    </div>

                    {/* TOILET BOWL PERSON HIGHLIGHT */}
                    {m.toiletBowls > 0 && (
                      <div className="flex justify-between items-end border-b border-white/5 pb-1 text-sm text-red-500">
                        <span className="opacity-70 uppercase font-black text-[10px] tracking-widest">Toilet Bowls</span>
                        <span className="font-black text-xl italic">💩 {m.toiletBowls}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto">
                    <h4 className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-2 text-white">Manager Bio</h4>
                    <p className="text-[13px] italic leading-relaxed opacity-90 border-l-2 border-white/20 pl-4 font-medium text-white shadow-sm">
                      {m.bio}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}