# 2026 Auction War Room Decision Score Calibration

> CALIBRATION ONLY — NOT PRODUCTION LOGIC — NO WEIGHTS APPROVED

Generated from local 2026 masterview and ADP artifacts. Player universe: **558** players with canonical Sleeper IDs and valid Auction consensus.
Players with Auction + ADP: **439**; Auction-only: **119**.

## Confidence semantics
The masterview `confidenceScore` is not player quality. It is `min(average match confidence, average source confidence)`, reduced by penalties for missing Sleeper identity, fewer than two sources, high source spread, match review, row warnings, and row errors. The harness uses it only as evidence quality alongside source coverage; it is not treated as a projection.

## Components
- Auction component: percentile rank of `averageValue` across the valid Auction universe × 100; higher dollar value is stronger.
- ADP component: inverse percentile rank of `consensusOverallAdp` across players with ADP × 100; lower ADP is stronger.
- Quality component: average of Auction source coverage and masterview confidence; when ADP exists, average that Auction evidence with ADP source coverage. Missing ADP is not a zero-quality score.

## Coverage by position
- QB: 42 total; 38 with ADP; 4 Auction-only.
- RB: 131 total; 110 with ADP; 21 Auction-only.
- WR: 206 total; 149 with ADP; 57 Auction-only.
- TE: 106 total; 75 with ADP; 31 Auction-only.
- K: 41 total; 36 with ADP; 5 Auction-only.
- DEF: 14 total; 14 with ADP; 0 Auction-only.

## Candidate model weights
| Model | Auction | ADP | Quality | Missing ADP treatment |
|---|---:|---:|---:|---|
| MODEL A | 50% | 35% | 15% | Proportional reweight in harness |
| MODEL B | 55% | 30% | 15% | Proportional reweight in harness |
| MODEL C | 60% | 30% | 10% | Proportional reweight in harness |
| MODEL D | 65% | 25% | 10% | Proportional reweight in harness |
| MODEL E | 70% | 20% | 10% | Proportional reweight in harness |
| CONTROL AUCTION | 100% | — | — | Auction-only |
| CONTROL ADP | — | 100% | — | ADP-present players only |
| CURRENT BEST-OVERALL APPROXIMATION | 62.5% | 37.5% | 0% | Renormalized 25:15 market ratio |

### MODEL A

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.4 | 5 | 5 |
| 2 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 99.2 | 5 | 5 |
| 3 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.1 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 98.7 | 5 | 5 |
| 5 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 98.4 | 5 | 5 |
| 6 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 98.3 | 5 | 5 |
| 7 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 97.8 | 5 | 5 |
| 8 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 97.6 | 4 | 5 |
| 9 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 97.6 | 5 | 5 |
| 10 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.4 | 5 | 5 |
| 11 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 97.3 | 4 | 5 |
| 12 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.2 | 5 | 5 |
| 13 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 96.8 | 5 | 5 |
| 14 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.7 | 5 | 5 |
| 15 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.5 | 5 | 5 |
| 16 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 96.4 | 5 | 5 |
| 17 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.3 | 5 | 5 |
| 18 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 96.2 | 5 | 5 |
| 19 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 96.1 | 5 | 5 |
| 20 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 96.1 | 5 | 5 |
| 21 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.1 | 5 | 5 |
| 22 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 96.1 | 5 | 5 |
| 23 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 95.8 | 5 | 5 |
| 24 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.8 | 5 | 5 |
| 25 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 95.7 | 5 | 5 |
| 26 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 95.5 | 5 | 5 |
| 27 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 95.2 | 4 | 5 |
| 28 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 94.8 | 5 | 5 |
| 29 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 94.7 | 5 | 5 |
| 30 | DeVonta Smith | WR | PHI | $24.6 | 94.8 | 34.0 | 92.5 | 98.5 | 94.6 | 5 | 5 |

### MODEL B

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.4 | 5 | 5 |
| 2 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 99.2 | 5 | 5 |
| 3 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.1 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 98.7 | 5 | 5 |
| 5 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 98.4 | 5 | 5 |
| 6 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 98.3 | 5 | 5 |
| 7 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 97.8 | 5 | 5 |
| 8 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 97.7 | 5 | 5 |
| 9 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 97.6 | 4 | 5 |
| 10 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.4 | 5 | 5 |
| 11 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 97.3 | 4 | 5 |
| 12 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.2 | 5 | 5 |
| 13 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 96.9 | 5 | 5 |
| 14 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.8 | 5 | 5 |
| 15 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 96.5 | 5 | 5 |
| 16 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.5 | 5 | 5 |
| 17 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 96.3 | 5 | 5 |
| 18 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 96.3 | 5 | 5 |
| 19 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.3 | 5 | 5 |
| 20 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 96.2 | 5 | 5 |
| 21 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.0 | 5 | 5 |
| 22 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 96.0 | 5 | 5 |
| 23 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 95.9 | 5 | 5 |
| 24 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.7 | 5 | 5 |
| 25 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 95.6 | 5 | 5 |
| 26 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 95.6 | 5 | 5 |
| 27 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 95.3 | 4 | 5 |
| 28 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 94.8 | 5 | 5 |
| 29 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 94.8 | 5 | 5 |
| 30 | DeVonta Smith | WR | PHI | $24.6 | 94.8 | 34.0 | 92.5 | 98.5 | 94.7 | 5 | 5 |

### MODEL C

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 99.5 | 5 | 5 |
| 2 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.5 | 5 | 5 |
| 3 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.3 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 99.0 | 5 | 5 |
| 5 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 98.6 | 5 | 5 |
| 6 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 98.6 | 5 | 5 |
| 7 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 98.1 | 4 | 5 |
| 8 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 98.0 | 5 | 5 |
| 9 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 97.8 | 4 | 5 |
| 10 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 97.8 | 5 | 5 |
| 11 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.6 | 5 | 5 |
| 12 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.4 | 5 | 5 |
| 13 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 97.1 | 5 | 5 |
| 14 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 96.7 | 5 | 5 |
| 15 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.7 | 5 | 5 |
| 16 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.6 | 5 | 5 |
| 17 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 96.5 | 5 | 5 |
| 18 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 96.4 | 5 | 5 |
| 19 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.4 | 5 | 5 |
| 20 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 96.1 | 5 | 5 |
| 21 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.1 | 5 | 5 |
| 22 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 96.0 | 5 | 5 |
| 23 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 95.8 | 5 | 5 |
| 24 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 95.8 | 5 | 5 |
| 25 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.8 | 5 | 5 |
| 26 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 95.6 | 5 | 5 |
| 27 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 95.4 | 4 | 5 |
| 28 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 94.8 | 5 | 5 |
| 29 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 94.8 | 5 | 5 |
| 30 | DeVonta Smith | WR | PHI | $24.6 | 94.8 | 34.0 | 92.5 | 98.5 | 94.5 | 5 | 5 |

### MODEL D

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 99.5 | 5 | 5 |
| 2 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.5 | 5 | 5 |
| 3 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.3 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 99.0 | 5 | 5 |
| 5 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 98.6 | 5 | 5 |
| 6 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 98.5 | 5 | 5 |
| 7 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 98.1 | 4 | 5 |
| 8 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 98.0 | 5 | 5 |
| 9 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 97.9 | 5 | 5 |
| 10 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 97.8 | 4 | 5 |
| 11 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.5 | 5 | 5 |
| 12 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.4 | 5 | 5 |
| 13 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 97.2 | 5 | 5 |
| 14 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 96.8 | 5 | 5 |
| 15 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.8 | 5 | 5 |
| 16 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 96.5 | 5 | 5 |
| 17 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 96.5 | 5 | 5 |
| 18 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.5 | 5 | 5 |
| 19 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.4 | 5 | 5 |
| 20 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 96.1 | 5 | 5 |
| 21 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 96.0 | 5 | 5 |
| 22 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.0 | 5 | 5 |
| 23 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 95.9 | 5 | 5 |
| 24 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 95.9 | 5 | 5 |
| 25 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.8 | 5 | 5 |
| 26 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 95.6 | 5 | 5 |
| 27 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 95.5 | 4 | 5 |
| 28 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 94.9 | 5 | 5 |
| 29 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 94.8 | 5 | 5 |
| 30 | DeVonta Smith | WR | PHI | $24.6 | 94.8 | 34.0 | 92.5 | 98.5 | 94.6 | 5 | 5 |

