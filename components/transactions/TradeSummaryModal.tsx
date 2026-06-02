// ---------------------------------------------------------
// File: /components/transactions/TradeSummaryModal.tsx
// PREMIUM VERSION – timelineResults[] + identity header
// ---------------------------------------------------------

"use client";

import React, { useState } from "react";
import {
  X,
  Info,
  TrendingUp,
  TrendingDown,
  Award,
  ScrollText,
  RotateCcw,
} from "lucide-react";
import LiveFairnessMeter from "./LiveFairnessMeter";

export interface TeamSummary {
  teamName: string;
  ownerName: string;
  valueSent: number;
  valueReceived: number;
  netSurplus: number;
  surplusSent: number;
  surplusReceived: number;
  faabNet: number;
  avatar?: string | null;
  playersReceived?: { name: string; pos: string; value: number }[];
}

export interface TeamComponentBreakdown {
  deltaTalent: number;
  deltaSurplus: number;
  deltaFaab: number;
  rosterTax: number;
  netValue: number;
}

export interface GlobalComponentSummary {
  imbalanceGap: number;
  biggestWinnerIndex: number;
  biggestLoserIndex: number;
}

// Mirrors /lib/timeline/timelineTypes TimelineResult
export interface TimelineResult {
  timelineScore: number;
  timelinePercent: number;
  timelineTag: "contender" | "bubble" | "rebuilder";
  timelineBadge: string;
  timelineExplanation: string[];
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  teamSummaries: TeamSummary[];
  fairnessScore: number | null;
  verdict: string;
  isSadBuddyJesus: boolean;
  components: {
    global: GlobalComponentSummary;
    perTeam: TeamComponentBreakdown[];
  };
  timelineResults?: TimelineResult[]; // ← now optional
};

