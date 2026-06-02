# Dead Code Inventory

Generated during Phase 2, Step 1. No components have been deleted or moved.

Detection method: searched app, component, and library source for JSX usage and imports of each top-level component. These entries are suspected dead code because no references were found by static search. Dynamic imports or string-based references could still exist, so each item should be confirmed before deletion.

## Suspected Dead Components

| Component | Evidence | Recommendation |
| --- | --- | --- |
| `components/ActivityFeed.tsx` | No import or JSX usage found. It also depends on compatibility Sleeper exports added during Phase 1, suggesting it predates the current route structure. | Preserve for now. Delete later if no page is intended to show recent transactions. Reconnect only if a league activity feed is part of the roadmap. |
| `components/CommishCorner.tsx` | No import or JSX usage found. The app has current commish routes under `app/commish`. | Preserve briefly. Delete later if `app/commish` fully replaces it. |
| `components/Divider.tsx` | No import or JSX usage found. It is a tiny presentational helper with no current consumers. | Delete later if still unused after UI cleanup. |
| `components/DraftBoard.tsx` | No import or JSX usage found. `app/league-info/draft/page.tsx` appears to implement its own draft board view. | Preserve until the draft page is reviewed. Likely delete after confirming the route-specific implementation is preferred. |
| `components/HomeSidebar.tsx` | No import or JSX usage found. It fetches champion details and renders sidebar content, but the homepage appears to have its own layout. | Preserve only if the home page is expected to regain a sidebar. Otherwise delete later. |
| `components/ManagerGrid.tsx` | No import or JSX usage found. It was kept compiling via the Phase 1 `lib/managersData.ts` adapter, but no route uses it. | Delete later unless there is a planned alternate manager gallery. |
| `components/MatchupBoard.tsx` | No import or JSX usage found. `app/matchups/page.tsx` appears to be the active matchup UI. | Preserve until the active matchup route is reviewed. Likely delete after confirming it is superseded. |
| `components/PowerRankings.tsx` | No import or JSX usage found. No current route appears to render it. | Preserve if power rankings are planned; otherwise delete later. |
| `components/TrophyRoom.tsx` | No import or JSX usage found. `app/league-info/trophy-room/page.tsx` appears to provide the active trophy room. | Likely delete later after confirming the app route version is canonical. |
| `components/transactions/TradeApprovalSeal.tsx` | No import or JSX usage found. It depends on `AssistantSealOuterRing`, which is otherwise still used. | Preserve if the trade modal will reuse it; otherwise delete later. |
| `components/transactions/Treasury.tsx` | No import or JSX usage found. `app/league-info/payouts/page.tsx` appears to own the active payout view. | Preserve until payout route review. Likely delete after confirming it is replaced. |

## Components With Confirmed Consumers

These were not marked dead because static references were found:

- `components/ConstitutionSection.tsx`
- `components/ManagerCardsNEW.tsx`
- `components/TradeAnalyzer.tsx`
- `components/theme-provider.tsx`
- `components/transactions/LiveFairnessMeter.tsx`
- `components/AssistantSealOuterRing.tsx`
- `components/VersionEntry.tsx`
- `components/transactions/TradeSummaryModal.tsx`
- `components/ModeToggle.tsx`

## Suggested Follow-Up

1. Confirm whether route-specific pages are canonical replacements for the stale shared components.
2. Move confirmed stale components to a temporary `components/legacy` quarantine or delete them in a focused cleanup commit.
3. Remove any compatibility shims that only existed to keep confirmed-dead components compiling.
