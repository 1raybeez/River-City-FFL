// components/VersionEntry.tsx
"use client";

import React, { useState } from "react";
import type { VersionEntry } from "@/lib/versionHistory";

interface Props {
  entry: VersionEntry;
}

const VersionEntry: React.FC<Props> = ({ entry }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-4 py-3 flex justify-between items-center hover:bg-gray-50"
      >
        <span className="text-lg font-semibold">
          📘 Version {entry.version} — <span className="text-gray-600">{entry.date}</span>
        </span>
        <span className="text-sm text-blue-600 font-medium">
          {isOpen ? "Hide" : "Show"} Changes
        </span>
      </button>

      {isOpen && (
        <div className="px-6 pb-4 pt-2">
          <ul className="list-disc list-inside space-y-1">
            {entry.changes.map((change, idx) => (
              <li key={idx}>
                <span className="font-semibold text-blue-700">{change.rule}</span>: {change.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VersionEntry;
