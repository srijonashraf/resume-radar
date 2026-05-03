# Phase 2: Analysis + ATS Scoring — Task Checklist

Full plan: `tasks/plan.md`

## Execution Order

| # | Task | Status | Depends on |
|---|------|--------|------------|
| 1 | T0: Cleanup old `/analyze` pipeline | ✅ | — |
| 2 | T7: Shared analysis v2 types | ✅ | T0 |
| 3 | T1: Deterministic metrics engine | ✅ | T7 |
| 4 | T2: ATS scoring engine | ✅ | T7 |
| 5 | T3: Analysis agent tools + prompts | ✅ | T7 |
| 6 | T4: Pipeline v2 persistence | ✅ | T1 |
| 7 | T5: Stage 3 analysis agent | ✅ | T1, T3 |
| 8 | T6: Pipeline orchestrator + route | ✅ | T1-T5 |
| 9 | T8: Client API + store | ✅ | T6 |
| 10 | T9: Analysis results UI | ⬜ | T8 |
| 11 | T10: Integration verification | ⬜ | T9 |

## Parallel Groups

- **Group A** (after T7): T1 + T2 + T3 in parallel
- **Group B** (after T1): T4 + T5 (T5 also needs T3)
- **Group C** (after T6): T8, then T9
- **Group D** (after T9): T10

## Critical Path

T0 → T7 → T1 → T5 → T6 → T8 → T9 → T10

## Key Decisions

- Old `/analyze` + `parseAndScore` + `generateFeedback` REMOVED. No legacy compat.
- New `/analyze` route replaces old one in-place.
- Old 4-table composite writes removed. New pipeline v2 tables used.
- `/job-match`, `/career-map`, `/tailor` temporarily 503 until Phase 3.
- Old history endpoints temporarily disabled until rebuilt against new schema.

## Verification Gate

After T10:
- [ ] `tsc --noEmit` passes all 3 packages
- [ ] `vitest run` passes server
- [ ] Manual: upload → extract → analyze → results display
- [ ] Manual: same resume twice → identical deterministic scores
- [ ] Manual: no JD case → metrics + section scores (no ATS keyword report)
