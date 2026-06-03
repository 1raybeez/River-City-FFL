"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { teamColors } from "@/lib/themes/teamColors";
import { contactIcons } from "@/lib/themes/contactIcons";

interface ManagerCardsProps {
  managers: any[];
  isRetired?: boolean;
}

// Sub-component for individual cards to handle their own flip state
function ManagerCard({ m, isRetired, colors }: { m: any, isRetired: boolean, colors: any }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const showRoleBadge = !isRetired && m.status === "Active" && m.role;
  const RoleIcon = m.role === "Commissioner" ? ShieldCheck : BadgeCheck;

  const getAggressionColor = (score: number) => {
    if (score >= 8) return "#4ade80";
    if (score >= 5) return "#facc15";
    return "#ef4444";
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents conflicts if card is inside another link
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="relative h-[550px] w-full [perspective:1000px]">
      <div 
        className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] shadow-2xl rounded-3xl ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* FRONT OF CARD */}
        <div 
          className="absolute inset-0 [backface-visibility:hidden] -webkit-backface-visibility:hidden rounded-3xl p-6 flex flex-col border-2 overflow-hidden z-20 shadow-inner"
          style={{ backgroundColor: colors.primary, borderColor: colors.secondary }}
        >
          {/* FLIP BUTTON - Now Functional */}
          <button 
            onClick={handleFlip}
            className="absolute top-4 right-4 z-30 bg-white/10 p-2.5 rounded-full backdrop-blur-md border border-white/20 opacity-100 hover:bg-white/20 transition-all cursor-pointer"
            aria-label="Flip Card"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
            </svg>
          </button>

          {/* LOGO WATERMARK */}
          <div className="absolute inset-0 opacity-[0.05] text-[180px] font-black flex items-center justify-center select-none pointer-events-none uppercase text-white">
              {m.favoriteTeam}
          </div>

          <div className="relative z-10 h-full flex flex-col text-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-black/20 flex items-center justify-center shrink-0">
                {m.photo ? (
                  <Image src={m.photo} alt={m.fullName} width={64} height={64} className="object-cover h-full w-full" />
                ) : (
                  <span className="text-3xl font-black opacity-40">{m.shortName?.[0]}</span>
                )}
              </div>
              <div className="overflow-hidden text-left">
                <h2 className="text-xl font-black tracking-tighter leading-none truncate uppercase italic">{m.teamName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[12px] font-bold text-white/80">{m.fullName}</p>
                </div>
                {!isRetired && m.coOwner?.fullName && (
                  <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white/50 truncate">
                    Co-owner: {m.coOwner.fullName}
                  </p>
                )}
                {showRoleBadge && (
                  <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white/80">
                    <RoleIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{m.role}</span>
                  </div>
                )}
              </div>
            </div>

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

            {!isRetired && (
              <div className="grid grid-cols-4 gap-2 mb-6">
                  {['Contact', 'POS', 'TEAM', 'Player'].map((label, idx) => (
                    <div key={idx} className="flex flex-col gap-1 items-center">
                      <span className="text-[8px] font-bold opacity-40 uppercase">{label}</span>
                      <div className="w-full h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                        {idx === 0 && contactIcons[m.preferredContact] && <Image src={contactIcons[m.preferredContact]} width={22} height={22} alt="icon" />}
                        {idx === 1 && <span className="text-[11px] font-black uppercase">{m.valuePosition}</span>}
                        {idx === 2 && <span className="text-[11px] font-black uppercase">{m.favoriteTeam}</span>}
                        {idx === 3 && <Image src={`https://sleepercdn.com/content/nfl/players/${m.favoritePlayer}.jpg`} width={32} height={32} alt="p" className="object-cover" />}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {!isRetired && m.rival && (
              <div className="bg-black/20 rounded-2xl p-3 flex items-center justify-between border border-white/5 mb-3">
                <span className="text-[9px] font-black opacity-40 tracking-widest uppercase italic">The Rivalry</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black">{m.rival.name}</span>
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-white/20 bg-black/40">
                    <Image src={m.rival.image || "/managers/default.png"} width={32} height={32} alt="r" />
                  </div>
                </div>
              </div>
            )}

            {!isRetired && typeof m.tradeAggression === "number" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black opacity-50 tracking-widest uppercase italic text-white">Trade Aggression</span>
                  <span className="text-[10px] font-black italic text-white">{m.tradeAggression}/10</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/30 p-[2px] border border-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${(m.tradeAggression / 10) * 100}%`,
                      backgroundColor: getAggressionColor(m.tradeAggression),
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
          className="absolute inset-0 [backface-visibility:hidden] -webkit-backface-visibility:hidden [transform:rotateY(180deg)] rounded-3xl p-8 flex flex-col border-2 shadow-2xl overflow-hidden z-10"
          style={{ backgroundColor: colors.secondary, borderColor: colors.primary }}
        >
          {/* FLIP BACK BUTTON */}
          <button 
            onClick={handleFlip}
            className="absolute top-4 right-4 z-30 bg-white/10 p-2.5 rounded-full backdrop-blur-md border border-white/20 opacity-100 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
            </svg>
          </button>

          <div className="relative z-10 h-full flex flex-col text-white text-left">
            <h3 className="text-xl font-black mb-6 uppercase border-b border-white/20 pb-2 italic">Career Snapshot</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/5 pb-1">
                <span className="opacity-50 uppercase font-black text-[10px]">All-Time Record</span>
                <span className="font-black text-lg italic">{m.record || "0-0"}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-1">
                <span className="opacity-50 uppercase font-black text-[10px]">Championships</span>
                <span className="font-black text-lg text-yellow-500 italic">🏆 {m.championships ?? 0}</span>
              </div>
              {!isRetired && m.coOwner?.fullName && (
                <div className="flex justify-between items-end border-b border-white/5 pb-1">
                  <span className="opacity-50 uppercase font-black text-[10px]">Co-owner</span>
                  <span className="font-black text-sm italic">{m.coOwner.fullName}</span>
                </div>
              )}
              {showRoleBadge && (
                <div className="flex justify-between items-end border-b border-white/5 pb-1">
                  <span className="opacity-50 uppercase font-black text-[10px]">League Office</span>
                  <span className="inline-flex items-center gap-1.5 font-black text-xs italic">
                    <RoleIcon className="h-3.5 w-3.5" />
                    {m.role}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-auto">
              <h4 className="text-[10px] font-black opacity-40 uppercase mb-2">Manager Bio</h4>
              <p className="text-[13px] italic leading-relaxed opacity-90 border-l-2 border-white/20 pl-4">
                {m.bio}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManagerCards({ managers, isRetired = false }: ManagerCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {managers.map((m) => {
        const colors = teamColors[m.favoriteTeam] || { primary: "#222", secondary: "#444" };
        return <ManagerCard key={m.shortName} m={m} isRetired={isRetired} colors={colors} />;
      })}
    </div>
  );
}
