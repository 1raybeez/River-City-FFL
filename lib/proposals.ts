// lib/proposals.ts

export interface RuleProposal {
  id: string;
  submittedBy: string;
  sleeperId: string;
  section: string;
  title: string;
  description: string;
  status: "active" | "passed" | "failed" | "closed";
  votes: {
    yes: string[];
    no: string[];
  };
  createdAt: string;
}

export const INITIAL_PROPOSALS: RuleProposal[] = [
  {
    id: "prop_jordan_2026",
    submittedBy: "Jordan Maslyn",
    sleeperId: "341412060426436608",
    section: "4.3 (Keepers)",
    title: "Roster Continuity Clause",
    description: "Allow keeper eligibility for any player drafted and held on the original owner’s roster for the duration of the season, regardless of starting lineup status.",
    status: 'active',
    votes: { yes: [], no: [] },
    createdAt: "2026-01-19"
  },
  {
    id: "prop_doug_2026",
    submittedBy: "Doug Fordham",
    sleeperId: "73400761740312576",
    section: "1.4 (Authority)",
    title: "The 'Fat Finger' Hardline",
    description: "All confirmed roster moves (Waivers, Trades, FAAB) are final and non-reversible. Owner errors, misclicks, or accidental overbidding are not grounds for Commissioner intervention or league appeals. Owners must accept the outcome of their actions as final.",
    status: 'active',
    votes: { yes: [], no: [] },
    createdAt: "2026-01-19"
  },
  {
    id: "prop_wade_2026",
    submittedBy: "Wade Cameron",
    sleeperId: "342838548870762496",
    section: "6.3-6.4 (Draft)",
    title: "Weekend Getaway Draft",
    description: "Transition the 2026 draft into a mandatory weekend getaway at a VRBO/AirBnB as per the shared analysis sheet.",
    status: 'active',
    votes: { yes: [], no: [] },
    createdAt: "2026-01-19"
  },
  {
    id: "prop_ray_2026",
    submittedBy: "Raymond Long",
    sleeperId: "342828350391230464",
    section: "6.1 (Logistics)",
    title: "2026 Draft Logistics",
    description: "Selection of final date, time, and venue for the upcoming season draft.",
    status: 'active',
    votes: { yes: [], no: [] },
    createdAt: "2026-01-19"
  }
];