export default function TradeSummaryModal({
  isOpen,
  onClose,
  teamSummaries,
  fairnessScore,
  verdict,
  isSadBuddyJesus,
  components,
  timelineResults,
}: Props) {
  const [showLegend, setShowLegend] = useState(false);

  // SAFETY: always an array, never undefined
  const safeTimeline = timelineResults ?? [];

  if (!isOpen) return null;

  const { global, perTeam } = components;
  const sealSrc = !isSadBuddyJesus
    ? "/logos/Trade Approval Seal.png"
    : "/logos/Sad Buddy Jesus Seal.png";

  const getDetailedAnalysis = () => {
    const winner = teamSummaries[global.biggestWinnerIndex];
    const gap = global.imbalanceGap || 0;

    if (isSadBuddyJesus)
      return `Sad Buddy Jesus lowers his glowing thumbs and sighs softly. ${
        winner?.teamName || "One side"
      } is walking away with roughly ${gap.toFixed(
        1
      )} points of unreturned value, and the spirit of fairness weeps.`;

    return `${
      winner?.teamName || "One side"
    } wins the talent acquisition phase, but the other side is likely prioritizing future flexibility. Buddy Jesus sees a path to victory for both sides.`;
  };

  const getTimelineTagColor = (tag: TimelineResult["timelineTag"]) => {
    switch (tag) {
      case "contender":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/40";
      case "bubble":
        return "text-amber-300 bg-amber-500/10 border-amber-500/40";
      case "rebuilder":
        return "text-red-300 bg-red-500/10 border-red-500/40";
      default:
        return "text-gray-300 bg-white/5 border-white/10";
    }
  };

  const getTimelineBarColor = (tag: TimelineResult["timelineTag"]) => {
    switch (tag) {
      case "contender":
        return "from-emerald-400 to-emerald-600";
      case "bubble":
        return "from-amber-300 to-amber-500";
      case "rebuilder":
        return "from-red-400 to-red-600";
      default:
        return "from-slate-400 to-slate-600";
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <div className="bg-[#0f111a] border rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden relative border-white/10 flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white transition-all z-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar space-y-8">
          {/* VERDICT + FAIRNESS METER AT TOP */}
          <section className="p-6 bg-black/30 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h2
                className={`text-2xl font-black uppercase tracking-widest ${
                  !isSadBuddyJesus ? "text-green-500" : "text-red-500"
                }`}
              >
                {verdict}
              </h2>
              <span className="text-xs font-mono bg-black/40 px-3 py-1 rounded-full border border-white/10 text-gray-400">
                FAIRNESS{" "}
                <span
                  className={
                    !isSadBuddyJesus ? "text-green-400" : "text-red-400"
                  }
                >
                  {Number(fairnessScore || 0).toFixed(0)}%
                </span>
              </span>
            </div>

            <LiveFairnessMeter
              fairnessScore={Number(fairnessScore || 0)}
              netSurplus={teamSummaries[0]?.netSurplus || 0}
              team1Name={teamSummaries[0]?.teamName || "Team 1"}
              team2Name={teamSummaries[1]?.teamName || "Team 2"}
            />

            <div className="flex flex-col md:flex-row items-center gap-8 p-6 bg-white/5 rounded-3xl border border-white/5">
              <img
                src={sealSrc}
                alt="Verdict Seal"
                className="w-32 h-32 object-contain rounded-xl"
              />
              <div className="flex-1">
                <div className="flex gap-3 text-gray-200 italic font-medium leading-snug text-sm md:text-base">
                  <ScrollText className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                  <p>{getDetailedAnalysis()}</p>
                </div>
              </div>
            </div>
          </section>

          {/* PREMIUM TIMELINE IDENTITY HEADER */}
          <section className="p-6 md:p-7 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/90 rounded-3xl border border-white/10 shadow-lg">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                  Timeline Identity
                </p>
                <h2 className="mt-1 text-xl md:text-2xl font-black uppercase italic tracking-tight text-white">
                  Window Alignment & Competitive Posture
                </h2>
              </div>
              <button
                onClick={() => setShowLegend(true)}
                className="hidden md:inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 hover:text-blue-300 transition-colors"
              >
                <Info className="w-4 h-4" />
                Legend
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamSummaries.map((team, idx) => {
                const timeline = safeTimeline[idx];
                if (!timeline) return null;

                const barColor = getTimelineBarColor(timeline.timelineTag);
                const tagColor = getTimelineTagColor(timeline.timelineTag);

                return (
                  <div
                    key={idx}
                    className="bg-black/40 rounded-2xl border border-white/10 p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                          {team.ownerName}
                        </p>
                        <p className="text-sm md:text-base font-black uppercase italic tracking-tight text-white truncate">
                          {team.teamName}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${tagColor}`}
                      >
                        {timeline.timelineBadge}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${barColor} transition-all`}
                          style={{
                            width: `${Math.max(
                              5,
                              Math.min(100, timeline.timelineScore)
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-gray-200">
                        {timeline.timelineScore.toFixed(0)}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-snug">
                      {timeline.timelineExplanation[0] ??
                        "This team’s current construction, history, and risk profile define its competitive window."}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* TIMELINE EXPLANATION BLOCKS */}
          <section className="p-6 bg-black/30 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                  Timeline Rationale
                </p>
                <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-white">
                  Why Each Team Is Where It Is
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamSummaries.map((team, idx) => {
                const timeline = safeTimeline[idx];
                if (!timeline) return null;

                return (
                  <div
                    key={idx}
                    className="bg-[#111320] rounded-2xl border border-white/10 p-4 space-y-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                      {team.teamName}
                    </p>
                    <ul className="space-y-2 text-[11px] text-gray-300">
                      {timeline.timelineExplanation.map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-blue-400/70 shrink-0" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {/* TRADE IMPACT ON TIMELINE */}
          <section className="p-6 bg-black/20 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="w-4 h-4 text-blue-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                Trade Impact On Window
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamSummaries.map((team, idx) => {
                const timeline = safeTimeline[idx];
                const comp = perTeam[idx];
                if (!timeline || !comp) return null;

                const direction =
                  comp.netValue >= 0
                    ? "strengthens their current window"
                    : "introduces risk to their current window";

                return (
                  <div
                    key={idx}
                    className="bg-[#111320] rounded-2xl border border-white/10 p-4 space-y-2"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                      {team.teamName}
                    </p>
                    <p className="text-[11px] text-gray-300 leading-snug">
                      This move {direction}, with a net value shift of{" "}
                      <span className="font-mono font-bold text-blue-300">
                        {comp.netValue >= 0 ? "+" : ""}
                        {comp.netValue.toFixed(1)}
                      </span>{" "}
                      and a timeline score sitting at{" "}
                      <span className="font-mono font-bold text-blue-300">
                        {timeline.timelineScore.toFixed(0)}
                      </span>
                      . In context, this trade{" "}
                      {comp.netValue >= 0
                        ? "pushes them further into their declared posture."
                        : "forces them to navigate a tighter margin for error."}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* COMPARISON TABLE (LIGHTWEIGHT, INDEX-BASED) */}
          <section className="p-6 bg-black/20 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                  Side-By-Side Snapshot
                </p>
                <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-white">
                  Value, Surplus, And Timeline
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px] text-gray-300 border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 pr-4">
                      Metric
                    </th>
                    {teamSummaries.map((team, idx) => (
                      <th
                        key={idx}
                        className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pr-4"
                      >
                        {team.teamName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 pr-4">
                      Net Value
                    </td>
                    {perTeam.map((comp, idx) => (
                      <td
                        key={idx}
                        className="font-mono font-bold pr-4 text-xs"
                      >
                        <span
                          className={
                            comp.netValue >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {comp.netValue >= 0 ? "+" : ""}
                          {comp.netValue.toFixed(1)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 pr-4">
                      Net Surplus
                    </td>
                    {teamSummaries.map((team, idx) => (
                      <td
                        key={idx}
                        className="font-mono font-bold pr-4 text-xs"
                      >
                        <span
                          className={
                            team.netSurplus >= 0
                              ? "text-emerald-300"
                              : "text-red-300"
                          }
                        >
                          {team.netSurplus >= 0 ? "+" : ""}
                          {team.netSurplus.toFixed(1)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 pr-4">
                      Timeline Score
                    </td>
                    {safeTimeline.map((timeline, idx) => (
                      <td
                        key={idx}
                        className="font-mono font-bold pr-4 text-xs text-blue-300"
                      >
                        {timeline?.timelineScore?.toFixed(0) ?? "--"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* TEAM CARDS (EXISTING, SLIGHTLY ENHANCED WITH TIMELINE BADGE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teamSummaries.map((team, idx) => {
              const comp = perTeam[idx];
              const timeline = safeTimeline[idx];
              const avatarUrl = team.avatar
                ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}`
                : `https://sleepercdn.com/images/v2/icons/player_default.webp`;

              return (
                <div
                  key={idx}
                  className="bg-[#161826] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-lg"
                >
                  <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarUrl}
                          className="w-12 h-12 rounded-full border-2 border-blue-500/30 object-cover bg-gray-800"
                          alt="Team Logo"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://sleepercdn.com/images/v2/icons/player_default.webp";
                          }}
                        />
                        <div className="max-w-[140px]">
                          <h3 className="font-bold text-white truncate text-sm md:text-base uppercase italic tracking-tighter">
                            {team.teamName}
                          </h3>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                            {team.ownerName}
                          </p>
                          {timeline && (
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                              {timeline.timelineBadge}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLegend(true)}
                        className="text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        <Info size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-gray-500 uppercase block mb-1 tracking-widest">
                          Net Value
                        </span>
                        <span
                          className={`text-xl font-mono font-bold ${
                            comp.netValue >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {comp.netValue > 0 ? "+" : ""}
                          {comp.netValue.toFixed(1)}
                        </span>
                      </div>
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-gray-500 uppercase block mb-1 tracking-widest">
                          Impact Delta
                        </span>
                        <div className="flex items-center justify-center gap-2 font-mono font-bold text-blue-400 text-xl">
                          {team.netSurplus > 0 ? "+" : ""}
                          {team.netSurplus.toFixed(1)}
                          {team.netSurplus >= 0 ? (
                            <TrendingUp
                              size={16}
                              className="text-green-500"
                            />
                          ) : (
                            <TrendingDown
                              size={16}
                              className="text-red-500"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-black/20 flex-1">
                    <h4 className="text-[10px] font-black uppercase text-gray-500 mb-4 flex items-center gap-2 tracking-[0.2em]">
                      <Award size={12} className="text-blue-500" /> Roster
                      Receipt
                    </h4>

                    <div className="space-y-2 min-h-[80px]">
                      {team.playersReceived && team.playersReceived.length > 0 ? (
                        team.playersReceived.map((p, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-white/5 px-3 py-2.5 rounded-xl border border-white/5 text-xs transition-all hover:bg-white/10"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded leading-none uppercase">
                                {p.pos}
                              </span>
                              <span className="text-gray-200 font-bold uppercase tracking-tight">
                                {p.name}
                              </span>
                            </div>
                            <span className="font-mono text-gray-400 font-bold">
                              +{p.value.toFixed(1)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 opacity-30">
                          <RotateCcw className="w-5 h-5 mb-2 animate-spin-slow" />
                          <p className="text-[10px] uppercase font-black tracking-widest">
                            No Acquisitions
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Imbalance Gap
                </p>
                <p className="text-xl font-mono font-bold text-orange-500">
                  {global.imbalanceGap.toFixed(1)}
                </p>
              </div>
              <div className="h-10 w-px bg-white/10 hidden md:block" />
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Biggest Winner
                </p>
                <p className="text-sm font-black text-green-400 uppercase italic">
                  {teamSummaries[global.biggestWinnerIndex]?.teamName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-[0.3em] rounded-full transition-all shadow-xl shadow-blue-900/20"
            >
              Close Verdict
            </button>
          </div>
        </div>
      </div>

      {/* LEGEND MODAL */}
      {showLegend && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowLegend(false)}
        >
          <div
            className="bg-[#1a1c2e] border border-white/10 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">
              Glossary
            </h3>
            <div className="space-y-4 text-sm text-gray-300">
              <p>
                <strong className="text-white uppercase text-[10px] tracking-widest block mb-1">
                  Net Value:
                </strong>
                Total asset shift after stud bonuses and roster taxes.
              </p>
              <p>
                <strong className="text-white uppercase text-[10px] tracking-widest block mb-1">
                  Impact Delta:
                </strong>
                Net change in your team&apos;s weekly projections.
              </p>
              <p>
                <strong className="text-white uppercase text-[10px] tracking-widest block mb-1">
                  Stud Bonus:
                </strong>
                A flat adjustment given to superstars to reflect positional
                scarcity.
              </p>
            </div>
            <button
              className="mt-8 w-full py-3 bg-white/5 rounded-xl text-xs uppercase font-black tracking-widest text-gray-400 transition-all hover:bg-white/10"
              onClick={() => setShowLegend(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
