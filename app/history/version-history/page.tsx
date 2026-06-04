"use client";

import React, { useEffect, useMemo, useState } from "react";
import versionHistory from "@/lib/versionHistory";
import type { VersionEntry as StaticVersionEntry } from "@/lib/versionHistory";
import VersionEntry from "@/components/VersionEntry";
import Link from "next/link";
import { History, Home, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
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
  const { theme, setTheme } = useTheme();
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
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-600">
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/league-info"
            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all"
            title="Back to Info Hub"
          >
            <Home size={18} />
          </Link>

          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button onClick={() => setTheme("light")} className={`p-1.5 rounded-md transition-all ${theme === "light" ? "bg-white text-black shadow-sm" : "opacity-40"}`}><Sun size={14} /></button>
            <button onClick={() => setTheme("dark")} className={`p-1.5 rounded-md transition-all ${theme === "dark" ? "bg-white/10 text-white shadow-sm" : "opacity-40"}`}><Moon size={14} /></button>
            <button onClick={() => setTheme("system")} className={`p-1.5 rounded-md transition-all ${theme === "system" ? "bg-white/10 text-white shadow-sm" : "opacity-40"}`}><Monitor size={14} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <History className="text-orange-600 hidden sm:block" size={20} />
          <span className="text-xs font-black uppercase italic tracking-tighter">Version History</span>
        </div>
      </nav>

      <header className="px-6 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg text-orange-600">
          <History size={28} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
          Version <span className="text-orange-600">History</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Rules, Amendments & League Changes</p>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {historyError && (
          <div className="mb-8 rounded-2xl border border-red-600/20 bg-red-600/10 px-5 py-4 text-sm font-bold text-red-700 dark:text-red-300">
            {historyError}
          </div>
        )}

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
