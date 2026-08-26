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

## PHASE 4 — SHADOW ENGINE

> SHADOW ONLY — NOT USED BY PRODUCTION RECOMMENDED NOW — NOT DISPLAYED IN PRODUCTION UI — no Firestore writes, deployment, or production JSON.

Policy version: **decision-score-shadow-v1** (60/30/10-market-quality-system-b). The isolated engine reuses the calibration normalization, roster guidance, canonical max-bid calculation, and affordability labels; it adds only bounded System B roster/scarcity modifiers. Decision Score is Market Score plus Ray modifier, clamped to 0–100. NOT_REALISTIC results remain auditable but are excluded from acquire-now ranking.

The Phase 4 comparison uses synthetic/reference roster states and does not constitute production validation. Real-state shadow evaluation is still required; existing Recommended Now remains authoritative in production.

### Shadow comparison: empty-roster reference state

Agreement: **5/5** current Recommended Now selections appear in the shadow ranked set. This comparison is descriptive, not a correctness verdict.

#### Shadow top 20

| Rank | Player | Market Score | Ray modifier | Decision Score | Affordability |
|---:|---|---:|---:|---:|---|
| 1 | A.J. Brown | 96.7 | +4 | 100.0 | AFFORDABLE |
| 2 | Amon-Ra St. Brown | 98.6 | +5 | 100.0 | AFFORDABLE |
| 3 | Ashton Jeanty | 96.0 | +5 | 100.0 | AFFORDABLE |
| 4 | Bijan Robinson | 99.3 | +6 | 100.0 | AFFORDABLE |
| 5 | Brock Bowers | 96.5 | +6 | 100.0 | AFFORDABLE |
| 6 | CeeDee Lamb | 98.0 | +4 | 100.0 | AFFORDABLE |
| 7 | Chase Brown | 96.1 | +5 | 100.0 | AFFORDABLE |
| 8 | Christian McCaffrey | 98.6 | +5 | 100.0 | AFFORDABLE |
| 9 | De'Von Achane | 97.4 | +5 | 100.0 | AFFORDABLE |
| 10 | Derrick Henry | 96.4 | +5 | 100.0 | AFFORDABLE |
| 11 | Drake London | 97.1 | +4 | 100.0 | AFFORDABLE |
| 12 | Ja'Marr Chase | 99.5 | +5 | 100.0 | AFFORDABLE |
| 13 | Jahmyr Gibbs | 99.5 | +6 | 100.0 | AFFORDABLE |
| 14 | James Cook | 97.6 | +5 | 100.0 | AFFORDABLE |
| 15 | Jaxon Smith-Njigba | 98.1 | +5 | 100.0 | AFFORDABLE |
| 16 | Jonathan Taylor | 97.8 | +5 | 100.0 | AFFORDABLE |
| 17 | Josh Allen | 96.7 | +7 | 100.0 | AFFORDABLE |
| 18 | Justin Jefferson | 97.8 | +4 | 100.0 | AFFORDABLE |
| 19 | Kenneth Walker | 95.8 | +5 | 100.0 | AFFORDABLE |
| 20 | Lamar Jackson | 93.2 | +7 | 100.0 | AFFORDABLE |

#### Current selections and shadow ranks

| Category | Player | Shadow rank |
|---|---|---:|
| BEST OVERALL | Josh Allen | 17 |
| BEST VALUE | Rashod Bateman | 182 |
| ROSTER FIT | Jahmyr Gibbs | 13 |
| SCARCITY PLAY | Lamar Jackson | 20 |
| BUDGET PLAY | John Metchie | 184 |

#### Shadow players omitted by current Recommended Now

- A.J. Brown: Market 96.7, Ray +4, Decision 100.0; AFFORDABLE.
- Amon-Ra St. Brown: Market 98.6, Ray +5, Decision 100.0; AFFORDABLE.
- Ashton Jeanty: Market 96.0, Ray +5, Decision 100.0; AFFORDABLE.
- Bijan Robinson: Market 99.3, Ray +6, Decision 100.0; AFFORDABLE.
- Brock Bowers: Market 96.5, Ray +6, Decision 100.0; AFFORDABLE.
- CeeDee Lamb: Market 98.0, Ray +4, Decision 100.0; AFFORDABLE.
- Chase Brown: Market 96.1, Ray +5, Decision 100.0; AFFORDABLE.
- Christian McCaffrey: Market 98.6, Ray +5, Decision 100.0; AFFORDABLE.
- De'Von Achane: Market 97.4, Ray +5, Decision 100.0; AFFORDABLE.
- Derrick Henry: Market 96.4, Ray +5, Decision 100.0; AFFORDABLE.

Disagreement explanation is intentionally component-level: market-score difference is the objective 60/30/10 baseline; roster/FLEX and scarcity are bounded System B nudges; affordability can hard-gate; Recommended Now also selects distinct categories and applies availability/private-preference behavior that Shadow v1 does not.

### Shadow implementation boundaries

The pure shadow engine has no current-bid parameter and no private target/watch/fade bonus. The server-only adapter accepts an already assembled War Room state and performs no reads or writes itself. The live-opportunity classifier is separate and never changes Market Score, Ray Fit, or Decision Score. No production import depends on the shadow module.

Score saturation near 100 remains an open evaluation item. No compression or rescaling policy has been approved. Phase 5 must test saturation using real War Room state before any production UI exposure.

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









## PHASE 5 — REAL WAR ROOM SHADOW EVALUATION

> READ-ONLY REAL-STATE EVALUATION — NOT PRODUCTION RECOMMENDATION LOGIC. No writes or deployment occurred.

- Keeper players: Chris Olave, Cam Skattebo.
- Purchased players: None.
- Starter needs: QB 1, RB 1, WR 1, TE 1, K 1, DEF 1, FLEX 1.
- Bench/depth needs: QB 2, RB 4, WR 4, TE 2, K 1, DEF 1.
### Real-state snapshot
Keepers 2; roster/purchases 2; available players 538; current nomination NO CURRENT NOMINATION; current bid —.

### Shadow universe
Candidates 538; eligible 538; NOT_REALISTIC 0; missing ADP 119.
Market statistics {"buckets":{"100":0,"99–99.9":4,"97.5–98.9":9,"95–97.4":12,"90–94.9":28,"80–89.9":53,"70–79.9":42,"60–69.9":14,"below 60":376},"minimum":4.3,"median":29.3,"mean":44.136988847583524,"p75":72.2,"p90":89.2,"p95":94.4,"p99":98.4,"maximum":99.5,"standardDeviation":27.40506811192428}
Decision statistics {"buckets":{"100":0,"99–99.9":1,"97.5–98.9":5,"95–97.4":14,"90–94.9":30,"80–89.9":57,"70–79.9":43,"60–69.9":12,"below 60":376},"minimum":8.7,"median":33,"mean":46.33866171003702,"p75":72.6,"p90":89.4,"p95":93.6,"p99":96.9,"maximum":99.5,"standardDeviation":25.911320595676994}

