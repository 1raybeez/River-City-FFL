'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Gavel, Info, ThumbsDown, ThumbsUp } from 'lucide-react';
import SiteShell from '@/components/SiteShell';
import type { NormalizedLegislativeRecord } from '@/lib/legislativeReadModel';

type State = {
  sessionYear: number;
  sessionPhase: 'COLLECTING' | 'ANNUAL_VOTING' | 'INTERIM' | 'CLOSED';
  sessionSource: 'persisted' | 'legacy-fallback';
  meetingDate?: string | null;
  annualVotingOpensAt?: string | null;
  votingDeadline?: string | null;
  isVotingOpen: boolean;
  authenticatedOwner: boolean;
  eligibleVoteCount: number;
  voteNow: NormalizedLegislativeRecord[];
  currentBusiness: NormalizedLegislativeRecord[];
  recentResults: NormalizedLegislativeRecord[];
  historicalRecords: NormalizedLegislativeRecord[];
  archiveYears: number[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-US', { dateStyle: 'long' });
}

function phaseLabel(phase: State['sessionPhase']) {
  return phase === 'ANNUAL_VOTING'
    ? 'Annual voting'
    : phase === 'INTERIM'
      ? 'Interim business'
      : phase === 'CLOSED'
        ? 'Cycle closed'
        : 'Collecting proposals';
}

function statusLabel(status: NormalizedLegislativeRecord['status']) {
  return status === 'tied' ? 'Tied / unresolved' : status.charAt(0).toUpperCase() + status.slice(1);
}

function voteCountLabel(record: NormalizedLegislativeRecord) {
  if (record.yesVotes === null || record.noVotes === null) return 'Vote total unavailable';
  return `${record.yesVotes} Yes · ${record.noVotes} No`;
}

function ProposalCard({
  record,
  canVote,
  busy,
  onVote,
}: {
  record: NormalizedLegislativeRecord;
  canVote?: boolean;
  busy?: boolean;
  onVote?: (vote: 'yes' | 'no') => void;
}) {
  const isActive = record.status === 'active';
  const isPassed = record.status === 'passed';
  const isFailed = record.status === 'failed';
  const isTied = record.status === 'tied';
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">
            {record.sectionLabel ?? 'General business'} · {record.sessionYear ?? 'Session unavailable'}
          </p>
          <h3 className="mt-2 break-words text-xl font-black italic uppercase tracking-tight text-slate-950">
            {record.title || 'Untitled proposal'}
          </h3>
          {record.proposer && <p className="mt-2 text-xs font-bold text-slate-500">Proposed by {record.proposer}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
          isPassed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
          isFailed ? 'border-rose-200 bg-rose-50 text-rose-700' :
          isTied ? 'border-blue-200 bg-blue-50 text-blue-700' :
          'border-orange-200 bg-orange-50 text-orange-700'
        }`}>
          {statusLabel(record.status)}
        </span>
      </div>

      {record.summary && <p className="mt-4 text-sm leading-7 text-slate-700">{record.summary}</p>}
      {record.description && record.description !== record.summary && (
        <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">Show full proposal</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{record.description}</p>
        </details>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500" aria-live="polite">
        <span>{voteCountLabel(record)}</span>
        {record.resultSourceLabel && <span>Vote recorded via {record.resultSourceLabel}</span>}
        {record.viewerVote && <span className="text-orange-700">Your vote: {record.viewerVote.toUpperCase()}</span>}
        {record.allEligibleVotesCast && isActive && <span className="text-blue-700">All 12 votes received.</span>}
      </div>

      {record.readyForCommissionerFinalization && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700" role="status">Ready for commissioner finalization.</p>}
      {record.allEligibleVotesCast && isTied && <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700" role="status">All 12 votes received — tied / unresolved.</p>}
      {isPassed && <p className="mt-3 text-xs font-bold text-emerald-700">{record.currentRuleHref ? 'Constitution amended through the approved ratification process.' : 'Approved by league vote.'}</p>}
      {isFailed && <p className="mt-3 text-xs font-bold text-rose-700">Constitution was not changed.</p>}
      {isTied && <p className="mt-3 text-xs font-bold text-blue-700">Further discussion or a future vote may occur. Constitution was not changed.</p>}

      {(record.currentRuleHref || record.amendmentHistoryHref) && <div className="mt-4 flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest">
        {record.currentRuleHref && <Link href={record.currentRuleHref} className="min-h-10 text-orange-700 underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">View current rule</Link>}
        {record.amendmentHistoryHref && <Link href={record.amendmentHistoryHref} className="min-h-10 text-slate-700 underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700">View amendment history</Link>}
      </div>}

      {canVote && onVote && <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => onVote('yes')} disabled={busy} aria-pressed={record.viewerVote === 'yes'} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"><ThumbsUp size={14} aria-hidden="true" /> {record.viewerVote ? 'Change to Yes' : 'Vote Yes'}</button>
        <button type="button" onClick={() => onVote('no')} disabled={busy} aria-pressed={record.viewerVote === 'no'} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-300 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:cursor-not-allowed disabled:opacity-60"><ThumbsDown size={14} aria-hidden="true" /> {record.viewerVote ? 'Change to No' : 'Vote No'}</button>
      </div>}
    </article>
  );
}

export default function LegislativeHubPage() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyVote, setBusyVote] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const load = async () => {
    try {
      const response = await fetch('/api/league-info/legislative', { cache: 'no-store' });
      if (!response.ok) throw new Error('Legislative Hub is unavailable.');
      setState((await response.json()) as State);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Legislative Hub is unavailable.');
    }
  };

  useEffect(() => {
    const queryYear = Number(new URLSearchParams(window.location.search).get('session'));
    if (Number.isInteger(queryYear) && queryYear > 0) setSelectedYear(queryYear);
    void load();
  }, []);

  const vote = async (proposalId: string, voteType: 'yes' | 'no') => {
    setBusyVote(proposalId);
    setError(null);
    try {
      const response = await fetch('/api/league-info/legislative/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId, voteType }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Vote could not be recorded.');
      await load();
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : 'Vote could not be recorded.');
    } finally {
      setBusyVote(null);
    }
  };

  const historicalYears = state?.archiveYears ?? [];
  const activeHistoricalYear = selectedYear ?? historicalYears[0] ?? null;
  const historicalRecords = useMemo(() => state?.historicalRecords.filter((record) => record.sessionYear === activeHistoricalYear) ?? [], [activeHistoricalYear, state?.historicalRecords]);
  const authenticated = state?.authenticatedOwner === true;
  const selectHistoricalYear = (year: number) => {
    setSelectedYear(year);
    window.history.replaceState({}, '', `/league-info/legislative?session=${year}`);
  };

  return (
    <SiteShell activePath="/league-info">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/league-info" className="inline-flex min-h-10 items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"><ArrowLeft size={15} aria-hidden="true" /> League Info</Link>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="legislative-title">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">League Info · Governance</p>
          <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div><h1 id="legislative-title" className="flex items-center gap-3 text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl"><Gavel className="h-9 w-9 shrink-0 text-orange-600" aria-hidden="true" /> Legislative Hub</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Submit proposals, follow league meeting business, vote when eligible, and review session history.</p></div>
            {state && <div className="grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:min-w-[23rem]"><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Governed season</p><p className="mt-1 text-xl font-black text-slate-950">{state.sessionYear}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Phase</p><p className="mt-1 font-black text-slate-950">{phaseLabel(state.sessionPhase)}</p></div>{formatDate(state.meetingDate) && <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Annual meeting</p><p className="mt-1 font-bold text-slate-950">{formatDate(state.meetingDate)}</p></div>}{formatDate(state.annualVotingOpensAt) && formatDate(state.votingDeadline) && <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Annual voting window</p><p className="mt-1 font-bold text-slate-950">{formatDate(state.annualVotingOpensAt)} – {formatDate(state.votingDeadline)}</p></div>}</div>}
          </div>
          {state && <p className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600"><span className={`h-2 w-2 rounded-full ${state.isVotingOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" /> {state.isVotingOpen ? 'Voting is open' : state.sessionPhase === 'INTERIM' ? 'Interim business is active' : 'Voting is closed'}</p>}
        </section>

        {state && <section className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-6" aria-labelledby="submit-proposal-title"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-orange-700">Owner participation</p><h2 id="submit-proposal-title" className="mt-1 text-2xl font-black italic uppercase text-slate-950">Have a rule idea?</h2><p className="mt-2 text-sm leading-6 text-slate-700">Submit a proposal for the current governed fantasy season.</p></div><Link href={authenticated ? '/league-info/legislative/new' : '/member/login?returnTo=%2Fleague-info%2Flegislative%2Fnew'} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-orange-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">{authenticated ? 'Submit a proposal' : 'Log in to submit'}</Link></div></section>}

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
        {!state && !error && <p role="status" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">Loading current legislative session…</p>}

        {state && <>
          <section className="mt-8" aria-labelledby="vote-now-title"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-orange-600">Owner action</p><h2 id="vote-now-title" className="mt-1 text-2xl font-black italic uppercase text-slate-950">Vote Now</h2></div><details className="relative"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"><Info size={15} aria-hidden="true" /> How voting works</summary><div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600 shadow-lg">Vote Yes or No. Yes over No passes; No over Yes fails; a tie remains unresolved. There is no abstain option. All 12 votes can make a proposal ready for commissioner finalization; nothing finalizes automatically.</div></details></div>{state.voteNow.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No proposals currently require your vote.{!authenticated && state.isVotingOpen && <Link href="/member/login?returnTo=%2Fleague-info%2Flegislative" className="ml-1 font-bold text-orange-700 underline">Log in to vote.</Link>}</div> : <>{!authenticated && state.isVotingOpen && <Link href="/member/login?returnTo=%2Fleague-info%2Flegislative" className="mb-4 inline-flex min-h-10 items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-700 underline">Log in to vote</Link>}<div className="grid gap-4 lg:grid-cols-2">{state.voteNow.map((record) => <ProposalCard key={record.id} record={record} canVote={authenticated && state.isVotingOpen} busy={busyVote === record.id} onVote={(voteType) => void vote(record.id, voteType)} />)}</div></>}</section>

          <section className="mt-8" aria-labelledby="current-business-title"><p className="text-xs font-black uppercase tracking-widest text-blue-700">Current session</p><h2 id="current-business-title" className="mt-1 text-2xl font-black italic uppercase text-slate-950">Current Business</h2>{state.currentBusiness.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No other active proposals are currently in session business.</div> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{state.currentBusiness.map((record) => <ProposalCard key={record.id} record={record} />)}</div>}</section>

          <section className="mt-8" aria-labelledby="recent-results-title"><p className="text-xs font-black uppercase tracking-widest text-blue-700">Finalized live business</p><h2 id="recent-results-title" className="mt-1 text-2xl font-black italic uppercase text-slate-950">Recent Results</h2>{state.recentResults.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No finalized results for the current governed season.</div> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{state.recentResults.map((record) => <ProposalCard key={record.id} record={record} />)}</div>}</section>

          <section className="mt-8" aria-labelledby="historical-sessions-title"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-blue-700">Legacy and reconciled record</p><h2 id="historical-sessions-title" className="mt-1 text-2xl font-black italic uppercase text-slate-950">Historical Sessions</h2></div>{historicalYears.length > 0 && <label className="text-xs font-bold text-slate-600">Session <select value={activeHistoricalYear ?? ''} onChange={(event) => selectHistoricalYear(Number(event.target.value))} className="ml-2 min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">{historicalYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>}</div>{historicalRecords.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No archived legislative items are available for this session.</div> : <div className="mt-4 grid gap-4 lg:grid-cols-2">{historicalRecords.map((record) => <ProposalCard key={`${record.source}-${record.id}`} record={record} />)}</div>}</section>

          <div className="mt-8 flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest"><Link href="/league-info/constitution" className="min-h-10 text-slate-700 underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700">View Constitution</Link><Link href="/history/version-history" className="min-h-10 text-orange-700 underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">View Amendment History</Link></div>
        </>}
      </main>
    </SiteShell>
  );
}
