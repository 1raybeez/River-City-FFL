'use client';

import { useEffect, useState } from "react";
import Image from 'next/image';
import { 
  Trophy, Wallet, CheckCircle, TrendingUp
} from 'lucide-react';
import { getRosters, getUsers, getWinnersBracket, getMatchups } from "@/lib/sleeper";

// --- CONFIGURATION ---
const LEAGUE_DUES = 50;

const PAYOUTS = {
    highScorer: 10,      // Season-Long High Scorer Prize
    weeklyHighScore: 10, // Weekly High Scorer Prize ($10 x 14 weeks)
    divisionWinner: 25,
    firstPlace: 219,
    secondPlace: 100,
    thirdPlace: 50
};

// Maps (User Name OR Team Name) -> Real Name
const REAL_NAME_MAP: Record<string, string> = {
  "The Mad 'Panda'": "JD Dowling",
  "The Mad Panda": "JD Dowling",
  "MadPanda": "JD Dowling",
  "Nudas Priest": "Aaron Hawkins",
  "ETN' Deez Nutz": "Tommy Moore",
  "Prestigio Mundial": "Ray Long",
  "#FuckTSwift": "Rashad Gresham",
  "Trash Pandas": "Travis Miller",
  "Stanal Fissures": "Stan Schoppe",
  "The Schmendricks": "David Besedich",
  "The Shake-n-Bakers": "Jordan Maslyn",
  "Broken Toe Joe": "Doug Fordham",
  "Carolina Reapers": "Wade Cameron",
  "It's a New Day": "Brian Stevens",
  "Jordan Maslyn": "Jordan Maslyn",
  "Tommy Moore": "Tommy Moore",
  "Ray Long": "Ray Long",
  "Wade Cameron": "Wade Cameron",
  "Stan Schoppe": "Stan Schoppe",
  "Doug Fordham": "Doug Fordham",
  "Travis Miller": "Travis Miller",
  "Brian Stevens": "Brian Stevens",
  "Rashad Gresham": "Rashad Gresham",
  "David Besedich": "David Besedich",
  "JD Dowling": "JD Dowling",
  "Aaron Hawkins": "Aaron Hawkins"
};

// --- TYPES ---
interface FinanceEntry {
    rosterId: number;
    name: string;
    avatar: string | null;
    paid: boolean;
    winnings: number;
    breakdown: string[];
    totalPoints: number;
    divisionWins: number;
    divisionId: number;
}

