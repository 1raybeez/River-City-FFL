'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const managers = [
  { name: "Aaron Dogg", id: "583513420586848256" },
  { name: "Brian Stevens", id: "343129212162523136" },
  { name: "David Besedich", id: "466663208728391680" },
  { name: "Doug Fordham", id: "73400761740312576" },
  { name: "JD Dowling", id: "342850391018356736" },
  { name: "Jordan Maslyn", id: "341412060426436608" },
  { name: "Landon Elliott", id: "469199353672626176" },
  { name: "Rashad Gresham", id: "864186418971418624" },
  { name: "Ray Long", id: "342828350391230464" },
  { name: "Stan Schoppe", id: "1260048448384667648" },
  { name: "Tommy Moore", id: "342849293037608960" },
  { name: "Travis Miller", id: "342831451382841344" },
  { name: "Wade Cameron", id: "342838548870762496" }
];

export default function NewProposalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    managerId: '',
    section: '',
    title: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const selectedManager = managers.find(m => m.id === formData.managerId);

    try {
      await addDoc(collection(db, "proposals"), {
        ...formData,
        submittedBy: selectedManager?.name,
        sleeperId: selectedManager?.id,
        status: 'active',
        votes: { yes: [], no: [] },
        createdAt: new Date().toISOString()
      });
      router.push('/commish/proposals');
    } catch (err) {
      console.error(err);
      alert("Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] pb-20">
      <div className="bg-white dark:bg-[#1e1e1e] border-b dark:border-white/5 py-8 sticky top-0 z-50">
        <div className="container mx-auto px-4 text-center relative">
          <Link href="/commish/proposals" className="absolute left-4 top-2 flex items-center gap-2 text-gray-500 font-bold text-xs uppercase">
            <ArrowLeft size={16} /> Cancel
          </Link>
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Submit New Proposal</h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl border dark:border-white/10 shadow-xl">
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Identify Yourself</label>
            <select 
              required
              className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 font-bold outline-none mb-6 border dark:border-white/5"
              onChange={(e) => setFormData({...formData, managerId: e.target.value})}
            >
              <option value="">Select Manager Name</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Constitution Section</label>
            <input 
              required
              placeholder="e.g. Section 4.3 Keepers"
              className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 font-bold outline-none mb-6 border dark:border-white/5"
              onChange={(e) => setFormData({...formData, section: e.target.value})}
            />

            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Rule Title</label>
            <input 
              required
              placeholder="e.g. The Roster Loyalty Rule"
              className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 font-bold outline-none mb-6 border dark:border-white/5"
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />

            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Rule Description</label>
            <textarea 
              required
              rows={4}
              placeholder="Describe the rule change in detail..."
              className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 font-bold outline-none border dark:border-white/5"
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-600 text-white py-5 rounded-3xl font-black uppercase italic tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-orange-700 transition"
          >
            {loading ? "Submitting..." : <><Send size={20} /> Submit for 2026 Meeting</>}
          </button>
        </form>
      </main>
    </div>
  );
}