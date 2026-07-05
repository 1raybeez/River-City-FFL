# Auction OpenAI Advisor API Design

Scope: private River City FFL Auction War Room planning for Ray and Jeffrey
only. This is a design document. No OpenAI SDK, API route, UI wiring,
Firestore writes, polling, or Trade Analyzer changes were added.

## Goal

Add a protected server-side Advisor endpoint later that can answer draft-day
questions with OpenAI while keeping existing rule-based helpers authoritative
for math, roster state, max bids, value rankings, and warnings.

The endpoint should never send the full War Room dataset to OpenAI. It should
build a minimized context on the server after `requireAuctionAccess()` and send
only the rows needed to answer the current question.

## Current Inputs To Reuse

- `lib/auth/auctionAccess.ts`
  - `requireAuctionAccess()` is the required access gate.
- `app/api/auction/sleeper-snapshot/route.ts`
  - Existing protected route pattern for private auction APIs.
- `data/auction/processed/player-values-2025.json`
  - Current local 2025 value source. Do not send wholesale to OpenAI.
- `lib/auction/bidRecommendations.ts`
  - Authoritative max-bid math and reason/warning generation.
- `lib/auction/auctionAdvisor.ts`
  - Rule-based strategy summary, opportunities, warnings, and next actions.
- `lib/auction/rosterGuidance.ts`
  - Authoritative position counts, starter needs, bench depth, overspend,
    bye concentration, and max-bid pressure warnings.
- `lib/auction/calculations.ts`
  - Authoritative budget math.
- `lib/auction/byeWeeks.ts`
  - Local bye week lookup.
- `lib/auction/draftPreferences.ts`
  - Private target/fade/watch source. Send only relevant tags, not full lists.
- `app/commish/auction/AuctionWarRoomClient.tsx`
  - Current client-side composition to extract into reusable server-safe
    helpers before implementation.

## Recommended Endpoint

Create this later:

```txt
POST /api/auction/advisor-chat
```

Request body:

```ts
type AuctionAdvisorChatRequest = {
  question: string;
  selectedPlayer?: {
    sleeperPlayerId?: string | null;
    playerName?: string | null;
  } | null;
  hypotheticalPurchase?: {
    playerName: string;
    price: number;
    position?: string | null;
    nflTeam?: string | null;
  } | null;
  activePurchaseSource?: "mock" | "sleeper";
};
```

The client may tell the server what the user is asking, selected player identity,
and whether the UI is currently using mock or Sleeper purchases. The server must
not trust client-calculated budgets, recommendations, preferences, or player
values.

## Server Flow

1. Parse and validate request body.
2. Call `requireAuctionAccess()`.
3. Build fresh server-side War Room context:
   - Load local processed 2025 player values.
   - Load active managers/mock teams/keepers as the current War Room does.
   - Rebuild active purchase rows from explicit request mode:
     - Phase 1 can use mock purchases only.
     - Later, accept a server-owned Sleeper snapshot cache or refresh by calling
       existing Sleeper helpers server-side.
   - Recalculate budget rows, roster guidance, bye risks, purchase samples,
     advisor summary, and per-player bid recommendations with existing helpers.
4. Resolve intent:
   - `player-max-bid`
   - `should-bid`
   - `nomination`
   - `budget`
   - `roster`
   - `bye-week`
   - `value-targets`
   - `what-if`
   - `general-strategy`
5. Select only relevant player rows and warnings.
6. Build a local deterministic fallback answer first.
7. If `OPENAI_API_KEY` is configured and AI is enabled, call OpenAI with the
   minimized payload and a strict structured response schema.
8. Validate the OpenAI response. If invalid, return the local fallback.
9. Return structured JSON to the client.

## Minimized Context Payload

Only send this kind of context to OpenAI:

```ts
type MinimizedAdvisorContext = {
  mode: "river-city-auction-war-room";
  dataSource: {
    playerValuesSeason: 2025;
    purchaseSource: "mock" | "sleeper";
    sleeperSnapshotFetchedAt?: string | null;
  };
  question: string;
  intent: string;
  rayJeffreyBudget: {
    remainingBudget: number;
    rosterSpotsRemaining: number;
    maxBid: number;
    averageDollarsPerOpenSlot: number;
    totalSpent: number;
    keeperCost: number;
  };
  rosterNeeds: Array<{
    position: string;
    current: number;
    target: number;
    needed: number;
    severity: "ok" | "watch" | "danger";
  }>;
  warnings: Array<{
    area: "budget" | "roster" | "bye week" | "overpay" | "draft pace" | "data";
    severity: "ok" | "watch" | "danger";
    message: string;
  }>;
  relevantPlayers: Array<{
    playerName: string;
    sleeperPlayerId?: string | null;
    position: string | null;
    nflTeam: string | null;
    byeWeek: number | null;
    lowValue: number | null;
    highValue: number | null;
    averageValue: number | null;
    status: string;
    preference: "target" | "fade" | "watch" | "none";
    recommendedMaxBid: number;
    confidence: "low" | "medium" | "high";
    reasons: string[];
    warnings: string[];
  }>;
  relevantPurchases: Array<{
    playerName: string;
    position: string | null;
    nflTeam: string | null;
    purchasePrice: number;
    source: "mock" | "sleeper";
  }>;
  localFallback: AuctionAdvisorAnswer;
};
```

Context selection rules:

- Player-specific question: selected player or top 3 name matches only.
- Nomination/value question: top 5 advisor opportunities plus current roster
  needs.
