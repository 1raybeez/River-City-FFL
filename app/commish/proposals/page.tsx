'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { 
  Home, Gavel, Check, X, Lock, Unlock, PlusCircle, Clock, 
  Sun, Moon, Monitor, MessageSquare, ShieldCheck
} from 'lucide-react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

const managers = [
  { name: "Aaron Dogg", id: "583513420586848256" },
  { name: "Brian Stevens", id: "343129212162523136" },
  { name: "David Besedich", id: "466663208728391680" },
  { name: "Doug Fordham", id: "73400761740312576" },
  { name: "JD Dowling", id: "342850391018356736" },
  { name: "Jeffrey Hudgins (Co-Owner)", id: "356621920969555968" },
  { name: "Jordan Maslyn", id: "341412060426436608" },
  { name: "Landon Elliott (Co-Owner)", id: "469199353672626176" },
  { name: "Rashad Gresham", id: "864186418971418624" },
  { name: "Ray Long", id: "342828350391230464" },
  { name: "Stan Schoppe", id: "1260048448384667648" },
  { name: "Tommy Moore", id: "342849293037608960" },
  { name: "Travis Miller", id: "342831451382841344" },
  { name: "Wade Cameron", id: "342838548870762496" }
];

const MEETING_DATE = new Date('2026-03-20T20:30:00');
const VOTING_DEADLINE = new Date(MEETING_DATE.getTime() + 7 * 24 * 60 * 60 * 1000);

