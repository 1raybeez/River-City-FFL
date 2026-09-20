"use client";

import { useState } from "react";

export default function PromotionForm({ shadowResultId, checksums, eligible }: { shadowResultId: string; checksums: readonly string[]; eligible: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function promote() {
    setBusy(true); setMessage(null);
    try { const response = await fetch("/api/commish/predictor/promote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm, shadowResultId, inputEvidenceChecksums: checksums, note: note.trim() || null }) }); const body = await response.json() as { error?: string; promotion?: { readiness?: string } }; if (!response.ok) throw new Error(body.error ?? "Promotion failed."); setMessage(`Promotion recorded: ${body.promotion?.readiness ?? "PRODUCTION_READY"}.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Promotion failed."); } finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3"><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={event => setConfirm(event.target.checked)} disabled={!eligible || busy} /><span>I confirm this current shadow result is eligible for production promotion.</span></label><textarea value={note} onChange={event => setNote(event.target.value)} disabled={!eligible || busy} placeholder="Optional commissioner note" rows={2} className="w-full rounded-lg border border-amber-300 bg-white p-2 text-sm" /><button type="button" onClick={promote} disabled={!eligible || !confirm || busy} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Checking…" : "Promote to production"}</button>{message ? <p className="text-sm font-bold">{message}</p> : null}</div>;
}
