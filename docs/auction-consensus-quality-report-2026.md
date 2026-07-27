# Auction Consensus Quality Report 2026

Generated: 2026-07-14T13:34:48.920Z

## Executive Summary

- Generated players: 345
- Source values: 709
- Skipped source values: 0
- Manifest warning labels: 156
- Players with at least one warning label: 153
- Source imports had zero errors.
- Production refresh design can proceed. The warnings are expected review signals, not blockers, as long as production design includes quality gates for unmatched high-value players, source-count drops, and schema failures.

## What The 502 Warnings Mean

The 502 number is not 502 broken players. It is the total number of warning labels attached to generated Masterview rows. A single player can have more than one warning label.

| Warning | Count | Meaning |
| --- | --- | --- |
| low-source-count | 104 | Player has fewer than 2 source values. This is expected for deep players, kickers, defenses, and source-specific long-tail rows. |
| high-source-spread | 48 | At least 2 sources disagree by $10 or by 25% of average value, whichever is larger. |
| identity-review-needed | 2 | Generated row does not have a matched Sleeper ID and should be reviewed before production persistence. |
| match-review-needed | 2 | At least one source row in the consensus group was ambiguous or unmatched. |

Blocker read:

- Not blockers: low-source-count and high-source-spread. These are normal consensus quality signals.
- Review before production persistence: identity-review-needed and match-review-needed. These indicate rows that should stay visible in review reports.
- Hard blockers only if present in future runs: source-row-errors, import errors, missing source files, or a sudden coverage drop.

## Source Count Distribution

| Coverage | Players |
| --- | --- |
| 3+ sources | 123 |
| 2 sources | 118 |
| 1 source | 104 |
| 0 sources | 0 |

## Source Coverage Table

| Source | Rows | Matched | Unmatched | Generated Players Covered | Coverage | Import Warnings | Import Errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FantasyPros | 338 | 338 | 0 | 338 | 98.0% | 0 | 0 |
| Lineup Experts | 242 | 240 | 2 | 242 | 70.1% | 0 | 0 |
| RotoWire | 129 | 128 | 1 | 129 | 37.4% | 0 | 0 |

## Unmatched Players By Source

### FantasyPros

No unmatched rows.

### Lineup Experts

| Player | Position | NFL Team | Value | Match Status |
| --- | --- | --- | --- | --- |
| Chigoziem Okonkwo | TE | WSH | $6 | unmatched |
| Kenneth Gainwell | RB | TB | $5 | unmatched |

### RotoWire

| Player | Position | NFL Team | Value | Match Status |
| --- | --- | --- | --- | --- |
| Kenneth Gainwell | RB | TB | $1 | unmatched |

## Confidence Score Distribution

| Score Bucket | Players |
| --- | --- |
| 90-100 | 192 |
| 75-89 | 49 |
| 50-74 | 102 |
| 25-49 | 0 |
| 0-24 | 2 |

## Disagreement Spread Distribution

Only players with at least two source values are included in this spread table.

| Spread Bucket | Players |
| --- | --- |
| $0 | 39 |
| $1-$4 | 86 |
| $5-$9 | 66 |
| $10-$19 | 26 |
| $20+ | 24 |

Eligible multi-source players: 241

## Top 25 Largest Source Disagreements

