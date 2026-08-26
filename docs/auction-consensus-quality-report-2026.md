# Auction Consensus Quality Report 2026

Generated: 2026-08-25T21:58:38.697Z

## Executive Summary

- Generated players: 567
- Source values: 1653
- Skipped source values: 0
- Manifest warning labels: 280
- Players with at least one warning label: 264
- Source imports had zero errors.
- Production refresh design can proceed. The warnings are expected review signals, not blockers, as long as production design includes quality gates for unmatched high-value players, source-count drops, and schema failures.

## What The 502 Warnings Mean

The 502 number is not 502 broken players. It is the total number of warning labels attached to generated Masterview rows. A single player can have more than one warning label.

| Warning | Count | Meaning |
| --- | --- | --- |
| low-source-count | 175 | Player has fewer than 2 source values. This is expected for deep players, kickers, defenses, and source-specific long-tail rows. |
| high-source-spread | 87 | At least 2 sources disagree by $10 or by 25% of average value, whichever is larger. |
| identity-review-needed | 9 | Generated row does not have a matched Sleeper ID and should be reviewed before production persistence. |
| match-review-needed | 9 | At least one source row in the consensus group was ambiguous or unmatched. |

Blocker read:

- Not blockers: low-source-count and high-source-spread. These are normal consensus quality signals.
- Review before production persistence: identity-review-needed and match-review-needed. These indicate rows that should stay visible in review reports.
- Hard blockers only if present in future runs: source-row-errors, import errors, missing source files, or a sudden coverage drop.

## Source Count Distribution

| Coverage | Players |
| --- | --- |
| 3+ sources | 302 |
| 2 sources | 90 |
| 1 source | 175 |
| 0 sources | 0 |

## Source Coverage Table

| Source | Rows | Matched | Unmatched | Generated Players Covered | Coverage | Import Warnings | Import Errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Draft Sharks | 523 | 514 | 9 | 523 | 92.2% | 0 | 0 |
| Fantasy Footballers | 377 | 377 | 0 | 377 | 66.5% | 0 | 0 |
| FantasyPros | 330 | 330 | 0 | 330 | 58.2% | 0 | 0 |
| Lineup Experts | 239 | 237 | 2 | 239 | 42.2% | 0 | 0 |
| RotoWire | 184 | 184 | 0 | 184 | 32.5% | 0 | 0 |

## Unmatched Players By Source

### Draft Sharks

| Player | Position | NFL Team | Value | Match Status |
| --- | --- | --- | --- | --- |
| Kenneth Gainwell | RB | TB | $5 | unmatched |
| Chigoziem Okonkwo | TE | WSH | $1 | unmatched |
| Christopher Brooks | RB | GB | $1 | unmatched |
| Jamarion Miller | RB | NE | $1 | unmatched |
| Nathaniel Dell | WR | HOU | $1 | unmatched |
| Chip Trayanum | RB | NYJ | $1 | unmatched |
| Mitchell Tinsley | WR | CIN | $1 | unmatched |
| Matthew Hibner | TE | BAL | $1 | unmatched |
| Andrew Ogletree | TE | IND | $1 | unmatched |

### Fantasy Footballers

No unmatched rows.

### FantasyPros

No unmatched rows.

### Lineup Experts

| Player | Position | NFL Team | Value | Match Status |
| --- | --- | --- | --- | --- |
| Chigoziem Okonkwo | TE | WSH | $6 | unmatched |
| Kenneth Gainwell | RB | TB | $5 | unmatched |

### RotoWire

No unmatched rows.

## Confidence Score Distribution

| Score Bucket | Players |
| --- | --- |
| 90-100 | 302 |
| 75-89 | 88 |
| 50-74 | 168 |
| 25-49 | 0 |
| 0-24 | 9 |

## Disagreement Spread Distribution

Only players with at least two source values are included in this spread table.

| Spread Bucket | Players |
| --- | --- |
| $0 | 68 |
| $1-$4 | 160 |
| $5-$9 | 76 |
| $10-$19 | 68 |
| $20+ | 20 |

