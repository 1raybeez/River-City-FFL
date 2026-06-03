"use client";

import React, { useEffect, useMemo, useState } from "react";
import versionHistory from "@/lib/versionHistory";
import type { VersionEntry as StaticVersionEntry } from "@/lib/versionHistory";
import VersionEntry from "@/components/VersionEntry";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

type FirebaseVersionEntry = StaticVersionEntry & {
  id: string;
  proposalId?: string;
  isLegislativeUpdate: true;
};

function getEntryTime(entry: StaticVersionEntry) {
  const timestamp = new Date(entry.date).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isFirebaseVersionEntry(
  entry: StaticVersionEntry | FirebaseVersionEntry
): entry is FirebaseVersionEntry {
  return "isLegislativeUpdate" in entry && entry.isLegislativeUpdate;
}

export default function VersionHistoryPage() {
  const [firebaseEntries, setFirebaseEntries] = useState<FirebaseVersionEntry[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "version_history_updates"), (snapshot) => {
      const entries: FirebaseVersionEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          version: data.version ?? "Legislative Update",
          date: data.date ?? "",
          changes: Array.isArray(data.changes) ? data.changes : [],
          proposalId: data.proposalId,
          isLegislativeUpdate: true as const,
        };
      });

      setFirebaseEntries(entries);
    });

    return () => unsubscribe();
  }, []);

  const combinedHistory = useMemo(() => {
    return [...firebaseEntries, ...versionHistory].sort(
      (a, b) => getEntryTime(b) - getEntryTime(a)
    );
  }, [firebaseEntries]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] font-sans pb-20">
      <div className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-white/5 pb-8 pt-4 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 text-center relative">
          <Link href="/league-info/constitution" className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-orange-600 font-bold text-xs uppercase transition-colors">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="absolute top-4 right-4"><ModeToggle /></div>
          <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 italic text-gray-900 dark:text-white">
            <History className="text-orange-600" /> Version History
          </h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="space-y-6">
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
        </div>
      </main>
    </div>
  );
}
