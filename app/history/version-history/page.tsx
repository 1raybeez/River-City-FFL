"use client";

import React, { useEffect, useMemo, useState } from "react";
import versionHistory from "@/lib/versionHistory";
import type { VersionEntry as StaticVersionEntry } from "@/lib/versionHistory";
import VersionEntry from "@/components/VersionEntry";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import SiteShell from "@/components/SiteShell";

type FirebaseVersionEntry = StaticVersionEntry & {
  id: string;
  proposalId?: string;
  isLegislativeUpdate: true;
};

function getEntryTime(entry: StaticVersionEntry) {
  const timestamp = new Date(entry.date).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getValidEntryDate(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp)) return value;
  }

  return new Date().toLocaleDateString();
}

function isFirebaseVersionEntry(
  entry: StaticVersionEntry | FirebaseVersionEntry
): entry is FirebaseVersionEntry {
  return "isLegislativeUpdate" in entry && entry.isLegislativeUpdate;
}

export default function VersionHistoryPage() {
  const [firebaseEntries, setFirebaseEntries] = useState<FirebaseVersionEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "version_history_updates"),
      (snapshot) => {
        const entries: FirebaseVersionEntry[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            version: "Legislative Update",
            date: getValidEntryDate(data.date),
            changes: Array.isArray(data.changes) ? data.changes : [],
            proposalId: data.proposalId,
            isLegislativeUpdate: true as const,
          };
        });

        setFirebaseEntries(entries);
        setHistoryError(null);
      },
      (error) => {
        console.error("Version history updates listener failed:", error);
        setHistoryError("Live version history updates could not be loaded. Check Firestore read permissions for version_history_updates.");
      }
    );

    return () => unsubscribe();
  }, []);

  const combinedHistory = useMemo(() => {
    return [...firebaseEntries, ...versionHistory].sort(
      (a, b) => getEntryTime(b) - getEntryTime(a)
    );
  }, [firebaseEntries]);
  return (
    <SiteShell activePath="/league-info">
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 text-slate-950 dark:bg-[#0a0a0a] dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <Link href="/league-info/constitution" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-orange-600 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
              <ArrowLeft size={14} aria-hidden="true" /> Back to Constitution
            </Link>
            <div className="mt-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600/10 text-orange-600"><History size={24} aria-hidden="true" /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">League Info</p>
                <h1 className="mt-2 text-4xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">Constitution Version History</h1>
                <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-600">Historical Constitution versions, amendments, and legislative revisions represented in the River City record.</p>
              </div>
            </div>
          </header>
        {historyError && (
          <div role="alert" className="rounded-2xl border border-red-600/20 bg-red-600/10 px-5 py-4 text-sm font-bold text-red-700 dark:text-red-300">
            {historyError}
          </div>
        )}

        <section aria-labelledby="version-history-entries" className="space-y-4">
          <h2 id="version-history-entries" className="flex items-center gap-3 text-2xl font-black uppercase italic tracking-tight"><History size={20} className="text-orange-600" aria-hidden="true" /> Version history</h2>
          {combinedHistory.map((entry) => (
            <div key={`${entry.version}-${entry.date}-${"id" in entry ? entry.id : "static"}`}>
              {isFirebaseVersionEntry(entry) && (
                <div className="mb-2 inline-flex items-center rounded-full border border-orange-600/20 bg-orange-600/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
                  Ratified Legislative Update
                </div>
              )}
              <VersionEntry entry={entry} />
            </div>
          ))}
        </section>
        </div>
      </main>
    </SiteShell>
  );
}
