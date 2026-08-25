'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Trophy } from 'lucide-react';
import {
  getCanonicalChampionshipResults,
  getCanonicalHallOfFameResumes,
  getCompletedHistoryResults,
} from '@/lib/history/historyAuthority';
import { ownerProfilesById } from '@/lib/managers/identityData';

const CHAMPIONS = getCanonicalChampionshipResults().flatMap((result) =>
  result.ownerIds.map((ownerId) => ({
    year: result.season,
    name: ownerProfilesById[ownerId]?.fullName ?? ownerId,
    team: result.rawTeamName,
    avatar: ownerProfilesById[ownerId]?.photo ?? null,
    league: 'River City FFL',
  }))
);

const PODIUMS = getCanonicalHallOfFameResumes()
  .filter((resume) => resume.podiumFinishes > 0)
  .sort((first, second) =>
    second.championships - first.championships ||
    second.runnerUpFinishes - first.runnerUpFinishes ||
    second.thirdPlaceFinishes - first.thirdPlaceFinishes ||
    first.manager.localeCompare(second.manager)
  )
  .map((resume, index) => ({
    rank: index + 1,
    name: resume.manager,
    avatar: ownerProfilesById[resume.ownerId]?.photo ?? null,
    gold: resume.championships,
    silver: resume.runnerUpFinishes,
    bronze: resume.thirdPlaceFinishes,
    total: resume.championships + resume.runnerUpFinishes + resume.thirdPlaceFinishes,
  }));

const SHAME = getCompletedHistoryResults()
  .filter((result) => result.finalPlacement === result.teamCount)
  .map((result) => ({
    year: result.season,
    name: result.ownerIds.map((ownerId) => ownerProfilesById[ownerId]?.fullName ?? ownerId).join(' / '),
    avatar: ownerProfilesById[result.ownerIds[0]]?.photo ?? null,
  }))
  .sort((first, second) => second.year - first.year);

export default function TrophyRoomExplorer() {
  const [activeTab, setActiveTab] = useState<'champions' | 'leaderboard' | 'shame'>('champions');

  return <section aria-labelledby="trophy-room-title">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">League Info</p>
      <h2 id="trophy-room-title" className="mt-2 font-sans text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl">River City Trophy Room</h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Champions, podium finishes, and existing league honors from River City FFL history.</p>
    </div>

    <section className="mt-6" aria-labelledby="trophy-categories-title">
      <h3 id="trophy-categories-title" className="sr-only">Trophy Room categories</h3>
      <div className="mb-10 flex justify-center">
        <div role="tablist" aria-label="Trophy Room categories" className="flex max-w-full flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <button type="button" role="tab" id="trophy-tab-champions" aria-selected={activeTab === 'champions'} onClick={() => setActiveTab('champions')} className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 ${activeTab === 'champions' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Champions</button>
          <button type="button" role="tab" id="trophy-tab-leaderboard" aria-selected={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 ${activeTab === 'leaderboard' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Podiums</button>
          <button type="button" role="tab" id="trophy-tab-shame" aria-selected={activeTab === 'shame'} onClick={() => setActiveTab('shame')} className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 ${activeTab === 'shame' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Shame</button>
        </div>
      </div>

      {activeTab === 'champions' && <div role="tabpanel" aria-labelledby="trophy-tab-champions" className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:grid-cols-2 lg:grid-cols-3">
        {CHAMPIONS.map((champ) => <div key={`${champ.year}-${champ.name}`} className="group relative overflow-hidden rounded-[2.5rem] border border-black/5 bg-black/5 shadow-xl transition-all">
          <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600"><div className="absolute -bottom-4 text-8xl font-black italic text-white/20">{champ.year}</div><Trophy className="relative z-10 h-12 w-12 text-white drop-shadow-lg" /></div>
          <div className="relative z-10 -mt-14 p-8 text-center"><div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-black/20 shadow-2xl">{champ.avatar ? <Image src={champ.avatar} alt={champ.name} fill className="object-cover" unoptimized /> : <div className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-500">{champ.name[0]}</div>}</div><h3 className="mt-4 text-3xl font-black italic tracking-tighter uppercase">{champ.year}</h3><p className="mb-4 text-[10px] font-black uppercase tracking-widest text-orange-600">{champ.name}</p><div className="flex flex-col items-center gap-1"><div className="max-w-full truncate rounded-full border border-black/5 bg-black/5 px-4 py-2 text-[10px] font-black italic uppercase tracking-widest opacity-60">{champ.team ?? 'Historical team name unavailable'}</div><span className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] opacity-30">{champ.league}</span></div></div>
        </div>)}
      </div>}

      {activeTab === 'leaderboard' && <div role="tabpanel" aria-labelledby="trophy-tab-leaderboard" className="animate-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm duration-500"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="border-b border-black/5 bg-black/5"><tr className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40"><th className="px-8 py-6">Rank</th><th className="px-8 py-6">Manager</th><th className="px-8 py-6 text-center text-yellow-500">Gold</th><th className="px-8 py-6 text-center opacity-50">Silver</th><th className="px-8 py-6 text-center text-orange-800">Bronze</th><th className="px-8 py-6 text-right">Total</th></tr></thead><tbody className="divide-y divide-black/5">{PODIUMS.map((podium) => <tr key={podium.name} className="group transition-colors hover:bg-black/5"><td className="px-8 py-6 text-xl font-black italic opacity-20 transition-all group-hover:text-orange-600 group-hover:opacity-100">#{podium.rank}</td><td className="px-8 py-6"><div className="flex items-center gap-4"><div className="relative h-10 w-10 overflow-hidden rounded-full border border-black/10 bg-black/20 shadow-md">{podium.avatar ? <Image src={podium.avatar} alt={podium.name} fill className="object-cover" unoptimized /> : <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-500">{podium.name[0]}</div>}</div><span className="font-black italic uppercase tracking-tighter">{podium.name}</span></div></td><td className="px-8 py-6 text-center text-xl font-black text-yellow-600">{podium.gold}</td><td className="px-8 py-6 text-center text-xl font-black opacity-40">{podium.silver}</td><td className="px-8 py-6 text-center text-xl font-black text-orange-800">{podium.bronze}</td><td className="px-8 py-6 text-right text-3xl font-black italic">{podium.total}</td></tr>)}</tbody></table></div></div>}

      {activeTab === 'shame' && <div role="tabpanel" aria-labelledby="trophy-tab-shame" className="animate-in fade-in duration-500"><p className="mb-5 text-center text-sm leading-6 text-slate-600">The final last-place finisher from each completed River City season.</p><div className="grid grid-cols-1 gap-5 text-center min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">{SHAME.map((loser) => <div key={loser.year} className="group flex flex-col items-center rounded-[2.5rem] border border-black/5 bg-black/5 p-8 shadow-xl transition-all hover:border-red-600"><div className="relative mb-6 h-20 w-20 overflow-hidden rounded-full border-2 border-black/5 bg-black/20 grayscale transition-all duration-700 group-hover:grayscale-0">{loser.avatar ? <Image src={loser.avatar} alt={loser.name} fill className="object-cover" unoptimized /> : <div className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-500">{loser.name[0]}</div>}<div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-red-600 text-[10px] text-white shadow-lg">💩</div></div><h3 className="mb-2 text-3xl font-black italic leading-none tracking-tighter">{loser.year}</h3><p className="w-full break-words px-2 text-[10px] font-black uppercase leading-5 tracking-widest opacity-40">{loser.name}</p></div>)}</div></div>}
    </section>
  </section>;
}
