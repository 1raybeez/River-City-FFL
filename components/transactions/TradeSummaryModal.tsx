import React, { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { generateVerdict } from "./verdict";

type TeamSummary = {
  teamIndex: number;
  managerName: string | null;
  valueSent: number;
  valueReceived: number;
  keeperSent: number;
  keeperReceived: number;
  surplusSent: number;
  surplusReceived: number;
  netValue: number;
  netSurplus: number;
  faabSent: number;
  faabReceived: number;
  faabNet: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  summaries: TeamSummary[];
  fairnessScore: number | null;
};

export default function TradeSummaryModal({
  open,
  onClose,
  summaries,
  fairnessScore
}: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const verdict = generateVerdict(summaries);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl max-w-5xl w-full mx-4 md:mx-0 animate-in fade-in zoom-in duration-300 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b dark:border-white/10">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Trade Summary
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Verdict:{" "}
            <span className="text-gray-900 dark:text-white">{verdict}</span>
          </p>

          {fairnessScore !== null && (
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Fairness Score:{" "}
              <span
                className={`font-black px-2 py-1 rounded-full ${
                  fairnessScore >= 85
                    ? "bg-emerald-600/10 text-emerald-500"
                    : fairnessScore >= 70
                    ? "bg-yellow-500/10 text-yellow-500"
                    : "bg-red-600/10 text-red-500"
                }`}
              >
                {fairnessScore}/100
              </span>
            </p>
          )}

          {/* MOBILE CARDS */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {summaries.map((t) => (
              <div
                key={t.teamIndex}
                className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border dark:border-white/5"
              >
                <p className="text-[9px] text-orange-500 mb-1">
                  Team {t.teamIndex + 1}
                </p>
                <p className="text-[11px] text-gray-900 dark:text-white mb-2">
                  {t.managerName || "Unassigned"}
                </p>
                <div className="space-y-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  <p>Value Sent: {t.valueSent.toFixed(1)}</p>
                  <p>Value Received: {t.valueReceived.toFixed(1)}</p>
                  <p>Surplus Sent: {t.surplusSent.toFixed(1)}</p>
                  <p>Surplus Received: {t.surplusReceived.toFixed(1)}</p>
                  <p>
                    Net Surplus:{" "}
                    <span
                      className={
                        t.netSurplus >= 0
                          ? "text-emerald-500"
                          : "text-red-500"
                      }
                    >
                      {t.netSurplus.toFixed(1)}
                    </span>
                  </p>
                  <p>
                    FAAB Net:{" "}
                    <span
                      className={
                        t.faabNet >= 0 ? "text-emerald-500" : "text-red-500"
                      }
                    >
                      {t.faabNet}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block">
            <table className="w-full text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
              <thead>
                <tr className="border-b dark:border-white/10">
                  <th className="text-left py-2">Team</th>
                  <th>Value Sent</th>
                  <th>Value Received</th>
                  <th>Surplus Sent</th>
                  <th>Surplus Received</th>
                  <th>Net Surplus</th>
                  <th>FAAB Net</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((t) => (
                  <tr
                    key={t.teamIndex}
                    className="border-b dark:border-white/10 text-gray-900 dark:text-white"
                  >
                    <td className="py-2">{t.managerName || "Unassigned"}</td>
                    <td>{t.valueSent.toFixed(1)}</td>
                    <td>{t.valueReceived.toFixed(1)}</td>
                    <td>{t.surplusSent.toFixed(1)}</td>
                    <td>{t.surplusReceived.toFixed(1)}</td>
                    <td
                      className={
                        t.netSurplus >= 0 ? "text-emerald-500" : "text-red-500"
                      }
                    >
                      {t.netSurplus.toFixed(1)}
                    </td>
                    <td
                      className={
                        t.faabNet >= 0 ? "text-emerald-500" : "text-red-500"
                      }
                    >
                      {t.faabNet}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
