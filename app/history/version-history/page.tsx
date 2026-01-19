"use client";

import React from "react";
import versionHistory from "@/lib/versionHistory";
import VersionEntry from "@/components/VersionEntry";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";

export default function VersionHistoryPage() {
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
          {versionHistory.map((entry) => (
            <VersionEntry key={entry.version} entry={entry} />
          ))}
        </div>
      </main>
    </div>
  );
}