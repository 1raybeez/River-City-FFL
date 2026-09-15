import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import { listPublishedWeeklyRecaps } from "@/lib/weeklyRecapPublication";

export const dynamic = "force-dynamic";

export default async function WeeklyRecapArchivePage() {
  const recaps = await listPublishedWeeklyRecaps(2026);
  return <SiteShell activePath="/league-info"><main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><header className="rounded-3xl bg-[#071a33] p-6 text-white sm:p-10"><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">River City FFL · archive</p><h1 className="mt-3 text-4xl font-black uppercase italic tracking-tight sm:text-6xl">Weekly Recaps</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-white/75">Commissioner recaps from the 2026 season.</p></header>{recaps.length === 0 ? <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h2 className="text-2xl font-black uppercase italic">No weekly recaps published yet</h2><p className="mt-3 text-sm leading-7 text-slate-600">Published weekly recaps will appear here after explicit commissioner approval.</p></section> : <section className="grid gap-4">{recaps.map((recap) => <Link key={recap.publicationId} href={`/league-info/recaps/${recap.season}/week/${recap.week}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-orange-500"><p className="text-xs font-black uppercase tracking-widest text-orange-700">Week {recap.week}</p><h2 className="mt-2 text-2xl font-black uppercase italic">{recap.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{recap.excerpt}</p></Link>)}</section>}</main></SiteShell>;
}
