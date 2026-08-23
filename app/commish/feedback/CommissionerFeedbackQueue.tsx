"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FEEDBACK_AREAS, FEEDBACK_STATUSES, COMMISSIONER_NOTE_MAX_LENGTH, filterCommissionerFeedback, countCommissionerFeedbackByStatus, sortCommissionerFeedback, type CommissionerFeedbackRecord, type CommissionerFeedbackStatus, type FeedbackArea, type FeedbackType } from "@/lib/feedback";

const statusLabels: Record<CommissionerFeedbackStatus, string> = {
  OPEN: "Open", PLANNED: "Planned", DONE: "Done", DECLINED: "Declined",
};

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CommissionerFeedbackQueue() {
  const [records, setRecords] = useState<CommissionerFeedbackRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [type, setType] = useState<FeedbackType | "ALL">("ALL");
  const [status, setStatus] = useState<CommissionerFeedbackStatus | "ALL">("ALL");
  const [area, setArea] = useState<FeedbackArea | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function loadFeedback() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/commish/feedback", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load site feedback.");
      const payload = await response.json() as { feedback?: CommissionerFeedbackRecord[] };
      setRecords(sortCommissionerFeedback(payload.feedback ?? []));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load site feedback.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadFeedback(); }, []);

  const counts = useMemo(() => countCommissionerFeedbackByStatus(records), [records]);
  const visible = useMemo(() => filterCommissionerFeedback(records, { type, status, area }), [records, type, status, area]);
  async function save(record: CommissionerFeedbackRecord, nextStatus: CommissionerFeedbackStatus, note: string) {
    setSavingId(record.id); setSaveMessage(null); setError(null);
    try {
      const response = await fetch("/api/commish/feedback", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId: record.id, status: nextStatus, commissionerNote: note }),
      });
      const payload = await response.json() as { feedback?: CommissionerFeedbackRecord; error?: string };
      if (!response.ok || !payload.feedback) throw new Error(payload.error ?? "Unable to save feedback.");
      setRecords((current) => current.map((item) => item.id === record.id ? payload.feedback! : item));
      setSaveMessage("Feedback updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save feedback.");
    } finally { setSavingId(null); }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-[#121212]">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Commissioner Queue</p>
        <h1 className="mt-2 text-4xl font-black uppercase italic tracking-tighter text-[#071a33] dark:text-white">Site Feedback</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-gray-400">Review owner bug reports and site improvement suggestions.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Feedback status counts">
          {[["TOTAL", records.length] as const, ...FEEDBACK_STATUSES.map((item) => [item, counts[item]] as const)].map(([label, count]) => (
            <div key={label} className="rounded-2xl border border-slate-200 p-3 dark:border-white/10"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-[#071a33] dark:text-white">{count}</p></div>
          ))}
        </div>
      </header>

      <section aria-labelledby="feedback-filters-heading" className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]">
        <h2 id="feedback-filters-heading" className="sr-only">Filter feedback</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">Type<select value={type} onChange={(event) => setType(event.target.value as FeedbackType | "ALL")} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#171717]"><option value="ALL">All types</option><option value="BUG">Bugs</option><option value="SUGGESTION">Suggestions</option></select></label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">Status<select value={status} onChange={(event) => setStatus(event.target.value as CommissionerFeedbackStatus | "ALL")} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#171717]"><option value="ALL">All statuses</option>{FEEDBACK_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">Area<select value={area} onChange={(event) => setArea(event.target.value as FeedbackArea | "ALL")} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#171717]"><option value="ALL">All areas</option>{FEEDBACK_AREAS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        </div>
      </section>

      {loading && <p role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm dark:border-white/10 dark:bg-[#121212]">Loading site feedback...</p>}
      {error && <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button type="button" onClick={() => void loadFeedback()} className="mt-3 min-h-11 rounded-xl bg-red-700 px-4 font-bold text-white">Retry</button></div>}
      {!loading && !error && records.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm dark:border-white/10 dark:bg-[#121212]">No feedback has been submitted yet.</p>}
      {!loading && !error && records.length > 0 && visible.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm dark:border-white/10 dark:bg-[#121212]">No feedback matches these filters.</p>}
      <div className="space-y-4">
        {visible.map((record) => <FeedbackCard key={record.id} record={record} expanded={record.id === selectedId} onToggle={() => setSelectedId(record.id === selectedId ? null : record.id)} saving={savingId === record.id} saveMessage={saveMessage} onSave={save} />)}
      </div>
      <p className="mt-8 text-sm text-slate-500"><Link href="/commish" className="font-bold text-orange-600 hover:underline">Back to Commissioner Hub</Link></p>
    </main>
  );
}

function FeedbackCard({ record, expanded, onToggle, saving, saveMessage, onSave }: { record: CommissionerFeedbackRecord; expanded: boolean; onToggle: () => void; saving: boolean; saveMessage: string | null; onSave: (record: CommissionerFeedbackRecord, status: CommissionerFeedbackStatus, note: string) => Promise<void> }) {
  const [nextStatus, setNextStatus] = useState(record.status);
  const [note, setNote] = useState(record.commissionerNote ?? "");
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]">
    <button type="button" aria-expanded={expanded} onClick={onToggle} className="flex min-h-11 w-full items-start justify-between gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
      <span className="min-w-0"><span className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest"><span className="rounded-full bg-orange-100 px-2 py-1 text-orange-800">{record.type}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{statusLabels[record.status]}</span></span><span className="mt-3 block break-words text-xl font-black text-[#071a33] dark:text-white">{record.title}</span><span className="mt-1 block text-sm text-slate-500">{record.area.replaceAll("_", " ")} · {formatDate(record.submittedAt)}</span></span><span aria-hidden="true" className="text-2xl text-orange-600">{expanded ? "−" : "+"}</span>
    </button>
    {expanded && <div className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10"><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold text-slate-500">Submitted by</dt><dd>{record.submittedByDisplayName}{record.submittedByFranchise ? ` · ${record.submittedByFranchise}` : ""}</dd></div><div><dt className="font-bold text-slate-500">Page</dt><dd className="break-all">{record.pagePath}</dd></div></dl><div className="mt-5 space-y-4 text-sm"><div><h3 className="font-bold text-slate-500">Description</h3><p className="mt-1 whitespace-pre-wrap">{record.description}</p></div>{record.expectedBehavior && <div><h3 className="font-bold text-slate-500">Expected behavior</h3><p className="mt-1 whitespace-pre-wrap">{record.expectedBehavior}</p></div>}{record.reproductionSteps && <div><h3 className="font-bold text-slate-500">Reproduction steps</h3><p className="mt-1 whitespace-pre-wrap">{record.reproductionSteps}</p></div>}{record.suggestionRationale && <div><h3 className="font-bold text-slate-500">Why this would help</h3><p className="mt-1 whitespace-pre-wrap">{record.suggestionRationale}</p></div>}</div><div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 dark:border-white/10"><label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">Status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as CommissionerFeedbackStatus)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#171717]">{FEEDBACK_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">Commissioner note<textarea value={note} maxLength={COMMISSIONER_NOTE_MAX_LENGTH} onChange={(event) => setNote(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-white/10 dark:bg-[#171717]" /><span className="mt-1 block text-right text-xs text-slate-500">{note.length}/{COMMISSIONER_NOTE_MAX_LENGTH}</span></label><div className="flex flex-wrap items-center gap-3"><button type="button" disabled={saving} onClick={() => void onSave(record, nextStatus, note)} className="min-h-11 rounded-xl bg-orange-600 px-5 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button>{saveMessage && <span role="status" className="text-sm text-green-700">{saveMessage}</span>}</div></div></div>}
  </article>;
}
