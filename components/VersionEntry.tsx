// components/VersionEntry.tsx
"use client";

import React, { useState } from "react";
import type { VersionEntry } from "@/lib/versionHistory";

interface Props {
  entry: VersionEntry;
}

const VersionEntry: React.FC<Props> = ({ entry }) => {
  const [isOpen, setIsOpen] = useState(false);
  const changesId = `version-history-${entry.version}-${entry.date}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const title =
    entry.version === "Legislative Update"
      ? entry.version
      : `Version ${entry.version}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={changesId}
        className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 sm:px-5"
      >
        <span className="min-w-0 break-words text-base font-black uppercase italic sm:text-lg">
          <span aria-hidden="true">📘 </span>{title} <span className="text-slate-500">— {entry.date}</span>
        </span>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-orange-600">
          {isOpen ? "Hide" : "Show"} Changes
        </span>
      </button>

      {isOpen && (
        <div id={changesId} className="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-white/10">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700 dark:text-white/75">
            {entry.changes.map((change, idx) => (
              <li key={idx}>
                <span className="font-black text-orange-700">{change.rule}</span>: {change.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};

export default VersionEntry;
