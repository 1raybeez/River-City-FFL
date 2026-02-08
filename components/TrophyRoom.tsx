'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Award, 
  User, 
  Loader2 
} from 'lucide-react';
import { getFullLeagueHistory } from '@/lib/sleeper';
import { getManagerDetails } from '@/lib/constants';

export default function TrophyRoomPage() {
    const [fullHistory, setFullHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                // This calls the merged Sleeper API + manual-history.ts logic
                const data = await getFullLeagueHistory();
                setFullHistory(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to load trophy room history:", error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-20">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-orange-600 mb-4" />
                <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.3em]">
                    Syncing League Archives...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {fullHistory.map((season) => {
                // Uses your lib/constants.ts 'Source of Truth'
                const champ = getManagerDetails(season.champion);
                const runnerUp = getManagerDetails(season.runnerUp);
                const thirdPlace = getManagerDetails(season.thirdPlace);

                return (
                    <div 
                        key={`${season.year}-${season.champion}`} 
                        className="group relative bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/5 rounded-[3rem] p-8 sm:p-10 transition-all hover:border-orange-500/50 shadow-xl hover:shadow-2xl overflow-hidden text-left"
                    >
                        {/* Background Year Watermark - Standardized Opacity Classes */}
                        <div className="absolute -right-4 -bottom-10 text-[10rem] font-black text-gray-100 dark:text-white/2 select-none pointer-events-none group-hover:text-gray-200 dark:group-hover:text-white/4 transition-colors leading-none">
                            {season.year}
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                            
                            {/* Year & Badge - Standardized Min-Width */}
                            <div className="text-center min-w-30">
                                <span className="text-5xl font-black text-gray-900 dark:text-white leading-none tracking-tighter">
                                    {season.year}
                                </span>
                                <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mt-3 border inline-block ${
                                    season.leagueName === "River City FFL" 
                                    ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-500/20" 
                                    : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-500 dark:border-white/10"
                                }`}>
                                    {season.leagueName === "River City FFL" ? "RC FFL" : "A10 FFL"}
                                </div>
                            </div>

                            {/* Podium Info - Standardized Grow Class */}
                            <div className="grow text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2 text-orange-600 dark:text-orange-500 font-black uppercase text-[10px] tracking-widest mb-2">
                                    <Crown size={16} /> League Champion
                                </div>
                                <h3 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white mb-6">
                                    {champ.name}
                                </h3>
                                
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 text-xs font-bold text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Medal size={18} className="text-gray-400" /> 
                                        <span className="uppercase text-[10px] tracking-widest text-gray-400">Runner Up</span> 
                                        <span className="text-gray-900 dark:text-gray-200 text-sm">{runnerUp.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Award size={18} className="text-amber-700" /> 
                                        <span className="uppercase text-[10px] tracking-widest text-gray-400">3rd Place</span> 
                                        <span className="text-gray-900 dark:text-gray-200 text-sm">{thirdPlace.name}</span>
                                    </div>
                                </div>
                                
                                {season.notes && (
                                    <div className="mt-6 p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border-l-4 border-orange-600/40">
                                        <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400 italic leading-relaxed">
                                            "{season.notes}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Champion Headshot */}
                            <div className="relative shrink-0">
                                <div className="w-28 h-28 rounded-full border-4 border-white dark:border-[#121212] overflow-hidden bg-gray-100 dark:bg-[#121212] flex items-center justify-center shadow-2xl relative z-20">
                                    {champ.avatar ? (
                                        <Image 
                                            src={champ.avatar} 
                                            alt={champ.name} 
                                            width={112} 
                                            height={112} 
                                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" 
                                            priority
                                            unoptimized
                                        />
                                    ) : (
                                        <User size={50} className="text-gray-300 dark:text-gray-700" />
                                    )}
                                </div>
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-orange-600/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            </div>

                        </div>
                    </div>
                );
            })}
        </div>
    );
}