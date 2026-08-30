import type { PostDraftTeamAnalysis } from "@/lib/postDraftTeamAnalysis";

export default function PostDraftAnalysisPanels({ analysis }: { analysis: PostDraftTeamAnalysis }) {
  return <>
    <section className="rounded-2xl border border-slate-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#121212]">
      <h2 className="text-xl font-black uppercase italic">Position Strength</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-900/10 text-[10px] uppercase tracking-widest text-slate-500 dark:border-white/10"><th className="px-3 py-2">Position</th><th className="px-3 py-2">River City Rank</th><th className="px-3 py-2">Read</th></tr></thead><tbody>{analysis.positionStrengths.map((row) => <tr key={row.position} className="border-b border-slate-900/5 last:border-0 dark:border-white/5"><td className="px-3 py-3 font-black">{row.position}</td><td className="px-3 py-3 font-black">{row.rank === null ? "UNRANKED" : `#${row.rank}`}</td><td className="px-3 py-3">{row.rank === null ? row.label : <><span className="mr-3 inline-block h-2 w-24 overflow-hidden rounded-full bg-slate-200 align-middle dark:bg-white/10"><span className="block h-full rounded-full bg-orange-500" style={{ width: `${Math.max(8, 100 - ((row.rank - 1) / 11) * 92)}%` }} /></span>{row.label}</>}</td></tr>)}</tbody></table></div>
      <h3 className="mt-6 text-xs font-black uppercase tracking-widest text-slate-500">Expected Starting Context</h3>
      <div className="mt-3 flex flex-wrap gap-2">{analysis.positionStrengths.flatMap((row) => row.starters.map((starter) => <span key={`${row.position}-${starter.playerId}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold dark:bg-white/[0.04]">{row.position} · {starter.playerName} · value {starter.value ?? "N/A"}</span>))}</div>
    </section>
    <section className="rounded-2xl border border-slate-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#121212]"><h2 className="text-xl font-black uppercase italic">Draft Insights</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{analysis.insights.map((insight) => <div key={insight.label} className="rounded-lg bg-slate-50 px-3 py-3 text-sm dark:bg-white/[0.04]"><p className="text-[10px] font-black uppercase tracking-widest text-orange-700">{insight.label}</p><p className="mt-1 font-semibold leading-6">{insight.text}</p></div>)}</div>{analysis.insights.length === 0 && <p className="mt-4 text-sm font-semibold text-slate-500">No additional draft insight is supported by the available data.</p>}</section>
  </>;
}