### MODEL E

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 99.5 | 5 | 5 |
| 2 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.5 | 5 | 5 |
| 3 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.3 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 99.0 | 5 | 5 |
| 5 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 98.7 | 5 | 5 |
| 6 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 98.5 | 5 | 5 |
| 7 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 98.1 | 4 | 5 |
| 8 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 98.1 | 5 | 5 |
| 9 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 97.9 | 5 | 5 |
| 10 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 97.8 | 4 | 5 |
| 11 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.5 | 5 | 5 |
| 12 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.5 | 5 | 5 |
| 13 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 97.3 | 5 | 5 |
| 14 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 96.9 | 5 | 5 |
| 15 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.8 | 5 | 5 |
| 16 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 96.7 | 5 | 5 |
| 17 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 96.6 | 5 | 5 |
| 18 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.5 | 5 | 5 |
| 19 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.5 | 5 | 5 |
| 20 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 96.2 | 5 | 5 |
| 21 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 96.1 | 5 | 5 |
| 22 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 96.1 | 5 | 5 |
| 23 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.0 | 5 | 5 |
| 24 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 95.8 | 5 | 5 |
| 25 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.7 | 5 | 5 |
| 26 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 95.6 | 4 | 5 |
| 27 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 95.5 | 5 | 5 |
| 28 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 94.9 | 5 | 5 |
| 29 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 94.8 | 5 | 5 |
| 30 | DeVonta Smith | WR | PHI | $24.6 | 94.8 | 34.0 | 92.5 | 98.5 | 94.7 | 5 | 5 |

### CONTROL AUCTION

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 100.0 | 5 | 5 |
| 2 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.8 | 5 | 5 |
| 3 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.6 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 99.5 | 5 | 5 |
| 5 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 99.3 | 5 | 5 |
| 6 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 99.1 | 4 | 5 |
| 7 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 98.9 | 5 | 5 |
| 8 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 98.7 | 4 | 5 |
| 9 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 98.6 | 5 | 5 |
| 10 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 98.4 | 5 | 5 |
| 11 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 98.0 | 5 | 5 |
| 12 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 98.0 | 5 | 5 |
| 13 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 97.8 | 5 | 5 |
| 14 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.7 | 5 | 5 |
| 15 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 97.5 | 5 | 5 |
| 16 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 97.3 | 5 | 5 |
| 17 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 97.1 | 5 | 5 |
| 18 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.9 | 5 | 5 |
| 19 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.8 | 5 | 5 |
| 20 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 96.4 | 5 | 5 |
| 21 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.4 | 5 | 5 |
| 22 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 96.2 | 4 | 5 |
| 23 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 96.1 | 5 | 5 |
| 24 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 95.9 | 5 | 5 |
| 25 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.7 | 5 | 5 |
| 26 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 95.5 | 5 | 5 |
| 27 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 95.3 | 5 | 5 |
| 28 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 95.2 | 5 | 5 |
| 29 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 95.0 | 5 | 5 |
| 30 | DeVonta Smith | WR | PHI | $24.6 | 94.8 | 34.0 | 92.5 | 98.5 | 94.8 | 5 | 5 |

### CONTROL ADP

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 100.0 | 5 | 5 |
| 2 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.8 | 5 | 5 |
| 3 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.5 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 99.3 | 5 | 5 |
| 5 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 99.1 | 5 | 5 |
| 6 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 98.9 | 4 | 5 |
| 7 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 98.6 | 4 | 5 |
| 8 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 98.4 | 5 | 5 |
| 9 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 98.2 | 5 | 5 |
| 10 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 97.9 | 5 | 5 |
| 11 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 97.7 | 5 | 5 |
| 12 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 97.5 | 5 | 5 |
| 13 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 97.5 | 5 | 5 |
| 14 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.0 | 5 | 5 |
| 15 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.8 | 5 | 5 |
| 16 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 96.6 | 5 | 5 |
| 17 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 96.3 | 5 | 5 |
| 18 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.1 | 5 | 5 |
| 19 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 95.9 | 5 | 5 |
| 20 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 95.7 | 5 | 5 |
| 21 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 95.4 | 5 | 5 |
| 22 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 95.2 | 5 | 5 |
| 23 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 95.0 | 5 | 5 |
| 24 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 94.7 | 5 | 5 |
| 25 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 94.5 | 4 | 5 |
| 26 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 94.3 | 5 | 5 |
| 27 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 94.1 | 5 | 5 |
| 28 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 93.8 | 5 | 5 |
| 29 | Kyren Williams | RB | LAR | $22.2 | 93.5 | 28.1 | 93.6 | 94.8 | 93.6 | 5 | 5 |
| 30 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 93.4 | 5 | 5 |

### CURRENT BEST-OVERALL APPROXIMATION

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 100.0 | 5 | 5 |
| 2 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.8 | 5 | 5 |
| 3 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.6 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 99.4 | 5 | 5 |
| 5 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 99.0 | 5 | 5 |
| 6 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 99.0 | 4 | 5 |
| 7 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 99.0 | 5 | 5 |
| 8 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 98.7 | 4 | 5 |
| 9 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 98.3 | 5 | 5 |
| 10 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 98.1 | 5 | 5 |
| 11 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.9 | 5 | 5 |
| 12 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.6 | 5 | 5 |
| 13 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 97.2 | 5 | 5 |
| 14 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 96.8 | 5 | 5 |
| 15 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.8 | 5 | 5 |
| 16 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 96.6 | 5 | 5 |
| 17 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 96.5 | 5 | 5 |
| 18 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.5 | 5 | 5 |
| 19 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.5 | 5 | 5 |
| 20 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 96.3 | 5 | 5 |
| 21 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.2 | 5 | 5 |
| 22 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.9 | 5 | 5 |
| 23 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 95.8 | 5 | 5 |
| 24 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 95.8 | 5 | 5 |
| 25 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 95.7 | 5 | 5 |
| 26 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 95.6 | 4 | 5 |
| 27 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 95.4 | 5 | 5 |
| 28 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 94.8 | 5 | 5 |
| 29 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 94.7 | 5 | 5 |
| 30 | DeVonta Smith | WR | PHI | $24.6 | 94.8 | 34.0 | 92.5 | 98.5 | 93.9 | 5 | 5 |

## Position-specific MODEL C