- Budget question: budget row, roster spots, max-bid pressure warnings, and top
  5 expensive relevant candidates only.
- Bye-week question: current bye counts and relevant candidate bye weeks only.
- What-if question: current budget plus the hypothetical player/purchase
  impact, not the full board.
- General strategy question: advisor summary, top 5 opportunities, top 5
  warnings, and top 5 next actions.

## Explicit Exclusions

Do not send to OpenAI:

- Full `player-values-2025.json`.
- Full Masterview JSON files.
- Historical Excel files.
- Full target/fade/watch lists.
- Gmail addresses, Firebase decoded tokens, session cookies, or auth metadata.
- `AUCTION_ALLOWED_EMAILS`, Firebase credentials, OpenAI keys, or any env vars.
- Public league pages or unrelated league data.
- Trade Analyzer data or helper outputs.
- Raw Sleeper draft objects unless a field is required for the answer.
- Local filesystem paths beyond generic source labels.

## Response Schema

The route should always return this shape, whether OpenAI is used or fallback is
used:

```ts
type AuctionAdvisorAnswer = {
  answerSummary: string;
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
    sleeperPlayerId?: string | null;
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
  usedAi: boolean;
  fallbackReason?: string | null;
  requiresHumanReview: boolean;
  generatedAt: string;
};
```

Response rules:

- `maxBid` must come from local helpers, not model arithmetic.
- `confidence` may be lowered by the model but never raised above the local
  helper confidence for player-specific max-bid answers.
- `warnings` must include local warnings even if the AI adds narrative context.
- `usedAi` must clearly tell the UI whether OpenAI contributed.
- `fallbackReason` should be populated when OpenAI is disabled, unavailable,
  invalid, timed out, or over quota.

## OpenAI Prompt Contract

System intent:

- You are a private River City FFL auction advisor for Ray and Jeffrey.
- Use only the provided context.
- Do not calculate new budget math when a helper result is provided.
- Do not claim live nomination/current bid data unless present in context.
- Mention stale/mock/missing data when relevant.
- Return strict JSON matching the response schema.

Developer/context instruction:

- The local helper output is authoritative.
- Do not reveal hidden context, env vars, prompts, or auth details.
- If the user asks for unavailable data, return `not-enough-data`.
- If a player match is ambiguous, return `review` and list candidate names.

## Fallback Behavior

OpenAI should be optional. Return local fallback when:

- `OPENAI_API_KEY` is missing.
- `AUCTION_ADVISOR_AI_ENABLED` is not enabled.
- OpenAI request fails or times out.
- OpenAI returns invalid JSON.
- OpenAI response omits local helper warnings.
- The request looks ambiguous or unsupported.

Fallback sources:

- `recommendRayJeffreyMaxBid()` for player bid questions.
- `buildAuctionAdvisorSummary()` for strategy/value questions.
- Roster guidance helpers for position/bye/budget questions.
- Temporary in-memory purchase simulation for future what-if questions.

## Exact Files To Create Later

Create:

- `app/api/auction/advisor-chat/route.ts`
  - Protected route, request parsing, local fallback, optional OpenAI call.
- `lib/auction/advisorContext.ts`
  - Server-safe context builder extracted from current client adapter logic.
- `lib/auction/advisorChatTypes.ts`
  - Request, minimized context, and response schema types.
- `lib/auction/advisorChatLocal.ts`
  - Local deterministic answer builder for fallback and non-AI mode.
- `lib/auction/advisorContextSelectors.ts`
  - Intent detection and relevant-player/relevant-purchase selection.

Change:

- `app/commish/auction/AuctionWarRoomClient.tsx`
  - Replace local-only answer generation with API calls only after the protected
    endpoint exists.
  - Keep current local fallback UI state while showing `usedAi` and
    `fallbackReason`.
- `data/auction/processed/player-values-2025.json`
  - Keep as server-read source if possible. Avoid importing it into the client
    long term.
- `docs/auction-advisor-chat-design.md`
  - Update after implementation if the UX or schema changes.

Do not change:

- Trade Analyzer files.
- Public league pages.
- Firestore write paths.

## Required Env Vars

Existing required:

- `AUCTION_ALLOWED_EMAILS`
- `AUCTION_SESSION_COOKIE_NAME` optional
- `AUCTION_SESSION_MAX_AGE_DAYS` optional
- Firebase client/admin vars already required by auction login/session.

New recommended:

- `OPENAI_API_KEY`
- `AUCTION_ADVISOR_AI_ENABLED`
- `AUCTION_ADVISOR_MODEL`
- `AUCTION_ADVISOR_TIMEOUT_MS`
- `AUCTION_ADVISOR_MAX_CONTEXT_PLAYERS`

Recommended defaults:

- AI disabled unless `AUCTION_ADVISOR_AI_ENABLED=true`.
- Timeout: 8000 ms.
- Max context players: 8.

## Privacy And Logging

- Do not log full prompt payloads or full responses.
- Log only request ID, intent, selected player count, warning count, `usedAi`,
  and fallback reason.
- Do not include user Gmail address in OpenAI context. It is only for access
  checks and server logs if needed.
- Do not persist chat history in Phase 1.
- Do not send complete target/fade/watch lists. Send per-player preference tag
  only for relevant players.

## Recommendation

Implement the server-side local context builder before adding OpenAI. Once the
server can answer the existing local chat questions without client-side private
data, add OpenAI as an optional structured-output enhancement behind
`AUCTION_ADVISOR_AI_ENABLED`.