export default function Treasury() {
  const [financials, setFinancials] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ collected: 0, total: 0, paidCount: 0 });

  useEffect(() => {
    async function calculateWinnings() {
      try {
        // 1. Fetch data safely. Catch errors individually so one failure doesn't break everything.
        const [rosters, users, bracket, ...weeksData] = await Promise.all([
            getRosters().catch((err: any) => { console.error("Rosters error:", err); return []; }),
            getUsers().catch((err: any) => { console.error("Users error:", err); return []; }),
            getWinnersBracket().catch((err: any) => { console.error("Bracket error:", err); return []; }),
            ...Array.from({ length: 14 }, (_, i) => getMatchups(i + 1).catch(() => [])) 
        ]);

        // 2. Map Users
        const ownerMap: any = {};
        const avatarMap: any = {};
        if (Array.isArray(users)) {
            users.forEach((u: any) => { 
                if (u && u.user_id) {
                    ownerMap[u.user_id] = u.display_name;
                    avatarMap[u.user_id] = u.avatar;
                }
            });
        }

        // 3. Init Data (Guard against missing rosters)
        if (!Array.isArray(rosters)) {
            console.error("Rosters data is missing or invalid");
            setLoading(false);
            return;
        }

        const financeData: FinanceEntry[] = rosters.map((roster: any) => {
            const sleeperName = ownerMap[roster.owner_id] || "Unknown";
            const teamName = roster.metadata?.nickname || ""; 
            const avatarId = avatarMap[roster.owner_id];
            const realName = REAL_NAME_MAP[teamName] || REAL_NAME_MAP[sleeperName] || sleeperName;

            // Safe point parsing
            const fpts = roster.settings?.fpts || 0;
            const fptsDecimal = roster.settings?.fpts_decimal || 0;
            const totalPoints = parseFloat(`${fpts}.${fptsDecimal}`);

            return {
                rosterId: roster.roster_id,
                name: realName,
                avatar: avatarId ? `https://sleepercdn.com/avatars/thumbs/${avatarId}` : null,
                paid: true, // Everyone is Paid
                winnings: 0,
                breakdown: [] as string[],
                totalPoints: isNaN(totalPoints) ? 0 : totalPoints,
                divisionWins: roster.settings?.wins || 0,
                divisionId: roster.settings?.division || 0,
            };
        });

        // 4. WEEKLY HIGH SCORERS (Weeks 1-14)
        if (Array.isArray(weeksData)) {
            weeksData.forEach((weekMatchups: any, index) => {
                const weekNum = index + 1;
                // CRITICAL CHECK: Ensure we actually have an array of matchups
                if (!Array.isArray(weekMatchups) || weekMatchups.length === 0) return;

                let highRosterId: number | null = null;
                let highScore = -1;

                weekMatchups.forEach((m: any) => {
                    // Ensure match object exists and has points
                    if (m && typeof m.points === 'number' && m.points > highScore) {
                        highScore = m.points;
                        highRosterId = m.roster_id;
                    }
                });

                if (highRosterId) {
                    const winner = financeData.find((f) => f.rosterId === highRosterId);
                    if (winner) {
                        winner.winnings += PAYOUTS.weeklyHighScore;
                        winner.breakdown.push(`⚡ Week ${weekNum} High: $${PAYOUTS.weeklyHighScore}`);
                    }
                }
            });
        }

        // 5. SEASON HIGH SCORER
        if (financeData.length > 0) {
            // Create a copy to sort safely
            const sortedByPoints = [...financeData].sort((a, b) => b.totalPoints - a.totalPoints);
            const highScorer = sortedByPoints[0];
            if (highScorer) {
                highScorer.winnings += PAYOUTS.highScorer;
                highScorer.breakdown.push(`🏆 Season High Points: $${PAYOUTS.highScorer}`);
            }
        }

        // 6. DIVISION WINNERS
        [1, 2, 3].forEach(divId => {
            const divRosters = financeData.filter((r) => r.divisionId === divId);
            if (divRosters.length > 0) {
                divRosters.sort((a, b) => b.divisionWins - a.divisionWins || b.totalPoints - a.totalPoints);
                if (divRosters[0]) {
                    divRosters[0].winnings += PAYOUTS.divisionWinner;
                    divRosters[0].breakdown.push(`🛡️ Div ${divId} Winner: $${PAYOUTS.divisionWinner}`);
                }
            }
        });

        // 7. BRACKET WINNERS
        if (Array.isArray(bracket) && bracket.length > 0) {
            const champMatch = bracket.find((m: any) => m.p === 1); 
            const thirdMatch = bracket.find((m: any) => m.p === 3); 

            if (champMatch) {
                const winner = financeData.find((f) => f.rosterId === champMatch.w);
                const second = financeData.find((f) => f.rosterId === champMatch.l);
                
                if (winner) {
                    winner.winnings += PAYOUTS.firstPlace;
                    winner.breakdown.push(`🥇 1st Place: $${PAYOUTS.firstPlace}`);
                }
                if (second) {
                    second.winnings += PAYOUTS.secondPlace;
                    second.breakdown.push(`🥈 2nd Place: $${PAYOUTS.secondPlace}`);
                }
            }

            if (thirdMatch) {
                const third = financeData.find((f) => f.rosterId === thirdMatch.w);
                if (third) {
                    third.winnings += PAYOUTS.thirdPlace;
                    third.breakdown.push(`🥉 3rd Place: $${PAYOUTS.thirdPlace}`);
                }
            }
        }

        // 8. SUMMARY
        const paidCount = financeData.filter((f) => f.paid).length;
        setSummary({
            collected: paidCount * LEAGUE_DUES,
            total: financeData.length * LEAGUE_DUES,
            paidCount
        });

        // Sort by Winnings
        financeData.sort((a, b) => b.winnings - a.winnings);

        setFinancials(financeData);
        setLoading(false);

      } catch (error) {
          console.error("Treasury calculation failed:", error);
          setLoading(false);
      }
    }

    calculateWinnings();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">Calculating League Finances...</div>;

  return (
    <div className="space-y-6">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-gray-200 dark:border-white/10 text-center shadow-sm">
            <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Pot</div>
            <div className="text-4xl font-black text-gray-900 dark:text-white flex justify-center items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" /> ${summary.total}
            </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-200 dark:border-green-900/30 text-center shadow-sm">
            <div className="text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-widest mb-1">Collected</div>
            <div className="text-4xl font-black text-green-700 dark:text-green-400 flex justify-center items-center gap-2">
                <Wallet className="w-6 h-6" /> ${summary.collected}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-green-600 dark:text-green-500 mt-2 flex justify-center items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {summary.paidCount}/12 Managers Paid
            </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="bg-gray-50 dark:bg-white/5 px-6 py-3 border-b border-gray-200 dark:border-white/10 font-bold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">
            Manager Ledger
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
            {financials.map((m) => (
                <div key={m.rosterId} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        {/* Status Dot */}
                        <div className={`w-2.5 h-2.5 rounded-full ${m.paid ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                        
                        {/* Avatar */}
                        <div className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-100 dark:border-white/10">
                              {m.avatar ? (
                                  <Image src={m.avatar} alt={m.name} fill className="object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">{m.name.charAt(0)}</div>
                              )}
                        </div>

                        <div>
                            <div className="font-bold text-gray-900 dark:text-white text-sm">{m.name}</div>
                            <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5">
                                {m.paid ? <span className="text-green-600 dark:text-green-400">PAID</span> : <span className="text-red-500">OWES DUES</span>}
                            </div>
                        </div>
                    </div>
                    
                    {/* Winnings */}
                    <div className="text-right">
                        {m.winnings > 0 ? (
                            <div>
                                <span className="text-green-600 dark:text-green-400 font-black text-lg block flex items-center justify-end gap-1">
                                    <TrendingUp className="w-4 h-4" /> +${m.winnings}
                                </span>
                                <div className="flex flex-col items-end">
                                    {m.breakdown.map((b, i) => (
                                        <div key={i} className="text-[9px] text-gray-400 uppercase tracking-wide font-medium">{b}</div>
                                    ))}
                                </div>
                            </div>
                        ) : <span className="text-gray-300 dark:text-gray-600 text-xs font-medium">No winnings yet</span>}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