### Top 30 Decision Scores
1. Bijan Robinson (RB, ATL) — Market 99.5, Auction 100.0, ADP 100.0, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 99.5, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 99.5 = Auction 100 × 60% + ADP 100 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical RB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
2. Puka Nacua (WR, LAR) — Market 99.3, Auction 99.8, ADP 99.8, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 99.3 = Auction 99.8 × 60% + ADP 99.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin WR inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
3. Amon-Ra St. Brown (WR, DET) — Market 99.0, Auction 99.6, ADP 99.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.1, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 99 = Auction 99.6 × 60% + ADP 99.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin WR inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
4. Christian McCaffrey (RB, SF) — Market 99.0, Auction 99.4, ADP 99.5, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.1, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 99 = Auction 99.4 × 60% + ADP 99.5 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
5. Josh Allen (QB, BUF) — Market 97.8, Auction 98.9, ADP 96.7, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 97.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.8 = Auction 98.9 × 60% + ADP 96.7 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
6. James Cook (RB, BUF) — Market 98.4, Auction 98.7, ADP 99.0, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 97.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 98.4 = Auction 98.7 × 60% + ADP 99 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
7. CeeDee Lamb (WR, DAL) — Market 98.7, Auction 99.3, ADP 98.8, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 96.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 98.7 = Auction 99.3 × 60% + ADP 98.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
8. Saquon Barkley (RB, PHI) — Market 97.7, Auction 97.8, ADP 98.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.7 = Auction 97.8 × 60% + ADP 98.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
9. Brock Bowers (TE, LV) — Market 97.5, Auction 98.3, ADP 96.9, Quality 94.5, Fit +5, Scarcity +1, Ray +6, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.5 = Auction 98.3 × 60% + ADP 96.9 × 30% + Quality 94.5 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
10. Derrick Henry (RB, BAL) — Market 97.5, Auction 98.0, ADP 97.4, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.5 = Auction 98 × 60% + ADP 97.4 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
11. Justin Jefferson (WR, MIN) — Market 98.5, Auction 99.1, ADP 98.6, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 98.5 = Auction 99.1 × 60% + ADP 98.6 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
12. Trey McBride (TE, ARI) — Market 97.5, Auction 98.5, ADP 96.4, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.5 = Auction 98.5 × 60% + ADP 96.4 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
13. Ashton Jeanty (RB, LV) — Market 97.4, Auction 97.4, ADP 98.3, Quality 94.5, Fit +5, Scarcity +1, Ray +6, Decision 96.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.4 = Auction 97.4 × 60% + ADP 98.3 × 30% + Quality 94.5 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
14. Kenneth Walker (RB, KC) — Market 97.3, Auction 97.6, ADP 97.6, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.5, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.3 = Auction 97.6 × 60% + ADP 97.6 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
15. Omarion Hampton (RB, LAC) — Market 97.1, Auction 97.2, ADP 97.8, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.1 = Auction 97.2 × 60% + ADP 97.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
16. A.J. Brown (WR, NE) — Market 97.8, Auction 98.1, ADP 97.1, Quality 98.5, Fit +5, Scarcity +0, Ray +5, Decision 96.1, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.8 = Auction 98.1 × 60% + ADP 97.1 × 30% + Quality 98.5 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
17. Jeremiyah Love (RB, ARI) — Market 96.4, Auction 96.8, ADP 96.2, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 95.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 96.4 = Auction 96.8 × 60% + ADP 96.2 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
18. Lamar Jackson (QB, BAL) — Market 95.3, Auction 96.3, ADP 93.5, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 95.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.3 = Auction 96.3 × 60% + ADP 93.5 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
19. Breece Hall (RB, NYJ) — Market 96.0, Auction 96.5, ADP 95.5, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 95.3, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 96 = Auction 96.5 × 60% + ADP 95.5 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
20. Josh Jacobs (RB, GB) — Market 95.6, Auction 95.9, ADP 95.2, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 95.0, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.6 = Auction 95.9 × 60% + ADP 95.2 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
21. Kyren Williams (RB, LAR) — Market 95.5, Auction 95.5, ADP 95.7, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 94.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.5 = Auction 95.5 × 60% + ADP 95.7 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
22. Malik Nabers (WR, NYG) — Market 96.5, Auction 97.0, ADP 95.9, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 94.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 96.5 = Auction 97 × 60% + ADP 95.9 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
23. Drake Maye (QB, NE) — Market 94.2, Auction 95.7, ADP 90.9, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 94.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 94.2 = Auction 95.7 × 60% + ADP 90.9 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
24. Zay Flowers (WR, BAL) — Market 95.9, Auction 96.6, ADP 95.0, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 94.3, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.9 = Auction 96.6 × 60% + ADP 95 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
25. Colston Loveland (TE, CHI) — Market 94.4, Auction 94.8, ADP 93.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 93.8, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 94.4 = Auction 94.8 × 60% + ADP 93.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
26. Tee Higgins (WR, CIN) — Market 95.4, Auction 95.3, ADP 94.7, Quality 98.5, Fit +5, Scarcity +0, Ray +5, Decision 93.8, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.4 = Auction 95.3 × 60% + ADP 94.7 × 30% + Quality 98.5 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
27. Garrett Wilson (WR, NYJ) — Market 95.3, Auction 96.1, ADP 93.8, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 93.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.3 = Auction 96.1 × 60% + ADP 93.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
28. Joe Burrow (QB, CIN) — Market 93.2, Auction 94.4, ADP 90.4, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 93.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 93.2 = Auction 94.4 × 60% + ADP 90.4 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
29. Jalen Hurts (QB, PHI) — Market 92.9, Auction 94.6, ADP 89.0, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 93.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.9 = Auction 94.6 × 60% + ADP 89 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 99.9 = Market Score + bounded Ray modifier +7.
30. Tetairoa McMillan (WR, CAR) — Market 94.9, Auction 95.2, ADP 94.3, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 93.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 94.9 = Auction 95.2 × 60% + ADP 94.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 99.9 = Market Score + bounded Ray modifier +5.

### Recommended Now
- BEST OVERALL: Bijan Robinson (current score 85.0); shadow Market 99.5, Ray 7, Decision 99.5, rank 1, AFFORDABLE.
- BEST VALUE: Rashod Bateman (current score 70.9); shadow Market 60.3, Ray 5, Decision 61.0, rank 162, AFFORDABLE.
- ROSTER FIT: Brock Bowers (current score 72.3); shadow Market 97.5, Ray 6, Decision 96.7, rank 9, AFFORDABLE.
- SCARCITY PLAY: Josh Allen (current score 99.7); shadow Market 97.8, Ray 7, Decision 97.9, rank 5, AFFORDABLE.
- BUDGET PLAY: Matthew Golden (current score 86.9); shadow Market 79.9, Ray 5, Decision 79.3, rank 109, AFFORDABLE.

### Agreement and limitations
The comparison is real-state and read-only. Existing Recommended Now remains authoritative. Score saturation is recorded as a production-readiness warning; no formula change is made.

### Live Opportunity
NO CURRENT NOMINATION; none invented.