export default function ProposalsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [now, setNow] = useState(new Date());
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);

  // LOGIC: Voting is open if time is right OR manual override is toggled
  const isVotingOpen = (now >= MEETING_DATE && now <= VOTING_DEADLINE) || isOverrideOpen;
  const isVotingFinished = now > VOTING_DEADLINE && !isOverrideOpen;
  const isPreMeeting = now < MEETING_DATE && !isOverrideOpen;

  useEffect(() => { setMounted(true); }, []);

  // Sync Global Voting Override
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "league_settings", "voting_state"), (doc) => {
      if (doc.exists()) setIsOverrideOpen(doc.data().isOverrideOpen);
    });
    return () => unsub();
  }, []);

  // Sync Proposals
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const unsubscribe = onSnapshot(collection(db, "proposals"), (snapshot) => {
      setProposals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);

  const toggleFloor = async () => {
    if (selectedManagerId !== "342828350391230464") return;
    try {
      await updateDoc(doc(db, "league_settings", "voting_state"), {
        isOverrideOpen: !isOverrideOpen
      });
    } catch (err) { console.error(err); }
  };

  const handleVote = async (proposalId: string, type: 'yes' | 'no') => {
    if (!selectedManagerId || !isVotingOpen) return;
    const coOwnerMap: { [key: string]: string } = {
      "342828350391230464": "356621920969555968",
      "356621920969555968": "342828350391230464",
      "341412060426436608": "469199353672626176",
      "469199353672626176": "341412060426436608"
    };
    const partnerId = coOwnerMap[selectedManagerId];
    const proposalRef = doc(db, "proposals", proposalId);
    const oppType = type === 'yes' ? 'no' : 'yes';

    try {
      await updateDoc(proposalRef, {
        [`votes.${type}`]: arrayUnion(selectedManagerId, ...(partnerId ? [partnerId] : []))
      });
      const proposalSnap = await getDoc(proposalRef);
      const data = proposalSnap.data();
      if (data?.votes?.[oppType]) {
        const cleanedOppVotes = data.votes[oppType].filter((id: string) => id !== selectedManagerId && id !== partnerId);
        await updateDoc(proposalRef, { [`votes.${oppType}`]: cleanedOppVotes });
      }
    } catch (error) { console.error(error); }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-600">
      
      {/* NAVIGATION BAR */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/league-info" className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all">
            <Home size={18} />
          </Link>
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}><Sun size={14} /></button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Moon size={14} /></button>
            <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Monitor size={14} /></button>
          </div>
        </div>

        {selectedManagerId === "342828350391230464" && (
            <button onClick={toggleFloor} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic border transition-all ${isOverrideOpen ? 'bg-red-600 text-white border-red-500 shadow-lg' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-60'}`}>
                {isOverrideOpen ? <Unlock size={14} /> : <Lock size={14} />}
                {isOverrideOpen ? "Voting Open" : "Open Floor"}
            </button>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* IDENTIFICATION BAR */}
        <div className="mb-12 p-1 bg-orange-600 rounded-2xl flex flex-col md:flex-row justify-between items-center shadow-lg">
          <div className="flex items-center gap-3 px-6 py-3 text-white">
             {isVotingOpen ? <Unlock size={18} className="animate-pulse" /> : <Lock size={18} />}
             <p className="font-black text-[10px] uppercase tracking-widest italic">
                {isVotingOpen ? "Floor is Open for Voting" : "Chamber Closed Until Meeting"}
             </p>
          </div>
          <select className="bg-white text-black px-6 py-3 rounded-xl font-black text-xs uppercase w-full md:w-80 outline-none cursor-pointer" value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}>
            <option value="">Verify Identity</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="space-y-10">
          <div className="flex justify-between items-center border-b-2 border-orange-600 pb-2">
               <h2 className="text-2xl font-black uppercase italic tracking-tighter">Active Floor</h2>
               <Link href="/commish/proposals/new" className="p-2 bg-orange-600 text-white rounded-full hover:scale-110 transition shadow-lg"><PlusCircle size={24} /></Link>
          </div>

          {proposals.map((prop) => {
            const yesCount = prop.votes?.yes?.length || 0;
            const noCount = prop.votes?.no?.length || 0;
            const hasVoted = prop.votes?.yes?.includes(selectedManagerId) || prop.votes?.no?.includes(selectedManagerId);

            return (
              <div key={prop.id} className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 overflow-hidden shadow-xl">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-14 w-14 rounded-full border-2 border-orange-600 overflow-hidden shrink-0 relative bg-black/20">
                      <Image src={prop.managerImage || "/River City FFL Logo.JPG"} alt="Proposer" fill className="object-cover" unoptimized />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase opacity-40 leading-none block mb-1">{prop.section}</span>
                      <p className="font-black uppercase italic tracking-tighter text-lg leading-none">{prop.submittedBy}</p>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-orange-600 italic leading-none">{prop.title}</h3>
                  <div className="bg-black/10 dark:bg-black/40 p-6 rounded-3xl border-l-4 border-orange-600 italic text-sm opacity-70 leading-relaxed">{prop.description}</div>
                </div>

                <div className="grid grid-cols-2 border-t border-black/5 dark:border-white/10">
                    {isPreMeeting ? (
                      <div className="col-span-2 py-6 text-center font-black uppercase text-[10px] tracking-[0.3em] opacity-30 bg-black/5 flex items-center justify-center gap-2">
                        <Clock size={14} /> Voting Unlocks {MEETING_DATE.toLocaleDateString()}
                      </div>
                    ) : isVotingFinished ? (
                      <div className="col-span-2 py-6 text-center font-black uppercase text-[10px] tracking-[0.3em] text-orange-600 bg-orange-600/10 flex items-center justify-center gap-2">
                        <Lock size={14} /> Final Tally: {yesCount} Yes / {noCount} No
                      </div>
                    ) : hasVoted ? (
                      <div className="col-span-2 py-6 flex flex-col items-center bg-emerald-600/10 gap-1">
                        <div className="text-emerald-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Check size={14} /> Ballot Recorded ({yesCount} - {noCount})</div>
                        <button onClick={() => handleVote(prop.id, prop.votes?.yes?.includes(selectedManagerId) ? 'no' : 'yes')} className="text-[9px] font-black opacity-30 hover:text-orange-600 uppercase underline transition-all">Change Vote</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => handleVote(prop.id, 'yes')} className="py-6 font-black uppercase text-xs text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all border-r border-black/5 dark:border-white/10 italic flex items-center justify-center gap-2 italic"><Check size={18} /> Yes</button>
                        <button onClick={() => handleVote(prop.id, 'no')} className="py-6 font-black uppercase text-xs text-red-600 hover:bg-red-600 hover:text-white transition-all italic flex items-center justify-center gap-2 italic"><X size={18} /> No</button>
                      </>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}