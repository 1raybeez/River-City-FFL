'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Gavel } from 'lucide-react';
import SiteShell from '@/components/SiteShell';

const managers = [
  { name: "Aaron Dogg", id: "583513420586848256", img: "Aaron.png" },
  { name: "Brian Stevens", id: "343129212162523136", img: "Brian.png" },
  { name: "David Besedich", id: "466663208728391680", img: "Dave.png" },
  { name: "Doug Fordham", id: "73400761740312576", img: "Doug.jpg" },
  { name: "JD Dowling", id: "342850391018356736", img: "JD.png" },
  { name: "Jeffrey Hudgins", id: "356621920969555968", img: "Ray.png" },
  { name: "Jordan Maslyn", id: "341412060426436608", img: "Jordan.jpg" },
  { name: "Landon Elliott", id: "469199353672626176", img: "Landon.png" },
  { name: "Rashad Gresham", id: "864186418971418624", img: "Rashad.png" },
  { name: "Ray Long", id: "342828350391230464", img: "Ray.png" },
  { name: "Stan Schoppe", id: "1260048448384667648", img: "Stan.jpg" },
  { name: "Tommy Moore", id: "342849293037608960", img: "Tommy.png" },
  { name: "Travis Miller", id: "342831451382841344", img: "Travis.png" },
  { name: "Wade Cameron", id: "342838548870762496", img: "Wade.png" }
];

export default function NewProposalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ managerId: '', section: '', title: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/commish/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Submission failed.");
      }
      router.push('/commish/proposals');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell activePath="/commish">
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 text-slate-950 dark:bg-[#0a0a0a] dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <Link href="/commish/proposals" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-orange-600 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
              <ArrowLeft size={14} aria-hidden="true" /> Back to Legislative Hub
            </Link>
            <div className="mt-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600/10 text-orange-600"><Gavel size={24} aria-hidden="true" /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Commissioner Hub</p>
                <h1 className="mt-2 text-4xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">New Proposal</h1>
                <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-600">Create a legislative proposal for the active River City session.</p>
              </div>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div>
                <label htmlFor="proposal-proposer" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">Identify Proposer</label>
                <select id="proposal-proposer" required aria-label="Verify proposer identity" className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-black uppercase outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20" onChange={(e) => setFormData({...formData, managerId: e.target.value})}>
                    <option value="">-- Verify Identity --</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div><label htmlFor="proposal-section" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">Section reference</label><input id="proposal-section" required placeholder="Section Ref" className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-black outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20" onChange={(e) => setFormData({...formData, section: e.target.value})} /></div>
                <div><label htmlFor="proposal-title" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">Short title</label><input id="proposal-title" required placeholder="Short Title" className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-black outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20" onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
            </div>
            <div className="mt-6"><label htmlFor="proposal-description" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-600">Detailed rule change</label><textarea id="proposal-description" required rows={8} placeholder="Detailed rule change..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm leading-7 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20" onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
          </div>
          <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-orange-600 px-5 py-3 font-black uppercase italic tracking-[0.15em] text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Transmitting..." : <><Send size={20} /> Submit to Chamber</>}
          </button>
        </form>
        </div>
      </main>
    </SiteShell>
  );
}
