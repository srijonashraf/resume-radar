# Phase 5 + 6: PDF Export Verification & Launch Polish — Implementation Plan

## Context

Phases 0-4 complete. Upload → extract → analyze → tailor → live editor pipeline works end-to-end. PDF export works with two templates (Professional + Modern). Three-layer editor store, all section editors, live preview, rewrite accept/reject all functional.

**Remaining work**:
- Phase 4 gap: BuildMode for thin resumes
- Phase 5: PDF WYSIWYG verification, ATS compatibility, integration tests
- Phase 6: Onboarding, error states, history rebuild, paywall, security, legacy cleanup, launch

**Spec**: `docs/spec.md` lines 409-443 (Phase 4-6 success criteria), lines 449-463 (three-layer architecture), lines 511 (free tier paywall decision).

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Template architecture | Keep current separate-file approach | Two templates work, config-driven refactor is speculative — no third template yet |
| BuildMode scope | Suggest content areas + bullet templates, no AI generation | Keep deterministic for Phase 5, AI-assisted building is Phase 6+ |
| History rebuild | Rebuild against v2 tables, re-enable endpoints | Legacy history uses v1 tables with wrong data model |
| Paywall placement | Block: PDF download, accept rewrites, full issue list | Per spec: analysis free, editor features gated |
| Legacy cleanup | Remove v1 routes, AI functions, keep v1 SQL files for migration reference | Migrations must stay idempotent, SQL files document schema |

---

## Tasks

### 5.1: BuildMode — Guided Content Builder for Thin Resumes

**Files**: `client/src/components/editor/BuildMode.tsx` (new), `client/src/components/editor/__tests__/BuildMode.test.tsx` (new)

**What**: When resume has thin content (few bullets, sparse sections), offer guided mode:
- Detect thin resume: < 3 bullets per experience entry, or < 2 sections with content
- Show "Build Mode" banner in EditorSidebar when detected
- Per-section suggestions: common bullet templates for SWE roles (from knowledge base)
- "Add suggested bullets" button per section — adds template bullets as user edits (Layer 3)
- Content checklist: "Add metrics to X bullets", "Add Y missing skills", "Expand summary"

**Store changes**: `useResumeEditorStore` — add `isThinResume: boolean` computed from sourceDocument, computed on `initialize()`.

**Depends on**: Nothing (editor store already supports addBullet/addEntry)

**Acceptance**:
- Thin resume detection triggers BuildMode banner
- Section suggestions render per-section
- "Add suggested bullets" adds bullets as user edits
- Content checklist shows actionable items
- Non-thin resumes hide BuildMode
- Toggle between Build/Editor mode works

---

### 5.2: PDF WYSIWYG Verification

**Files**: `client/src/components/pdf/__tests__/ResumePdfDocument.test.tsx` (new)

**What**: Verify PDF output matches live preview:
- Extract text from generated PDF (server-side pdfjs-dist or client-side)
- Compare extracted text against resolved document content
- Verify: all sections present, contact info correct, bullets preserved, section order matches
- Visual spot-check: Professional + Modern templates render without layout breaks
- Font verification: Outfit headings, DM Sans body in PDF

**Approach**: Write automated test that generates PDF from test data, extracts text, asserts content. Manual visual check for layout.

**Depends on**: Nothing

**Acceptance**:
- Automated test: all sections present in PDF text extraction
- Automated test: contact info matches resolved document
- Automated test: bullet content matches
- Automated test: section order matches `sectionOrder`
- Manual: Professional template renders cleanly (no overflow, no missing sections)
- Manual: Modern template renders cleanly (sidebar correct, body correct)
- Manual: Fonts are correct in PDF (not fallback)

---

### 5.3: PDF ATS Compatibility Check

**Files**: `client/src/components/pdf/__tests__/atsCompatibility.test.ts` (new)

**What**: Verify PDF output is ATS-parseable:
- Generate PDF from test data with known keywords
- Extract text from PDF programmatically
- Run extracted text through server's ATS keyword matcher
- Assert: all test keywords detected
- Assert: no formatting artifacts in extracted text (no table markers, no weird spacing)
- Verify: standard fonts used (no custom encoding)

**Depends on**: 5.2