Eligible multi-source players: 392

## Top 25 Largest Source Disagreements

| Player | Pos | Team | Sources | Low | High | Spread | Average | Source Values |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Josh Allen | QB | BUF | 5 | $23 | $55 | $32 | $38 | Draft Sharks $23; Fantasy Footballers $41; FantasyPros $38; Lineup Experts $55; RotoWire $33 |
| James Cook | RB | BUF | 5 | $17 | $48 | $31 | $36.8 | Draft Sharks $42; Fantasy Footballers $48; FantasyPros $35; Lineup Experts $17; RotoWire $42 |
| Derrick Henry | RB | BAL | 5 | $14 | $45 | $31 | $32.6 | Draft Sharks $45; Fantasy Footballers $29; FantasyPros $38; Lineup Experts $14; RotoWire $37 |
| Chase Brown | RB | CIN | 5 | $9 | $39 | $30 | $29.4 | Draft Sharks $39; Fantasy Footballers $30; FantasyPros $32; Lineup Experts $9; RotoWire $37 |
| Jeremiyah Love | RB | ARI | 5 | $9 | $39 | $30 | $25 | Draft Sharks $39; Fantasy Footballers $22; FantasyPros $25; Lineup Experts $9; RotoWire $30 |
| Omarion Hampton | RB | LAC | 5 | $9 | $36 | $27 | $26.6 | Draft Sharks $33; Fantasy Footballers $29; FantasyPros $26; Lineup Experts $9; RotoWire $36 |
| Breece Hall | RB | NYJ | 5 | $8 | $35 | $27 | $23.4 | Draft Sharks $35; Fantasy Footballers $21; FantasyPros $23; Lineup Experts $8; RotoWire $30 |
| Drake Maye | QB | NE | 5 | $11 | $38 | $27 | $22.4 | Draft Sharks $11; Fantasy Footballers $22; FantasyPros $18; Lineup Experts $38; RotoWire $23 |
| Kenneth Walker | RB | KC | 5 | $11 | $35 | $24 | $28.4 | Draft Sharks $34; Fantasy Footballers $34; FantasyPros $28; Lineup Experts $11; RotoWire $35 |
| Bijan Robinson | RB | ATL | 5 | $51 | $73 | $22 | $59.6 | Draft Sharks $58; Fantasy Footballers $73; FantasyPros $61; Lineup Experts $51; RotoWire $55 |
| Josh Jacobs | RB | GB | 5 | $8 | $30 | $22 | $22.6 | Draft Sharks $28; Fantasy Footballers $21; FantasyPros $26; Lineup Experts $8; RotoWire $30 |
| Kyren Williams | RB | LAR | 5 | $9 | $31 | $22 | $22.2 | Draft Sharks $24; Fantasy Footballers $23; FantasyPros $24; Lineup Experts $9; RotoWire $31 |
| Jonathan Taylor | RB | IND | 4 | $37 | $58 | $21 | $45.75 | Draft Sharks $58; Fantasy Footballers $45; Lineup Experts $37; RotoWire $43 |
| Javonte Williams | RB | DAL | 5 | $8 | $29 | $21 | $21.2 | Draft Sharks $27; Fantasy Footballers $20; FantasyPros $22; Lineup Experts $8; RotoWire $29 |
| Puka Nacua | WR | LAR | 5 | $45 | $65 | $20 | $54.4 | Draft Sharks $50; Fantasy Footballers $51; FantasyPros $65; Lineup Experts $61; RotoWire $45 |
| Amon-Ra St. Brown | WR | DET | 5 | $41 | $61 | $20 | $52 | Draft Sharks $61; Fantasy Footballers $53; FantasyPros $56; Lineup Experts $49; RotoWire $41 |
| De'Von Achane | RB | MIA | 5 | $30 | $50 | $20 | $38.6 | Draft Sharks $50; Fantasy Footballers $37; FantasyPros $37; Lineup Experts $30; RotoWire $39 |
| Rashee Rice | WR | KC | 5 | $23 | $43 | $20 | $33 | Draft Sharks $43; Fantasy Footballers $23; FantasyPros $39; Lineup Experts $35; RotoWire $25 |
| Ashton Jeanty | RB | LV | 5 | $16 | $36 | $20 | $26.8 | Draft Sharks $36; Fantasy Footballers $20; FantasyPros $27; Lineup Experts $16; RotoWire $35 |
| Cam Skattebo | RB | NYG | 5 | $8 | $28 | $20 | $19 | Draft Sharks $22; Fantasy Footballers $17; FantasyPros $20; Lineup Experts $8; RotoWire $28 |
| Travis Etienne | RB | NO | 5 | $7 | $26 | $19 | $19 | Draft Sharks $25; Fantasy Footballers $17; FantasyPros $20; Lineup Experts $7; RotoWire $26 |
| Jaylen Warren | RB | PIT | 5 | $1 | $20 | $19 | $9.4 | Draft Sharks $8; Fantasy Footballers $1; FantasyPros $12; Lineup Experts $6; RotoWire $20 |
| Jahmyr Gibbs | RB | DET | 5 | $56 | $74 | $18 | $62.6 | Draft Sharks $61; Fantasy Footballers $74; FantasyPros $64; Lineup Experts $56; RotoWire $58 |
| Colston Loveland | TE | CHI | 5 | $10 | $28 | $18 | $19.8 | Draft Sharks $17; Fantasy Footballers $18; FantasyPros $28; Lineup Experts $10; RotoWire $26 |
| Jaylen Waddle | WR | DEN | 5 | $8 | $26 | $18 | $17.4 | Draft Sharks $16; Fantasy Footballers $26; FantasyPros $16; Lineup Experts $8; RotoWire $21 |