### QB

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 14 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 96.7 | 5 | 5 |
| 37 | Lamar Jackson | QB | BAL | $23.2 | 94.3 | 42.3 | 90.4 | 94.8 | 93.2 | 5 | 5 |
| 44 | Drake Maye | QB | NE | $22.4 | 93.7 | 55.7 | 87.4 | 94.8 | 91.9 | 5 | 5 |
| 50 | Joe Burrow | QB | CIN | $18.2 | 91.9 | 58.0 | 86.8 | 94.8 | 90.7 | 5 | 5 |
| 51 | Jalen Hurts | QB | PHI | $18.8 | 92.1 | 67.2 | 85.4 | 94.8 | 90.4 | 5 | 5 |
| 52 | Jayden Daniels | QB | WSH | $17.8 | 91.6 | 65.0 | 85.8 | 94.8 | 90.2 | 5 | 5 |
| 69 | Dak Prescott | QB | DAL | $13.2 | 88.5 | 83.1 | 82.0 | 98.5 | 87.6 | 5 | 5 |
| 70 | Caleb Williams | QB | CHI | $12.6 | 87.8 | 75.5 | 83.6 | 94.8 | 87.2 | 5 | 5 |
| 77 | Trevor Lawrence | QB | JAC | $11.2 | 86.9 | 88.0 | 80.8 | 94.8 | 85.9 | 5 | 5 |
| 78 | Justin Herbert | QB | LAC | $10.8 | 86.0 | 83.6 | 81.5 | 98.5 | 85.9 | 5 | 5 |
| 81 | Jaxson Dart | QB | NYG | $11.4 | 87.3 | 97.7 | 79.5 | 94.8 | 85.7 | 5 | 5 |
| 88 | Brock Purdy | QB | SF | $10.0 | 85.5 | 109.4 | 75.1 | 94.8 | 83.3 | 5 | 5 |
| 89 | Patrick Mahomes | QB | KC | $8.4 | 84.0 | 105.3 | 76.5 | 98.5 | 83.2 | 5 | 5 |
| 94 | Bo Nix | QB | DEN | $9.2 | 84.7 | 109.4 | 75.1 | 94.8 | 82.8 | 5 | 5 |
| 96 | Matthew Stafford | QB | LAR | $8.8 | 84.4 | 106.5 | 75.6 | 93.5 | 82.7 | 4 | 5 |

### RB

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 99.5 | 5 | 5 |
| 3 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.3 | 5 | 5 |
| 6 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 98.6 | 5 | 5 |
| 9 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 97.8 | 4 | 5 |
| 11 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.6 | 5 | 5 |
| 12 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.4 | 5 | 5 |
| 16 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.6 | 5 | 5 |
| 19 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.4 | 5 | 5 |
| 21 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.1 | 5 | 5 |
| 22 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 96.0 | 5 | 5 |
| 25 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.8 | 5 | 5 |
| 26 | Omarion Hampton | RB | LAC | $26.6 | 95.3 | 16.3 | 96.6 | 94.8 | 95.6 | 5 | 5 |
| 29 | Jeremiyah Love | RB | ARI | $25.0 | 95.0 | 27.6 | 94.3 | 94.8 | 94.8 | 5 | 5 |
| 31 | Breece Hall | RB | NYJ | $23.4 | 94.4 | 33.0 | 92.9 | 94.8 | 94.0 | 5 | 5 |
| 33 | Kyren Williams | RB | LAR | $22.2 | 93.5 | 28.1 | 93.6 | 94.8 | 93.7 | 5 | 5 |
| 34 | Josh Jacobs | RB | GB | $22.6 | 93.9 | 33.8 | 92.7 | 94.8 | 93.6 | 5 | 5 |
| 36 | Javonte Williams | RB | DAL | $21.2 | 93.2 | 32.6 | 93.2 | 94.8 | 93.4 | 5 | 5 |
| 41 | Travis Etienne | RB | NO | $19.0 | 92.3 | 40.5 | 91.3 | 94.8 | 92.3 | 5 | 5 |
| 42 | Cam Skattebo | RB | NYG | $19.0 | 92.3 | 41.3 | 91.1 | 94.8 | 92.2 | 5 | 5 |
| 48 | Bucky Irving | RB | TB | $17.0 | 91.0 | 48.5 | 89.5 | 94.8 | 90.9 | 5 | 5 |
| 49 | D'Andre Swift | RB | CHI | $16.6 | 90.8 | 48.4 | 89.7 | 94.8 | 90.9 | 5 | 5 |
| 54 | Quinshon Judkins | RB | CLE | $15.8 | 90.1 | 49.6 | 89.0 | 94.8 | 90.2 | 5 | 5 |
| 59 | David Montgomery | RB | HOU | $13.4 | 88.9 | 48.7 | 89.3 | 94.8 | 89.6 | 5 | 5 |
| 63 | Bhayshul Tuten | RB | JAC | $13.2 | 88.5 | 55.0 | 87.7 | 94.8 | 88.9 | 5 | 5 |
| 64 | TreVeyon Henderson | RB | NE | $13.0 | 88.2 | 55.9 | 87.2 | 89.8 | 88.1 | 4 | 5 |

### WR

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.5 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 99.0 | 5 | 5 |
| 5 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 98.6 | 5 | 5 |
| 7 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 98.1 | 4 | 5 |
| 8 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 98.0 | 5 | 5 |
| 10 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 97.8 | 5 | 5 |
| 13 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 97.1 | 5 | 5 |
| 15 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.7 | 5 | 5 |
| 20 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 96.1 | 5 | 5 |
| 23 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 95.8 | 5 | 5 |
| 24 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 95.8 | 5 | 5 |
| 27 | George Pickens | WR | DAL | $30.3 | 96.2 | 24.8 | 94.5 | 93.5 | 95.4 | 4 | 5 |
| 28 | Malik Nabers | WR | NYG | $25.8 | 95.2 | 27.8 | 94.1 | 94.8 | 94.8 | 5 | 5 |
| 30 | DeVonta Smith | WR | PHI | $24.6 | 94.8 | 34.0 | 92.5 | 98.5 | 94.5 | 5 | 5 |
| 32 | Zay Flowers | WR | BAL | $23.6 | 94.6 | 36.8 | 92.2 | 94.8 | 93.9 | 5 | 5 |
| 35 | Tee Higgins | WR | CIN | $22.0 | 93.4 | 38.9 | 92.0 | 98.5 | 93.5 | 5 | 5 |
| 38 | Garrett Wilson | WR | NYJ | $22.8 | 94.1 | 41.8 | 90.6 | 94.8 | 93.1 | 5 | 5 |
| 39 | Tetairoa McMillan | WR | CAR | $21.0 | 93.0 | 39.9 | 91.6 | 94.8 | 92.8 | 5 | 5 |
| 40 | Emeka Egbuka | WR | TB | $20.2 | 92.8 | 41.3 | 91.1 | 94.8 | 92.5 | 5 | 5 |
| 45 | Ladd McConkey | WR | LAC | $17.6 | 91.4 | 39.8 | 91.8 | 94.8 | 91.9 | 5 | 5 |
| 46 | Jaylen Waddle | WR | DEN | $17.4 | 91.2 | 44.8 | 90.0 | 94.8 | 91.2 | 5 | 5 |
| 47 | Davante Adams | WR | LAR | $18.0 | 91.7 | 53.8 | 88.1 | 94.8 | 90.9 | 5 | 5 |
| 55 | Terry McLaurin | WR | WSH | $15.8 | 90.1 | 53.4 | 88.4 | 94.8 | 90.1 | 5 | 5 |
| 56 | Luther Burden | WR | CHI | $15.6 | 89.9 | 51.1 | 88.8 | 94.8 | 90.1 | 5 | 5 |
| 57 | Jameson Williams | WR | DET | $16.4 | 90.5 | 56.6 | 87.0 | 94.8 | 89.9 | 5 | 5 |

### TE

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 17 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 96.5 | 5 | 5 |
| 18 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 96.4 | 5 | 5 |
| 43 | Colston Loveland | TE | CHI | $19.8 | 92.6 | 42.9 | 90.2 | 94.8 | 92.1 | 5 | 5 |
| 53 | Tyler Warren | TE | IND | $16.4 | 90.5 | 54.5 | 87.9 | 94.8 | 90.2 | 5 | 5 |
| 65 | Tucker Kraft | TE | GB | $13.0 | 88.2 | 72.0 | 84.5 | 94.8 | 87.8 | 5 | 5 |
| 67 | Harold Fannin | TE | CLE | $13.6 | 89.0 | 80.6 | 82.6 | 94.8 | 87.7 | 5 | 5 |
| 72 | Sam LaPorta | TE | DET | $12.2 | 87.6 | 78.4 | 83.3 | 94.8 | 87.0 | 5 | 5 |
| 76 | Kyle Pitts | TE | ATL | $11.0 | 86.4 | 80.8 | 82.4 | 94.8 | 86.0 | 5 | 5 |
| 83 | George Kittle | TE | SF | $10.8 | 86.0 | 99.7 | 78.5 | 98.5 | 85.0 | 5 | 5 |
| 105 | Travis Kelce | TE | KC | $7.0 | 82.4 | 105.5 | 76.3 | 94.8 | 81.8 | 5 | 5 |
| 107 | Dalton Kincaid | TE | BUF | $5.2 | 80.3 | 105.7 | 76.0 | 98.5 | 80.8 | 5 | 5 |
| 112 | Dallas Goedert | TE | PHI | $5.2 | 80.3 | 121.3 | 73.1 | 94.8 | 79.6 | 5 | 5 |
| 116 | Mark Andrews | TE | BAL | $4.8 | 79.9 | 122.2 | 72.8 | 94.8 | 79.3 | 5 | 5 |
| 120 | Jake Ferguson | TE | DAL | $4.0 | 77.9 | 117.5 | 74.0 | 98.5 | 78.8 | 5 | 5 |
| 121 | Isaiah Likely | TE | NYG | $3.8 | 77.6 | 114.6 | 74.4 | 98.5 | 78.7 | 5 | 5 |
## Model movement versus MODEL C

