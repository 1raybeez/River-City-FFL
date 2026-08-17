# River City FFL Finance Disaster Recovery

This runbook covers the 2026 operational finance ledger and its historical
archive. It is a commissioner operating procedure, not an automated restore
tool.

## Sources of truth

- Open or reconciling finance: the server-only operational ledger in Firestore.
- Closed finance: the highest revision of the immutable operational archive in
  `operational_finance_seasons/{season}/archives`.
- Historical 2016–2025 finance: the checked-in reconciled historical source.
- Public payouts: the allow-listed public presentation, never a private export.

Application exports are recovery artifacts. They are not equivalent to a
Firestore infrastructure backup.

## Commissioner exports

From Commissioner Finance, use the private server-generated export links:

- **Operational Snapshot JSON** — current ledger snapshot; inspect
  `exportStatus`, `seasonMetadata.status`, `generated` context, and
  reconciliation state. It is provisional while the season is open.
- **Closed Archive JSON** — available only after close; contains the immutable
  archive, revisioned manifest, provenance, and archive hash.
- Reconciliation report, dues, obligations, settlements, expenses,
  contributions, and adjustments CSV exports.

Store downloaded artifacts in a restricted location. Never place private
exports in public hosting, client state, or source control.

To verify a closed archive, parse its manifest, confirm the expected season,
schema version, revision, and source league, then recompute the SHA-256 over
the canonical archive JSON using the repository's stable-key serialization.
The computed hash must equal `manifest.archiveHash`. A matching hash proves
content identity for that artifact; it does not by itself prove storage
availability or prevent compromise of the storage location.

## Close and correction procedure

Before close, reconcile the ledger and optionally download the operational
snapshot. Close remains an explicit commissioner action and is not blocked on
an external storage upload.

After close, download the Closed Archive JSON and verify its hash. The close
archive is immutable. If a material correction is required, do not edit or
delete the archive and do not use a normal ledger mutation. Use the controlled
server-side correction workflow with:

1. commissioner authorization;
2. a factual correction reason;
3. a stable idempotency key;
4. the resulting audit event;
5. the correction-state ledger mutations; and
6. an explicit re-close, which creates the next archive revision.

The old revision remains readable. Historical Finance uses only the highest
active revision.

## Restore policy

There is no browser restore/import path. Do not add one casually.

Any future restore must be a server/admin procedure with a dry run first. The
operator must verify:

- Firebase project and destination database;
- season and archive revision;
- schema and rules versions;
- canonical archive hash;
- required collections/documents;
- integer-cent amounts and valid identifiers;
- current target state and expected overwrite behavior.

Require explicit commissioner/admin intent before any authoritative overwrite.
Restore into an isolated project or database first, compare counts, hashes,
reconciliation totals, audit coverage, and public serialization, then perform
the approved recovery action. Never import an unvalidated client upload.

## Infrastructure backup state

The repository contains Firestore rules and Admin SDK access but no checked-in
scheduled backup, managed-backup, PITR, backup-bucket, or restore configuration.
No backup service, billing plan, retention setting, or PITR setting is changed
by this project.

The local finance design documentation records PITR as deferred and managed
backup schedule status as requiring explicit provider-level verification. Treat
the live infrastructure setting as unknown until an authorized operator checks
the Firebase/Google Cloud console or CLI without changing it.

## Recovery scenarios

| Scenario | First action | Source of truth / path | Expected loss window | Verification |
| --- | --- | --- | --- | --- |
| Accidental finance mutation | Stop further writes and preserve the audit/export | Reverse/correct through the server ledger; closed archive remains authoritative | Zero for closed seasons; since last export for open data | Reconcile totals and audit sequence |
| Corrupted open-season data | Stop writes; capture a snapshot | Restore only through an approved admin procedure or reconstruct from validated events | Since last trusted snapshot/export | Counts, cents, reconciliation, and idempotency checks |
| Deleted season document/subcollection | Do not recreate blindly | Managed Firestore backup/export if enabled; otherwise validated operational exports and archive | Since last infrastructure backup/export | Document paths, revision, hash, and ledger totals |
| Incorrect season close | Do not edit revision 1 | Controlled commissioner reopen/correction, then re-close revision 2 | No loss to closed archive; correction window only | Both revisions readable; public view selects revision 2 |
| Bad deployment, data intact | Roll back application deployment | Firestore and archives remain unchanged | None | Smoke test auth, finance reads, exports, and public payouts |
| Entire Firebase project/data loss | Freeze public claims and document incident | Restore infrastructure backup/export into an isolated project; rebuild only after validation | Backup cadence window | Project identity, rules, counts, hashes, and read-only smoke tests |
| Historical finance reproduction without Firestore | Use checked-in history and closed archive artifact | 2016–2025 source plus verified closed archive JSON | None for archived source | Rebuild totals and compare archive hash |

## Retention recommendation

- Keep each closed archive and verified manifest permanently as the season
  record.
- Keep at least one verified operational snapshot before close and before any
  major migration or correction.
- If managed Firestore backups are approved, start with one daily backup and
  14-day retention for the current season, subject to billing approval.
- Keep longer-lived managed exports only when needed for an incident or major
  migration; do not treat them as a replacement for immutable close archives.

## Infrastructure options

- **Recommended now:** keep deterministic commissioner exports, immutable close
  archives, restricted off-machine copies, and conduct one isolated restore
  rehearsal before closing 2026.
- **Optional:** managed scheduled Firestore backups after explicit approval of
  billing, cadence, bucket access, retention, and restore testing.
- **Optional / incident-driven:** one-time managed Firestore export before a
  major migration or correction.
- **Deferred:** PITR. The league has few writers, append-only finance events,
  immutable archives, and deterministic exports; PITR adds paid operational
  complexity and is not required for the first recovery posture.

## Never do this

- Do not edit or delete a closed archive revision.
- Do not restore directly into production without a dry run and project check.
- Do not use public payouts or browser state as a recovery source.
- Do not expose private exports, payment contacts, notes, evidence, emails, or
  internal identifiers.
- Do not make Google Drive a system of record.
- Do not enable PITR, scheduled backups, billing, or retention changes without
  separate commissioner approval.

## Rehearsal

Before the 2026 season is closed, the commissioner should approve an isolated,
read-only rehearsal: export the current snapshot, validate a representative
closed archive fixture and hash, simulate a wrong-season/schema/hash rejection,
and restore only into a non-production target if infrastructure backup is
enabled. Record the result and do not touch production finance state.
