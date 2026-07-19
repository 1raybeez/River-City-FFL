# Auction War Room Production Smoke Checklist

## Deployment

- [ ] Confirm deployment model is Firebase Hosting framework integration with Next.js SSR.
- [ ] Confirm deployed host serves `/commish`.
- [ ] Confirm deployed host serves `/commish/maintenance`.
- [ ] Confirm deployed host serves `/commish/auction`.
- [ ] Confirm `/api/auction/health` is protected.

## Login

- [ ] Sign in as Ray with Google.
- [ ] Confirm Ray reaches `/commish/auction`.
- [ ] Confirm an unapproved account is rejected.
- [ ] Confirm logout clears access.

## Commish Navigation

- [ ] Open the main site navigation.
- [ ] Confirm `Commish` links to `/commish`.
- [ ] Confirm protected commissioner pages still require access.

## Maintenance Health

- [ ] Open `/commish/maintenance`.
- [ ] Click `Run Health Check`.
- [ ] Confirm Firebase project is `river-city-ffl`.
- [ ] Confirm Storage bucket is `river-city-ffl.firebasestorage.app`.
- [ ] Confirm values, ADP, and Sleeper checks are not blocked.

## Auction Value Publish

- [ ] Start a new value refresh run.
- [ ] Upload FantasyPros CSV.
- [ ] Upload RotoWire CSV.
- [ ] Upload Lineup Experts CSV.
- [ ] Validate the run.
- [ ] Review quality gates.
- [ ] Publish the run.
- [ ] Confirm active value run updates without redeploying.

## ADP Publish

- [ ] Start a new ADP refresh run.
- [ ] Upload FantasyPros ADP CSV.
- [ ] Upload RotoWire ADP CSV.
- [ ] Validate the run.
- [ ] Review quality gates.
- [ ] Publish the run.
- [ ] Confirm active ADP run updates without redeploying.

## War Room Source Labels

- [ ] Open `/commish/auction`.
- [ ] Confirm auction values show the published Firestore run.
- [ ] Confirm ADP shows the published Firestore run.
- [ ] Confirm fallback warnings are visible when no active run exists.

## Sleeper Refresh

- [ ] Click Sleeper snapshot refresh.
- [ ] Confirm the 2026 River City league is detected.
- [ ] Confirm auction draft selection.
- [ ] Confirm keepers are detected.
- [ ] Confirm priced draft rows are detected when available.
- [ ] Confirm missing keeper prices produce partial status, not a crash.

## Draft Actions

- [ ] Select a player from the pool.
- [ ] Confirm Current Nomination updates.
- [ ] Record a manual sale.
- [ ] Confirm team budgets update.
- [ ] Undo the sale.
- [ ] Confirm team budgets restore.
- [ ] Confirm Sleeper confirmation does not duplicate a recorded sale.

## Workspaces

- [ ] Confirm Strategy reflects the current draft state.
- [ ] Confirm History reflects live auction history.
- [ ] Confirm League Intel remains readable.
- [ ] Confirm AI Coach opens and responds through the existing API.

## Fallback Behavior

- [ ] Confirm missing active values use local value fallback.
- [ ] Confirm missing active ADP uses local ADP fallback.
- [ ] Confirm temporary Firestore failure shows a compact warning.
- [ ] Confirm temporary Sleeper failure preserves stale snapshot state.

## Rollback

- [ ] Roll back auction values to the previous published run.
- [ ] Confirm War Room value label updates without redeploying.
- [ ] Roll back ADP to the previous published run.
- [ ] Confirm War Room ADP label updates without redeploying.
