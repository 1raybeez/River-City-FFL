// AssistantSealOuterRing.tsx
import React from "react";

interface AssistantSealOuterRingProps {
  className?: string;
}

const AssistantSealOuterRing: React.FC<AssistantSealOuterRingProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="assistant-seal-title assistant-seal-desc"
    >
      <title id="assistant-seal-title">Assistant to the Commish Trade Approved Seal</title>
      <desc id="assistant-seal-desc">
        A metallic gold circular seal with five stars and the text Assistant to the Commish and Trade Approved.
      </desc>

      {/* Outer beveled ring */}
      <defs>
        <radialGradient id="goldBevel" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#fff7d1" />
          <stop offset="30%" stopColor="#f7d36b" />
          <stop offset="60%" stopColor="#d9a63a" />
          <stop offset="85%" stopColor="#b57b1f" />
          <stop offset="100%" stopColor="#7a4e12" />
        </radialGradient>
      </defs>

      {/* Outer circle */}
      <circle
        cx="100"
        cy="100"
        r="95"
        fill="url(#goldBevel)"
      />

      {/* Inner cutout to create ring */}
      <circle
        cx="100"
        cy="100"
        r="70"
        fill="#111827"
      />

      {/* Inner subtle bevel edge */}
      <circle
        cx="100"
        cy="100"
        r="72"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
      />
      <circle
        cx="100"
        cy="100"
        r="93"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="3"
      />

      {/* Top star */}
      <polygon
        points="100,26 105,38 118,38 107,46 111,58 100,51 89,58 93,46 82,38 95,38"
        fill="#fff8dc"
        stroke="#b8860b"
        strokeWidth="1"
      />

      {/* Four surrounding stars (clockwise from top-right) */}
      <polygon
        points="150,55 154,65 165,65 156,72 159,83 150,77 141,83 144,72 135,65 146,65"
        fill="#fff8dc"
        stroke="#b8860b"
        strokeWidth="1"
      />
      <polygon
        points="170,110 174,120 185,120 176,127 179,138 170,132 161,138 164,127 155,120 166,120"
        fill="#fff8dc"
        stroke="#b8860b"
        strokeWidth="1"
      />
      <polygon
        points="50,55 54,65 65,65 56,72 59,83 50,77 41,83 44,72 35,65 46,65"
        fill="#fff8dc"
        stroke="#b8860b"
        strokeWidth="1"
      />
      <polygon
        points="30,110 34,120 45,120 36,127 39,138 30,132 21,138 24,127 15,120 26,120"
        fill="#fff8dc"
        stroke="#b8860b"
        strokeWidth="1"
      />

      {/* Top text: ASSISTANT TO THE COMMISH */}
      <text
        x="100"
        y="62"
        textAnchor="middle"
        fill="#111827"
        fontSize="11"
        fontWeight="700"
        letterSpacing="2"
        style={{ textTransform: "uppercase" }}
      >
        ASSISTANT TO THE COMMISH
      </text>

      {/* Bottom text: TRADE APPROVED (curved feel via baseline) */}
      <text
        x="100"
        y="150"
        textAnchor="middle"
        fill="#111827"
        fontSize="13"
        fontWeight="800"
        letterSpacing="3"
        style={{ textTransform: "uppercase" }}
      >
        TRADE APPROVED
      </text>
    </svg>
  );
};

export default AssistantSealOuterRing;