**Acceptance**:
- All test keywords detected in PDF text extraction
- No formatting artifacts interfere with keyword matching
- ATS score from extracted PDF matches expected range (within 5%)
- Both templates pass ATS check

---

### 5.4: Integration Test Suite

**Files**: Multiple test files (see below)

**What**: Write integration tests for critical paths:

**Server integration tests** (`server/src/__tests__/integration/`):
- `extract.test.ts` — POST /extract with PDF + text, verify SSE events
- `analyze.test.ts` — POST /analyze with extracted data, verify scoring
- `tailor.test.ts` — POST /tailor with analysis + JD, verify rewrites
- `rewrite-persistence.test.ts` — PATCH /tailor/rewrite/:id, GET /tailor/:analysisId

**Client integration tests** (`client/src/__tests__/integration/`):
- `editor-flow.test.tsx` — Initialize editor → edit → accept rewrite → verify resolved document
- `pdf-generation.test.tsx` — Editor state → generate PDF → verify content

**Approach**: Server tests mock AI service (deterministic responses), use real DB queries against test DB. Client tests use real stores, mock API calls.

**Depends on**: Nothing

**Acceptance**:
- Server: extract pipeline returns structured sections
- Server: analyze pipeline returns metrics + scores
- Server: tailor pipeline returns classified rewrites
- Server: rewrite persistence round-trips correctly
- Client: editor flow initializes and resolves correctly
- Client: PDF generation produces valid output

---

### 6.1: Onboarding Flow

**Files**: `client/src/components/onboarding/OnboardingOverlay.tsx` (new), `client/src/components/onboarding/OnboardingStep.tsx` (new), `client/src/components/onboarding/__tests__/OnboardingOverlay.test.tsx` (new)

**What**: First-time user walkthrough:
- 3-4 step overlay: (1) Upload your resume, (2) Get scored on ATS + content, (3) Tailor to any job, (4) Edit and export
- Shows on first visit (localStorage flag `resumetra_onboarding_complete`)
- "Skip" button on each step, "Don't show again" at end
- Brief explanation of: honest tailoring (no fabrication), font replacement, ATS scoring

**Depends on**: Nothing

**Acceptance**:
- Overlay appears on first visit
- Steps progress correctly
- "Skip" dismisses overlay
- "Don't show again" persists to localStorage
- Overlay does not reappear after completion
- Mobile-responsive layout

---

### 6.2: Empty States + Error Boundaries

**Files**: `client/src/components/ui/EmptyState.tsx` (new), `client/src/components/ui/ErrorBoundary.tsx` (new), `client/src/pages/ErrorFallback.tsx` (new), multiple component updates

**What**:

**Empty states** for:
- Dashboard before any analysis
- Editor with no document loaded
- Analysis results with no data
- History with no entries
- ATS report with no JD provided

**Error boundaries**:
- Top-level App error boundary with recovery actions (retry, go home)
- Editor error boundary (isolates editor crashes from dashboard)
- PDF generation error boundary (shows error + fallback to preview-only)

**Depends on**: Nothing

**Acceptance**:
- EmptyState renders icon + message + optional action button
- All listed views show empty state when no data
- ErrorBoundary catches render errors
- Recovery actions work (retry reloads, go home navigates)
- Editor crash doesn't break dashboard
- PDF error shows meaningful message

---

### 6.3: Resume History (v2 Rebuild)

**Files**: `server/src/db/history.ts` (new, replaces `historyService.ts`), `server/src/routes/api.ts` (edit — re-enable history endpoints), `client/src/services/api.ts` (edit — add history API calls), `client/src/components/dashboard/AnalysisHistory.tsx` (rewrite against v2 types), `client/src/store/useStore.ts` (edit — add history state)

**What**: Rebuild history feature against v2 data model:
- Server: `GET /api/v1/history` — paginated list of user's analyses (from `resume_sections` table)
- Server: `GET /api/v1/history/:analysisId` — full analysis data (sections + scores + rewrites)
- Client: history list in dashboard, click to reload analysis into store
- Transform v2 DB rows to camelCase at API boundary

**Depends on**: Nothing

**Acceptance**:
- Authenticated user sees analysis history
- History list paginated (10 per page)
- Click entry loads full analysis into store
- Loaded analysis shows in editor/preview
- Guest users see "Sign in to save history" CTA
- History persists across sessions

