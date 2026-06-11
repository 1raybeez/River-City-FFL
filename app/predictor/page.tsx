'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BrainCircuit, Loader2, Scale } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';
import { getAllPlayers } from '@/lib/sleeper';

const LEAGUE_ID = "1312149033254416384"; 

interface TeamData {
  rosterId: number;
  name: string;
  avatar: string | null;
  fpts: number;
  wins: number;
  losses: number;
  status: 'Contender' | 'Neutral';
  winProb: number;
  rosterValue: number;
  sos: number;
}

export default function PredictorPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictionData() {
      try {
        setError(null);
        // FIX: Ensuring all response variables are correctly named and captured
        const [usersRes, rostersRes, players] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`),
          fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`),
          getAllPlayers()
        ]);

        if (!usersRes.ok || !rostersRes.ok) {
          throw new Error("Sleeper predictor request failed.");
        }

        const users = await usersRes.json();
        const rosters = await rostersRes.json();
        if (!Array.isArray(users) || !Array.isArray(rosters) || rosters.length === 0) {
          throw new Error("Predictor roster data is unavailable.");
        }

        const userMap: Record<string, any> = {};
        users.forEach((u: any) => {
          userMap[u.user_id] = {
            name: u.metadata?.team_name || u.display_name,
            avatar: u.avatar
          };
        });

        let totalPowerScore = 0;
        const processedTeams: TeamData[] = rosters.map((r: any) => {
          const owner = userMap[r.owner_id] || { name: 'Unknown', avatar: null };
          let totalValue = 0;
          let totalSOS = 0;
          const rosterPlayers = r.players || [];
          
          rosterPlayers.forEach((pId: string) => {
            const p = players[pId];
            totalValue += p?.totalValueScore || 0;
            totalSOS += p?.sosScore || 50; 
          });

          const avgSOS = rosterPlayers.length > 0 ? totalSOS / rosterPlayers.length : 50;
          const powerScore = (totalValue * 0.8) + (avgSOS * 2); 
          totalPowerScore += powerScore;

          return {
            rosterId: r.roster_id,
            name: owner.name,
            avatar: owner.avatar,
            fpts: r.settings.fpts,
            wins: r.settings.wins,
            losses: r.settings.losses,
            status: totalValue > 100 ? 'Contender' : 'Neutral',
            winProb: powerScore,
            rosterValue: totalValue,
            sos: avgSOS
          };
        });

        const finalTeams = processedTeams.map((t: any) => ({
          ...t,
          winProb: totalPowerScore > 0 ? (t.winProb / totalPowerScore) * 100 : 0.0
        })).sort((a: any, b: any) => b.winProb - a.winProb);

        setTeams(finalTeams);
        setLoading(false);
      } catch (error) {
        console.error("Predictor Error:", error);
        setError("Predictor data could not be loaded.");
        setTeams([]);
        setLoading(false);
      }
    }
    fetchPredictionData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6">
	        <Loader2 className="w-12 h-12 animate-spin text-fuchsia-500" />
	        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Loading Preseason Predictor</p>
	    </div>
	  );

  const oddsAreEqual = teams.length > 1 && teams.every(
    (team) => Math.abs(team.winProb - teams[0].winProb) < 0.05
  );
  const valuesAreZero = teams.length > 0 && teams.every((team) => team.rosterValue === 0);
  const isPredictorPlaceholder = teams.length > 0 && (oddsAreEqual || valuesAreZero);

	  return (
	    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20">
      <div className="container mx-auto px-6 pt-10 flex justify-between items-center mb-12">
        <Link href="/" className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-fuchsia-500 transition-all italic">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Home
        </Link>
        <ModeToggle />
      </div>

      <main className="container mx-auto px-6 max-w-5xl">
        <header className="mb-16">
           <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 text-[10px] font-black uppercase tracking-widest mb-6 italic">
              <BrainCircuit size={14} /> Intelligence Dispatch
           </div>
	           <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-4 leading-none">
	              AI <span className="text-fuchsia-600">Championship</span> <br/>Predictor
	           </h1>
	           <p className="text-sm md:text-lg opacity-40 max-w-2xl italic">
	             {isPredictorPlaceholder
	               ? "Preseason placeholder for 2026 outlooks."
	               : "2026 outlook based on available roster value inputs."}
	           </p>
	        </header>

	        {isPredictorPlaceholder && (
	          <div className="mb-8 rounded-[2rem] border border-fuchsia-500/20 bg-fuchsia-500/10 p-5">
	            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-600 dark:text-fuchsia-300">
	              Preseason Placeholder
	            </p>
	            <p className="mt-3 text-sm font-bold leading-relaxed opacity-60">
	              Odds are currently equalized until roster values, projections, and schedule strength are fully wired in.
	            </p>
	          </div>
	        )}

	        {error ? (
	          <div className="rounded-[2rem] border border-red-600/20 bg-red-600/10 p-10 text-center">
	            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">{error}</p>
	            <p className="mx-auto mt-3 max-w-lg text-sm font-bold leading-relaxed opacity-50">
	              Sleeper roster data or player value data is unavailable right now.
	            </p>
	          </div>
	        ) : teams.length === 0 ? (
	          <div className="rounded-[2rem] border border-dashed border-black/10 bg-black/5 p-10 text-center dark:border-white/10 dark:bg-white/5">
	            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Predictor data unavailable.</p>
	            <p className="mx-auto mt-3 max-w-lg text-sm font-bold leading-relaxed opacity-50">
	              No teams were returned for the current preseason predictor.
	            </p>
	          </div>
	        ) : (
	        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
	          <div className="overflow-x-auto custom-scrollbar">
	             <table className="w-full min-w-[760px] text-left border-collapse">
	                <thead className="bg-gray-50 dark:bg-black/40 text-[10px] uppercase font-black text-gray-400 tracking-widest">
	                   <tr>
	                      <th className="px-8 py-6">Rank</th>
	                      <th className="px-8 py-6">Manager</th>
	                      <th className="px-8 py-6 text-center">{isPredictorPlaceholder ? "Placeholder Power" : "Power / SOS"}</th>
	                      <th className="px-8 py-6 text-right">Win Prob</th>
	                   </tr>
	                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                   {teams.map((team, idx) => (
                      <tr key={team.rosterId} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                         <td className="px-8 py-8 font-black italic text-gray-300 text-lg">#{idx + 1}</td>
                         <td className="px-8 py-8">
                            <div className="flex items-center gap-4">
                               <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 shadow-lg group-hover:border-fuchsia-500 transition-colors">
                                  {team.avatar ? (
                                     <Image src={`https://sleepercdn.com/avatars/${team.avatar}`} alt={team.name} fill className="object-cover" unoptimized />
                                  ) : (
                                     <div className="flex items-center justify-center w-full h-full text-xs font-bold text-gray-400 uppercase">RC</div>
                                  )}
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-lg font-black uppercase italic tracking-tighter">{team.name}</span>
                                  <span className="text-[9px] font-black text-fuchsia-500 uppercase tracking-widest">{team.status}</span>
                               </div>
                            </div>
                         </td>
	                         <td className="px-8 py-8">
	                            <div className="flex flex-col items-center gap-1">
	                               <div className="flex items-center gap-2">
	                                  <Scale size={12} className="text-gray-400" />
	                                  <span className="text-xs font-black uppercase">
	                                    Val: {team.rosterValue.toFixed(0)}{isPredictorPlaceholder ? " placeholder" : ""}
	                                  </span>
	                               </div>
	                               <div className="flex items-center gap-2">
	                                  <span className={`text-[10px] font-black uppercase ${team.sos > 60 ? 'text-green-500' : 'text-orange-500'}`}>
	                                     SOS: {team.sos.toFixed(0)}{isPredictorPlaceholder ? " placeholder" : ""}
	                                  </span>
	                               </div>
	                            </div>
                         </td>
                         <td className="px-8 py-8 text-right">
                            <div className="flex flex-col items-end gap-2">
                               <span className="font-black text-xl text-fuchsia-600 dark:text-fuchsia-400 italic">{team.winProb.toFixed(1)}%</span>
                               <div className="w-24 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-fuchsia-600 transition-all duration-1000" 
                                    style={{ width: `${team.winProb * 3}%` }}
                                  />
                               </div>
                            </div>
                         </td>
                      </tr>
	                   ))}
	                </tbody>
	             </table>
	          </div>
	        </div>
	        )}
	      </main>
	    </div>
	  );
}
