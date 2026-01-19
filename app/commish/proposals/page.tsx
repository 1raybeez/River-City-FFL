'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gavel, Check, X, ArrowLeft, Lock, PlusCircle, Clock } from 'lucide-react';
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
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [now, setNow] = useState(new Date());

  const isVotingOpen = now >= MEETING_DATE && now <= VOTING_DEADLINE;
  const isVotingFinished = now > VOTING_DEADLINE;
  const isPreMeeting = now < MEETING_DATE;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const unsubscribe = onSnapshot(collection(db, "proposals"), (snapshot) => {
      setProposals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] pb-20 font-sans">
      <div className="bg-white dark:bg-[#1e1e1e] border-b dark:border-white/5 py-8 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 text-center relative text-gray-900 dark:text-white">
          <Link href="/league-info" className="absolute left-4 top-2 flex items-center gap-2 text-gray-500 font-bold text-xs uppercase italic tracking-tighter hover:text-orange-600 transition-colors">
            <ArrowLeft size={16} /> Hub
          </Link>
          <h1 className="text-xl md:text-2xl font-black uppercase italic flex items-center justify-center gap-3">
            <Gavel className="text-orange-600" /> 2026 Legislative Hub
          </h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-10 p-6 bg-orange-600 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <Lock size={20} className={isVotingOpen ? "animate-pulse" : ""} />
             <p className="font-black text-xs uppercase tracking-widest italic">Manager Identification Required</p>
          </div>
          <select 
            className="bg-white text-gray-900 px-6 py-3 rounded-2xl font-black text-xs uppercase w-full md:w-72 outline-none"
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
          >
            <option value="">-- Verify Identity --</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        {!selectedManagerId ? (
          <div className="text-center py-20 bg-white dark:bg-[#1e1e1e] rounded-[3rem] border-2 border-dashed dark:border-white/5">
             <Lock size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
             <p className="font-black uppercase text-gray-400 text-sm tracking-widest">Select Identity to View Proposals</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-black uppercase italic tracking-tight underline decoration-orange-500 decoration-4 underline-offset-8 text-gray-900 dark:text-white">Active 2026 Ballot</h2>
               <Link href="/commish/proposals/new" className="bg-orange-600 text-white p-3 rounded-full hover:scale-110 transition shadow-lg"><PlusCircle size={24} /></Link>
            </div>

            {proposals.map((prop) => {
              const hasVotedYes = prop.votes?.yes?.includes(selectedManagerId);
              const hasVotedNo = prop.votes?.no?.includes(selectedManagerId);
              const hasVoted = hasVotedYes || hasVotedNo;
              const yesCount = prop.votes?.yes?.length || 0;
              const noCount = prop.votes?.no?.length || 0;
              const isRatified = yesCount >= 7;

              return (
                <div key={prop.id} className={`bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border transition-all ${isRatified ? 'border-emerald-500 shadow-emerald-500/10' : 'dark:border-white/10 shadow-sm'}`}>
                  <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-14 w-14 rounded-full border-2 border-orange-600 overflow-hidden shrink-0 shadow-md">
                        <img 
                          src={`https://sleepercdn.com/avatars/thumbs/${prop.sleeperId}`} 
                          alt="Proposer" 
                          onError={(e) => { (e.target as HTMLImageElement).src = "/River City FFL Logo.JPG"; }}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{prop.section}</span>
                        <p className="font-black uppercase text-gray-900 dark:text-white leading-none">{prop.submittedBy}</p>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-black uppercase mb-4 tracking-tighter leading-tight text-gray-900 dark:text-white">{prop.title}</h3>
                    
                    {/* NEW: Clickable Description Parser */}
                    <div className="bg-gray-50 dark:bg-black/20 p-5 rounded-3xl border-l-4 border-orange-600 italic text-sm text-gray-600 dark:text-gray-400">
                      {prop.description.split(/(https?:\/\/[^\s]+)/g).map((part: string, i: number) => (
                        part.match(/^https?:\/\//) ? (
                          <a 
                            key={i} 
                            href={part} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-orange-600 underline break-all font-bold hover:text-orange-500 transition-colors"
                          >
                            {part}
                          </a>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-t dark:border-white/5">
                    {isPreMeeting ? (
                      <div className="col-span-2 py-6 text-center font-black uppercase text-[10px] tracking-widest text-gray-400 bg-gray-50 dark:bg-white/5 flex items-center justify-center gap-2">
                        <Clock size={16} /> Voting Unlocks {MEETING_DATE.toLocaleDateString()}
                      </div>
                    ) : isVotingFinished ? (
                      <div className="col-span-2 py-6 text-center font-black uppercase text-[10px] tracking-widest text-orange-600 bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center gap-2">
                        <Lock size={16} /> Final Tally: {yesCount} Yes / {noCount} No
                      </div>
                    ) : hasVoted ? (
                      <div className="col-span-2 py-4 flex flex-col items-center bg-emerald-50 dark:bg-emerald-900/10 gap-1">
                        <div className="text-emerald-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                          <Check size={14} /> Team Ballot Recorded ({yesCount} - {noCount})
                        </div>
                        <button 
                          onClick={() => handleVote(prop.id, hasVotedYes ? 'no' : 'yes')}
                          className="text-[9px] font-bold text-gray-400 hover:text-orange-600 uppercase underline underline-offset-2"
                        >
                          Flip Vote to {hasVotedYes ? 'No' : 'Yes'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => handleVote(prop.id, 'yes')} className="py-5 font-black uppercase text-xs text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border-r dark:border-white/5 flex items-center justify-center gap-2">
                           <Check size={18} /> Yes
                        </button>
                        <button onClick={() => handleVote(prop.id, 'no')} className="py-5 font-black uppercase text-xs text-red-600 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                           <X size={18} /> No
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}