### QB leaders
1. Josh Allen (QB, BUF) — Market 97.8, Auction 98.9, ADP 96.7, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 97.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.8 = Auction 98.9 × 60% + ADP 96.7 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
2. Lamar Jackson (QB, BAL) — Market 95.3, Auction 96.3, ADP 93.5, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 95.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.3 = Auction 96.3 × 60% + ADP 93.5 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
3. Drake Maye (QB, NE) — Market 94.2, Auction 95.7, ADP 90.9, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 94.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 94.2 = Auction 95.7 × 60% + ADP 90.9 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
4. Joe Burrow (QB, CIN) — Market 93.2, Auction 94.4, ADP 90.4, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 93.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 93.2 = Auction 94.4 × 60% + ADP 90.4 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
5. Jalen Hurts (QB, PHI) — Market 92.9, Auction 94.6, ADP 89.0, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 93.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.9 = Auction 94.6 × 60% + ADP 89 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 99.9 = Market Score + bounded Ray modifier +7.
6. Jayden Daniels (QB, WSH) — Market 92.7, Auction 94.0, ADP 89.5, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 93.2, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.7 = Auction 94 × 60% + ADP 89.5 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 99.7 = Market Score + bounded Ray modifier +7.
7. Dak Prescott (QB, DAL) — Market 90.3, Auction 91.2, ADP 85.9, Quality 98.5, Fit +5, Scarcity +2, Ray +7, Decision 90.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 90.3 = Auction 91.2 × 60% + ADP 85.9 × 30% + Quality 98.5 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 97.3 = Market Score + bounded Ray modifier +7.
8. Caleb Williams (QB, CHI) — Market 90.2, Auction 90.9, ADP 87.3, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 90.8, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 90.2 = Auction 90.9 × 60% + ADP 87.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 97.2 = Market Score + bounded Ray modifier +7.
9. Justin Herbert (QB, LAC) — Market 89.0, Auction 89.2, ADP 85.4, Quality 98.5, Fit +5, Scarcity +2, Ray +7, Decision 89.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 89 = Auction 89.2 × 60% + ADP 85.4 × 30% + Quality 98.5 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 96 = Market Score + bounded Ray modifier +7.
10. Trevor Lawrence (QB, JAC) — Market 88.8, Auction 89.9, ADP 84.7, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 89.5, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 88.8 = Auction 89.9 × 60% + ADP 84.7 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical QB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 95.8 = Market Score + bounded Ray modifier +7.

### RB leaders
1. Bijan Robinson (RB, ATL) — Market 99.5, Auction 100.0, ADP 100.0, Quality 94.8, Fit +5, Scarcity +2, Ray +7, Decision 99.5, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 99.5 = Auction 100 × 60% + ADP 100 × 30% + Quality 94.8 × 10%. Starter need contributes +5. critical RB inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +7.
2. Christian McCaffrey (RB, SF) — Market 99.0, Auction 99.4, ADP 99.5, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.1, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 99 = Auction 99.4 × 60% + ADP 99.5 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
3. James Cook (RB, BUF) — Market 98.4, Auction 98.7, ADP 99.0, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 97.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 98.4 = Auction 98.7 × 60% + ADP 99 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
4. Saquon Barkley (RB, PHI) — Market 97.7, Auction 97.8, ADP 98.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.7 = Auction 97.8 × 60% + ADP 98.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
5. Derrick Henry (RB, BAL) — Market 97.5, Auction 98.0, ADP 97.4, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.5 = Auction 98 × 60% + ADP 97.4 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
6. Ashton Jeanty (RB, LV) — Market 97.4, Auction 97.4, ADP 98.3, Quality 94.5, Fit +5, Scarcity +1, Ray +6, Decision 96.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.4 = Auction 97.4 × 60% + ADP 98.3 × 30% + Quality 94.5 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
7. Kenneth Walker (RB, KC) — Market 97.3, Auction 97.6, ADP 97.6, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.5, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.3 = Auction 97.6 × 60% + ADP 97.6 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
8. Omarion Hampton (RB, LAC) — Market 97.1, Auction 97.2, ADP 97.8, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.1 = Auction 97.2 × 60% + ADP 97.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
9. Jeremiyah Love (RB, ARI) — Market 96.4, Auction 96.8, ADP 96.2, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 95.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 96.4 = Auction 96.8 × 60% + ADP 96.2 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
10. Breece Hall (RB, NYJ) — Market 96.0, Auction 96.5, ADP 95.5, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 95.3, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 96 = Auction 96.5 × 60% + ADP 95.5 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
11. Josh Jacobs (RB, GB) — Market 95.6, Auction 95.9, ADP 95.2, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 95.0, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.6 = Auction 95.9 × 60% + ADP 95.2 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
12. Kyren Williams (RB, LAR) — Market 95.5, Auction 95.5, ADP 95.7, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 94.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.5 = Auction 95.5 × 60% + ADP 95.7 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
13. Bucky Irving (RB, TB) — Market 93.5, Auction 93.7, ADP 92.8, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 93.0, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 93.5 = Auction 93.7 × 60% + ADP 92.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 99.5 = Market Score + bounded Ray modifier +6.
14. D'Andre Swift (RB, CHI) — Market 93.5, Auction 93.5, ADP 93.1, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 93.0, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 93.5 = Auction 93.5 × 60% + ADP 93.1 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 99.5 = Market Score + bounded Ray modifier +6.
15. Quinshon Judkins (RB, CLE) — Market 92.9, Auction 92.9, ADP 92.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 92.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.9 = Auction 92.9 × 60% + ADP 92.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 98.9 = Market Score + bounded Ray modifier +6.
16. David Montgomery (RB, HOU) — Market 92.2, Auction 91.6, ADP 92.6, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 91.8, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.2 = Auction 91.6 × 60% + ADP 92.6 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 98.2 = Market Score + bounded Ray modifier +6.
17. Bhayshul Tuten (RB, JAC) — Market 91.5, Auction 91.2, ADP 91.1, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 91.1, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 91.5 = Auction 91.2 × 60% + ADP 91.1 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 97.5 = Market Score + bounded Ray modifier +6.
18. Jadarian Price (RB, SEA) — Market 90.7, Auction 90.5, ADP 89.7, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 90.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 90.7 = Auction 90.5 × 60% + ADP 89.7 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 96.7 = Market Score + bounded Ray modifier +6.
19. Rhamondre Stevenson (RB, NE) — Market 89.0, Auction 88.6, ADP 88.0, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 88.8, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 89 = Auction 88.6 × 60% + ADP 88 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 95 = Market Score + bounded Ray modifier +6.
20. Jaylen Warren (RB, PIT) — Market 88.8, Auction 88.1, ADP 88.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 88.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 88.8 = Auction 88.1 × 60% + ADP 88.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin RB inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 94.8 = Market Score + bounded Ray modifier +6.

