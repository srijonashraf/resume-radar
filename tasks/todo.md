# Phase 5 + 6: PDF Verification & Launch Polish — Task Checklist

Full plan: `tasks/plan.md`

## Execution Order

| # | Task | Status | Depends on |
|---|------|--------|------------|
| 1 | 5.1: BuildMode — guided content builder for thin resumes | ✅ | — |
| 2 | 5.2: PDF WYSIWYG verification | ✅ | — |
| 3 | 5.3: PDF ATS compatibility check | ✅ | 5.2 |
| 4 | 5.4: Integration test suite | ✅ | — |
| 5 | 6.1: Onboarding flow | ✅ | — |
| 6 | 6.2: Empty states + error boundaries | ✅ | — |
| 7 | 6.3: Resume history (v2 rebuild) | ✅ | — |
| 8 | 6.4: Free tier paywall | ✅ | 6.3 |
| 9 | 6.5: Security review + cleanup | ✅ | — |
| 10 | 6.6: Legacy code removal | ⬜ | 6.3, 5.4 |
| 11 | 6.7: Final verification + launch readiness | ⬜ | All |

## Parallel Groups

- **Group A** (start immediately): ~~5.1~~, ~~5.2~~, ~~5.3~~, ~~5.4~~, ~~6.1~~, ~~6.2~~, ~~6.3~~, ~~6.5~~
- **Group B** (after 5.2): ~~5.3~~
- **Group C** (after 6.3): ~~6.4~~
- **Group D** (after 6.3 + 5.4): 6.6 ← **unblocked**
- **Group E** (after all): 6.7

## Critical Path

6.3 ✅ → 6.4 ✅ → 6.6 ← **next** → 6.7

## Key Decisions

- Keep current separate-file template approach (no config-driven refactor)
- BuildMode: suggest content areas + bullet templates, no AI generation
- History rebuild against v2 tables, re-enable endpoints
- Paywall gates: PDF download, accept rewrites, full issue list, editor edit access
- Legacy v1 code removed after v2 integration tests pass
- Job-match + career-map endpoints stay 503 (rebuild post-launch)

## Security Audit Findings (6.5)

- All areas PASS: input sanitization, rate limiting, PDF retention, JWT, CORS, SQL injection, XSS, secrets
- 1 WARNING: No CSP headers configured — add Content-Security-Policy middleware

## Verification Gate (after 6.7)

- [ ] `tsc --noEmit` passes all 3 packages
- [ ] `vitest run` passes server + client
- [ ] Coverage: deterministic metrics 90%+, ATS scoring 90%+
- [ ] Manual: upload → extract → analyze → tailor → editor → PDF
- [ ] Manual: BuildMode works for thin resume
- [ ] Manual: onboarding on fresh visit
- [ ] Manual: history loads past analyses
- [ ] Manual: paywall gates free users
- [ ] Manual: mobile-responsive
- [ ] Lighthouse: performance > 80, accessibility > 90