## Players With One Source But Meaningful Auction Value

Threshold: average value of $5 or more.

| Player | Pos | Team | Average | Source | Warnings |
| --- | --- | --- | --- | --- | --- |

## Missing From One Or More Major Sources

Missing-source counts:

| Missing Source | Players |
| --- | --- |
| RotoWire | 383 |
| Lineup Experts | 328 |
| FantasyPros | 237 |
| Fantasy Footballers | 190 |
| Draft Sharks | 44 |

Highest-value rows missing at least one major source:

| Player | Pos | Team | Average | Present Sources | Missing Sources |
| --- | --- | --- | --- | --- | --- |
| Jaxon Smith-Njigba | WR | SEA | $50.5 | Draft Sharks, Fantasy Footballers, Lineup Experts, RotoWire | FantasyPros |
| Jonathan Taylor | RB | IND | $45.75 | Draft Sharks, Fantasy Footballers, Lineup Experts, RotoWire | FantasyPros |
| George Pickens | WR | DAL | $30.25 | Draft Sharks, Fantasy Footballers, Lineup Experts, RotoWire | FantasyPros |
| TreVeyon Henderson | RB | NE | $13 | Draft Sharks, Fantasy Footballers, Lineup Experts, RotoWire | FantasyPros |
| Jared Goff | QB | DET | $8.75 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Matthew Stafford | QB | LAR | $8.75 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Kyler Murray | QB | MIN | $7.75 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Tyler Shough | QB | NO | $7.75 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Baker Mayfield | QB | TB | $7 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Kenneth Gainwell | RB | TB | $5 | Draft Sharks, Lineup Experts | Fantasy Footballers, FantasyPros, RotoWire |
| Kenny Gainwell | RB | TB | $5 | Fantasy Footballers, FantasyPros, RotoWire | Draft Sharks, Lineup Experts |
| Stefon Diggs | WR | WSH | $4.5 | Draft Sharks, Fantasy Footballers, FantasyPros, RotoWire | Lineup Experts |
| Malik Willis | QB | MIA | $4 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Chigoziem Okonkwo | TE | WSH | $3.5 | Draft Sharks, Lineup Experts | Fantasy Footballers, FantasyPros, RotoWire |
| John Metchie | WR | CAR | $3.5 | Draft Sharks, Lineup Experts | Fantasy Footballers, FantasyPros, RotoWire |
| Theo Wease | WR | MIA | $3.5 | Draft Sharks, Lineup Experts | Fantasy Footballers, FantasyPros, RotoWire |
| Tank Dell | WR | HOU | $3.33 | Fantasy Footballers, FantasyPros, Lineup Experts | Draft Sharks, RotoWire |
| Greg Dulcich | TE | MIA | $2.5 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Pat Freiermuth | TE | PIT | $2.5 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| T.J. Hockenson | TE | MIN | $2.5 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| De'Zhaun Stribling | WR | SF | $2.25 | Draft Sharks, Fantasy Footballers, FantasyPros, RotoWire | Lineup Experts |
| Kenyon Sadiq | TE | NYJ | $2.25 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Terrance Ferguson | TE | LAR | $2.25 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Cade Otton | TE | TB | $2 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |
| Colby Parkinson | TE | LAR | $2 | Draft Sharks, Fantasy Footballers, FantasyPros, Lineup Experts | RotoWire |