### WR leaders
1. Puka Nacua (WR, LAR) — Market 99.3, Auction 99.8, ADP 99.8, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 99.3 = Auction 99.8 × 60% + ADP 99.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin WR inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
2. Amon-Ra St. Brown (WR, DET) — Market 99.0, Auction 99.6, ADP 99.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.1, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 99 = Auction 99.6 × 60% + ADP 99.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin WR inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
3. CeeDee Lamb (WR, DAL) — Market 98.7, Auction 99.3, ADP 98.8, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 96.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 98.7 = Auction 99.3 × 60% + ADP 98.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
4. Justin Jefferson (WR, MIN) — Market 98.5, Auction 99.1, ADP 98.6, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 98.5 = Auction 99.1 × 60% + ADP 98.6 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
5. A.J. Brown (WR, NE) — Market 97.8, Auction 98.1, ADP 97.1, Quality 98.5, Fit +5, Scarcity +0, Ray +5, Decision 96.1, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.8 = Auction 98.1 × 60% + ADP 97.1 × 30% + Quality 98.5 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
6. Malik Nabers (WR, NYG) — Market 96.5, Auction 97.0, ADP 95.9, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 94.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 96.5 = Auction 97 × 60% + ADP 95.9 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
7. Zay Flowers (WR, BAL) — Market 95.9, Auction 96.6, ADP 95.0, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 94.3, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.9 = Auction 96.6 × 60% + ADP 95 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
8. Tee Higgins (WR, CIN) — Market 95.4, Auction 95.3, ADP 94.7, Quality 98.5, Fit +5, Scarcity +0, Ray +5, Decision 93.8, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.4 = Auction 95.3 × 60% + ADP 94.7 × 30% + Quality 98.5 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
9. Garrett Wilson (WR, NYJ) — Market 95.3, Auction 96.1, ADP 93.8, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 93.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 95.3 = Auction 96.1 × 60% + ADP 93.8 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +5.
10. Tetairoa McMillan (WR, CAR) — Market 94.9, Auction 95.2, ADP 94.3, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 93.4, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 94.9 = Auction 95.2 × 60% + ADP 94.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 99.9 = Market Score + bounded Ray modifier +5.
11. Emeka Egbuka (WR, TB) — Market 94.7, Auction 95.0, ADP 94.0, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 93.2, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 94.7 = Auction 95 × 60% + ADP 94 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 99.7 = Market Score + bounded Ray modifier +5.
12. Ladd McConkey (WR, LAC) — Market 94.2, Auction 93.9, ADP 94.5, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 92.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 94.2 = Auction 93.9 × 60% + ADP 94.5 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 99.2 = Market Score + bounded Ray modifier +5.
13. Davante Adams (WR, LAR) — Market 93.4, Auction 94.2, ADP 91.4, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 92.0, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 93.4 = Auction 94.2 × 60% + ADP 91.4 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 98.4 = Market Score + bounded Ray modifier +5.
14. Jameson Williams (WR, DET) — Market 92.7, Auction 93.3, ADP 90.7, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 91.3, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.7 = Auction 93.3 × 60% + ADP 90.7 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 97.7 = Market Score + bounded Ray modifier +5.
15. Luther Burden (WR, CHI) — Market 92.7, Auction 92.7, ADP 92.1, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 91.3, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.7 = Auction 92.7 × 60% + ADP 92.1 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 97.7 = Market Score + bounded Ray modifier +5.
16. Terry McLaurin (WR, WSH) — Market 92.7, Auction 92.9, ADP 91.6, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 91.3, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.7 = Auction 92.9 × 60% + ADP 91.6 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 97.7 = Market Score + bounded Ray modifier +5.
17. DJ Moore (WR, BUF) — Market 92.3, Auction 92.0, ADP 91.9, Quality 95.0, Fit +5, Scarcity +0, Ray +5, Decision 90.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92.3 = Auction 92 × 60% + ADP 91.9 × 30% + Quality 95 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 97.3 = Market Score + bounded Ray modifier +5.
18. Mike Evans (WR, SF) — Market 92.0, Auction 92.4, ADP 90.2, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 90.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 92 = Auction 92.4 × 60% + ADP 90.2 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 97 = Market Score + bounded Ray modifier +5.
19. Christian Watson (WR, GB) — Market 91.8, Auction 92.6, ADP 89.2, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 90.5, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 91.8 = Auction 92.6 × 60% + ADP 89.2 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 96.8 = Market Score + bounded Ray modifier +5.
20. Rome Odunze (WR, CHI) — Market 91.8, Auction 92.2, ADP 90.0, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 90.5, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 91.8 = Auction 92.2 × 60% + ADP 90 × 30% + Quality 94.8 × 10%. Starter need contributes +5. normal WR inventory (4 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 96.8 = Market Score + bounded Ray modifier +5.

### TE leaders
1. Brock Bowers (TE, LV) — Market 97.5, Auction 98.3, ADP 96.9, Quality 94.5, Fit +5, Scarcity +1, Ray +6, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.5 = Auction 98.3 × 60% + ADP 96.9 × 30% + Quality 94.5 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
2. Trey McBride (TE, ARI) — Market 97.5, Auction 98.5, ADP 96.4, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 97.5 = Auction 98.5 × 60% + ADP 96.4 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
3. Colston Loveland (TE, CHI) — Market 94.4, Auction 94.8, ADP 93.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 93.8, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 94.4 = Auction 94.8 × 60% + ADP 93.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 100 = Market Score + bounded Ray modifier +6.
4. Harold Fannin (TE, CLE) — Market 90.5, Auction 91.8, ADP 86.4, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 90.2, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 90.5 = Auction 91.8 × 60% + ADP 86.4 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 96.5 = Market Score + bounded Ray modifier +6.
5. Sam LaPorta (TE, DET) — Market 90.0, Auction 90.7, ADP 87.1, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 89.7, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 90 = Auction 90.7 × 60% + ADP 87.1 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 96 = Market Score + bounded Ray modifier +6.
6. George Kittle (TE, SF) — Market 88.1, Auction 89.2, ADP 82.3, Quality 98.5, Fit +5, Scarcity +1, Ray +6, Decision 87.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 88.1 = Auction 89.2 × 60% + ADP 82.3 × 30% + Quality 98.5 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 94.1 = Market Score + bounded Ray modifier +6.
7. Travis Kelce (TE, KC) — Market 84.8, Auction 85.5, ADP 79.9, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 84.9, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 84.8 = Auction 85.5 × 60% + ADP 79.9 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 90.8 = Market Score + bounded Ray modifier +6.
8. Dalton Kincaid (TE, BUF) — Market 83.7, Auction 83.2, ADP 79.7, Quality 98.5, Fit +5, Scarcity +1, Ray +6, Decision 83.8, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 83.7 = Auction 83.2 × 60% + ADP 79.7 × 30% + Quality 98.5 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 89.7 = Market Score + bounded Ray modifier +6.
9. Dallas Goedert (TE, PHI) — Market 82.4, Auction 83.2, ADP 76.6, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 82.6, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 82.4 = Auction 83.2 × 60% + ADP 76.6 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 88.4 = Market Score + bounded Ray modifier +6.
10. Mark Andrews (TE, BAL) — Market 82.1, Auction 82.9, ADP 76.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 82.3, AFFORDABLE, Auc src 5, ADP src 5
   Market Score 82.1 = Auction 82.9 × 60% + ADP 76.3 × 30% + Quality 94.8 × 10%. Starter need contributes +5. thin TE inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 88.1 = Market Score + bounded Ray modifier +6.

### K leaders
1. Brandon Aubrey (K, DAL) — Market 70.1, Auction 72.3, ADP 62.9, Quality 78.5, Fit +5, Scarcity +2, Ray +7, Decision 72.1, AFFORDABLE, Auc src 5, ADP src 3
   Market Score 70.1 = Auction 72.3 × 60% + ADP 62.9 × 30% + Quality 78.5 × 10%. Starter need contributes +5. critical K inventory (1 strong players remain) maps to +2. Budget feasibility: AFFORDABLE. Decision Score 77.1 = Market Score + bounded Ray modifier +7.
2. Cameron Dicker (K, LAC) — Market 68.2, Auction 71.1, ADP 59.1, Quality 78.5, Fit +5, Scarcity +1, Ray +6, Decision 69.3, AFFORDABLE, Auc src 5, ADP src 3
   Market Score 68.2 = Auction 71.1 × 60% + ADP 59.1 × 30% + Quality 78.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 74.2 = Market Score + bounded Ray modifier +6.
3. Jason Myers (K, SEA) — Market 40.7, Auction 26.3, ADP 56.9, Quality 78.5, Fit +5, Scarcity +1, Ray +6, Decision 43.6, AFFORDABLE, Auc src 5, ADP src 3
   Market Score 40.7 = Auction 26.3 × 60% + ADP 56.9 × 30% + Quality 78.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 46.7 = Market Score + bounded Ray modifier +6.
4. Ka'imi Fairbairn (K, HOU) — Market 40.6, Auction 26.3, ADP 56.5, Quality 78.5, Fit +5, Scarcity +1, Ray +6, Decision 43.6, AFFORDABLE, Auc src 5, ADP src 3
   Market Score 40.6 = Auction 26.3 × 60% + ADP 56.5 × 30% + Quality 78.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 46.6 = Market Score + bounded Ray modifier +6.
5. Harrison Mevis (K, LAR) — Market 37.8, Auction 25.0, ADP 49.8, Quality 78.5, Fit +5, Scarcity +1, Ray +6, Decision 40.9, AFFORDABLE, Auc src 5, ADP src 3
   Market Score 37.8 = Auction 25 × 60% + ADP 49.8 × 30% + Quality 78.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 43.8 = Market Score + bounded Ray modifier +6.
6. Jake Bates (K, DET) — Market 37.8, Auction 26.3, ADP 49.0, Quality 73.5, Fit +5, Scarcity +1, Ray +6, Decision 40.9, AFFORDABLE, Auc src 4, ADP src 3
   Market Score 37.8 = Auction 26.3 × 60% + ADP 49 × 30% + Quality 73.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 43.8 = Market Score + bounded Ray modifier +6.
7. Cam Little (K, JAC) — Market 36.2, Auction 20.9, ADP 54.3, Quality 73.5, Fit +5, Scarcity +1, Ray +6, Decision 39.4, AFFORDABLE, Auc src 4, ADP src 3
   Market Score 36.2 = Auction 20.9 × 60% + ADP 54.3 × 30% + Quality 73.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 42.2 = Market Score + bounded Ray modifier +6.
8. Tyler Loop (K, BAL) — Market 36.1, Auction 26.3, ADP 43.1, Quality 73.5, Fit +5, Scarcity +1, Ray +6, Decision 39.3, AFFORDABLE, Auc src 4, ADP src 3
   Market Score 36.1 = Auction 26.3 × 60% + ADP 43.1 × 30% + Quality 73.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 42.1 = Market Score + bounded Ray modifier +6.
9. Eddy Pineiro (K, SF) — Market 35.6, Auction 26.3, ADP 41.6, Quality 73.5, Fit +5, Scarcity +1, Ray +6, Decision 38.9, AFFORDABLE, Auc src 4, ADP src 3
   Market Score 35.6 = Auction 26.3 × 60% + ADP 41.6 × 30% + Quality 73.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 41.6 = Market Score + bounded Ray modifier +6.
10. Harrison Butker (K, KC) — Market 35.0, Auction 20.9, ADP 53.8, Quality 63.5, Fit +5, Scarcity +1, Ray +6, Decision 38.3, AFFORDABLE, Auc src 4, ADP src 2
   Market Score 35 = Auction 20.9 × 60% + ADP 53.8 × 30% + Quality 63.5 × 10%. Starter need contributes +5. thin K inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 41 = Market Score + bounded Ray modifier +6.

### DEF leaders
1. Houston Texans (DEF, HOU) — Market 71.2, Auction 73.0, ADP 72.0, Quality 58.0, Fit +5, Scarcity +1, Ray +6, Decision 72.1, AFFORDABLE, Auc src 3, ADP src 2
   Market Score 71.2 = Auction 73 × 60% + ADP 72 × 30% + Quality 58 × 10%. Starter need contributes +5. thin DEF inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 77.2 = Market Score + bounded Ray modifier +6.
2. Seattle Seahawks (DEF, SEA) — Market 71.2, Auction 71.7, ADP 71.3, Quality 68.0, Fit +5, Scarcity +0, Ray +5, Decision 71.2, AFFORDABLE, Auc src 3, ADP src 3
   Market Score 71.2 = Auction 71.7 × 60% + ADP 71.3 × 30% + Quality 68 × 10%. Starter need contributes +5. normal DEF inventory (3 strong players remain) maps to +0. Budget feasibility: AFFORDABLE. Decision Score 76.2 = Market Score + bounded Ray modifier +5.
3. Denver Broncos (DEF, DEN) — Market 69.8, Auction 73.0, ADP 67.2, Quality 58.0, Fit +5, Scarcity +1, Ray +6, Decision 70.8, AFFORDABLE, Auc src 3, ADP src 2
   Market Score 69.8 = Auction 73 × 60% + ADP 67.2 × 30% + Quality 58 × 10%. Starter need contributes +5. thin DEF inventory (2 strong players remain) maps to +1. Budget feasibility: AFFORDABLE. Decision Score 75.8 = Market Score + bounded Ray modifier +6.
4. Los Angeles Rams (DEF, LAR) — Market 71.6, Auction 70.4, ADP 75.1, Quality 68.0, Fit +5, Scarcity -1, Ray +4, Decision 70.7, AFFORDABLE, Auc src 3, ADP src 3
   Market Score 71.6 = Auction 70.4 × 60% + ADP 75.1 × 30% + Quality 68 × 10%. Starter need contributes +5. plentiful DEF inventory (7 strong players remain) maps to -1. Budget feasibility: AFFORDABLE. Decision Score 75.6 = Market Score + bounded Ray modifier +4.
5. Philadelphia Eagles (DEF, PHI) — Market 69.4, Auction 70.4, ADP 67.7, Quality 68.0, Fit +5, Scarcity -1, Ray +4, Decision 68.6, AFFORDABLE, Auc src 3, ADP src 3
   Market Score 69.4 = Auction 70.4 × 60% + ADP 67.7 × 30% + Quality 68 × 10%. Starter need contributes +5. plentiful DEF inventory (7 strong players remain) maps to -1. Budget feasibility: AFFORDABLE. Decision Score 73.4 = Market Score + bounded Ray modifier +4.
6. Minnesota Vikings (DEF, MIN) — Market 67.4, Auction 70.4, ADP 61.2, Quality 68.0, Fit +5, Scarcity -1, Ray +4, Decision 66.7, AFFORDABLE, Auc src 3, ADP src 3
   Market Score 67.4 = Auction 70.4 × 60% + ADP 61.2 × 30% + Quality 68 × 10%. Starter need contributes +5. plentiful DEF inventory (7 strong players remain) maps to -1. Budget feasibility: AFFORDABLE. Decision Score 71.4 = Market Score + bounded Ray modifier +4.
7. Pittsburgh Steelers (DEF, PIT) — Market 65.9, Auction 70.4, ADP 56.2, Quality 68.0, Fit +5, Scarcity -1, Ray +4, Decision 65.3, AFFORDABLE, Auc src 3, ADP src 3
   Market Score 65.9 = Auction 70.4 × 60% + ADP 56.2 × 30% + Quality 68 × 10%. Starter need contributes +5. plentiful DEF inventory (7 strong players remain) maps to -1. Budget feasibility: AFFORDABLE. Decision Score 69.9 = Market Score + bounded Ray modifier +4.
8. Baltimore Ravens (DEF, BAL) — Market 40.5, Auction 26.3, ADP 59.6, Quality 68.0, Fit +5, Scarcity -1, Ray +4, Decision 41.6, AFFORDABLE, Auc src 3, ADP src 3
   Market Score 40.5 = Auction 26.3 × 60% + ADP 59.6 × 30% + Quality 68 × 10%. Starter need contributes +5. plentiful DEF inventory (7 strong players remain) maps to -1. Budget feasibility: AFFORDABLE. Decision Score 44.5 = Market Score + bounded Ray modifier +4.
9. Detroit Lions (DEF, DET) — Market 37.0, Auction 26.3, ADP 48.1, Quality 68.0, Fit +5, Scarcity -1, Ray +4, Decision 38.3, AFFORDABLE, Auc src 3, ADP src 3
   Market Score 37 = Auction 26.3 × 60% + ADP 48.1 × 30% + Quality 68 × 10%. Starter need contributes +5. plentiful DEF inventory (7 strong players remain) maps to -1. Budget feasibility: AFFORDABLE. Decision Score 41 = Market Score + bounded Ray modifier +4.
10. New England Patriots (DEF, NE) — Market 33.2, Auction 11.5, ADP 65.1, Quality 68.0, Fit +5, Scarcity -1, Ray +4, Decision 34.8, AFFORDABLE, Auc src 3, ADP src 3
   Market Score 33.2 = Auction 11.5 × 60% + ADP 65.1 × 30% + Quality 68 × 10%. Starter need contributes +5. plentiful DEF inventory (7 strong players remain) maps to -1. Budget feasibility: AFFORDABLE. Decision Score 37.2 = Market Score + bounded Ray modifier +4.

### Detailed comparison
Selections in shadow top 10/20/30/50: 3/3/3/3.
Shadow-high/current-omitted: Puka Nacua (WR, LAR) — Market 99.3, Auction 99.8, ADP 99.8, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.4, AFFORDABLE, Auc src 5, ADP src 5 | Amon-Ra St. Brown (WR, DET) — Market 99.0, Auction 99.6, ADP 99.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.1, AFFORDABLE, Auc src 5, ADP src 5 | Christian McCaffrey (RB, SF) — Market 99.0, Auction 99.4, ADP 99.5, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 98.1, AFFORDABLE, Auc src 5, ADP src 5 | James Cook (RB, BUF) — Market 98.4, Auction 98.7, ADP 99.0, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 97.6, AFFORDABLE, Auc src 5, ADP src 5 | CeeDee Lamb (WR, DAL) — Market 98.7, Auction 99.3, ADP 98.8, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 96.9, AFFORDABLE, Auc src 5, ADP src 5 | Saquon Barkley (RB, PHI) — Market 97.7, Auction 97.8, ADP 98.3, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.9, AFFORDABLE, Auc src 5, ADP src 5 | Derrick Henry (RB, BAL) — Market 97.5, Auction 98.0, ADP 97.4, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5 | Justin Jefferson (WR, MIN) — Market 98.5, Auction 99.1, ADP 98.6, Quality 94.8, Fit +5, Scarcity +0, Ray +5, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5 | Trey McBride (TE, ARI) — Market 97.5, Auction 98.5, ADP 96.4, Quality 94.8, Fit +5, Scarcity +1, Ray +6, Decision 96.7, AFFORDABLE, Auc src 5, ADP src 5 | Ashton Jeanty (RB, LV) — Market 97.4, Auction 97.4, ADP 98.3, Quality 94.5, Fit +5, Scarcity +1, Ray +6, Decision 96.6, AFFORDABLE, Auc src 5, ADP src 5.
Current-selected below shadow top 150: Rashod Bateman (BEST VALUE).
Preference context: 4 target, 0 watch, 0 fade, 0 open; preferences remain intentionally outside Shadow v1.
Top roster boosts: Bijan Robinson +5, Puka Nacua +5, Amon-Ra St. Brown +5, Christian McCaffrey +5, Josh Allen +5, James Cook +5, CeeDee Lamb +5, Saquon Barkley +5, Brock Bowers +5, Derrick Henry +5.
Top roster penalties: Los Angeles Chargers -2, Atlanta Falcons -2, Jacksonville Jaguars -2, Dallas Cowboys -2, Kansas City Chiefs -2, Chicago Bears -2, San Francisco 49ers -2, New York Giants -2, Tampa Bay Buccaneers -2, Tennessee Titans -2.
Scarcity range -1 to 2; the ±2 limit is a nudge.
Budget counts: AFFORDABLE 538; STRETCH 0; NOT_REALISTIC 0.
Important gated players: None.

### Saturation alternatives — analysis only
A keep additive score preserves policy and auditability but retains compression; B percentile-ranks the final score but changes score meaning; C compresses Market Score but changes calibrated semantics; D uses an uncapped internal score plus display transform but adds complexity; E applies simple post-score scaling but risks unexplained math. No alternative is selected.

### Findings
Decision Engine most favors Bijan Robinson; greatest current need is QB. Existing Recommended Now category diversity remains useful; showing both systems would require explicit labeling. Real-state validation does not justify production integration yet.

### Agreement and score gaps
Current selections in shadow top 10/20/30/50: 3/3/3/3.
Eligible score gaps: #1/#2 1.1; #1/#5 1.6; #1/#10 2.8; #5/#10 1.2; #10/#20 1.7; #20/#30 1.6.
Median/mean adjacent gap approximated by mean for top 10/top 25/top 50: 0.31 / 0.24 / 0.19.

Budget state: remaining $167.0; roster slots 14; legal max bid $154.0.

## PHASE 6 — SCORE SEPARATION / SATURATION

> OFFLINE CALIBRATION — NO PRODUCTION INTEGRATION. Recommended Now remains authoritative. No Firestore writes or deployment occurred.

### Baseline policy
Raw Decision Score = Market Score + Ray Modifier; no clamp for calibration. Auction/ADP normalization, 60/30/10 Market Score, Quality, missing-ADP handling, roster/FLEX ±5, scarcity ±2, combined ±7, budget gate, and separate live opportunity are unchanged.

### Raw Decision Score
Distribution {"minimum":9.3,"median":35.3,"mean":49.57936802973963,"p75":77.7,"p90":95.7,"p95":100.2,"p99":103.7,"maximum":106.5,"standardDeviation":27.7286044309813,"above100":28,"exactly100":0,"from95to99_9":29,"from90to94_9":28,"below90":453}.
Raw >100: 28; exactly 100: 0; 95–99.9: 29; 90–94.9: 28; below 90: 453.
Raw score preserves useful ordering and exposes the full Ray modifier, but its unbounded range is not a commissioner-facing 0–100 display.

### Options A–F
Option A — current clamp: display clamp(raw, 0, 100). This preserves the current semantics but leaves the elite cluster tied at 100.
Option B — raw ranking with clamped display: internal ranking uses raw score; display remains clamped. This makes hidden ordering deterministic but leaves identical visible 100s and is confusing unless explicitly disclosed.
Option C — percentile display: monotonic rank percentile over the eligible pool. Distribution {"minimum":0.4,"median":50.3,"mean":50.62992565055752,"p75":74.9,"p90":90.1,"p95":95,"p99":98.9,"maximum":100,"standardDeviation":28.772088918567707,"above100":0,"exactly100":1,"from95to99_9":27,"from90to94_9":27,"below90":483}; pool test 538: Bijan Robinson E 99.5, C 100.0; 300: Bijan Robinson E 99.5, C 100.0; 150: Bijan Robinson E 99.5, C 100.0; 75: Bijan Robinson E 99.5, C 100.0. It separates the top ranks, but scores change when unrelated players leave the pool.
Option D — fixed market headroom variants tested at factors 0.90, 0.93, 0.95, and 0.97. The 0.93 variant is the best tested separation, but it changes the meaning of Market Score by compressing the approved 0–100 market scale.
Option E — fixed monotonic display transform tested with policy range 0–107: display = raw × 100 / 107. It preserves raw ordering, is deterministic, and provides visible headroom without roster- or pool-dependent normalization.
Option F — headroom-aware positive modifier tested by scaling positive Ray influence by (1 − Market Score / 100). It reduces saturation, but weakens roster relevance most for elite players and makes the approved modifier semantics harder to explain.

### Rank preservation
Spearman correlation versus raw: A 1, B 1, C 1, D 1, E 1, F 1.
Top-10 membership versus raw: A 10/10, B 10/10, C 10/10, D 10/10, E 10/10, F 10/10; top-25: A 25/25, B 25/25, C 25/25, D 25/25, E 25/25, F 25/25; top-50: A 50/50, B 50/50, C 50/50, D 50/50, E 50/50, F 50/50.
Ordering reversals versus raw: A 0, B 0, C 0, D 30, E 0, F 416.
Display tie counts: A 248, B 248, C 228, D 226, E 240, F 241. Option E has no practical top-30 display ties; Option C has no ties except equal raw values; A/B retain the current elite ties.

### Real top-30 side-by-side
1. Bijan Robinson | M 99.5 | Ray +7 | Raw 106.5 | A 100.0 | B #1/100.0 | C 100.0 | D 99.5 | E 99.5 | F 99.5
2. Puka Nacua | M 99.3 | Ray +6 | Raw 105.3 | A 100.0 | B #2/100.0 | C 99.8 | D 98.3 | E 98.4 | F 99.3
3. Amon-Ra St. Brown | M 99.0 | Ray +6 | Raw 105.0 | A 100.0 | B #3/100.0 | C 99.6 | D 98.1 | E 98.1 | F 99.1
4. Christian McCaffrey | M 99.0 | Ray +6 | Raw 105.0 | A 100.0 | B #4/100.0 | C 99.6 | D 98.1 | E 98.1 | F 99.1
5. Josh Allen | M 97.8 | Ray +7 | Raw 104.8 | A 100.0 | B #5/100.0 | C 99.3 | D 98.0 | E 97.9 | F 98.0
6. James Cook | M 98.4 | Ray +6 | Raw 104.4 | A 100.0 | B #6/100.0 | C 99.1 | D 97.5 | E 97.6 | F 98.5
7. CeeDee Lamb | M 98.7 | Ray +5 | Raw 103.7 | A 100.0 | B #7/100.0 | C 98.9 | D 96.8 | E 96.9 | F 98.8
8. Saquon Barkley | M 97.7 | Ray +6 | Raw 103.7 | A 100.0 | B #8/100.0 | C 98.9 | D 96.9 | E 96.9 | F 97.8
9. Brock Bowers | M 97.5 | Ray +6 | Raw 103.5 | A 100.0 | B #9/100.0 | C 98.5 | D 96.7 | E 96.7 | F 97.7
10. Derrick Henry | M 97.5 | Ray +6 | Raw 103.5 | A 100.0 | B #10/100.0 | C 98.5 | D 96.7 | E 96.7 | F 97.7
11. Justin Jefferson | M 98.5 | Ray +5 | Raw 103.5 | A 100.0 | B #11/100.0 | C 98.5 | D 96.6 | E 96.7 | F 98.6
12. Trey McBride | M 97.5 | Ray +6 | Raw 103.5 | A 100.0 | B #12/100.0 | C 98.5 | D 96.7 | E 96.7 | F 97.7
13. Ashton Jeanty | M 97.4 | Ray +6 | Raw 103.4 | A 100.0 | B #13/100.0 | C 97.8 | D 96.6 | E 96.6 | F 97.6
14. Kenneth Walker | M 97.3 | Ray +6 | Raw 103.3 | A 100.0 | B #14/100.0 | C 97.6 | D 96.5 | E 96.5 | F 97.5
15. Omarion Hampton | M 97.1 | Ray +6 | Raw 103.1 | A 100.0 | B #15/100.0 | C 97.4 | D 96.3 | E 96.4 | F 97.3
16. A.J. Brown | M 97.8 | Ray +5 | Raw 102.8 | A 100.0 | B #16/100.0 | C 97.2 | D 96.0 | E 96.1 | F 97.9
17. Jeremiyah Love | M 96.4 | Ray +6 | Raw 102.4 | A 100.0 | B #17/100.0 | C 97.0 | D 95.7 | E 95.7 | F 96.6
18. Lamar Jackson | M 95.3 | Ray +7 | Raw 102.3 | A 100.0 | B #18/100.0 | C 96.8 | D 95.6 | E 95.6 | F 95.6
19. Breece Hall | M 96.0 | Ray +6 | Raw 102.0 | A 100.0 | B #19/100.0 | C 96.6 | D 95.3 | E 95.3 | F 96.2
20. Josh Jacobs | M 95.6 | Ray +6 | Raw 101.6 | A 100.0 | B #20/100.0 | C 96.5 | D 94.9 | E 95.0 | F 95.9
21. Kyren Williams | M 95.5 | Ray +6 | Raw 101.5 | A 100.0 | B #21/100.0 | C 96.3 | D 94.8 | E 94.9 | F 95.8
22. Malik Nabers | M 96.5 | Ray +5 | Raw 101.5 | A 100.0 | B #22/100.0 | C 96.3 | D 94.7 | E 94.9 | F 96.7
23. Drake Maye | M 94.2 | Ray +7 | Raw 101.2 | A 100.0 | B #23/100.0 | C 95.9 | D 94.6 | E 94.6 | F 94.6
24. Zay Flowers | M 95.9 | Ray +5 | Raw 100.9 | A 100.0 | B #24/100.0 | C 95.7 | D 94.2 | E 94.3 | F 96.1
25. Colston Loveland | M 94.4 | Ray +6 | Raw 100.4 | A 100.0 | B #25/100.0 | C 95.5 | D 93.8 | E 93.8 | F 94.7
26. Tee Higgins | M 95.4 | Ray +5 | Raw 100.4 | A 100.0 | B #26/100.0 | C 95.5 | D 93.7 | E 93.8 | F 95.6
27. Garrett Wilson | M 95.3 | Ray +5 | Raw 100.3 | A 100.0 | B #27/100.0 | C 95.2 | D 93.6 | E 93.7 | F 95.5
28. Joe Burrow | M 93.2 | Ray +7 | Raw 100.2 | A 100.0 | B #28/100.0 | C 95.0 | D 93.7 | E 93.6 | F 93.7
29. Jalen Hurts | M 92.9 | Ray +7 | Raw 99.9 | A 99.9 | B #29/99.9 | C 94.8 | D 93.4 | E 93.4 | F 93.4
30. Tetairoa McMillan | M 94.9 | Ray +5 | Raw 99.9 | A 99.9 | B #30/99.9 | C 94.8 | D 93.3 | E 93.4 | F 95.2

### Close-player cases
Bijan Robinson/Puka Nacua: raw 106.5/105.3; A 100.0/100.0; C 100.0/99.8; D 99.5/98.3; E 99.5/98.4; F 99.5/99.3 | Puka Nacua/Amon-Ra St. Brown: raw 105.3/105.0; A 100.0/100.0; C 99.8/99.6; D 98.3/98.1; E 98.4/98.1; F 99.3/99.1 | Amon-Ra St. Brown/Christian McCaffrey: raw 105.0/105.0; A 100.0/100.0; C 99.6/99.6; D 98.1/98.1; E 98.1/98.1; F 99.1/99.1 | Christian McCaffrey/Josh Allen: raw 105.0/104.8; A 100.0/100.0; C 99.6/99.3; D 98.1/98.0; E 98.1/97.9; F 99.1/98.0 | Josh Allen/James Cook: raw 104.8/104.4; A 100.0/100.0; C 99.3/99.1; D 98.0/97.5; E 97.9/97.6; F 98.0/98.5 | James Cook/CeeDee Lamb: raw 104.4/103.7; A 100.0/100.0; C 99.1/98.9; D 97.5/96.8; E 97.6/96.9; F 98.5/98.8 | CeeDee Lamb/Saquon Barkley: raw 103.7/103.7; A 100.0/100.0; C 98.9/98.9; D 96.8/96.9; E 96.9/96.9; F 98.8/97.8 | Saquon Barkley/Brock Bowers: raw 103.7/103.5; A 100.0/100.0; C 98.9/98.5; D 96.9/96.7; E 96.9/96.7; F 97.8/97.7 | Brock Bowers/Derrick Henry: raw 103.5/103.5; A 100.0/100.0; C 98.5/98.5; D 96.7/96.7; E 96.7/96.7; F 97.7/97.7 | Derrick Henry/Justin Jefferson: raw 103.5/103.5; A 100.0/100.0; C 98.5/98.5; D 96.7/96.6; E 96.7/96.7; F 97.7/98.6 | Justin Jefferson/Trey McBride: raw 103.5/103.5; A 100.0/100.0; C 98.5/98.5; D 96.6/96.7; E 96.7/96.7; F 98.6/97.7 | Trey McBride/Ashton Jeanty: raw 103.5/103.4; A 100.0/100.0; C 98.5/97.8; D 96.7/96.6; E 96.7/96.6; F 97.7/97.6 | Ashton Jeanty/Kenneth Walker: raw 103.4/103.3; A 100.0/100.0; C 97.8/97.6; D 96.6/96.5; E 96.6/96.5; F 97.6/97.5 | Kenneth Walker/Omarion Hampton: raw 103.3/103.1; A 100.0/100.0; C 97.6/97.4; D 96.5/96.3; E 96.5/96.4; F 97.5/97.3 | Omarion Hampton/A.J. Brown: raw 103.1/102.8; A 100.0/100.0; C 97.4/97.2; D 96.3/96.0; E 96.4/96.1; F 97.3/97.9 | A.J. Brown/Jeremiyah Love: raw 102.8/102.4; A 100.0/100.0; C 97.2/97.0; D 96.0/95.7; E 96.1/95.7; F 97.9/96.6 | Jeremiyah Love/Lamar Jackson: raw 102.4/102.3; A 100.0/100.0; C 97.0/96.8; D 95.7/95.6; E 95.7/95.6; F 96.6/95.6 | Lamar Jackson/Breece Hall: raw 102.3/102.0; A 100.0/100.0; C 96.8/96.6; D 95.6/95.3; E 95.6/95.3; F 95.6/96.2 | Breece Hall/Josh Jacobs: raw 102.0/101.6; A 100.0/100.0; C 96.6/96.5; D 95.3/94.9; E 95.3/95.0; F 96.2/95.9 | Josh Jacobs/Kyren Williams: raw 101.6/101.5; A 100.0/100.0; C 96.5/96.3; D 94.9/94.8; E 95.0/94.9; F 95.9/95.8

### Roster-state stability
Representative empty, one-RB, two-RB, QB-filled, TE-filled, and FLEX/depth scenarios retain the same raw-to-Option-E mapping for identical raw input. Roster changes affect only the intended Ray modifier source, not the deterministic display transform. Option C has no roster-state dependency unless the eligible pool itself changes.

### Shrinking-player-pool stability
Pool test: 538: Bijan Robinson E 99.5, C 100.0; 300: Bijan Robinson E 99.5, C 100.0; 150: Bijan Robinson E 99.5, C 100.0; 75: Bijan Robinson E 99.5, C 100.0. Option E remains stable for a fixed raw score; Option C changes solely because the comparison population changes. That relative-percentile semantic cost is material during an auction. Options A, B, D, E, and F are pool-independent when player inputs are held fixed.

### Interpretability
A means clamped additive score; 95 is an absolute-ish score but is unreliable near the ceiling. B means raw internal rank with a clamped display; 95 still does not disclose rank separation. C means relative percentile; 95 means approximately the 95th percentile of the current pool, not fixed desirability. D means compressed Market Score plus Ray modifier; 95 is a transformed acquisition score, not the original Market Score. E means a fixed transformed raw acquisition score on a 0–100 display; 95 is comparable across states under the fixed policy range. F means a headroom-adjusted additive score; 95 is less transparent because modifier strength varies with Market Score.

### Bateman and category coexistence
Rashod Bateman remains BEST VALUE in Recommended Now while ranking 162 in the shadow overall Decision ranking. These can validly coexist: the former is a tactical value lens and the latter is an overall acquire-now ordering. Recommended Now category cards remain useful and are not being replaced.

### Approved Decision Score v1 separation policy
Option E is approved for future production-integration work, but is not yet consumed by production UI or Recommended Now.
Exact policy: rawDecisionScore = marketScore + rayModifier; displayDecisionScore = clamp(rawDecisionScore × 100 / 107, 0, 100), using fixed policy range [0, 107]. Rank by the unrounded rawDecisionScore. Display values are rounded to one decimal place only after the clamp; display rounding never determines rank. The policy is deterministic, pool-independent, preserves the approved 60/30/10 and modifier caps, retains NOT_REALISTIC as a gate, and leaves Recommended Now tactical cards authoritative. Rashod Bateman remains a valid tactical BEST VALUE versus overall-ranking disagreement.
Approved limitation: a raw score below zero displays as 0; the defensive upper clamp handles raw values above 107. This policy does not compress Market Score or weaken positive modifiers near 100.

### Production boundary
OFFLINE CALIBRATION. NO PRODUCTION INTEGRATION. RECOMMENDED NOW REMAINS AUTHORITATIVE.