---

### 6.4: Free Tier Paywall

**Files**: `client/src/components/paywall/PaywallGate.tsx` (new), `client/src/components/paywall/PaywallModal.tsx` (new), `client/src/store/useStore.ts` (edit — add paywall state), `server/src/routes/api.ts` (edit — add usage enforcement)

**What**: Gate premium features for free tier:

**Free tier limits** (per spec decisions):
- Analysis: 3 free analyses (guest + authenticated)
- Editor: view-only for free users (no edit, no accept/reject)
- PDF download: paid only
- Issue list: first 3 issues only for free users
- Tailor: 1 free tailor run per analysis

**Implementation**:
- `PaywallGate` component wraps premium features — checks user tier, shows CTA if blocked
- `PaywallModal` — explains what's locked + pricing CTA
- Server: `GET /api/v1/usage` returns `{ analysesUsed, analysesLimit, tier }`
- Server: middleware checks usage before premium endpoints

**Depends on**: 6.3 (history needed to count usage)

**Acceptance**:
- Free user blocked from PDF download (modal shown)
- Free user sees first 3 issues only
- Free user limited to 1 tailor run
- Free user limited to 3 analyses total
- Authenticated user sees usage counter
- Paywall modal shows pricing CTA
- Premium user (when implemented) has no restrictions

---

### 6.5: Security Review + Cleanup

**Files**: No new files — review and edit existing

**What**:
- Input sanitization: verify all user inputs sanitized before DB storage
- Rate limiting: review current limits, add per-endpoint granularity
- PDF retention: confirm no PDFs stored server-side
- JWT security: review token expiry, refresh mechanism
- CORS: verify origin whitelist
- SQL injection: audit all parameterized queries
- XSS: verify no dangerouslySetInnerHTML without sanitization
- Environment variables: confirm no secrets in client bundle
- CSP headers: add Content-Security-Policy

**Depends on**: Nothing

**Acceptance**:
- No unsanitized user input reaches DB
- Rate limiting active on all public endpoints
- No PDFs stored on server filesystem
- JWT expiry enforced
- CORS restricted to allowed origins
- All queries use parameterized inputs
- No raw HTML injection without sanitization
- No secrets in client build output
- CSP headers present

---

### 6.6: Legacy Code Removal

**Files**: Multiple deletions/edits

**What**: Remove deprecated v1 code:

**Remove**:
- `server/src/services/historyService.ts` — replaced by `db/history.ts` (6.3)
- Legacy AI functions in `aiService.ts`: `generateCareerMap()`, `compareWithJobDescription()`, `tailorResume()`
- Legacy schemas in `schemas.ts` related to v1 analysis
- `client/src/utils/editorTransforms.ts` — replaced by `resolvedDocumentToPdfData.ts`
- Any remaining TipTap imports/references

**Keep**:
- V1 SQL files in `server/src/db/*.sql` — migration reference
- V1 migration files — must stay for DB compatibility
- `client/src/utils/pdfUtils.ts` — still used for upload flow text extraction

**Re-enable**:
- `POST /job-match` — return 503 remains (rebuild is post-launch)
- `POST /career-map` — return 503 remains (rebuild is post-launch)

**Depends on**: 6.3 (history rebuilt), 5.4 (integration tests confirm v2 works)

**Acceptance**:
- No references to removed functions remain
- `tsc --noEmit` passes all 3 packages
- All tests pass after removal
- No dead imports or unused types
- Build succeeds

---

### 6.7: Final Verification + Launch Readiness

**What**: End-to-end validation:
- `tsc --noEmit` all 3 packages — 0 errors
- `vitest run` server + client — all pass
- Coverage check: deterministic metrics 90%+, ATS scoring 90%+
- Manual: full flow upload → extract → analyze → tailor → editor → PDF
- Manual: accept/reject persists across page refresh
- Manual: template switch preserves edits
- Manual: PDF download matches preview
- Manual: BuildMode works for thin resume
- Manual: onboarding appears on fresh visit
- Manual: empty states render correctly
- Manual: error recovery works (simulate component error)
- Manual: history loads past analysis
- Manual: paywall gates free users
- Manual: mobile-responsive across all views
- Lighthouse: performance > 80, accessibility > 90

