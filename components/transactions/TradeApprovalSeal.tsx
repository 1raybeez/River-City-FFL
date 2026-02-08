import React from "react";
import AssistantSealOuterRing from "../AssistantSealOuterRing";

const TradeApprovalSeal: React.FC = () => {
  return (
    <div className="relative inline-flex items-center justify-center w-32 h-32">
      {/* Outer gold ring */}
      <AssistantSealOuterRing className="w-32 h-32" />

      {/* Inner glowing Buddy Jesus silhouette */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="w-16 h-16 drop-shadow-[0_0_14px_rgba(255,255,255,0.9)]"
          fill="white"
          stroke="white"
          strokeWidth="2"
        >
          <path d="M40 10c-4 0-8 4-8 8v20H22c-4 0-8 3-9 7l-5 20c-1 5 3 9 8 9h18v10c0 4 3 8 8 8h6c4 0 7-3 8-7l6-28h10c6 0 11-4 12-10l3-14c1-6-3-12-9-13H64V18c0-4-4-8-8-8H40z" />
        </svg>
      </div>
    </div>
  );
};

export default TradeApprovalSeal;
