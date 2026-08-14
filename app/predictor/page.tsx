'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, Scale, TrendingUp } from 'lucide-react';
import SiteShell from '@/components/SiteShell';
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
    <SiteShell activePath="/predictor">
      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center gap-6 bg-[#f7f8fa] text-slate-950 dark:bg-[#0a0a0a] dark:text-white">
        <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Loading preseason power rankings</p>
      </div>
    </SiteShell>
  );

  const oddsAreEqual = teams.length > 1 && teams.every(
    (team) => Math.abs(team.winProb - teams[0].winProb) < 0.05
  );
  const valuesAreZero = teams.length > 0 && teams.every((team) => team.rosterValue === 0);
  const isPredictorPlaceholder = teams.length > 0 && (oddsAreEqual || valuesAreZero);

	  return (
	    <SiteShell activePath="/predictor">
	      <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 text-slate-950 dark:bg-[#0a0a0a] dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
	        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-orange-600 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
            <ArrowLeft size={14} aria-hidden="true" /> Back to Home
          </Link>
          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600/10 text-orange-600"><TrendingUp size={24} aria-hidden="true" /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Power Rankings</p>
              <h1 className="mt-2 text-4xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">2026 Power Rankings</h1>
              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-600">Preseason roster-strength outlook based on available roster value and schedule-strength inputs.</p>
            </div>
          </div>
        </header>

	        {isPredictorPlaceholder && (
	          <div className="rounded-2xl border border-orange-600/20 bg-orange-600/10 p-5">
	            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-700 dark:text-orange-300">Preseason Placeholder</p>
	            <p className="mt-3 text-sm font-bold leading-relaxed text-slate-700 dark:text-white/70">Normalized outlook values are currently equalized until roster values, projections, and schedule strength are fully wired in. This is not a calibrated matchup win-probability model.</p>
	          </div>
	        )}

	        {error ? (
	          <div className="rounded-2xl border border-red-600/20 bg-red-600/10 p-10 text-center">
	            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">{error}</p>
	            <p className="mx-auto mt-3 max-w-lg text-sm font-bold leading-relaxed opacity-50">
	              Sleeper roster data or player value data is unavailable right now.
	            </p>
	          </div>
	        ) : teams.length === 0 ? (
	          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
	            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Predictor data unavailable.</p>
	            <p className="mx-auto mt-3 max-w-lg text-sm font-bold leading-relaxed opacity-50">
	              No teams were returned for the current preseason predictor.
	            </p>
	          </div>
	        ) : (
	        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
	          <div className="overflow-x-auto custom-scrollbar">
	             <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">2026 preseason power rankings by roster strength and schedule strength</caption>
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:bg-black/40 dark:text-gray-400">
	                   <tr>
	                      <th className="px-8 py-6">Rank</th>
	                      <th className="px-8 py-6">Manager</th>
	                      <th className="px-8 py-6 text-center">{isPredictorPlaceholder ? "Placeholder Power" : "Power / SOS"}</th>
	                      <th className="px-8 py-6 text-right">Normalized Outlook</th>
	                   </tr>
	                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                   {teams.map((team, idx) => (
                      <tr key={team.rosterId} className="group transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                         <td className="px-5 py-6 text-lg font-black italic text-slate-300 sm:px-8 sm:py-8">#{idx + 1}</td>
                         <td className="px-5 py-6 sm:px-8 sm:py-8">
                            <div className="flex items-center gap-4">
                               <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-colors group-hover:border-orange-500 dark:border-white/10">
                                  {team.avatar ? (
                                     <Image src={`https://sleepercdn.com/avatars/${team.avatar}`} alt={team.name} fill className="object-cover" unoptimized />
                                  ) : (
                                     <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-slate-400">RC</div>
                                  )}
                               </div>
                               <div className="flex flex-col">
	                                  <span className="text-lg font-black uppercase italic tracking-tighter">{team.name}</span>
	                                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">{team.status}</span>
                               </div>
                            </div>
                         </td>
	                         <td className="px-5 py-6 sm:px-8 sm:py-8">
	                            <div className="flex flex-col items-center gap-1">
	                               <div className="flex items-center gap-2">
                                  <Scale size={12} className="text-slate-400" aria-hidden="true" />
	                                  <span className="text-xs font-black uppercase">
	                                    Val: {team.rosterValue.toFixed(0)}{isPredictorPlaceholder ? " placeholder" : ""}
	                                  </span>
	                               </div>
	                               <div className="flex items-center gap-2">
                                     <span className={`text-[10px] font-black uppercase ${team.sos > 60 ? 'text-emerald-600' : 'text-orange-600'}`}>
	                                     SOS: {team.sos.toFixed(0)}{isPredictorPlaceholder ? " placeholder" : ""}
	                                  </span>
	                               </div>
	                            </div>
                         </td>
                         <td className="px-5 py-6 text-right sm:px-8 sm:py-8">
                            <div className="flex flex-col items-end gap-2">
                               <span className="text-xl font-black italic text-orange-600 dark:text-orange-400">{team.winProb.toFixed(1)}%</span>
                               <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5" aria-hidden="true">
                                  <div 
                                    className="h-full bg-orange-600 transition-all duration-1000"
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
	        </div>
	      </main>
	    </SiteShell>
	  );
}