**Depends on**: All previous

---

## Dependency Graph

```
Phase 5:
5.1 (BuildMode) ─────────────────────────────────────────┐
5.2 (PDF Verify) ──→ 5.3 (ATS Check) ───────────────────┤
5.4 (Integration Tests) ─────────────────────────────────┤
                                                          │
Phase 6:                                                  │
6.1 (Onboarding) ─────────────────────────────────────────┤
6.2 (Empty States + Error Boundaries) ───────────────────┤
6.3 (History v2) ──→ 6.4 (Paywall) ─────────────────────┤
6.5 (Security) ──────────────────────────────────────────┤
6.6 (Legacy Cleanup) ←── 6.3 + 5.4 ─────────────────────┤
                                                          │
6.7 (Final Verify) ←──────────────────────────────────────┘
```

**Parallel groups**:
- **Group A** (no deps): 5.1, 5.2, 5.4, 6.1, 6.2, 6.3, 6.5
- **Group B** (after 5.2): 5.3
- **Group C** (after 6.3): 6.4
- **Group D** (after 6.3 + 5.4): 6.6
- **Group E** (after all): 6.7

**Critical path**: 6.3 → 6.4 → 6.7 (history → paywall → verify)

---

## New Files Summary

| Location | File | Purpose |
|----------|------|---------|
| client/editor | `BuildMode.tsx` | Guided content builder for thin resumes |
| client/pdf/tests | `ResumePdfDocument.test.tsx` | PDF content verification |
| client/pdf/tests | `atsCompatibility.test.ts` | ATS parseability check |
| client/onboarding | `OnboardingOverlay.tsx` | First-time user walkthrough |
| client/onboarding | `OnboardingStep.tsx` | Individual onboarding step |
| client/ui | `EmptyState.tsx` | Reusable empty state component |
| client/ui | `ErrorBoundary.tsx` | Error boundary with recovery |
| client/pages | `ErrorFallback.tsx` | Error fallback page |
| client/paywall | `PaywallGate.tsx` | Feature gate wrapper |
| client/paywall | `PaywallModal.tsx` | Paywall CTA modal |
| server/db | `history.ts` | V2 history queries |
| server/tests/integration | `extract.test.ts` | Extraction integration test |
| server/tests/integration | `analyze.test.ts` | Analysis integration test |
| server/tests/integration | `tailor.test.ts` | Tailor integration test |
| server/tests/integration | `rewrite-persistence.test.ts` | Rewrite persistence test |
| client/tests/integration | `editor-flow.test.tsx` | Editor flow integration test |
| client/tests/integration | `pdf-generation.test.tsx` | PDF generation integration test |

## Modified Files Summary

| File | Changes |
|------|---------|
| `client/src/store/useResumeEditorStore.ts` | Add `isThinResume` computed, BuildMode state |
| `client/src/store/useStore.ts` | Add history state, paywall state |
| `client/src/services/api.ts` | Add history API calls, usage check |
| `client/src/components/dashboard/AnalysisHistory.tsx` | Rewrite against v2 types |
| `server/src/routes/api.ts` | Re-enable history endpoints, add usage enforcement |
| `server/src/services/aiService.ts` | Remove legacy functions |
| `server/src/schemas.ts` | Remove legacy v1 schemas |

## Files to Remove

| File | Reason |
|------|--------|
| `client/src/utils/editorTransforms.ts` | Replaced by `resolvedDocumentToPdfData.ts` |
| `server/src/services/historyService.ts` | Replaced by `server/src/db/history.ts` |

## Verification Gate (after 6.7)

- [ ] `tsc --noEmit` passes all 3 packages
- [ ] `vitest run` passes server + client
- [ ] Coverage: deterministic metrics 90%+, ATS scoring 90%+
- [ ] Manual: full flow works end-to-end
- [ ] Manual: PDF matches preview
- [ ] Manual: BuildMode for thin resume
- [ ] Manual: onboarding on fresh visit
- [ ] Manual: history loads past analyses
- [ ] Manual: paywall gates free users
- [ ] Manual: mobile-responsive
- [ ] Lighthouse: performance > 80, accessibility > 90
