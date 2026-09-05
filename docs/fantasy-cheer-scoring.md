# Fantasy Cheer scoring — single fixed source of truth

There is **one** Fantasy Cheer scoring system. It is identical for every team,
every league, every division and every season. It is not configurable, not
versioned, and cannot be overridden.

The canonical values live in **`src/utils/cheerScoring.ts`**. Mobile, the admin
dashboard and the server must all apply exactly these numbers.

## The rules

### Official score

| Result | Points |
| --- | --- |
| Scored 98.5–100 | +50 |
| Scored 97–98.5 | +40 |
| Scored 95.5–97 | +30 |
| Scored 94–95.5 | +25 |
| Scored 92–94 | +20 |
| Scored 90–92 | +10 |
| Scored 87.5–90 | −10 |
| Scored below 87.5 | −20 |

Bands are contiguous and cover 0–100 with no gaps. **A score landing exactly on
a boundary earns the higher band** — 98.5 is 50 points, not 40; 90 is +10, not
−10. Scores outside 0–100 are invalid and must be rejected, not clamped.

### Bonuses

| Result | Points |
| --- | --- |
| Winning division with 1–2 other teams | +10 |
| Winning division with 3–5 other teams | +20 |
| Winning division with 6 or more other teams | +30 |
| Hit zero deductions | +10 |
| Grand champion | +25 |

### Deductions

| Result | Points |
| --- | --- |
| Finishing last in a division with 2–4 other teams | −15 |
| Finishing last in a division with 5 or more other teams | −25 |

### How they combine

```
total = scoreBandPoints
      + divisionResultPoints   // win bonus OR last-place penalty, never both
      + hitZeroPoints
      + grandChampionPoints
```

- `divisionResultPoints` is the **win bonus if the team placed first**,
  otherwise the **last-place penalty if it finished last**, otherwise 0. Winning
  takes precedence — a team cannot receive both.
- "Other teams" excludes the team itself. A division of 6 entries means 5 other
  teams.
- Last place only carries a penalty from 2 other teams upward. Finishing second
  of two earns nothing and loses nothing.

## Ownership across the system

| Component | Responsibility |
| --- | --- |
| `src/utils/cheerScoring.ts` | Owns the numbers. The only place any of them appear. |
| Mobile app | Renders the rules (`ScoringRulesTab`) and may preview a total locally. **Never submits fantasy points.** |
| Admin dashboard | Renders the same rules read-only via `FixedScoringRulesList`. No editing UI. |
| Server | **Calculates and stores the authoritative fantasy points** from the submitted raw result, applying exactly the table above. |

## Server contract (implemented)

Score entry (`POST /events/entries/:entryId/performances`) submits the **raw
competition result only**:

```jsonc
{
  "round": "preliminary",
  "categoryScores": [ /* judge scores */ ],
  "deductions": [],
  "isHitZero": true,
  "placement": 1,
  "isGrandChampion": false
}
```

`otherTeamsInDivision` is **not** submitted: the server counts the published
performances in the division and round itself, so division size can never be
influenced by a client. `placement` is a competition result, not a scoring
setting, and is stored on the performance.

The server derives `fantasyPoints` and its breakdown at publish time. A body
carrying `fantasyPoints` or `fantasyPointsBreakdown` is rejected with `400` by
the global validation pipe (`forbidNonWhitelisted: true`) — the fields do not
exist on `ScoreCheerPerformanceDto`, so they cannot be trusted or stored.

### Where it lives on the server

| Concern | Location |
| --- | --- |
| The fixed values and calculator | `src/fantasy-cheer/fantasy-cheer-scoring.ts` |
| Applying them on publish | `FantasyCheerService.scorePublishedPerformance` |
| Accepting the raw result | `ScoreCheerPerformanceDto` |
| Tests | `src/fantasy-cheer/fantasy-cheer-scoring.spec.ts` |

`calculateFantasyCheerScore(performance, context)` takes no rule set. The
previous signature accepted a third `rules` argument sourced from the league's
`scoringRuleSetId`; that parameter, the rule-set lookup and the legacy
metric-code path are gone.

### What was removed

- `GET /leagues/:id/scoring-settings` and `LeagueScoringSettingsService`
- The `ScoringRuleSet` lookup in the cheer scoring path, and
  `scoringRuleSetId` / `scoringRuleSetVersion` on the cheer score ledger
- Scoring fields on `fantasyCheerSettings` — `officialScoreMultiplier`,
  `deductionMultiplier`, `hitZeroBonus`, `advancementBonus`,
  `championshipBonus`, `placementPoints` — from the schema, the DTO and the
  settings defaults/merge. Only `rosterSize`, `starterCount` and
  `regularSeasonPeriods` remain, and those are roster shape.

Because the DTO no longer declares those fields and the pipe runs with
`forbidNonWhitelisted`, a league create/update trying to set a scoring value is
**rejected with 400**, not silently ignored.

### Still using scoring rule sets: football

`ScoringRuleSet`, `/admin/scoring` and `ScoringService` remain untouched. They
drive the football/NFL scoring path, which is a separate system with its own
metrics. Only the **cheer** path was made fixed. Deleting the rule-set
infrastructure outright would break football scoring.

## Deployment order

The server calculation is in place, so the mobile release is unblocked. Ship the
server first regardless — an app build that has stopped sending fantasy points
against an older server would store none.

## Changing a value

If a rule genuinely changes, edit `src/utils/cheerScoring.ts` and the matching
constant on the server in the same change, and update the transcribed table in
`__tests__/scoringRulesTab.test.tsx` — that test deliberately holds a second,
hand-written copy so a silent edit to the constants fails the build.

`__tests__/fixedScoringArchitecture.test.ts` guards the shape of this
architecture: no scoring endpoint, no per-league overrides, no client-submitted
points, and exactly one module defining the numbers.
