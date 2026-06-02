'use client';

import React from 'react';
import Image from 'next/image';

// SLEEPER-STYLE FULL CELL COLORS
const POS_COLORS: Record<string, string> = {
  QB: 'bg-[#ff6b8e] text-black',  // Bright Sleeper Pink
  RB: 'bg-[#29bf7f] text-black',  // Sleeper Green
  WR: 'bg-[#40b3ff] text-black',  // Sleeper Blue
  TE: 'bg-[#ffae58] text-black',  // Sleeper Orange
  K:  'bg-[#bd66ff] text-black',  // Sleeper Purple
  DEF:'bg-[#bf944e] text-black',  // Sleeper Brown/Gold
};

interface DraftBoardProps {
  data: any; 
}

export default function DraftBoard({ data }: DraftBoardProps) {
  if (!data) return <div className="text-center py-10 text-gray-500">Loading Draft...</div>;

  const { picks, teams, slot_to_roster, settings } = data;
  const numTeams = settings.teams;
  const numRounds = settings.rounds;

  // Build the Grid
  const grid: any[][] = Array.from({ length: numRounds }, () => Array(numTeams).fill(null));

  picks.forEach((pick: any) => {
    const roundIdx = pick.round - 1;
    const slotIdx = pick.draft_slot - 1;
    if (grid[roundIdx]) {
        grid[roundIdx][slotIdx] = pick;
    }
  });

  return (
    <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
      <table className="min-w-max border-collapse w-full">
        
        {/* --- HEADER ROW (TEAMS) --- */}
        <thead>
          <tr>
            {Array.from({ length: numTeams }).map((_, i) => {
              const slot = i + 1;
              const rosterId = slot_to_roster ? slot_to_roster[slot] : null;
              const teamData = rosterId ? teams[rosterId] : null;
              const teamName = teamData?.name || `Team ${slot}`;
              const teamAvatar = teamData?.avatar;

              return (
                <th key={`head-${i}`} className="p-2 border-b-2 border-gray-200 dark:border-white/10 w-[140px] bg-white dark:bg-[#121212] sticky top-0 z-20">
                  <div className="flex flex-col items-center gap-2 mb-1">
                    <div className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 overflow-hidden shadow-sm">
                        {teamAvatar ? (
                            <Image src={teamAvatar} alt={teamName} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">{teamName.charAt(0)}</div>
                        )}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-gray-900 dark:text-white text-center leading-tight max-w-[120px] line-clamp-2 h-6 flex items-center justify-center">
                        {teamName}
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* --- DRAFT ROUNDS --- */}
        <tbody>
          {grid.map((row, roundIdx) => (
            <tr key={`round-${roundIdx}`}>
              {row.map((pick, colIdx) => {
                if (!pick) {
                  return <td key={`empty-${roundIdx}-${colIdx}`} className="border border-white/20 bg-gray-50/10 h-24 w-[140px]"></td>;
                }

                const pos = pick.metadata.position;
                const colorClass = POS_COLORS[pos] || 'bg-gray-200 text-gray-800'; // Fallback
                const firstName = pick.metadata.first_name;
                const lastName = pick.metadata.last_name;
                const team = pick.metadata.team || "FA";

                return (
                  <td key={pick.pick_no} className={`h-20 w-[140px] p-0.5 border border-white/10 align-top ${colorClass}`}>
                    <div className="h-full w-full relative flex flex-col items-center justify-center">
                      
                      {/* Pick Number (Top Left) */}
                      <div className="absolute top-1 left-1 text-[8px] font-black opacity-50">
                        {pick.round}.{pick.draft_slot < 10 ? `0${pick.draft_slot}` : pick.draft_slot}
                      </div>

                      {/* Player Headshot (Centered) */}
                      <div className="relative w-9 h-9 mb-0.5">
                        <img 
                            src={`https://sleepercdn.com/content/nfl/players/${pick.player_id}.jpg`}
                            alt={lastName}
                            className="w-full h-full object-cover rounded-full border border-black/10 bg-white/20"
                            onError={(e: any) => { e.target.src = "https://sleepercdn.com/images/v2/icons/player_default.webp" }}
                        />
                      </div>

                      {/* Name & Info (Bottom) */}
                      <div className="text-[10px] font-black text-center leading-none px-1 line-clamp-1 w-full truncate">
                        {firstName.charAt(0)}. {lastName}
                      </div>
                      <div className="text-[8px] font-bold opacity-70 uppercase tracking-wide">
                        {pos} • {team}
                      </div>

                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