| Model | Largest risers | Largest fallers |
|---|---|---|
| MODEL A | Cam Ward (+138), Cooper Kupp (+135), Jacoby Brissett (+129), Omar Cooper (+126), Travis Hunter (+123), Aaron Rodgers (+122), Adonai Mitchell (+122), Geno Smith (+122), Chig Okonkwo (+114), Germie Bernard (+112), Chris Bell (+109), Troy Franklin (+106), Keon Coleman (+105), Ted Hurst (+105), Tua Tagovailoa (+104), Deshaun Watson (+102), Tommy Tremble (+84), Darnell Mooney (+66), Tory Horton (+65), Will Reichard (+59) | Zay Jones (-111), Jarquez Hunter (-101), Brandon Aiyuk (-100), Riley Nowakowski (-46), Hunter Long (-34), Jaleel McLaughlin (-34), Noah Whittington (-34), Johnny Mundt (-33), Kaden Wetjen (-33), Cade York (-32), Charlie Woerner (-32), J'Mari Taylor (-32), Jake Briningstool (-32), Josh Cuevas (-32), Lan Larison (-32), Tanner Hudson (-32), Alexander Mattison (-31), Jared Wiley (-31), Jerome Ford (-31), Sterling Shepard (-31) |
| MODEL B | Adonai Mitchell (+115), Geno Smith (+114), Cam Ward (+112), Aaron Rodgers (+109), Germie Bernard (+108), Ted Hurst (+106), Keon Coleman (+105), Tua Tagovailoa (+104), Deshaun Watson (+102), Omar Cooper (+98), Travis Hunter (+98), AJ Dillon (+49), Olamide Zaccheaus (+49), Tory Horton (+49), Darnell Mooney (+48), Antonio Williams (+40), Theo Johnson (+36), Cooper Kupp (+34), Will Reichard (+33), Green Bay Packers (+32) | Zay Jones (-108), Jarquez Hunter (-106), Brandon Aiyuk (-97), Riley Nowakowski (-43), Eli Raridon (-30), Jahdae Walker (-30), Barion Brown (-28), Colbie Young (-28), Demarcus Robinson (-28), Hunter Long (-28), Jared Wiley (-28), Savion Williams (-28), Cade York (-27), Josh Cuevas (-27), Charlie Woerner (-26), J'Mari Taylor (-26), Jaleel McLaughlin (-26), Noah Whittington (-26), Jake Briningstool (-24), Kaden Wetjen (-24) |
| MODEL D | Brenen Thompson (+81), Andre Szmyt (+24), Jake Moody (+24), Robert Henry (+24), Chase McLaughlin (+23), Dominic Zvada (+23), Joshua Karty (+22), Spencer Shrader (+22), Chris Brazzell (+21), Konata Mumpfield (+21), Darius Cooper (+20), Grant Calcaterra (+20), Jonnu Smith (+20), Reggie Virgil (+20), Brandon McManus (+19), Daniel Carlson (+19), Nick Westbrook-Ikhine (+19), Blake Grupe (+18), Davis Allen (+18), Hunter Renfrow (+18) | Kimani Vidal (-101), Jordan James (-99), Darnell Washington (-52), Dawson Knox (-50), Cole Kmet (-49), Theo Johnson (-45), Jacksonville Jaguars (-44), Antonio Williams (-41), Omar Cooper (-38), Chig Okonkwo (-36), Travis Hunter (-36), Cooper Kupp (-34), Aaron Rodgers (-31), Adonai Mitchell (-30), Jacoby Brissett (-30), Fernando Mendoza (-28), Geno Smith (-28), New England Patriots (-28), Caleb Douglas (-27), Dontayvion Wicks (-27) |
| MODEL E | Seth McGowan (+104), Brenen Thompson (+93), Andre Szmyt (+44), Jake Moody (+43), Robert Henry (+43), Aaron Anderson (+40), Dominic Zvada (+38), Hunter Renfrow (+38), Brandon McManus (+37), Chris Brazzell (+37), Daniel Carlson (+37), Davis Allen (+37), Joshua Karty (+37), Darius Cooper (+36), Grant Calcaterra (+36), Konata Mumpfield (+36), Reggie Virgil (+36), Spencer Shrader (+36), Matt Gay (+35), Blake Grupe (+34) | New England Patriots (-134), Caleb Douglas (-128), Jaydon Blue (-124), Jordan James (-119), Kimani Vidal (-114), Isaac TeSlaa (-109), Pat Bryant (-109), Chig Okonkwo (-85), Travis Hunter (-82), Omar Cooper (-80), Zay Jones (-77), Aaron Rodgers (-76), Adonai Mitchell (-74), Jacksonville Jaguars (-74), Geno Smith (-73), Cam Ward (-71), Jacoby Brissett (-66), Cooper Kupp (-61), Darnell Washington (-59), Dawson Knox (-57) |
| CONTROL AUCTION | Aaron Anderson (+328), Andre Szmyt (+308), Brandon McManus (+302), Daniel Carlson (+277), Davis Allen (+275), Chris Brazzell (+270), Dominic Zvada (+254), Darius Cooper (+252), Alexander Mattison (+251), Antonio Gibson (+243), Blake Grupe (+243), Hunter Renfrow (+238), Cade York (+237), Charlie Woerner (+232), Grant Calcaterra (+231), Audric Estime (+230), Jake Moody (+215), Austin Hooper (+210), Isaiah Williams (+201), Adam Trautman (+200) | Malik Washington (-269), Tank Bigsby (-248), Keaton Mitchell (-246), MarShawn Lloyd (-245), Jonah Coleman (-244), Ja'Kobi Lane (-243), Tre' Harris (-242), New England Patriots (-240), Tyler Allgeier (-238), Tyrone Tracy (-238), Ray Davis (-235), Brian Robinson (-232), Dylan Sampson (-232), Kaelon Black (-231), Braelon Allen (-229), Fernando Mendoza (-228), Zachariah Branch (-228), Dontayvion Wicks (-226), Emmett Johnson (-226), James Conner (-225) |
| CONTROL ADP | Darius Slayton (+258), Austin Ekeler (+256), Dallas Cowboys (+244), Green Bay Packers (+244), Kansas City Chiefs (+241), Chig Okonkwo (+240), Chicago Bears (+239), Jacksonville Jaguars (+236), Cole Kmet (+232), Dawson Knox (+231), New York Giants (+231), Darnell Washington (+230), Wil Lutz (+228), Will Reichard (+228), San Francisco 49ers (+226), Erick All (+217), Cam Ward (+209), Tampa Bay Buccaneers (+209), Bub Means (+208), Malik Davis (+205) | Van Jefferson (-275), Zane Gonzalez (-275), Tahj Brooks (-267), Roman Wilson (-265), Ryan Fitzgerald (-265), Noah Fant (-260), Oscar Delp (-260), Kyle Williams (-249), Justin Joly (-243), Jaylin Lane (-235), John Metchie (-233), Devontez Walker (-209), Dont'e Thornton (-202), Cedric Tillman (-195), Calvin Austin (-193), Ben Sauls (-189), Ben Sinnott (-189), Xavier Restrepo (-179), Vinny Anthony (-178), Tahj Washington (-177) |
| CURRENT BEST-OVERALL APPROXIMATION | Jeremy McNichols (+125), Laquon Treadwell (+125), Adam Trautman (+124), Michael Trigg (+124), Luke Farrell (+122), Jared Wiley (+115), Tommy Tremble (+112), Riley Nowakowski (+100), Brenen Thompson (+95), Casey Washington (+85), Curtis Samuel (+80), DeAndre Hopkins (+76), Desmond Reid (+74), Eric McAlister (+62), Graham Gano (+61), Kendre Miller (+38), Jarquez Hunter (+32), Trey Benson (+31), Colbie Young (+29), Demarcus Robinson (+29) | Jordan James (-126), Michael Penix (-117), Kimani Vidal (-113), Van Jefferson (-111), Zane Gonzalez (-111), Tahj Brooks (-103), Roman Wilson (-100), Ryan Fitzgerald (-100), Noah Fant (-95), Oscar Delp (-95), Kyle Williams (-84), Justin Joly (-78), Jaylin Lane (-70), Antonio Williams (-46), Devontez Walker (-45), AJ Dillon (-38), Cooper Kupp (-38), Dont'e Thornton (-38), Olamide Zaccheaus (-38), Devaughn Vele (-37) |

