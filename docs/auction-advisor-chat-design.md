# River City Auction Advisor Chat Design

Scope: private River City FFL Auction War Room planning for Ray and Jeffrey
only. This is a design document. No chat UI, OpenAI/API calls, routes,
Firestore writes, polling, or Trade Analyzer changes were made.

## Existing War Room Inputs

The current War Room already has the right read-only ingredients for a chat
assistant:

- `lib/auction/auctionAdvisor.ts`: rule-based strategy summary, value targets,
  warning areas, and next actions.
- `lib/auction/bidRecommendations.ts`: pure per-player max-bid guidance with
  reasons, warnings, confidence, budget state, roster need, preference, bye
  risk, and market inflation inputs.
- `lib/auction/rosterGuidance.ts`: pure roster counts, starter/depth needs,
  overspend warnings, bye concentration warnings, and max-bid pressure warnings.
- `lib/auction/calculations.ts`: pure keeper cost, spend, remaining budget,
  roster spots, max bid, and average dollars per open slot.
- `lib/auction/byeWeeks.ts`: local 2025 NFL bye week lookup.
- `lib/auction/draftPreferences.ts`: local Ray/Jeffrey target, fade, and watch
  lists.
- `app/commish/auction/AuctionWarRoomClient.tsx`: current client composition of
  processed 2025 player values, active purchase source, Ray/Jeffrey budget row,
  roster guidance, player selection, and manual Sleeper snapshot state.
- `app/api/auction/sleeper-snapshot/route.ts`: protected read-only Sleeper
  purchase snapshot API.

## Recommended Approach

Use a hybrid path:

1. Local rule-based chat first for predictable draft math questions.
2. OpenAI API later as a narrative layer over a server-built, minimized War Room
   payload.
3. Keep local helpers authoritative for max bids, budget math, roster needs,
   taken status, bye risk, and value target ranking.

This avoids making the model responsible for arithmetic, access control, or data
selection. The AI should explain and synthesize; the existing helper functions
should calculate.

## Chat UX Placement

Place the chat near the current Auction Advisor, not inside public navigation:

- Add a compact `Advisor Chat` panel directly below or beside the Auction
  Advisor on desktop.
- On mobile, use a single full-width panel below the Auction Advisor summary.
- Include starter-question chips above the input.
- Keep a short message history in component state only for the first version.
- Show a persistent data-source label: `Using Sleeper snapshot purchases` or
  `Using mock purchases`.
- Add a small `Read-only` badge and plain text that no roster, budget, or draft
  data is being written.
- When a Player Pool row is selected, prefill contextual chips such as `Should I
  bid on this player?` and `Explain max bid`.

Avoid a floating global chat button for the first version. The assistant is a
draft tool, not a site-wide feature.

## Starter Questions

Suggested chips:

- `Should I bid on this player?`
- `What is my max bid for Bijan?`
- `Who should I nominate next?`
- `Am I overspending at RB?`
- `What happens if I buy this WR for $42?`
- `Which targets fit my remaining budget?`
- `Are there bye week risks?`
- `Who is the best value left?`
- `Show value targets under my max bid`
- `What positions should I stop buying?`

## Prompt And Context Shape

Later implementation should build chat context on the server after
`requireAuctionAccess()`. Do not ask the client to send the full War Room state
as authoritative input.

High-level request shape:

```ts
type AuctionAdvisorChatRequest = {
  question: string;
  selectedPlayerId?: string | null;
  selectedPlayerName?: string | null;
  hypotheticalPurchase?: {
    playerName: string;
    price: number;
    position?: string | null;
    nflTeam?: string | null;
  } | null;
  clientContext?: {
    activePurchaseSource: "sleeper" | "mock";
    sleeperSnapshotFetchedAt?: string | null;
  };
};
```

Server-built AI context:

```ts
type AuctionAdvisorChatContext = {
  access: {
    audience: "ray-jeffrey-private";
    userEmail: string;
  };
  dataFreshness: {
    playerValuesSeason: 2025;
    sleeperSeason: 2026;
    activePurchaseSource: "sleeper" | "mock";
    sleeperSnapshotFetchedAt: string | null;
  };
  rayJeffreyBudget: {
    teamName: string;
    teamBudget: number;
    keeperCost: number;
    totalSpent: number;
    remainingBudget: number;
    rosterSpotsRemaining: number;
    maxBid: number;
    averageDollarsPerOpenSlot: number;
  };
  rosterGuidance: {
    positionCounts: Record<string, number>;
    starterNeeds: Array<{ label: string; current: number; target: number; needed: number; severity: string }>;
    benchDepthNeeds: Array<{ label: string; current: number; target: number; needed: number; severity: string }>;
    warnings: Array<{ title: string; message: string; severity: string }>;
  };
  advisorSummary: {
    headline: string;
    currentStrategy: string;
    bestValueOpportunities: Array<{
      playerName: string;
      position: string | null;
      nflTeam: string | null;
      averageValue: number | null;
      recommendedMaxBid: number | null;
      preference: "target" | "fade" | "watch" | "none";
      reason: string;
    }>;
    warnings: Array<{ area: string; severity: string; message: string }>;
    nextRecommendedActions: string[];
  };
  relevantPlayers: Array<{
    sleeperPlayerId: string | null;
    playerName: string;
    matchedSleeperName: string | null;
    position: string | null;
    nflTeam: string | null;
    byeWeek: number | null;
    lowValue: number | null;
    highValue: number | null;
    averageValue: number | null;
    matchStatus: string;
    takenStatus: string;
    preference: "target" | "fade" | "watch" | "none";
    localMaxBid: number | null;
    reasons: string[];
    warnings: string[];
  }>;
  purchases: Array<{
    playerName: string;
    position: string | null;
    nflTeam: string | null;
    rosterId: number | null;
    teamName: string | null;
    purchasePrice: number;
    source: "sleeper" | "mock";
  }>;
};
```

