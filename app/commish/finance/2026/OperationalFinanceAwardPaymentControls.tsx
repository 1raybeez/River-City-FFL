"use client";

import { useState } from "react";
import { Clipboard, ContactRound, WalletCards } from "lucide-react";

import type {
  OperationalFinanceApprovedAwardItem,
  OperationalFinanceCommissionerDashboardPresentation,
} from "@/lib/finance/operationalFinanceAwardReview";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function dollarsToCents(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export default function OperationalFinanceAwardPaymentControls({
  award,
  onDashboard,
  onConfirmation,
}: {
  award: OperationalFinanceApprovedAwardItem;
  onDashboard: (dashboard: OperationalFinanceCommissionerDashboardPresentation) => void;
  onConfirmation: (message: string) => void;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  const [contactHandle, setContactHandle] = useState(award.paymentContact?.handle ?? "");
  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState((award.remainingCents / 100).toFixed(2));
  const [actualPaidDate, setActualPaidDate] = useState("");
  const [note, setNote] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [contactIdempotencyKey, setContactIdempotencyKey] = useState("");
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState("");

  const mutateContact = async (action: "set" | "deactivate") => {
    if (pending || !contactIdempotencyKey) return;
    if (action === "set" && !contactConfirmed) {
      setError("Confirm that this private Venmo contact was provided to the commissioner.");
      return;
    }
    setPending(true);
    setError(null);
    setLocalStatus(null);
    try {
      const response = await fetch(
        `/api/commish/finance/2026/payment-contacts/${encodeURIComponent(award.financialOwnerId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "set"
              ? {
                  action,
                  method: "venmo",
                  handle: contactHandle,
                  status: "unverified",
                  idempotencyKey: contactIdempotencyKey,
                }
              : {
                  action,
                  idempotencyKey: contactIdempotencyKey,
                }
          ),
        }
      );
      const payload = (await response.json()) as {
        dashboard?: OperationalFinanceCommissionerDashboardPresentation;
        error?: string;
      };
      if (!response.ok || !payload.dashboard) {
        throw new Error(payload.error || "Payment contact could not be saved.");
      }
      onDashboard(payload.dashboard);
      onConfirmation(
        action === "set"
          ? `Private Venmo contact saved for ${award.financialOwnerName}.`
          : `Private Venmo contact deactivated for ${award.financialOwnerName}.`
      );
      setContactOpen(false);
      setDeactivateOpen(false);
      setContactConfirmed(false);
      setContactIdempotencyKey(`commissioner-contact-${crypto.randomUUID()}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment contact could not be saved.");
    } finally {
      setPending(false);
    }
  };

  const copyContact = async () => {
    if (!award.paymentContact || award.paymentContact.status === "inactive") return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(award.paymentContact.handle);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setLocalStatus("Venmo handle copied.");
      setError(null);
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = award.paymentContact.handle;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.appendChild(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      if (copied) {
        setLocalStatus("Venmo handle copied.");
        setError(null);
      } else {
        setError("Venmo handle could not be copied. Select and copy it manually.");
      }
    }
  };

  const recordPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !paymentIdempotencyKey) return;
    const amountCents = dollarsToCents(amount);
    if (!amountCents) {
      setError("Enter a payment amount greater than $0.00.");
      return;
    }
    if (amountCents > award.remainingCents) {
      setError("Payment cannot exceed the remaining award balance.");
      return;
    }
    if (!paymentConfirmed) {
      setError("Confirm that you already sent this payment externally via Venmo.");
      return;
    }
    setPending(true);
    setError(null);
    setLocalStatus(null);
    try {
      const response = await fetch(
        `/api/commish/finance/2026/awards/${encodeURIComponent(award.obligationId)}/settlements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountCents,
            paymentMethod: "venmo",
            actualPaidAt: actualPaidDate ? `${actualPaidDate}T00:00:00.000Z` : null,
            commissionerNote: note || null,
            idempotencyKey: paymentIdempotencyKey,
          }),
        }
      );
      const payload = (await response.json()) as {
        dashboard?: OperationalFinanceCommissionerDashboardPresentation;
        created?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.dashboard) {
        throw new Error(payload.error || "Award payment could not be recorded.");
      }
      onDashboard(payload.dashboard);
      onConfirmation(
        payload.created === false
          ? "This award payment was already recorded; the ledger remains unchanged."
          : `Recorded ${formatCurrency(amountCents)} paid to ${award.financialOwnerName} via Venmo.`
      );
      setPaymentOpen(false);
      setPaymentIdempotencyKey(`commissioner-award-payment-${crypto.randomUUID()}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Award payment could not be recorded.");
    } finally {
      setPending(false);
    }
  };

  const contact = award.paymentContact;
  const usableContact = contact && contact.status !== "inactive";
  const errorId = `award-payment-error-${award.obligationId.replaceAll(":", "-")}`;

  return (
    <div className="mt-4 space-y-3 border-t border-black/10 pt-4 dark:border-white/10">
      <div className="rounded-xl bg-black/[0.035] p-3 dark:bg-white/[0.05]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500">
              <ContactRound className="h-4 w-4 text-orange-600" aria-hidden="true" />
              Private Payment Contact
            </p>
            {contact ? (
              <p className="mt-1 break-all text-sm font-black">
                Venmo: {contact.handle} <span className="text-[9px] uppercase text-gray-500">({contact.status})</span>
              </p>
            ) : (
              <p className="mt-1 text-sm font-black">Venmo: Not on file</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {usableContact && (
              <button type="button" onClick={() => void copyContact()} className="min-h-11 rounded-lg border border-black/15 px-3 text-xs font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/15">
                <Clipboard className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Copy
              </button>
            )}
            <button type="button" onClick={() => { const opening = !contactOpen; setContactOpen(opening); setDeactivateOpen(false); setError(null); if (opening) setContactIdempotencyKey(`commissioner-contact-${crypto.randomUUID()}`); }} aria-expanded={contactOpen} className="min-h-11 rounded-lg border border-black/15 px-3 text-xs font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/15">
              {contact ? "Edit" : "Add"}
            </button>
            {usableContact && (
              <button type="button" onClick={() => { const opening = !deactivateOpen; setDeactivateOpen(opening); setContactOpen(false); setError(null); if (opening) setContactIdempotencyKey(`commissioner-contact-${crypto.randomUUID()}`); }} aria-expanded={deactivateOpen} className="min-h-11 rounded-lg border border-red-600/25 px-3 text-xs font-black uppercase text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:text-red-300">
                Deactivate
              </button>
            )}
          </div>
        </div>
        {localStatus && <p role="status" className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">{localStatus}</p>}
        {contactOpen && (
          <div className="mt-3 space-y-3 border-t border-black/10 pt-3 dark:border-white/10">
            <div>
              <label htmlFor={`contact-${award.obligationId}`} className="mb-1 block text-xs font-black uppercase">Venmo handle</label>
              <input id={`contact-${award.obligationId}`} autoComplete="off" value={contactHandle} onChange={(event) => setContactHandle(event.target.value)} placeholder="@example-user" className="min-h-11 w-full rounded-xl border border-black/20 bg-white px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/20 dark:bg-black/30" />
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-black/10 p-3 text-sm font-bold dark:border-white/10">
              <input type="checkbox" checked={contactConfirmed} onChange={(event) => setContactConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" />
              I confirm this private contact was provided to the commissioner. Save as unverified; ownership is not inferred from the handle.
            </label>
            <button type="button" disabled={pending || !contactConfirmed} onClick={() => void mutateContact("set")} className="min-h-11 w-full rounded-xl bg-orange-600 px-3 text-sm font-black uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50">
              {pending ? "Saving…" : "Save Private Contact"}
            </button>
          </div>
        )}
        {deactivateOpen && (
          <div className="mt-3 rounded-xl border border-red-600/20 bg-red-600/5 p-3">
            <p className="text-sm font-bold">Deactivate this Venmo contact? Its private revision history will be preserved.</p>
            <button type="button" disabled={pending} onClick={() => void mutateContact("deactivate")} className="mt-3 min-h-11 w-full rounded-xl bg-red-700 px-3 text-sm font-black uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50">
              {pending ? "Deactivating…" : "Confirm Deactivation"}
            </button>
          </div>
        )}
      </div>

      {award.remainingCents > 0 && !paymentOpen && (
        <button type="button" onClick={() => { setPaymentOpen(true); setError(null); setPaymentIdempotencyKey(`commissioner-award-payment-${crypto.randomUUID()}`); }} className="min-h-11 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#121212]">
          Record Venmo Payment
        </button>
      )}

      {paymentOpen && (
        <form onSubmit={(event) => void recordPayment(event)} className="space-y-3 rounded-xl border border-orange-600/25 bg-orange-600/5 p-4" noValidate>
          <div>
            <p className="flex items-center gap-2 font-black uppercase"><WalletCards className="h-4 w-4" aria-hidden="true" /> Record Payment</p>
            <p className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-300">River City records payment after you send it externally. This form does not send money.</p>
          </div>
          {usableContact ? (
            <p className="break-all rounded-lg bg-white/70 p-3 text-sm font-bold dark:bg-black/20">Pay via Venmo: {contact.handle}</p>
          ) : (
            <p className="rounded-lg bg-amber-600/10 p-3 text-sm font-bold text-amber-800 dark:text-amber-200">No active Venmo contact is on file. Verify the recipient externally before recording payment.</p>
          )}
          <div>
            <label htmlFor={`award-amount-${award.obligationId}`} className="mb-1 block text-xs font-black uppercase">Amount paid</label>
            <input id={`award-amount-${award.obligationId}`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-h-11 w-full rounded-xl border border-black/20 bg-white px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/20 dark:bg-black/30" />
            <p className="mt-1 text-xs text-gray-500">Defaults to {formatCurrency(award.remainingCents)} remaining; a smaller partial payment is allowed.</p>
          </div>
          <div>
            <label htmlFor={`award-date-${award.obligationId}`} className="mb-1 block text-xs font-black uppercase">Actual payment date <span className="normal-case text-gray-500">(optional)</span></label>
            <input id={`award-date-${award.obligationId}`} type="date" value={actualPaidDate} onChange={(event) => setActualPaidDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-black/20 bg-white px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/20 dark:bg-black/30" />
          </div>
          <div>
            <label htmlFor={`award-note-${award.obligationId}`} className="mb-1 block text-xs font-black uppercase">Commissioner note <span className="normal-case text-gray-500">(optional)</span></label>
            <textarea id={`award-note-${award.obligationId}`} rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-xl border border-black/20 bg-white px-3 py-2 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/20 dark:bg-black/30" />
          </div>
          <p className="text-sm font-black">Record that {formatCurrency(dollarsToCents(amount) ?? 0)} was paid to {award.financialOwnerName} via Venmo.</p>
          <label className="flex items-start gap-3 rounded-xl border border-black/10 p-3 text-sm font-bold dark:border-white/10">
            <input type="checkbox" checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" />
            I confirm I already sent this payment externally via Venmo.
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={pending} onClick={() => { setPaymentOpen(false); setError(null); }} className="min-h-11 rounded-xl border border-black/15 px-3 text-sm font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50 dark:border-white/15">Cancel</button>
            <button type="submit" disabled={pending || !paymentConfirmed} aria-busy={pending} className="min-h-11 rounded-xl bg-black px-3 text-sm font-black uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50 dark:bg-white dark:text-black">{pending ? "Recording…" : "Record Payment"}</button>
          </div>
        </form>
      )}
      {error && <p id={errorId} role="alert" className="rounded-xl bg-red-600/10 p-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