## K/DEF Warning Patterns

- K/DEF generated rows: 55
- K/DEF rows with warnings: 7
- K/DEF rows with one source: 7
- K/DEF high-spread rows: 0

| Warning | K/DEF Count |
| --- | --- |
| low-source-count | 7 |

Largest K/DEF disagreements:

| Player | Pos | Team | Low | High | Spread | Source Values |
| --- | --- | --- | --- | --- | --- | --- |
| Brandon Aubrey | K | DAL | $1 | $5 | $4 | Draft Sharks $5; Fantasy Footballers $1; FantasyPros $1; Lineup Experts $1; RotoWire $1 |
| Denver Broncos | DEF | DEN | $1 | $3 | $2 | Fantasy Footballers $3; FantasyPros $2; Lineup Experts $1 |
| Houston Texans | DEF | HOU | $1 | $3 | $2 | Fantasy Footballers $3; FantasyPros $2; Lineup Experts $1 |
| Cameron Dicker | K | LAC | $1 | $3 | $2 | Draft Sharks $3; Fantasy Footballers $1; FantasyPros $1; Lineup Experts $1; RotoWire $1 |
| Seattle Seahawks | DEF | SEA | $1 | $2 | $1 | Fantasy Footballers $2; FantasyPros $2; Lineup Experts $1 |
| Los Angeles Rams | DEF | LAR | $1 | $2 | $1 | Fantasy Footballers $2; FantasyPros $1; Lineup Experts $1 |
| Minnesota Vikings | DEF | MIN | $1 | $2 | $1 | Fantasy Footballers $1; FantasyPros $2; Lineup Experts $1 |
| Philadelphia Eagles | DEF | PHI | $1 | $2 | $1 | Fantasy Footballers $2; FantasyPros $1; Lineup Experts $1 |
| Pittsburgh Steelers | DEF | PIT | $1 | $2 | $1 | Fantasy Footballers $1; FantasyPros $2; Lineup Experts $1 |
| Harrison Mevis | K | LAR | $0 | $1 | $1 | Draft Sharks $1; Fantasy Footballers $1; FantasyPros $1; Lineup Experts $0; RotoWire $1 |

## Recommended Cleanup Actions

1. Review the 13 unmatched source rows and add aliases only where the Sleeper match is obvious.
2. Review the top high-spread players before trusting the consensus as a draft-day max-bid input.
3. Treat low-source-count as expected for deep players, K, DEF, and source-specific long-tail rows.
4. Add production quality gates for missing source files, import errors, source coverage drops, and high-value unmatched players.
5. Keep generating this report after each CSV refresh and store the report beside the generated Masterview.
6. Consider using a minimum source-count or confidence filter for any future Firestore write path.

## Production Refresh Readiness

Production refresh design can proceed. The current warnings are mostly coverage and disagreement signals. They should be visible in review tooling and logs, but they do not block designing the production refresh pipeline.