| Player | Pos | Team | Sources | Low | High | Spread | Average | Source Values |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| James Cook | RB | BUF | 3 | $17 | $63 | $46 | $38.33 | FantasyPros $35; Lineup Experts $17; RotoWire $63 |
| Derrick Henry | RB | BAL | 3 | $14 | $59 | $45 | $37 | FantasyPros $38; Lineup Experts $14; RotoWire $59 |
| Ashton Jeanty | RB | LV | 3 | $16 | $59 | $43 | $35.67 | FantasyPros $32; Lineup Experts $16; RotoWire $59 |
| Omarion Hampton | RB | LAC | 3 | $9 | $51 | $42 | $29.67 | FantasyPros $29; Lineup Experts $9; RotoWire $51 |
| Jeremiyah Love | RB | ARI | 3 | $9 | $47 | $38 | $27.33 | FantasyPros $26; Lineup Experts $9; RotoWire $47 |
| Chase Brown | RB | CIN | 3 | $9 | $45 | $36 | $28.67 | FantasyPros $32; Lineup Experts $9; RotoWire $45 |
| Bijan Robinson | RB | ATL | 3 | $51 | $86 | $35 | $66.33 | FantasyPros $62; Lineup Experts $51; RotoWire $86 |
| Kenneth Walker | RB | KC | 3 | $11 | $46 | $35 | $27.67 | FantasyPros $26; Lineup Experts $11; RotoWire $46 |
| Breece Hall | RB | NYJ | 3 | $8 | $40 | $32 | $24.67 | FantasyPros $26; Lineup Experts $8; RotoWire $40 |
| Jonathan Taylor | RB | IND | 2 | $37 | $68 | $31 | $52.5 | Lineup Experts $37; RotoWire $68 |
| Saquon Barkley | RB | PHI | 3 | $22 | $53 | $31 | $35.67 | FantasyPros $32; Lineup Experts $22; RotoWire $53 |
| Travis Etienne | RB | NO | 3 | $7 | $38 | $31 | $21.67 | FantasyPros $20; Lineup Experts $7; RotoWire $38 |
| Christian McCaffrey | RB | SF | 3 | $40 | $69 | $29 | $53.67 | FantasyPros $52; Lineup Experts $40; RotoWire $69 |
| Rashee Rice | WR | KC | 3 | $11 | $40 | $29 | $28.67 | FantasyPros $40; Lineup Experts $35; RotoWire $11 |
| Josh Jacobs | RB | GB | 3 | $8 | $34 | $26 | $24 | FantasyPros $30; Lineup Experts $8; RotoWire $34 |
| Kyren Williams | RB | LAR | 3 | $9 | $35 | $26 | $23 | FantasyPros $25; Lineup Experts $9; RotoWire $35 |
| Javonte Williams | RB | DAL | 3 | $8 | $34 | $26 | $21 | FantasyPros $21; Lineup Experts $8; RotoWire $34 |
| Bucky Irving | RB | TB | 3 | $7 | $32 | $25 | $19.67 | FantasyPros $20; Lineup Experts $7; RotoWire $32 |
| David Montgomery | RB | HOU | 3 | $7 | $32 | $25 | $17 | FantasyPros $12; Lineup Experts $7; RotoWire $32 |
| De'Von Achane | RB | MIA | 3 | $30 | $53 | $23 | $41.67 | FantasyPros $42; Lineup Experts $30; RotoWire $53 |
| Jahmyr Gibbs | RB | DET | 3 | $56 | $78 | $22 | $66 | FantasyPros $64; Lineup Experts $56; RotoWire $78 |
| Josh Allen | QB | BUF | 3 | $33 | $55 | $22 | $41.33 | FantasyPros $36; Lineup Experts $55; RotoWire $33 |
| Drake Maye | QB | NE | 3 | $17 | $38 | $21 | $24.67 | FantasyPros $19; Lineup Experts $38; RotoWire $17 |
| D'Andre Swift | RB | CHI | 3 | $8 | $29 | $21 | $18.67 | FantasyPros $19; Lineup Experts $8; RotoWire $29 |
| Drake London | WR | ATL | 3 | $28 | $47 | $19 | $39 | FantasyPros $47; Lineup Experts $42; RotoWire $28 |

## Players With One Source But Meaningful Auction Value

Threshold: average value of $5 or more.

| Player | Pos | Team | Average | Source | Warnings |
| --- | --- | --- | --- | --- | --- |
| Kenny Gainwell | RB | TB | $8 | FantasyPros | low-source-count |
| Chigoziem Okonkwo | TE | WSH | $6 | Lineup Experts | identity-review-needed, low-source-count, match-review-needed |

## Missing From One Or More Major Sources

Missing-source counts:

| Missing Source | Players |
| --- | --- |
| RotoWire | 216 |
| Lineup Experts | 103 |
| FantasyPros | 7 |

Highest-value rows missing at least one major source:

| Player | Pos | Team | Average | Present Sources | Missing Sources |
| --- | --- | --- | --- | --- | --- |
| Jonathan Taylor | RB | IND | $52.5 | Lineup Experts, RotoWire | FantasyPros |
| Jaxon Smith-Njigba | WR | SEA | $50.5 | Lineup Experts, RotoWire | FantasyPros |
| George Pickens | WR | DAL | $31 | Lineup Experts, RotoWire | FantasyPros |
| TreVeyon Henderson | RB | NE | $15 | Lineup Experts, RotoWire | FantasyPros |
| Dallas Goedert | TE | PHI | $10 | FantasyPros, Lineup Experts | RotoWire |
| Jakobi Meyers | WR | JAC | $8 | FantasyPros, Lineup Experts | RotoWire |
| Kenny Gainwell | RB | TB | $8 | FantasyPros | Lineup Experts, RotoWire |
| Michael Pittman | WR | PIT | $8 | FantasyPros, Lineup Experts | RotoWire |
| Rachaad White | RB | WSH | $7.5 | FantasyPros, Lineup Experts | RotoWire |
| Wan'Dale Robinson | WR | TEN | $7.5 | FantasyPros, Lineup Experts | RotoWire |
| Jordan Addison | WR | MIN | $6.5 | FantasyPros, Lineup Experts | RotoWire |
| Quentin Johnston | WR | LAC | $6.5 | FantasyPros, Lineup Experts | RotoWire |
| Xavier Worthy | WR | KC | $6.5 | FantasyPros, Lineup Experts | RotoWire |
| Chigoziem Okonkwo | TE | WSH | $6 | Lineup Experts | FantasyPros, RotoWire |
| Josh Downs | WR | IND | $6 | FantasyPros, Lineup Experts | RotoWire |
| Khalil Shakir | WR | BUF | $6 | FantasyPros, Lineup Experts | RotoWire |
| Makai Lemon | WR | PHI | $6 | FantasyPros, Lineup Experts | RotoWire |
| Hunter Henry | TE | NE | $5.5 | FantasyPros, Lineup Experts | RotoWire |
| Juwan Johnson | TE | NO | $5.5 | FantasyPros, Lineup Experts | RotoWire |
| Tyler Shough | QB | NO | $5.5 | FantasyPros, Lineup Experts | RotoWire |
| Calvin Ridley | WR | TEN | $5 | FantasyPros, Lineup Experts | RotoWire |
| John Metchie | WR | CAR | $5 | FantasyPros, Lineup Experts | RotoWire |
| Jonathon Brooks | RB | CAR | $5 | FantasyPros, Lineup Experts | RotoWire |
| Matthew Golden | WR | GB | $5 | FantasyPros, Lineup Experts | RotoWire |
| Dalton Schultz | TE | HOU | $4.5 | FantasyPros, Lineup Experts | RotoWire |

## K/DEF Warning Patterns

- K/DEF generated rows: 60
- K/DEF rows with warnings: 25
- K/DEF rows with one source: 25
- K/DEF high-spread rows: 0

| Warning | K/DEF Count |
| --- | --- |
| low-source-count | 25 |

Largest K/DEF disagreements:

| Player | Pos | Team | Low | High | Spread | Source Values |
| --- | --- | --- | --- | --- | --- | --- |
| Brandon Aubrey | K | DAL | $1 | $3 | $2 | FantasyPros $1; Lineup Experts $1; RotoWire $3 |
| Denver Broncos | DEF | DEN | $1 | $2 | $1 | FantasyPros $2; Lineup Experts $1 |
| Houston Texans | DEF | HOU | $1 | $2 | $1 | FantasyPros $2; Lineup Experts $1 |
| Minnesota Vikings | DEF | MIN | $1 | $2 | $1 | FantasyPros $2; Lineup Experts $1 |
| Pittsburgh Steelers | DEF | PIT | $1 | $2 | $1 | FantasyPros $2; Lineup Experts $1 |
| Seattle Seahawks | DEF | SEA | $1 | $2 | $1 | FantasyPros $2; Lineup Experts $1 |
| Cameron Dicker | K | LAC | $1 | $2 | $1 | FantasyPros $1; Lineup Experts $1; RotoWire $2 |
| Jason Myers | K | SEA | $1 | $2 | $1 | FantasyPros $1; Lineup Experts $1; RotoWire $2 |
| Ka'imi Fairbairn | K | HOU | $1 | $2 | $1 | FantasyPros $1; Lineup Experts $1; RotoWire $2 |
| Cam Little | K | JAC | $0 | $1 | $1 | FantasyPros $0; Lineup Experts $1; RotoWire $1 |

## Recommended Cleanup Actions

1. Review the 13 unmatched source rows and add aliases only where the Sleeper match is obvious.
2. Review the top high-spread players before trusting the consensus as a draft-day max-bid input.
3. Treat low-source-count as expected for deep players, K, DEF, and source-specific long-tail rows.
4. Add production quality gates for missing source files, import errors, source coverage drops, and high-value unmatched players.
5. Keep generating this report after each CSV refresh and store the report beside the generated Masterview.
6. Consider using a minimum source-count or confidence filter for any future Firestore write path.

## Production Refresh Readiness

Production refresh design can proceed. The current warnings are mostly coverage and disagreement signals. They should be visible in review tooling and logs, but they do not block designing the production refresh pipeline.