### Top-set entries/exits

| Model | Top 25 changes | Top 50 changes | Top 100 changes |
|---|---|---|---|
| MODEL A | In: Omarion Hampton; Out: Rashee Rice | In: None; Out: None | In: Jordan Mason; Out: Jayden Reed |
| MODEL B | In: None; Out: None | In: None; Out: None | In: None; Out: None |
| MODEL D | In: None; Out: None | In: None; Out: None | In: None; Out: None |
| MODEL E | In: None; Out: None | In: Jalen Hurts; Out: D'Andre Swift | In: Jared Goff; Out: RJ Harvey |

## Auction versus ADP disagreement

- **AUCTION LOVES MORE THAN ADP:** Pat Freiermuth (#162), Colby Parkinson (#176), Evan Engram (#178), Mike Gesicki (#179), Michael Mayer (#180), Theo Wease (#181), Rashod Bateman (#182), Mason Taylor (#183), John Metchie (#184), Jake Moody (#500), Aaron Anderson (#513)
- **ADP LOVES MORE THAN AUCTION:** Tyler Allgeier (#185), Tyrone Tracy (#186), Brian Robinson (#187), Dylan Sampson (#188), Braelon Allen (#189), Jonah Coleman (#190), Keaton Mitchell (#191), Cyrus Allen (#192), MarShawn Lloyd (#193), Keenan Allen (#194), Tank Bigsby (#195), Jason Myers (#197)
- **BOTH STRONGLY AGREE:** Jahmyr Gibbs (#1), Ja'Marr Chase (#2), Bijan Robinson (#3), Puka Nacua (#4), Amon-Ra St. Brown (#5), Christian McCaffrey (#6), Jaxon Smith-Njigba (#7), CeeDee Lamb (#8), Jonathan Taylor (#9), Justin Jefferson (#10), James Cook (#11), De'Von Achane (#12)
- **BOTH WEAK:** Jake Tonges (#221), Eli Stowers (#225), Samaje Perine (#228), Eddy Pineiro (#229), Jaylen Wright (#236), Charlie Kolar (#242), Bryce Lance (#248), Elijah Arroyo (#252), Chase McLaughlin (#268), Shedeur Sanders (#274), Evan McPherson (#275), Trey Benson (#276)

## Quality sensitivity

MODEL C versus Auction+ADP-only on players with both inputs: Spearman rank correlation **0.992**. Quality changed **355** of 439 paired ranks; largest movements: Germie Bernard +63, Aaron Rodgers +58, Jordan James +58, Travis Hunter +52, Troy Franklin +52, Adonai Mitchell +51, Chris Bell +51, Keon Coleman +51, Omar Cooper +51, Cam Ward +50. Quality should remain a reviewable evidence component; this run does not approve 10%.

## Missing ADP sensitivity

Auction-only players affected: **119**. Proportional reweighting preserves their Auction/Quality evidence; neutral ADP inserts a 50-point assumption and compresses results toward the middle. Against proportional MODEL C, neutral treatment changes **349** ranks and changes **0** top-25 memberships. Largest neutral-treatment movements: AJ Dillon +115, Olamide Zaccheaus +115, Jason Sanders +105, Tyler Higbee +93, Phil Mafah +92, Ty Chandler +92, Ashton Dulin +91, Jawhar Jordan +91. The next calibration round should review proportional reweighting first, without making it production policy.

## Positional effects

Global percentiles favor the largest cross-position Auction values and strongest ADP ranks. Elite RB/WR values dominate the global top; QBs and low-dollar K/DEF are naturally lower. No position adjustment was introduced. Review position-specific tables before considering any adjustment.

## Sanity-check players

| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Jahmyr Gibbs | RB | DET | $62.6 | 100.0 | 1.3 | 100.0 | 94.8 | 99.5 | 5 | 5 |
| 2 | Ja'Marr Chase | WR | CIN | $56.2 | 99.6 | 3.6 | 99.5 | 98.5 | 99.5 | 5 | 5 |
| 3 | Bijan Robinson | RB | ATL | $59.6 | 99.8 | 1.9 | 99.8 | 94.8 | 99.3 | 5 | 5 |
| 4 | Puka Nacua | WR | LAR | $54.4 | 99.5 | 4.8 | 99.3 | 94.8 | 99.0 | 5 | 5 |
| 5 | Amon-Ra St. Brown | WR | DET | $52.0 | 99.3 | 8.7 | 98.4 | 94.8 | 98.6 | 5 | 5 |
| 6 | Christian McCaffrey | RB | SF | $49.2 | 98.9 | 5.5 | 99.1 | 94.8 | 98.6 | 5 | 5 |
| 7 | Jaxon Smith-Njigba | WR | SEA | $50.5 | 99.1 | 6.2 | 98.9 | 89.8 | 98.1 | 4 | 5 |
| 8 | CeeDee Lamb | WR | DAL | $43.0 | 98.6 | 11.2 | 97.9 | 94.8 | 98.0 | 5 | 5 |
| 9 | Jonathan Taylor | RB | IND | $45.8 | 98.7 | 6.7 | 98.6 | 89.8 | 97.8 | 4 | 5 |
| 10 | Justin Jefferson | WR | MIN | $39.6 | 98.4 | 12.8 | 97.7 | 94.8 | 97.8 | 5 | 5 |
| 11 | James Cook | RB | BUF | $36.8 | 97.7 | 9.2 | 98.2 | 94.8 | 97.6 | 5 | 5 |
| 12 | De'Von Achane | RB | MIA | $38.6 | 98.0 | 13.7 | 97.0 | 94.8 | 97.4 | 5 | 5 |
| 13 | Drake London | WR | ATL | $38.6 | 98.0 | 20.4 | 95.9 | 94.8 | 97.1 | 5 | 5 |
| 14 | Josh Allen | QB | BUF | $38.0 | 97.8 | 24.1 | 95.0 | 94.8 | 96.7 | 5 | 5 |
| 15 | A.J. Brown | WR | NE | $32.8 | 96.9 | 21.4 | 95.7 | 98.5 | 96.7 | 5 | 5 |
| 16 | Saquon Barkley | RB | PHI | $31.0 | 96.4 | 13.1 | 97.5 | 94.8 | 96.6 | 5 | 5 |
| 17 | Brock Bowers | TE | LV | $33.4 | 97.3 | 21.7 | 95.4 | 94.5 | 96.5 | 5 | 5 |
| 18 | Trey McBride | TE | ARI | $34.2 | 97.5 | 24.3 | 94.7 | 94.8 | 96.4 | 5 | 5 |
| 19 | Derrick Henry | RB | BAL | $32.6 | 96.8 | 17.6 | 96.1 | 94.8 | 96.4 | 5 | 5 |
| 20 | Nico Collins | WR | HOU | $30.2 | 96.1 | 23.7 | 95.2 | 98.5 | 96.1 | 5 | 5 |
| 21 | Chase Brown | RB | CIN | $29.4 | 95.9 | 16.1 | 96.8 | 94.8 | 96.1 | 5 | 5 |
| 22 | Ashton Jeanty | RB | LV | $26.8 | 95.5 | 13.1 | 97.5 | 94.5 | 96.0 | 5 | 5 |
| 23 | Rashee Rice | WR | KC | $33.0 | 97.1 | 29.7 | 93.4 | 94.8 | 95.8 | 5 | 5 |
| 24 | Chris Olave | WR | NO | $31.0 | 96.4 | 27.9 | 93.8 | 98.5 | 95.8 | 5 | 5 |
| 25 | Kenneth Walker | RB | KC | $28.4 | 95.7 | 16.8 | 96.3 | 94.8 | 95.8 | 5 | 5 |

## Ray-specific modifier simulation

Synthetic only; no production integration:

| Scenario | Base | Fit | Scarcity | Budget | Result |
|---|---:|---:|---:|---:|---:|
| Quality-first player with balanced fit | 80 | 6 | 2 | 2 | 90 |
| High-quality player after position filled | 90 | -8 | -3 | 0 | 79 |
| Barely affordable target | 80 | 8 | 3 | -5 | 86 |

The synthetic ranges can move a 80-point player to 90 and a 90-point player to 79, so fit/scarcity/budget modifiers can overpower quality when stacked. A later review should start around ±5 total per layer, with a combined modifier guardrail around ±10, before considering larger ranges.

## Live opportunity simulation

Synthetic only; no current bid was wired into Recommended Now.

| Consensus | Current bid | Absolute difference | Percentage difference |
|---:|---:|---:|---:|
| $60 | $45 | $15 | 25% |
| $60 | $50 | $10 | 16.7% |
| $60 | $55 | $5 | 8.3% |
| $60 | $60 | $0 | 0% |
| $60 | $63 | $-3 | -5% |
| $60 | $65 | $-5 | -8.3% |
| $60 | $70 | $-10 | -16.7% |

Absolute dollars are intuitive but overstate discounts on low-priced players. Percentage better compares scale but can overstate small-dollar noise. A future hybrid should use percentage as the normalized signal with an absolute-dollar floor/context guardrail. No thresholds are approved.

## PHASE 3 — Quality and modifier calibration

> CALIBRATION ONLY — synthetic/offline analysis; no production decision weights, modifiers, thresholds, UI, API, or data were changed.

### Quality decomposition

Quality is evidence quality, not player talent: Auction coverage is `min(auctionSourceCount / 5, 1) × 100`; Auction evidence averages that coverage with masterview confidence; when ADP exists, ADP source coverage is averaged into the evidence score. The masterview confidence input is the existing `min(averageMatchConfidence, averageSourceConfidence)` after its source/match/spread/warning/error penalties. Missing ADP is proportionally reweighted, never treated as a permanent neutral 50-point input.

### Top 30 quality-sensitive players

Movement is `rank without quality − rank with quality`; positive values rise when quality is included.

| Player | Pos | Auction | ADP | Auc src | ADP src | Confidence | Quality rank | No-quality rank | Movement | Classification |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Jordan James | RB | $0.6 | 225.2 | 5 | 5 | 94.0 | 284 | 424 | +140 | broad source support |
| Jaydon Blue | RB | $0.7 | 196.4 | 3 | 5 | 94.0 | 253 | 382 | +129 | broad source support |
| Adam Trautman | TE | $1.0 | 253.0 | 1 | 1 | 74.0 | 386 | 258 | -128 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Jeremy McNichols | RB | $1.0 | 264.8 | 1 | 1 | 74.0 | 392 | 264 | -128 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Laquon Treadwell | WR | $1.0 | 252.0 | 1 | 1 | 74.0 | 385 | 257 | -128 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Michael Trigg | TE | $1.0 | 271.0 | 1 | 1 | 74.0 | 398 | 270 | -128 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Luke Farrell | TE | $1.0 | 249.3 | 1 | 1 | 74.0 | 378 | 252 | -126 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Kimani Vidal | RB | $0.7 | 213.1 | 3 | 5 | 94.0 | 278 | 399 | +121 | broad source support |
| Jared Wiley | TE | $1.0 | 248.7 | 1 | 1 | 74.0 | 369 | 250 | -119 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Isaac TeSlaa | WR | $0.7 | 203.5 | 3 | 5 | 94.0 | 272 | 388 | +116 | broad source support |
| Pat Bryant | WR | $0.7 | 201.7 | 3 | 5 | 94.0 | 273 | 389 | +116 | broad source support |
| Michael Penix | QB | $1.0 | 292.4 | 2 | 4 | 94.0 | 282 | 395 | +113 | broad source support |
| Van Jefferson | WR | $1.0 | — | 2 | 0 | 94.0 | 267 | 375 | +108 | clean/high-confidence source matching |
| Zane Gonzalez | K | $1.0 | — | 2 | 0 | 90.0 | 271 | 379 | +108 | clean/high-confidence source matching |
| Riley Nowakowski | TE | $1.0 | 247.0 | 1 | 1 | 74.0 | 353 | 249 | -104 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Tommy Tremble | TE | $0.7 | 193.0 | 3 | 1 | 94.0 | 370 | 267 | -103 | spread/confidence penalty limits evidence quality |
| Tahj Brooks | RB | $1.0 | — | 2 | 0 | 94.0 | 266 | 366 | +100 | clean/high-confidence source matching |
| Brenen Thompson | WR | $1.0 | 270.5 | 2 | 2 | 94.0 | 368 | 269 | -99 | clean/high-confidence source matching |
| Roman Wilson | WR | $1.0 | — | 2 | 0 | 94.0 | 264 | 361 | +97 | clean/high-confidence source matching |
| Ryan Fitzgerald | K | $1.0 | — | 2 | 0 | 94.0 | 265 | 362 | +97 | clean/high-confidence source matching |
| Noah Fant | TE | $1.0 | — | 2 | 0 | 94.0 | 262 | 354 | +92 | clean/high-confidence source matching |
| Oscar Delp | TE | $1.0 | — | 2 | 0 | 94.0 | 263 | 355 | +92 | clean/high-confidence source matching |
| Casey Washington | WR | $1.0 | — | 1 | 0 | 70.0 | 372 | 284 | -88 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Curtis Samuel | WR | $1.0 | — | 1 | 0 | 70.0 | 373 | 290 | -83 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Kyle Williams | WR | $1.0 | — | 2 | 0 | 94.0 | 261 | 342 | +81 | clean/high-confidence source matching |
| DeAndre Hopkins | WR | $1.0 | — | 1 | 0 | 70.0 | 374 | 295 | -79 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Desmond Reid | RB | $1.0 | — | 1 | 0 | 70.0 | 375 | 298 | -77 | limited coverage; movement is evidence-weighting sensitivity, not player quality |
| Justin Joly | TE | $1.0 | — | 2 | 0 | 94.0 | 260 | 335 | +75 | clean/high-confidence source matching |
| Jaylin Lane | WR | $1.0 | — | 2 | 0 | 94.0 | 259 | 326 | +67 | clean/high-confidence source matching |
| Jacoby Brissett | QB | $0.5 | 208.9 | 4 | 5 | 94.0 | 421 | 487 | +66 | broad source support |

### Quality weight sensitivity

| Variant | Auction | ADP | Quality | Result versus QUALITY 10% |
|---|---:|---:|---:|---|
| QUALITY 0% | 66.7% | 33.3% | 0% | correlation 0.984; top-25 In: Omarion Hampton; Out: Chris Olave; top-50 In: None; Out: None; top-100 In: Jared Goff; Out: Jayden Reed; largest movements Adam Trautman +128, Jeremy McNichols +128, Laquon Treadwell +128, Michael Trigg +128, Luke Farrell +126 |
| QUALITY 5% | 63.3% | 31.7% | 5% | correlation 0.995; top-25 In: None; Out: None; top-50 In: None; Out: None; top-100 In: Jared Goff; Out: Jayden Reed; largest movements Adam Trautman +100, Laquon Treadwell +100, Luke Farrell +99, Jared Wiley +91, Tommy Tremble +83 |
| QUALITY 10% | 60% | 30% | 10% | correlation 1.000; top-25 In: None; Out: None; top-50 In: None; Out: None; top-100 In: None; Out: None; largest movements A.J. Brown 0, Aaron Anderson 0, Aaron Jones 0, Aaron Rodgers 0, Adam Randall 0 |
| QUALITY 15% | 56.7% | 28.3% | 15% | correlation 0.994; top-25 In: None; Out: None; top-50 In: None; Out: None; top-100 In: None; Out: None; largest movements Germie Bernard +108, Aaron Rodgers +106, Cam Ward +106, Ted Hurst +105, Tua Tagovailoa +104 |

Working recommendation for commissioner review: QUALITY 10% remains the balanced candidate because it rewards evidence quality without replacing Auction/ADP market signal; this is not a production approval. QUALITY 0%, 5%, and 15% remain valid comparison points.

### Market Score and roster semantics

The working market score is Auction percentile × Auction weight + inverse-ADP percentile × ADP weight + evidence quality × Quality weight, with proportional reweighting when ADP is missing. It has no roster, current-bid, budget, or owner-preference input.

Roster fit audit: starter need is the strongest signal; bench/depth need is weaker; a filled position receives a bounded negative fit only when the roster is beyond the modeled depth target. FLEX can be modeled as (A) position-only starter fit, (B) starter plus bench/depth fit, or (C) starter plus bench plus flexible replacement opportunity. C is the most useful next review candidate because it preserves positional need while recognizing multi-position open paths; it remains unapproved and offline.

### Roster modifier caps

Synthetic 80-point example with fit only:

| Cap | Result | Interpretation |
|---:|---:|---|
| ±3 | 83 | Maximum positive roster movement in this isolated example |
| ±5 | 85 | Maximum positive roster movement in this isolated example |
| ±7 | 87 | Maximum positive roster movement in this isolated example |
| ±10 | 90 | Maximum positive roster movement in this isolated example |

A ±5 roster cap is the preferred next review starting point: ±3 may under-express a real starter hole, while ±7/±10 can dominate too easily. No cap is applied to production.

### Scarcity modifier caps

Synthetic 80-point example with scarcity only:

| Cap | Result | Interpretation |
|---:|---:|---|
| ±1 | 81 | Maximum positive scarcity movement in this isolated example |
| ±2 | 82 | Maximum positive scarcity movement in this isolated example |
| ±3 | 83 | Maximum positive scarcity movement in this isolated example |
| ±5 | 85 | Maximum positive scarcity movement in this isolated example |

A ±2 scarcity cap is the preferred next review starting point. Scarcity should break close market-score ties, not overturn a materially stronger market signal.

### Budget treatment

Budget fit should primarily be a gate/label: NOT_REALISTIC removes a candidate from a legal recommendation set; AFFORDABLE and STRETCH explain feasibility. A large positive budget modifier would double-count affordability and can incorrectly elevate spend capacity over player value. A small bounded budget signal may be tested only after the gate semantics are stable.

### Combined modifier systems

| System | Roster cap | Scarcity cap | Budget | Combined cap | Assessment |
|---|---:|---:|---:|---:|---|
| SYSTEM A | ±5 | ±3 | ±2 | ±10 | full stack; highest double-count risk |
| SYSTEM B | ±5 | ±2 | gate only | ±7 | transparent gate-first baseline |
| SYSTEM C | ±7 | ±3 | gate only | ±10 | upper-bound roster sensitivity |

System A permits the full ±10 budget-inclusive stack and is the least stable when affordability is already gating. System B preserves a transparent ±5 roster signal, ±2 scarcity signal, and budget gate with a ±7 combined cap; it is the preferred first review candidate. System C provides the full ±10 combined philosophy with a larger roster range but no budget score; it is a useful sensitivity upper bound. System D is intentionally absent—no fourth combined system was invented without a distinct semantic contract.

### Ten roster scenarios — MODEL C top 15

Each scenario is synthetic. ‘Market’ is the unchanged market score; A/B/C apply only the bounded offline modifier systems.

| Scenario | Market top 15 | System A top 15 | System B top 15 | System C top 15 |
|---|---|---|---|---|
| Empty roster except keepers | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, Brock Bowers, CeeDee Lamb, Chris Olave, Christian McCaffrey, De'Von Achane, Derrick Henry, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Chris Olave, Christian McCaffrey, De'Von Achane, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Chris Olave, Christian McCaffrey, De'Von Achane, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson |
| One elite RB acquired | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, Brock Bowers, CeeDee Lamb, Chris Olave, Christian McCaffrey, De'Von Achane, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Chris Olave, Christian McCaffrey, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, Jaxon Smith-Njigba, Justin Jefferson, Nico Collins, Puka Nacua, Rashee Rice | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Chris Olave, Christian McCaffrey, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, Jaxon Smith-Njigba, Justin Jefferson, Nico Collins, Puka Nacua, Rashee Rice |
| Two strong RBs acquired | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, Brock Bowers, CeeDee Lamb, Chris Olave, Christian McCaffrey, De'Von Achane, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Chris Olave, Christian McCaffrey, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, Jaxon Smith-Njigba, Justin Jefferson, Nico Collins, Puka Nacua, Rashee Rice | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Chris Olave, Christian McCaffrey, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, Jaxon Smith-Njigba, Justin Jefferson, Nico Collins, Puka Nacua, Rashee Rice |
| WR-heavy start | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | Amon-Ra St. Brown, Bijan Robinson, Brock Bowers, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Derrick Henry, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Josh Allen, Justin Jefferson | Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Puka Nacua, Justin Jefferson, Josh Allen, Saquon Barkley, Brock Bowers | Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Puka Nacua, Justin Jefferson, Josh Allen, Saquon Barkley, Brock Bowers |
| QB already acquired | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, Brock Bowers, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Derrick Henry, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson | Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson, Puka Nacua, A.J. Brown, Saquon Barkley | Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson, Puka Nacua, A.J. Brown, Saquon Barkley |
| TE already acquired | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Derrick Henry, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Josh Allen, Justin Jefferson | Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson, Puka Nacua, A.J. Brown, Josh Allen | Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson, Puka Nacua, A.J. Brown, Josh Allen |
| Low remaining budget | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | Saquon Barkley, Nico Collins, Chris Olave, Jeremiyah Love, Malik Nabers, DeVonta Smith, George Pickens, Lamar Jackson, Chase Brown, Ashton Jeanty, Breece Hall, Zay Flowers, Kenneth Walker, Kyren Williams, Josh Jacobs | Saquon Barkley, Nico Collins, Chris Olave, George Pickens, Chase Brown, Ashton Jeanty, Kenneth Walker, Omarion Hampton, Jeremiyah Love, Malik Nabers, DeVonta Smith, Lamar Jackson, Breece Hall, Zay Flowers, Kyren Williams | Saquon Barkley, Nico Collins, Chris Olave, George Pickens, Chase Brown, Ashton Jeanty, Kenneth Walker, Omarion Hampton, Jeremiyah Love, Malik Nabers, DeVonta Smith, Lamar Jackson, Breece Hall, Zay Flowers, Kyren Williams |
| High remaining budget | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | A.J. Brown, Amon-Ra St. Brown, Bijan Robinson, Brock Bowers, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Derrick Henry, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Josh Allen | Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson, Puka Nacua, A.J. Brown, Josh Allen | Amon-Ra St. Brown, Bijan Robinson, CeeDee Lamb, Christian McCaffrey, De'Von Achane, Drake London, Ja'Marr Chase, Jahmyr Gibbs, James Cook, Jaxon Smith-Njigba, Jonathan Taylor, Justin Jefferson, Puka Nacua, A.J. Brown, Josh Allen |
| Several starter holes | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | A.J. Brown, Amon-Ra St. Brown, Ashton Jeanty, Bijan Robinson, Brock Bowers, CeeDee Lamb, Chase Brown, Chris Olave, Christian McCaffrey, De'Von Achane, Derrick Henry, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs | A.J. Brown, Amon-Ra St. Brown, Ashton Jeanty, Bijan Robinson, CeeDee Lamb, Chase Brown, Chris Olave, Christian McCaffrey, De'Von Achane, Derrick Henry, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, James Cook | A.J. Brown, Amon-Ra St. Brown, Ashton Jeanty, Bijan Robinson, CeeDee Lamb, Chase Brown, Chris Olave, Christian McCaffrey, De'Von Achane, Derrick Henry, Drake London, George Pickens, Ja'Marr Chase, Jahmyr Gibbs, James Cook |
| Mostly complete; FLEX/depth | Ja'Marr Chase, Jahmyr Gibbs, Bijan Robinson, Puka Nacua, Amon-Ra St. Brown, Christian McCaffrey, Jaxon Smith-Njigba, CeeDee Lamb, Jonathan Taylor, Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen | A.J. Brown, Saquon Barkley, Brock Bowers, Derrick Henry, Trey McBride, Nico Collins, Chris Olave, Justin Jefferson, Rashee Rice, James Cook, De'Von Achane, George Pickens, Chase Brown, Drake London, Ashton Jeanty | Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen, Saquon Barkley, Brock Bowers, Derrick Henry, Trey McBride, Nico Collins, Chris Olave, Rashee Rice, George Pickens, Chase Brown | Justin Jefferson, James Cook, De'Von Achane, Drake London, A.J. Brown, Josh Allen, Saquon Barkley, Brock Bowers, Derrick Henry, Trey McBride, Nico Collins, Chris Olave, Rashee Rice, George Pickens, Chase Brown |

### Twenty head-to-head comparisons

Scenario: Several starter holes; System B. These are close MODEL C pairs, not production recommendations.

| Pair | Market winner | System B winner | Flip? |
|---|---|---|---|
| Jahmyr Gibbs vs Ja'Marr Chase | Ja'Marr Chase | Ja'Marr Chase | NO |
| Ja'Marr Chase vs Bijan Robinson | Ja'Marr Chase | Bijan Robinson | YES |
| Bijan Robinson vs Puka Nacua | Bijan Robinson | Bijan Robinson | NO |
| Puka Nacua vs Christian McCaffrey | Puka Nacua | Christian McCaffrey | YES |
| Amon-Ra St. Brown vs Christian McCaffrey | Amon-Ra St. Brown | Amon-Ra St. Brown | NO |
| Christian McCaffrey vs Jaxon Smith-Njigba | Christian McCaffrey | Christian McCaffrey | NO |
| Jaxon Smith-Njigba vs Jonathan Taylor | Jaxon Smith-Njigba | Jaxon Smith-Njigba | NO |
| CeeDee Lamb vs Jonathan Taylor | CeeDee Lamb | CeeDee Lamb | NO |
| Jonathan Taylor vs Justin Jefferson | Jonathan Taylor | Jonathan Taylor | NO |
| Justin Jefferson vs James Cook | Justin Jefferson | James Cook | YES |
| James Cook vs Drake London | James Cook | Drake London | YES |
| De'Von Achane vs Drake London | De'Von Achane | De'Von Achane | NO |
| Drake London vs Josh Allen | Drake London | Drake London | NO |
| Josh Allen vs A.J. Brown | A.J. Brown | A.J. Brown | NO |
| A.J. Brown vs Saquon Barkley | A.J. Brown | A.J. Brown | NO |
| Saquon Barkley vs Brock Bowers | Saquon Barkley | Saquon Barkley | NO |
| Brock Bowers vs Derrick Henry | Brock Bowers | Derrick Henry | YES |
| Trey McBride vs Derrick Henry | Derrick Henry | Derrick Henry | NO |
| Derrick Henry vs Nico Collins | Derrick Henry | Derrick Henry | NO |
| Nico Collins vs Chase Brown | Chase Brown | Chase Brown | NO |

### Live opportunity matrix

Live opportunity remains separate from market score and owner/roster modifiers. It is calculated from consensus and current bid only: absolute difference = consensus − bid; percentage difference = `(consensus − bid) / consensus × 100`. Across low-dollar examples, percentage is more comparable but noisier; absolute dollars are more intuitive but scale-sensitive.

| Consensus | Bid bands tested | Interpretation |
|---:|---|---|
| $5 | $1, $1, $1, $5, $10 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |
| $10 | $1, $1, $5, $10, $15 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |
| $15 | $1, $5, $10, $15, $20 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |
| $20 | $5, $10, $15, $20, $25 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |
| $30 | $15, $20, $25, $30, $35 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |
| $40 | $25, $30, $35, $40, $45 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |
| $50 | $35, $40, $45, $50, $55 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |
| $60 | $45, $50, $55, $60, $65 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |
| $80 | $65, $70, $75, $80, $85 | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |

Hybrid band proposal for later review only: use normalized percentage as the primary signal, require a minimum absolute-dollar difference before calling a discount meaningful, and label near-consensus/overpay states separately. The bands must not enter Recommended Now until explicitly selected and implemented in a later task.

### Independence proof

Market Score is independent of current bid, roster fit, scarcity, budget fit, and owner preferences. Ray Fit/modifiers are independent of current bid. Live opportunity is independent of the market ranking and is evaluated as a separate event-time signal. The focused regression asserts these boundaries and confirms no production recommendation path was changed.

## Approved for SHADOW V1

The commissioner-approved shadow policy is recorded here without implementing it in production Recommended Now:

- Base Market Score: 60% Auction + 30% ADP + 10% Market Quality.
- Missing ADP: proportional reweighting of available components; no neutral ADP 50.
- Quality: 10% evidence quality only, using Auction coverage, Auction confidence, and ADP source coverage.
- Roster/FLEX: starter need, depth need, and FLEX opportunity; roster modifier maximum ±5.
- Scarcity: maximum ±2.
- Budget: no numeric score modifier; feasibility gate with affordability/stretch labels; NOT_REALISTIC is a hard gate.
- Combined Ray-specific modifier: System B, maximum ±7.
- Live Opportunity: entirely separate from Market Score and Ray Fit.

### Shadow live-value bands

| Band | Below/above consensus | Absolute-dollar floor |
|---|---:|---:|
| SMASH VALUE | ≥25% below | ≥$5 below |
| STRONG VALUE | ≥15% below | ≥$4 below |
| VALUE | ≥7.5% below | ≥$2 below |
| FAIR | no value/overpay threshold crossed | — |
| STRETCH | ≥7.5% above | ≥$2 above |
| OVERPAY | ≥15% above | ≥$4 above |
| HEAVY OVERPAY | ≥25% above | ≥$5 above |

These bands are shadow-test policy only. They are NOT YET APPROVED FOR PRODUCTION RECOMMENDED NOW.

## Controls and caveats

The Auction control is the Auction component alone. The ADP control is ADP-only where present. The current BEST OVERALL approximation uses only its market-related Auction/ADP weights; actual production BEST OVERALL additionally uses roster fit, scarcity, affordability, private preference, and league pressure. This report does not reproduce the production recommendation.
