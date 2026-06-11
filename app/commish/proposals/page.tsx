'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Home, Gavel, Check, X, Lock, Unlock, PlusCircle, Clock, 
  ShieldCheck, Archive
} from 'lucide-react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { ratifyProposal } from "@/lib/legislativeLogic";
import {
  ArchivedProposal,
  getArchiveSession,
  LEGISLATIVE_ARCHIVE_YEARS,
} from "@/lib/legislativeArchive";

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

const CURRENT_LEGISLATIVE_SESSION_YEAR = 2027;
const MEETING_DATE = new Date(`${CURRENT_LEGISLATIVE_SESSION_YEAR}-03-20T20:30:00`);
const VOTING_DEADLINE = new Date(MEETING_DATE.getTime() + 7 * 24 * 60 * 60 * 1000);

export default function ProposalsPage() {
  const [mounted, setMounted] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [now, setNow] = useState(new Date());
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<number>(LEGISLATIVE_ARCHIVE_YEARS[0]);
  const [selectedArchivedProposal, setSelectedArchivedProposal] = useState<ArchivedProposal | null>(null);

  // LOGIC: Voting is open if time is right OR manual override is toggled
  const isVotingOpen = (now >= MEETING_DATE && now <= VOTING_DEADLINE) || isOverrideOpen;
  const isVotingFinished = now > VOTING_DEADLINE && !isOverrideOpen;
  const isPreMeeting = now < MEETING_DATE && !isOverrideOpen;
  const currentSessionProposals = proposals.filter(
    (proposal) => proposal.sessionYear === CURRENT_LEGISLATIVE_SESSION_YEAR
  );
  const activeProposals = currentSessionProposals.filter(
    (proposal) => String(proposal.status ?? "").toLowerCase() === "active"
  );
  const finalizedProposals = currentSessionProposals.filter((proposal) =>
    ["passed", "failed"].includes(String(proposal.status ?? "").toLowerCase())
  );
  const archiveSession = useMemo(() => getArchiveSession(selectedArchiveYear), [selectedArchiveYear]);
  const archivedPassedProposals = archiveSession.proposals.filter((proposal) => proposal.status === "passed");
  const archivedFailedProposals = archiveSession.proposals.filter((proposal) => proposal.status === "failed");
  const archivedOtherProposals = archiveSession.proposals.filter((proposal) =>
    ["tied", "unclear", "informational"].includes(proposal.status)
  );

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

  const finalizeVoting = async () => {
    if (selectedManagerId !== "342828350391230464" || activeProposals.length === 0) return;

    const confirmed = window.confirm(
      `Finalize voting for ${activeProposals.length} active proposal${activeProposals.length === 1 ? "" : "s"}? This will mark proposals as passed or failed.`
    );
    if (!confirmed) return;

    setIsFinalizing(true);
    setFinalizeMessage(null);

    try {
      let passedCount = 0;
      let failedCount = 0;

      for (const proposal of activeProposals) {
        const yesCount = proposal.votes?.yes?.length || 0;
        const noCount = proposal.votes?.no?.length || 0;

        if (yesCount > noCount) {
          const result = await ratifyProposal({
            ...proposal,
            status: "active",
            votes: {
              yes: proposal.votes?.yes ?? [],
              no: proposal.votes?.no ?? [],
            },
          });

          if (!result.success) {
            throw new Error(`Failed to ratify "${proposal.title}".`);
          }

          passedCount++;
        } else {
          await updateDoc(doc(db, "proposals", proposal.id), {
            status: "failed",
          });
          failedCount++;
        }
      }

      setFinalizeMessage({
        type: "success",
        text: `Voting finalized: ${passedCount} passed, ${failedCount} failed.`,
      });
    } catch (error) {
      console.error("Finalize voting failed:", error);
      setFinalizeMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Finalize voting failed.",
      });
    } finally {
      setIsFinalizing(false);
    }
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

  const getProposalStatus = (proposal: any) => {
    const status = String(proposal.status ?? "active").toLowerCase();
    if (status === "passed" || status === "failed") return status;
    return "active";
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "passed") {
      return "border-emerald-600/20 bg-emerald-600/10 text-emerald-600";
    }
    if (status === "failed") {
      return "border-red-600/20 bg-red-600/10 text-red-600";
    }
    if (status === "tied") {
      return "border-blue-600/20 bg-blue-600/10 text-blue-600";
    }
    if (status === "unclear") {
      return "border-yellow-600/20 bg-yellow-600/10 text-yellow-600";
    }
    if (status === "informational") {
      return "border-zinc-500/20 bg-zinc-500/10 text-zinc-500";
    }
    return "border-orange-600/20 bg-orange-600/10 text-orange-600";
  };

  const formatArchiveVoteTotal = (proposal: ArchivedProposal) => {
    const yes = proposal.voteTotals?.yes;
    const no = proposal.voteTotals?.no;
    const absent = proposal.voteTotals?.absent;
    if (typeof yes === "number" && typeof no === "number") {
      return `${yes} Yes / ${no} No${typeof absent === "number" ? ` / ${absent} Absent` : ""}`;
    }
    if (typeof yes === "number") return `${yes} Yes`;
    if (typeof no === "number") return `${no} No`;
    if (proposal.winningOption) return `Winner: ${proposal.winningOption}`;
    return "Vote total unavailable";
  };

  const renderArchivedProposalCard = (proposal: ArchivedProposal) => (
    <button
      key={proposal.id}
      type="button"
      onClick={() => setSelectedArchivedProposal(proposal)}
      className="w-full rounded-[2rem] border border-black/5 bg-black/[0.03] p-6 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-orange-600/30 hover:bg-orange-600/5 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.25em] opacity-40">
            {proposal.section ?? "General Business"}
          </p>
          <h4 className="text-xl font-black uppercase italic leading-none tracking-tighter text-orange-600">
            {proposal.title}
          </h4>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${getStatusBadgeClass(proposal.status)}`}>
          {proposal.status}
        </span>
      </div>
      <p className="mb-5 line-clamp-3 text-sm font-bold leading-relaxed opacity-60">
        {proposal.description}
      </p>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-black/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest opacity-60 dark:bg-white/10">
          {formatArchiveVoteTotal(proposal)}
        </span>
        {proposal.sponsor && (
          <span className="rounded-full bg-black/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest opacity-60 dark:bg-white/10">
            Sponsor: {proposal.sponsor}
          </span>
        )}
        <span className="rounded-full bg-orange-600/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-orange-600">
          Informational archive only
        </span>
      </div>
    </button>
  );

  const renderProposalCard = (prop: any, isActiveProposal: boolean) => {
    const yesCount = prop.votes?.yes?.length || 0;
    const noCount = prop.votes?.no?.length || 0;
    const hasVoted = prop.votes?.yes?.includes(selectedManagerId) || prop.votes?.no?.includes(selectedManagerId);
    const status = getProposalStatus(prop);

    return (
      <div key={prop.id} className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 overflow-hidden shadow-xl">
        <div className="p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-full border-2 border-orange-600 overflow-hidden shrink-0 relative bg-black/20">
                <Image src={prop.managerImage || "/River City FFL Logo.JPG"} alt="Proposer" fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase opacity-40 leading-none block mb-1">{prop.section}</span>
                <p className="font-black uppercase italic tracking-tighter text-lg leading-none truncate">{prop.submittedBy}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${getStatusBadgeClass(status)}`}>
              {status}
            </span>
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-orange-600 italic leading-none">{prop.title}</h3>
          <div className="bg-black/10 dark:bg-black/40 p-6 rounded-3xl border-l-4 border-orange-600 italic text-sm opacity-70 leading-relaxed">{prop.description}</div>
        </div>

        <div className="grid grid-cols-2 border-t border-black/5 dark:border-white/10">
          {!isActiveProposal ? (
            <div className={`col-span-2 py-6 text-center font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 ${
              status === "passed"
                ? "text-emerald-600 bg-emerald-600/10"
                : "text-red-600 bg-red-600/10"
            }`}>
              <Lock size={14} /> Final Tally: {yesCount} Yes / {noCount} No
            </div>
          ) : isPreMeeting ? (
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
              <button onClick={() => handleVote(prop.id, 'yes')} className="py-6 font-black uppercase text-xs text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all border-r border-black/5 dark:border-white/10 italic flex items-center justify-center gap-2"><Check size={18} /> Yes</button>
              <button onClick={() => handleVote(prop.id, 'no')} className="py-6 font-black uppercase text-xs text-red-600 hover:bg-red-600 hover:text-white transition-all italic flex items-center justify-center gap-2"><X size={18} /> No</button>
            </>
          )}
        </div>
      </div>
    );
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
        </div>

        <div className="flex items-center gap-2">
           <Gavel className="text-orange-600 hidden sm:block" size={20} />
           <span className="text-xs font-black uppercase italic tracking-tighter">Legislative Hub</span>
        </div>
      </nav>

      <header className="px-6 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg text-orange-600">
          <Gavel size={28} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
          Legislative <span className="text-orange-600">Hub</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Proposals, Voting & Amendments</p>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.35em] text-orange-600">
          {CURRENT_LEGISLATIVE_SESSION_YEAR} Winter Owners Meeting
        </p>
      </header>

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

        {selectedManagerId === "342828350391230464" && (
          <div className="mb-10 rounded-[2rem] border border-orange-600/20 bg-orange-600/10 p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-orange-600" size={20} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Commissioner Action</p>
                <p className="text-sm font-bold opacity-60">{activeProposals.length} active proposal{activeProposals.length === 1 ? "" : "s"} ready for finalization</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={toggleFloor}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isOverrideOpen ? 'border-red-500 bg-red-600 text-white shadow-lg' : 'border-black/10 bg-black/5 opacity-60 dark:border-white/10 dark:bg-white/5'}`}
              >
                {isOverrideOpen ? <Unlock size={16} /> : <Lock size={16} />}
                {isOverrideOpen ? "Voting Open" : "Open Floor"}
              </button>
              <button
                onClick={finalizeVoting}
                disabled={isFinalizing || activeProposals.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Gavel size={16} />
                {isFinalizing ? "Finalizing..." : "Finalize Voting"}
              </button>
            </div>
          </div>
        )}

        {finalizeMessage && (
          <div className={`mb-10 rounded-2xl border p-4 text-sm font-bold ${
            finalizeMessage.type === "success"
              ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-600"
              : "border-red-600/20 bg-red-600/10 text-red-600"
          }`}>
            {finalizeMessage.text}
          </div>
        )}

        <div className="space-y-10">
          <div className="flex justify-between items-center border-b-2 border-orange-600 pb-2">
               <h2 className="text-2xl font-black uppercase italic tracking-tighter">Active Floor</h2>
               <Link href="/commish/proposals/new" className="p-2 bg-orange-600 text-white rounded-full hover:scale-110 transition shadow-lg"><PlusCircle size={24} /></Link>
          </div>

          {activeProposals.length > 0 ? (
            activeProposals.map((prop) => renderProposalCard(prop, true))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/10 dark:border-white/10 p-10 text-center text-xs font-black uppercase tracking-[0.2em] opacity-30">
              No active proposals currently on the floor.
            </div>
          )}

          {finalizedProposals.length > 0 && (
            <div className="space-y-10 pt-6">
              <div className="border-b-2 border-black/10 dark:border-white/10 pb-2">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Finalized Results</h2>
              </div>
              {finalizedProposals.map((prop) => renderProposalCard(prop, false))}
            </div>
          )}

          <section className="space-y-8 pt-10">
            <div className="flex flex-col gap-5 border-b-2 border-black/10 pb-4 dark:border-white/10 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-orange-600">
                  <Archive size={18} />
                  <p className="text-[10px] font-black uppercase tracking-[0.25em]">Historical Records</p>
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Session Archive</h2>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest opacity-40">Informational archive only</p>
              </div>
              <select
                value={selectedArchiveYear}
                onChange={(event) => setSelectedArchiveYear(Number(event.target.value))}
                className="w-full rounded-2xl border border-black/10 bg-black/5 px-5 py-3 text-xs font-black uppercase outline-none dark:border-white/10 dark:bg-white/5 md:w-48"
              >
                {LEGISLATIVE_ARCHIVE_YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-black/5 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40">Total Proposals</p>
                <p className="mt-2 text-3xl font-black tracking-tighter">{archiveSession.proposals.length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-600/20 bg-emerald-600/10 p-5 text-emerald-600">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-70">Passed</p>
                <p className="mt-2 text-3xl font-black tracking-tighter">{archivedPassedProposals.length}</p>
              </div>
              <div className="rounded-2xl border border-red-600/20 bg-red-600/10 p-5 text-red-600">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-70">Failed</p>
                <p className="mt-2 text-3xl font-black tracking-tighter">{archivedFailedProposals.length}</p>
              </div>
              <div className="rounded-2xl border border-orange-600/20 bg-orange-600/10 p-5 text-orange-600">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-70">Other</p>
                <p className="mt-2 text-3xl font-black tracking-tighter">{archivedOtherProposals.length}</p>
              </div>
            </div>

            {archiveSession.notes && (
              <div className="rounded-2xl border border-orange-600/20 bg-orange-600/10 p-4 text-xs font-bold leading-relaxed text-orange-700 dark:text-orange-400">
                {archiveSession.notes}
              </div>
            )}

            {archiveSession.proposals.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-black/10 p-10 text-center dark:border-white/10">
                <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">No archived proposals digitized for {archiveSession.year}</p>
                <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-relaxed opacity-50">
                  This year is reserved in the Session Archive, but the local Master Archive import does not include proposal-level records yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-emerald-600">Passed Proposals</h3>
                  {archivedPassedProposals.length > 0 ? (
                    archivedPassedProposals.map(renderArchivedProposalCard)
                  ) : (
                    <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-30 dark:border-white/10">
                      No passed proposals recorded
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-red-600">Failed Proposals</h3>
                  {archivedFailedProposals.length > 0 ? (
                    archivedFailedProposals.map(renderArchivedProposalCard)
                  ) : (
                    <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-30 dark:border-white/10">
                      No failed proposals recorded
                    </div>
                  )}
                </div>
                {archivedOtherProposals.length > 0 && (
                  <div className="space-y-4 lg:col-span-2">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-orange-600">Tied, Unclear & Informational Items</h3>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {archivedOtherProposals.map(renderArchivedProposalCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedArchivedProposal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#111] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
                  {selectedArchivedProposal.year} Session Archive
                </p>
                <h3 className="text-3xl font-black uppercase italic leading-none tracking-tighter text-orange-600">
                  {selectedArchivedProposal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArchivedProposal(null)}
                className="rounded-full border border-black/10 bg-black/5 p-2 transition hover:scale-105 dark:border-white/10 dark:bg-white/5"
                aria-label="Close archive proposal details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${getStatusBadgeClass(selectedArchivedProposal.status)}`}>
                {selectedArchivedProposal.status}
              </span>
              <span className="rounded-full bg-black/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest opacity-60 dark:bg-white/10">
                {formatArchiveVoteTotal(selectedArchivedProposal)}
              </span>
              {selectedArchivedProposal.section && (
                <span className="rounded-full bg-black/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest opacity-60 dark:bg-white/10">
                  {selectedArchivedProposal.section}
                </span>
              )}
              {selectedArchivedProposal.sponsor && (
                <span className="rounded-full bg-black/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest opacity-60 dark:bg-white/10">
                  Sponsor: {selectedArchivedProposal.sponsor}
                </span>
              )}
              <span className="rounded-full bg-black/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest opacity-60 dark:bg-white/10">
                Source: {selectedArchivedProposal.sourceFile}
              </span>
              <span className="rounded-full bg-orange-600/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-orange-600">
                Informational archive only
              </span>
            </div>

            <div className="rounded-3xl border-l-4 border-orange-600 bg-black/5 p-6 text-sm font-bold leading-relaxed opacity-75 dark:bg-black/40">
              {selectedArchivedProposal.description}
            </div>

            {selectedArchivedProposal.options && selectedArchivedProposal.options.length > 0 && (
              <div className="mt-6 rounded-2xl border border-black/5 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Recorded Options</p>
                <div className="space-y-2">
                  {selectedArchivedProposal.options.map((option) => (
                    <div key={option.label} className="flex items-start justify-between gap-4 text-xs font-bold">
                      <span className="opacity-60">{option.label}</span>
                      <span className="shrink-0 text-orange-600">{option.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedArchivedProposal.notes && (
              <p className="mt-6 rounded-2xl border border-black/5 bg-black/[0.03] p-4 text-xs font-bold leading-relaxed opacity-60 dark:border-white/10 dark:bg-white/[0.03]">
                {selectedArchivedProposal.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
