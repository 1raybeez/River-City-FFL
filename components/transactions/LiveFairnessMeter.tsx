"use client";

import React from "react";
import { motion } from "framer-motion";

interface LiveFairnessMeterProps {
  fairnessScore: number; // 0–100
  netSurplus: number;    // positive = Team 1 wins, negative = Team 2 wins
  team1Name: string;
  team2Name: string;
}

export default function LiveFairnessMeter({
  fairnessScore,
  netSurplus,
  team1Name,
  team2Name,
}: LiveFairnessMeterProps) {
  // Clamp fairnessScore to 0–100
  const score = Math.min(100, Math.max(0, fairnessScore));

  // Position of the sliding block (-50% to +50%)
  const position = (score - 50) * 1; // medium width block, smooth slide

  // Determine bar color
  const getColor = () => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-yellow-400";
    if (score >= 55) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-600";
  };

  // Fun league‑tone labels
  const getLabel = () => {
    if (score >= 85) return "Buddy Jesus approves — dead even";

    if (score >= 70) {
      return netSurplus > 0
        ? `Leaning ${team1Name} — borderline`
        : `Leaning ${team2Name} — borderline`;
    }

    if (score >= 55) {
      return netSurplus > 0
        ? `${team1Name} cooking the books`
        : `${team2Name} cooking the books`;
    }

    return netSurplus > 0
      ? `Highway robbery by ${team1Name}`
      : `Highway robbery by ${team2Name}`;
  };

  return (
    <div className="w-full flex flex-col items-center mt-6 mb-4">
      {/* Label */}
      <div className="text-lg font-semibold mb-2 text-center">
        {getLabel()}
      </div>

      {/* Percentage */}
      <div className="text-sm text-gray-300 mb-2">
        Fairness Estimate: {score}%
      </div>

      {/* Meter Container */}
      <div className="relative w-2/3 h-4 bg-gray-800 rounded-full overflow-hidden">
        {/* Sliding Block */}
        <motion.div
          className={`absolute top-0 h-full ${getColor()}`}
          animate={{ x: `${position}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          style={{
            width: "50%", // medium-width block
            borderRadius: "9999px",
          }}
        />
      </div>
    </div>
  );
}
