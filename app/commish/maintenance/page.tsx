"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Database,
  History,
  Loader2,
  RefreshCcw,
  Shield,
} from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";

type OperationId =
  | "scrape-trades"
  | "normalize-trades"
  | "build-distribution"
  | "refresh-current-trades";

type OperationState = {
  loading: boolean;
  status: "idle" | "success" | "error";
  output: string;
};

type Operation = {
  id: OperationId;
  title: string;
  description: string;
  endpoint: string;
  requiresKey: boolean;
  requiresConfirmation?: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

const operations: Operation[] = [
  {
    id: "scrape-trades",
    title: "Scrape historical trades",
    description: "Pull historical Sleeper trade data into the archive.",
    endpoint: "/api/scrape-trades",
    requiresKey: true,
    requiresConfirmation: true,
    icon: History,
  },
  {
    id: "normalize-trades",
    title: "Normalize trades",
    description: "Convert raw historical trades into the normalized format.",
    endpoint: "/api/normalize-trades",
    requiresKey: true,
    icon: Database,
  },
  {
    id: "build-distribution",
    title: "Build distribution",
    description: "Rebuild the historical imbalance distribution dataset.",
    endpoint: "/api/build-distribution",
    requiresKey: true,
    requiresConfirmation: true,
    icon: BarChart3,
  },
  {
    id: "refresh-current-trades",
    title: "Refresh current-season trade history",
    description: "Fetch 2026 Sleeper trades and store them in trade history.",
    endpoint: "/api/history/trades?season=2026",
    requiresKey: false,
    icon: RefreshCcw,
  },
];

const initialOperationState = operations.reduce<Record<OperationId, OperationState>>(
  (state, operation) => {
    state[operation.id] = {
      loading: false,
      status: "idle",
      output: "",
    };
    return state;
  },
  {} as Record<OperationId, OperationState>
);

function formatOutput(data: unknown) {
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

export default function MaintenancePage() {
  const [scraperKey, setScraperKey] = useState("");
  const [operationState, setOperationState] = useState(initialOperationState);
  const isAnyOperationRunning = Object.values(operationState).some(
    (state) => state.loading
  );

  const runOperation = async (operation: Operation) => {
    if (
      operation.requiresConfirmation &&
      !window.confirm(`Run "${operation.title}" now?`)
    ) {
      return;
    }

    const trimmedScraperKey = scraperKey.trim();

    setOperationState((current) => ({
      ...current,
      [operation.id]: {
        loading: true,
        status: "idle",
        output: "",
      },
    }));

    try {
      const response = await fetch(operation.endpoint, {
        method: "POST",
        headers: operation.requiresKey
          ? {
              "x-scraper-key": trimmedScraperKey,
            }
          : undefined,
      });
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      setOperationState((current) => ({
        ...current,
        [operation.id]: {
          loading: false,
          status: response.ok ? "success" : "error",
          output: response.ok
            ? formatOutput(payload)
            : `HTTP ${response.status} ${response.statusText}\n${formatOutput(payload)}`,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown maintenance error.";

      setOperationState((current) => ({
        ...current,
        [operation.id]: {
          loading: false,
          status: "error",
          output: message,
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-600">
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <Link
          href="/commish"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Commish
        </Link>
        <ModeToggle />
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10 flex flex-col gap-4 border-b-2 border-orange-600 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter">
                Maintenance
              </h1>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                Commissioner Operations
              </p>
            </div>
          </div>
        </div>

        <section className="mb-8 rounded-3xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-5 sm:p-6">
          <label
            htmlFor="scraper-key"
            className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400"
          >
            Scraper key
          </label>
          <input
            id="scraper-key"
            type="password"
            value={scraperKey}
            onChange={(event) => setScraperKey(event.target.value)}
            autoComplete="off"
            placeholder="Required for protected maintenance jobs"
            className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black/40 px-4 py-3 text-sm font-medium outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
          />
        </section>

        <section className="grid gap-5">
          {operations.map((operation) => {
            const state = operationState[operation.id];
            const Icon = operation.icon;
            const isDisabled =
              isAnyOperationRunning ||
              (operation.requiresKey && scraperKey.trim() === "");

            return (
              <article
                key={operation.id}
                className="rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121212] shadow-xl overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black uppercase italic tracking-tight">
                        {operation.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {operation.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => runOperation(operation)}
                    disabled={isDisabled}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {state.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Run
                  </button>
                </div>

                {state.output && (
                  <div className="border-t border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-black/30 p-5 sm:p-6">
                    <div
                      className={`mb-3 text-[10px] font-black uppercase tracking-[0.2em] ${
                        state.status === "success"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {state.status}
                    </div>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-black text-xs leading-relaxed text-white p-4">
                      {state.output}
                    </pre>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
