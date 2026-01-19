// lib/constitutionData.ts

export interface ConstitutionSubsection {
  id: string;
  title: string;
  content: string[];
}

export interface ConstitutionSection {
  id: string;
  anchor: string;
  title: string;
  icon: string;
  content?: string[];
  subsections?: ConstitutionSubsection[];
}

const constitutionData: ConstitutionSection[] = [
  {
    id: "1",
    anchor: "governance",
    title: "1. Governance & League Structure",
    icon: "gavel", // Updated icon
    subsections: [
      {
        id: "1.1",
        title: "1.1 League Leadership",
        content: [
          "The River City FFL is governed by the Commissioner and the Assistant to the Commissioner.",
          "Both roles are elected positions and serve as the league’s administrative and procedural leaders."
        ]
      },
      {
        id: "1.2",
        title: "1.2 Commissioner Availability Clause",
        content: [
          "Any reference to 'the Commissioner' shall be interpreted as: 'The Commissioner, or the Assistant to the Commissioner if the Commissioner is unavailable at that time.'"
        ]
      },
      {
        id: "1.3",
        title: "1.3 League Membership",
        content: [
          "The league consists of 12 owners.",
          "Vacancies are filled by league vote.",
          "New owners must agree to all rules and traditions before joining."
        ]
      },
      {
        id: "1.4",
        title: "1.4 Authority Boundaries",
        content: [
          "The Commissioner may enforce rules, correct errors, and maintain fairness, but may not create new rules without league approval."
        ]
      },
      {
        id: "1.5",
        title: "1.5 Sleeper Rule Allowances",
        content: [
          "If a situation is not covered by this constitution and Sleeper allows it, then it is allowed."
        ]
      }
    ]
  },

  {
    id: "2",
    anchor: "traditions",
    title: "2. League Culture, Traditions & Punishments",
    icon: "flag", // Updated icon
    subsections: [
      {
        id: "2.1",
        title: "2.1 Rookie Hazing",
        content: [
          "Your team name will be chosen by the rest of the league before the season starts.",
          "If the draft is held at a brewery, the rookie must buy a drink for the prior champion and the Toilet Bowl loser.",
          "If the draft is held somewhere that does not serve beer, the rookie must bring a case of beer for the league on draft night."
        ]
      },
      {
        id: "2.2",
        title: "2.2 Last Place Punishment",
        content: [
          "The loser of the Toilet Bowl must write an apology letter to the league.",
          "This letter is read aloud before the start of the draft.",
          "Leaving the league does not exempt an owner from completing the punishment."
        ]
      }
    ]
  },

  {
    id: "3",
    anchor: "voting",
    title: "3. Rule Changes & Voting Procedures",
    icon: "scale", // Updated icon
    subsections: [
      {
        id: "3.1",
        title: "3.1 Spring Owners Meeting",
        content: [
          "Held annually in late March or early April.",
          "Format: In-person and/or Zoom.",
          "Quorum: Minimum of 8 owners.",
          "Rule proposals are submitted through the League Website Proposal Portal.",
          "Voting occurs through the League Website Voting System.",
          "Additional meetings may be called for follow-up discussions, replacement owner votes, or emergency one-season rules."
        ]
      },
      {
        id: "3.2",
        title: "3.2 Voting Process",
        content: [
          "Each owner receives one vote.",
          "A simple majority passes a proposal.",
          "Abstentions do not count toward the total."
        ]
      },
      {
        id: "3.3",
        title: "3.3 Implementation Timing",
        content: [
          "Approved rules take effect the following season unless otherwise specified.",
          "Keeper-related changes may require a one-year delay."
        ]
      }
    ]
  },

  {
    id: "4",
    anchor: "rosters",
    title: "4. Rosters, Lineups & Scoring",
    icon: "clipboard-list", // Updated icon
    subsections: [
      {
        id: "4.1",
        title: "4.1 Divisions",
        content: [
          "Divisions are based on the prior season’s final standings:",
          "Division A: 1, 4, 7, 10",
          "Division B: 2, 5, 8, 11",
          "Division C: 3, 6, 9, 12"
        ]
      },
      {
        id: "4.2",
        title: "4.2 Roster Structure",
        content: [
          "16 total players.",
          "Starters: QB, RB, WR, WR, TE, FLEX, D/ST, K.",
          "Bench: 8 bench spots.",
          "IR: 2 IR spots."
        ]
      },
      {
        id: "4.2.1",
        title: "IR Enforcement",
        content: [
          "If you have an illegal IR player, you have until Tuesday morning to correct it.",
          "Repeat violations allow the Commissioner to assign punishment."
        ]
      },
      {
        id: "4.3",
        title: "4.3 Keepers",
        content: [
          "Keepers lock when the draft begins.",
          "Beginning in 2025, teams may retain up to 2 players, with no more than 1 per position.",
          "To be keeper-eligible, the player must have started at least once during the regular season and cannot have been on IR when started.",
          "If a player is dropped after a season-ending injury, they cannot be kept.",
          "If a player was started by another owner and then traded to you, they remain keeper-eligible.",
          "Keeper cost increases by +$10 from the prior year."
        ]
      },
      {
        id: "4.4",
        title: "4.4 Scoring System",
        content: [
          "The league uses Half-PPR scoring.",
          "All offensive, defensive, and special teams scoring follows the full scoring tables in Appendix B."
        ]
      }
    ]
  },

  {
    id: "5",
    anchor: "free-agency",
    title: "5. Free Agency, Waivers & Trading",
    icon: "zap", // Updated icon
    subsections: [
      {
        id: "5.1",
        title: "5.1 Free Agency (FAAB)",
        content: [
          "Budget: $200 (usable in regular season & postseason).",
          "Waivers open Wednesday at 12 PM ET after the draft.",
          "Waivers process daily at 12 PM ET except Tuesday (locked).",
          "$0 bids are allowed.",
          "During playoffs, only teams still competing may acquire players."
        ]
      },
      {
        id: "5.1.1",
        title: "Waiver Tiebreaker",
        content: [
          "Rolling list priority based on draft order.",
          "Any waiver claim moves you to the end of the list."
        ]
      },
      {
        id: "5.2",
        title: "5.2 Trading",
        content: [
          "Offseason: You cannot trade FAAB for players.",
          "Trade deadline: End of Week 10.",
          "Trades auto-approve in Sleeper unless veto flagged.",
          "Any owner may raise a veto flag.",
          "A 24-hour Sleeper poll determines outcome.",
          "Owners involved in the trade may not vote.",
          "FAAB trades follow Sleeper rules only — no manual adjustments.",
          "If you trade for a player who has not yet played, you cannot start them until the following week.",
          "IR-for-IR trades are allowed."
        ]
      }
    ]
  },

  {
    id: "6",
    anchor: "draft",
    title: "6. The Draft",
    icon: "hammer", // Updated icon
    subsections: [
      {
        id: "6.1",
        title: "6.1 Draft Details",
        content: [
          "Date: Friday of Labor Day Weekend (unless determined during the Owners Meeting to be a different date).",
          "Time: Determined during the Owners Meeting.",
          "Location: Determined during the Owners Meeting.",
          "Format: In-person auction draft.",
          "Budget: $200 minus keeper costs.",
          "Length: 4–5 hours.",
          "Attendance: Owners must attend in person or provide an approved substitute.",
          "Exception: Virtual draft permitted only during an approved Adverse Event."
        ]
      },
      {
        id: "6.2",
        title: "6.2 Nomination Order",
        content: [
          "The draft uses a snake nomination order, not a pick order.",
          "Nominations 1–6: Based on regular-season standings for non-playoff teams.",
          "Nominations 7–12: Based on playoff finish."
        ]
      },
      {
        id: "6.3",
        title: "6.3 Pause Tokens",
        content: [
          "Each owner receives 3 tokens.",
          "Each token = 3-minute pause.",
          "Commissioner may pause for breaks or technical issues.",
          "Once out of tokens, no more pauses."
        ]
      }
    ]
  },

  {
    id: "7",
    anchor: "regular-season",
    title: "7. Regular Season",
    icon: "calendar", // Updated icon
    subsections: [
      {
        id: "7.1",
        title: "7.1 Schedule",
        content: [
          "The schedule is generated automatically by Sleeper.",
          "The Commissioner or Assistant Commissioner may adjust the schedule only if the auto-generated version does not ensure that each team plays every team in its division twice.",
          "Any adjustments must be completed before Week 1 kickoff."
        ]
      },
      {
        id: "7.2",
        title: "7.2 Standings",
        content: [
          "Standings are determined by:",
          "1. Overall record",
          "2. Points For",
          "3. Head-to-Head",
          "4. Points Against",
          "5. Coin flip"
        ]
      },
      {
        id: "7.3",
        title: "7.3 Owner Responsibilities",
        content: [
          "Owners must remain active, responsive, and competitive throughout the season."
        ]
      }
    ]
  },

  {
    id: "8",
    anchor: "postseason",
    title: "8. Postseason",
    icon: "trophy", // Updated icon
    subsections: [
      {
        id: "8.1",
        title: "8.1 Playoffs",
        content: [
          "Playoffs begin Week 15.",
          "6 teams qualify.",
          "Seeds 1–3: Division winners.",
          "Seed 4: Best remaining record.",
          "Seeds 5–6: Highest remaining Points For."
        ]
      },
      {
        id: "8.2",
        title: "8.2 Playoff Tiebreakers",
        content: [
          "1. Points For",
          "2. Higher Points Against",
          "3. Head-to-Head",
          "4. Commissioner discretion or coin toss"
        ]
      },
      {
        id: "8.3",
        title: "8.3 Playoff Game Tiebreaker",
        content: [
          "If a playoff matchup ends in a tie, the higher seed wins."
        ]
      },
      {
        id: "8.4",
        title: "8.4 Loser Bracket",
        content: [
          "Winner of the loser bracket receives the #1 nomination in next year’s draft."
        ]
      }
    ]
  },

  {
    id: "9",
    anchor: "issue-resolution",
    title: "9. Issue Resolution Process",
    icon: "handshake", // Updated icon
    subsections: [
      {
        id: "9.1",
        title: "9.1 Step 1 — Mediation & Informal Discussion",
        content: [
          "Any member may initiate a dispute.",
          "Leaders mediate an informal discussion.",
          "Quorum: 6 members."
        ]
      },
      {
        id: "9.2",
        title: "9.2 Step 2 — Group Deliberation & Voting",
        content: [
          "Leaders present dispute details.",
          "Open discussion.",
          "Vote requires 7 of 12.",
          "Quorum: 8 members."
        ]
      },
      {
        id: "9.3",
        title: "9.3 Step 3 — Leaders’ Decision with Appeals",
        content: [
          "Leaders deliberate privately.",
          "Members may appeal within 3 days.",
          "Neutral third party may assist."
        ]
      }
    ]
  },

  {
    id: "10",
    anchor: "conduct",
    title: "10. Communication & Conduct",
    icon: "message-square", // Updated icon
    subsections: [
      {
        id: "10.1",
        title: "10.1 Official Communication Channels",
        content: [
          "Sleeper chat.",
          "League website.",
          "In-person meetings."
        ]
      },
      {
        id: "10.2",
        title: "10.2 Conduct Expectations",
        content: [
          "Sportsmanship.",
          "Responsiveness.",
          "Engagement."
        ]
      },
      {
        id: "10.3",
        title: "10.3 Violations",
        content: [
          "Minor violations result in a warning.",
          "Major violations may result in league review and possible removal."
        ]
      }
    ]
  },

  {
    id: "11",
    anchor: "finance",
    title: "11. Financial Transparency",
    icon: "dollar-sign", // Updated icon
    subsections: [
      {
        id: "11.1",
        title: "11.1 Website as Source of Truth",
        content: [
          "All financial information — dues, payouts, ring cost, rollover — is published on the official Payouts page.",
          "Click here to view the [Payouts Hub](/league-info/payouts)." // Added Link
        ]
      },
      {
        id: "11.2",
        title: "11.2 No Financial Details in Constitution",
        content: [
          "To prevent outdated information, the constitution does not list specific amounts."
        ]
      }
    ]
  },

  {
    id: "12",
    anchor: "revision-history",
    title: "12. Revision History & Amendments",
    icon: "history", // Updated icon
    subsections: [
      {
        id: "12.1",
        title: "12.1 Purpose",
        content: [
          "This section establishes that all past and future rule changes are recorded and accessible to league members."
        ]
      },
      {
        id: "12.2",
        title: "12.2 Website Version History",
        content: [
          "All amendment entries — including dates, sections modified, proposal authors, vote results, and effective seasons — are maintained on the League Website → Version History page."
        ]
      },
      {
        id: "12.3",
        title: "12.3 Constitution Cleanliness",
        content: [
          "The full amendment log is not stored inside this document.",
          "A clickable link at the bottom directs owners to the complete version history."
        ]
      },
      {
        id: "12.4",
        title: "12.4 Update Requirement",
        content: [
          "All approved rule changes must be posted to the website within 7 days."
        ]
      }
    ]
  }
];

export default constitutionData;