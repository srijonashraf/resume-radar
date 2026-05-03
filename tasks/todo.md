# Phase 3: Honest Tailoring — Task Checklist

Full plan: `tasks/plan.md`

## Execution Order

| # | Task | Status | Depends on |
|---|------|--------|------------|
| 1 | 3.1: Tailor agent tools + prompt | ✅ | — |
| 2 | 3.3: Rewrite persistence | ✅ | — |
| 3 | 3.2: Stage 4 tailor agent | ✅ | 3.1 |
| 4 | 3.5: Client API + SSE types | ✅ | — |
| 5 | 3.4: Tailor pipeline + route | ✅ | 3.2, 3.3 |
| 6 | 3.6: Store extensions | ✅ | 3.5 |
| 7 | 3.7: Tailor results UI | ✅ | 3.6 |
| 8 | 3.8: Integration verification | ✅ | 3.4, 3.7 |

## Parallel Groups

- **Group A** (start immediately): 3.1 + 3.3 + 3.5 in parallel
- **Group B** (after 3.1): 3.2
- **Group C** (after 3.2 + 3.3): 3.4
- **Group D** (after 3.5): 3.6 → 3.7
- **Group E** (after 3.4 + 3.7): 3.8

## Critical Path

3.1 → 3.2 → 3.4 → 3.8

## Key Decisions

- Classification + rewrite in single tool call (not two-pass)
- Only process flagged bullets (medium+ severity) + JD-related items
- MISSING learning paths: KB lookup first, AI fallback
- Fabrication prevention: prompt guardrails + post-processing validation
- SSE events: `tailoring_start`, `tailoring_section`, `tailoring_rewrite`, `tailoring_complete`

## Verification Gate

After 3.8:
- [x] `tsc --noEmit` passes all 3 packages
- [x] `vitest run` passes server + client
- [ ] Manual: upload → extract → analyze → tailor → rewrites display
- [ ] Manual: accept/reject persists across page refresh
- [ ] Manual: MISSING rewrites show learning path cards
- [ ] Manual: no fabricated skills in REWRITTEN classification