The payload should include only the top relevant player rows for the question,
not the entire processed JSON file by default. Examples:

- Player-specific question: selected player plus close name matches.
- Nomination question: top value targets, targets/watchlist, and position needs.
- Budget question: Ray/Jeffrey budget row, purchases, and roster needs.
- Bye question: rostered player bye counts plus candidate bye weeks.
- What-if question: current state plus one hypothetical purchase row.

## Response Format

The chat response should be structured before rendering:

```ts
type AuctionAdvisorChatResponse = {
  answer: string;
  recommendation:
    | "bid"
    | "do-not-bid"
    | "nominate"
    | "wait"
    | "review"
    | "not-enough-data";
  confidence: "low" | "medium" | "high";
  maxBid?: number | null;
  affectedPlayer?: {
    playerName: string;
    position: string | null;
    nflTeam: string | null;
  } | null;
  reasons: string[];
  warnings: Array<{
    area: "budget" | "roster" | "bye week" | "overpay" | "draft pace" | "data";
    severity: "ok" | "watch" | "danger";
    message: string;
  }>;
  nextActions: string[];
  dataSourceLabel: string;
  requiresHumanReview: boolean;
};
```

The UI can render this as a normal chat bubble with expandable `Reasons`,
`Warnings`, and `Next actions`.

## Guardrails

- Require `requireAuctionAccess()` for any future chat API.
- Allow only Ray/Jeffrey allowlisted session users.
- Keep the assistant read-only. It must never update Firestore, Sleeper,
  local JSON, preferences, keepers, or purchases.
- Treat existing pure helpers as authoritative for math.
- The assistant must say when data is mock, stale, missing, unmatched, or based
  on a small Sleeper sample.
- The assistant must not reveal environment variables, session cookies, Gmail
  addresses, Firebase tokens, raw workbook paths beyond normal local source
  labels, or implementation secrets.
- The assistant must not use public league pages, Trade Analyzer logic, or
  unrelated site data.
- The assistant should not invent live nomination/current bid data unless that
  endpoint exists later.
- For unclear player names, return candidate matches and ask Ray/Jeffrey to
  choose rather than guessing.
- For any arithmetic-heavy answer, include the relevant budget cap, average
  value, current spend source, and one-sentence explanation.

## Privacy Risks

- The page contains private draft strategy: targets, fades, watchlist, max-bid
  guidance, roster needs, and budget tactics.
- Sleeper snapshot purchases may reveal live draft state and opponent behavior.
- A future chat API could accidentally send too much processed player data to an
  AI provider if the context is not minimized.
- Client-imported local JSON is already visible to anyone who can access the
  private page; keep page/API access locked to Ray and Jeffrey.
- Do not send Gmail addresses to the AI unless absolutely necessary. The server
  can use email for authorization and omit it from model context.
- Do not log full prompts, full payloads, or chat answers in production by
  default. If debugging is needed, log request IDs and summary counts instead.

## Fallback Behavior

If AI is unavailable, disabled, over quota, or returns invalid JSON:

- Answer using local rule-based helpers only.
- For player-specific questions, call the same logic behind
  `recommendRayJeffreyMaxBid()`.
- For strategy questions, return `buildAuctionAdvisorSummary()`.
- For roster/budget/bye questions, return the current roster guidance and budget
  warnings.
- For what-if questions, calculate a temporary in-memory purchase state and show
  before/after budget, roster count, max bid, and warnings.
- Show a clear UI state: `Using rule-based Advisor only`.

## Future Implementation Plan

1. Extract client-side War Room adapter logic into pure reusable helper modules
   so both UI and future API can build the same context.
2. Add a protected read-only route such as `app/api/auction/advisor-chat/route.ts`.
3. In that route, call `requireAuctionAccess()`.
4. Build a minimized `AuctionAdvisorChatContext` server-side from local
   processed values, active managers, local preferences, and optionally the
   latest manually fetched Sleeper snapshot if that state is made available to
   the server.
5. Implement local intent handling first:
   - player max bid
   - nominate next
   - overspending by position
   - bye risk
   - best value left
   - what-if purchase
6. Add OpenAI only after local responses work, using a strict structured output
   schema and local helper outputs as facts.
7. Render responses in the War Room chat panel with source labels and warnings.

## Recommendation

Build local rule-based chat first, then add OpenAI as an optional summarization
and reasoning layer. A hybrid approach is safest because the War Room already
has deterministic helpers for the numbers Ray and Jeffrey need to trust during
the draft.
