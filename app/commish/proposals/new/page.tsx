'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from "next-themes";
import { ArrowLeft, Send, Sun, Moon, Monitor, Gavel } from 'lucide-react';

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ managerId: '', section: '', title: '', description: '' });

  useEffect(() => { setMounted(true); }, []);

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

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-600">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/commish/proposals" className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[10px] font-black uppercase italic tracking-tight transition-all hover:text-orange-500 border border-white/10">
            <ArrowLeft size={16} />
            Back to Legislative Hub
          </Link>
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}><Sun size={14} /></button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Moon size={14} /></button>
            <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Monitor size={14} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2 font-black uppercase italic text-xs tracking-tighter">
           <Gavel className="text-orange-600" size={18} /> New Legislation
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 ml-2 italic">Identify Proposer</label>
                <select required className="w-full p-5 rounded-2xl bg-black/40 border border-white/5 font-black uppercase italic text-xs outline-none focus:ring-2 focus:ring-orange-600 transition-all appearance-none cursor-pointer" onChange={(e) => setFormData({...formData, managerId: e.target.value})}>
                    <option value="">-- Verify Identity --</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input required placeholder="Section Ref" className="w-full p-5 rounded-2xl bg-black/40 border border-white/5 font-black uppercase italic text-xs outline-none focus:ring-2 focus:ring-orange-600 transition-all" onChange={(e) => setFormData({...formData, section: e.target.value})} />
                <input required placeholder="Short Title" className="w-full p-5 rounded-2xl bg-black/40 border border-white/5 font-black uppercase italic text-xs outline-none focus:ring-2 focus:ring-orange-600 transition-all" onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </div>
            <textarea required rows={6} placeholder="Detailed rule change..." className="w-full p-6 rounded-[2rem] bg-black/40 border border-white/5 font-medium text-sm outline-none focus:ring-2 focus:ring-orange-600 transition-all leading-relaxed italic" onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-orange-600 text-white py-6 rounded-[2rem] font-black uppercase italic tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl shadow-orange-900/20 hover:scale-[1.02] transition-all disabled:opacity-50">
            {loading ? "Transmitting..." : <><Send size={20} /> Submit to Chamber</>}
          </button>
        </form>
      </main>
    </div>
  );
}
