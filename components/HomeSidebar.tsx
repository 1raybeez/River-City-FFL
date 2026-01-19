import React from 'react';
import Image from 'next/image';
import { Trophy, Activity } from 'lucide-react';
import { getChampionDetails } from '@/lib/sleeper';

export default async function HomeSidebar() {
  // Use your actual league ID and the most recently completed season [cite: 2025-01-01]
  const LEAGUE_ID = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID || '896024194098907136'; 
  const SEASON_YEAR = 2025; 

  let champion;
  try {
    // Dynamically fetch the winner of the 2025 campaign
    champion = await getChampionDetails(LEAGUE_ID, SEASON_YEAR); 
  } catch (error) {
    console.error("Failed to fetch champion details:", error);
    // Hardcoded fallback based on your league history [cite: 2025-10-15]
    champion = {
      name: "Aaron Hawkins",
      teamName: "Reigning Champ",
      avatar: "/managers/Aaron.png" 
    };
  }
  
  return (
    <div className="space-y-6">
      {/* REIGNING CHAMPION SECTION */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-[2rem] shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden text-center transition-all">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Reigning Champion</h3>
        </div>
        
        <div className="p-6">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-[#2a2a2a] shadow-lg">
              <Image 
                src={champion.avatar || "/River City FFL Logo.JPG"} 
                alt={champion.name} 
                fill 
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 p-2 rounded-full border-2 border-white dark:border-[#2a2a2a] shadow-md">
              <Trophy size={16} />
            </div>
          </div>
          
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase leading-none">{champion.name}</h2>
          <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-widest">{champion.teamName}</p>
        </div>
      </div>
      
      {/* RECENT MOVES SECTION */}
      <div className="bg-[#0B1527] text-white p-6 rounded-[2rem] shadow-lg border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity size={48} />
        </div>
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <Activity size={18} className="text-blue-400" />
          <h3 className="text-xs font-black uppercase tracking-widest">Recent Moves</h3>
        </div>
        <p className="text-[10px] text-blue-200 uppercase font-bold italic opacity-80 relative z-10">
          Waiver wire tracking will go live once the 2026 league year officially begins.
        </p>
      </div>
    </div>
  );
}