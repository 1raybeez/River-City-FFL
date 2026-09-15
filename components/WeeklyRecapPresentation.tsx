import type { WeeklyLeagueRecap } from "@/lib/weeklyRecapPublication";

function points(value: number) {
  return value.toFixed(2);
}

export default function WeeklyRecapPresentation({ recap }: { recap: WeeklyLeagueRecap }) {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-[#071a33] p-6 text-white shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">River City FFL · {recap.season} Week {recap.week}</p>
        <h1 className="mt-3 text-4xl font-black uppercase italic tracking-tight sm:text-6xl">{recap.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/75">{recap.excerpt}</p>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white/50">Week {recap.week} recap</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black uppercase italic">Commissioner&apos;s Take</h2>
        <p className="mt-3 text-base leading-8 text-slate-700">{recap.openingCommissionerTake}</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black uppercase italic">Week {recap.week} Honors</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div><dt className="font-black uppercase tracking-widest text-slate-500">High score</dt><dd className="font-bold">{recap.honors.highScore.teamName} · {points(recap.honors.highScore.points)}</dd></div>
          <div><dt className="font-black uppercase tracking-widest text-slate-500">Low score</dt><dd className="font-bold">{recap.honors.lowScore.teamName} · {points(recap.honors.lowScore.points)}</dd></div>
          <div><dt className="font-black uppercase tracking-widest text-slate-500">Closest game</dt><dd className="font-bold">{recap.honors.closestGame.winner.teamName} over {recap.honors.closestGame.loser.teamName} · {points(recap.honors.closestGame.margin)} margin</dd></div>
          <div><dt className="font-black uppercase tracking-widest text-slate-500">Biggest blowout</dt><dd className="font-bold">{recap.honors.biggestBlowout.winner.teamName} over {recap.honors.biggestBlowout.loser.teamName} · {points(recap.honors.biggestBlowout.margin)} margin</dd></div>
        </dl>
        <p className="mt-5 border-t border-slate-200 pt-4 text-sm leading-7 text-slate-600"><span className="font-black uppercase tracking-widest text-orange-700">Tough luck:</span> {recap.toughLuck}</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black uppercase italic">Scoreboard</h2>
        <div className="mt-4 grid gap-4">{recap.scoreboard.map((game) => <article key={game.matchupId} className="rounded-xl border border-slate-200 p-4"><h3 className="font-black">{game.winner.teamName} {points(game.winner.points)} — {points(game.loser.points)} {game.loser.teamName}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{game.writeup}</p></article>)}</div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black uppercase italic">Early Standings</h2>
        <ol className="mt-4 grid gap-2 text-sm">{recap.standings.map((team, index) => <li key={team.rosterId} className="flex justify-between gap-3 border-b border-slate-100 pb-2"><span><b>{index + 1}. {team.teamName}</b></span><span className="whitespace-nowrap font-bold">{team.record} · {points(team.pf)} PF / {points(team.pa)} PA</span></li>)}</ol>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black uppercase italic">What to Watch in Week {recap.week + 1}</h2>
        <ul className="mt-4 grid gap-3 pl-5 text-sm leading-7 text-slate-700">{recap.weekAhead.map((note) => <li key={note}>{note}</li>)}</ul>
      </section>
    </div>
  );
}
