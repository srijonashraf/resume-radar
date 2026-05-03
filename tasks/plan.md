# Phase 3: Honest Tailoring — Implementation Plan

## Context

Phases 0-2 complete. Upload → extract → analyze → results pipeline works end-to-end with 192 tests. Phase 3 adds the core product differentiator: per-bullet AI rewrites with honest gap classification. No fabricated skills.

**Spec**: `docs/spec.md` lines 398-408 (Phase 3 success criteria), lines 449-475 (architecture).

**Pipeline stage 4**: `ResumeDocument + AtsReport + Issues → Rewrite[]`

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Classification timing | Single tool call (classify + rewrite together) | Two-pass would double token cost. Classification context must inform the rewrite. |
| Skill fabrication prevention | Prompt guardrails + post-processing validation | Prompt rules forbid fabrication. Post-processing cross-references `keywordsAdded` against `missingKeywords`. REWRITTEN + missing keyword → downgrade to REFRAMED. |
| Which bullets to process | Only flagged items (medium+ severity) + JD-related items | Processing all bullets wastes tokens on content that doesn't need improvement. |
| MISSING learning paths | KB lookup first, AI fallback | KB has `learningResources` per skill. If no match, AI generates inline. |
| SSE events | `tailoring_start`, `tailoring_section`, `tailoring_rewrite`, `tailoring_complete` | Matches existing SSE pattern. Per-rewrite events enable progressive UI. |

---

## Existing Infrastructure (reuse)

| What | Where | Notes |
|------|-------|-------|
| `Rewrite` type + Zod schema | `shared/src/types/rewrite.ts`, `shared/src/schemas/rewrite.ts` | Already defined with tests |
| `resume_tailor_rewrites` table | Migration `20260426000003_add_pipeline_v2_tables.js` | Schema matches types |
| `callTool()` pattern | `server/src/services/aiService.ts` | Dual-schema tools, Zod validation |
| Agent iteration pattern | `server/src/stages/stage3_analysis.ts` | Per-section loop, SSE progress, graceful errors |
| Persistence pattern | `server/src/db/sections.ts` | Transactions, sectionIdMap for UUID resolution |
| KB learning resources | `server/src/knowledge/types.ts` `LearningPath` | `courses`, `projects`, `timeline`, `resumeBulletExample` |
| JD keyword extraction | `server/src/stages/analysisAgentTools.ts` `extractJdKeywordsTool` | Reuse for tailor pipeline |
| ATS keyword matching | `server/src/stages/atsScoring.ts` `computeKeywordMatchScore` | Reuse for tailor pipeline |
| SSE client pattern | `client/src/services/api.ts` `analyzeResumeStream()` | Same fetch + ReadableStream pattern |
| UI primitives | `client/src/components/ui/` | `Badge`, `Card`, `Button`, `AccordionItem`, `Spinner` |

---

## Tasks

### 3.1: Tailor Agent Tools + Prompt

**Files**: `server/src/stages/tailorTools.ts` (new), `server/src/stages/tailorPrompts.ts` (new)

**What**: Define two AI tools following the dual-schema pattern (JSON Schema for AI + Zod for validation).

**Tool 1: `classify_skills`** — Called once before rewriting. Classifies each JD skill:
- Params: `{ classifications: Array<{ skill: string, classification: "HAS" | "ADJACENT" | "LACKS", evidence: string, adjacentSkill?: string }> }`

**Tool 2: `rewrite_bullet`** — Per-bullet rewrite with gap classification:
- Params: `{ sectionId, itemId, field, before, after, rationale, keywordsAdded: string[], gapClassification: "REWRITTEN"|"REFRAMED"|"MISSING", learningPath?: { courses, projects, timeline, targetBullet } }`

**System prompt rules**:
1. NEVER fabricate skills
2. Classify skills first via `classify_skills`
3. REWRITTEN = user has skill, bullet just needs better framing with JD keywords
4. REFRAMED = user lacks exact skill but has adjacent experience
5. MISSING = user genuinely lacks skill → learning path, not fabricated bullet
6. For MISSING, `after` is aspirational (what bullet COULD look like after learning)
7. Only surface implicit skills user already demonstrates
8. `keywordsAdded` must trace to existing resume experience

**Acceptance**:
- Both tools match `ToolDefinition` type
- Zod schemas validate valid/invalid inputs
- System prompt contains all 8 fabrication-prevention rules
- `tsc --noEmit` passes

---

### 3.2: Stage 4 Tailor Agent

**Files**: `server/src/stages/stage4_tailoring.ts` (new)

**What**: `runTailorAgent(document, atsReport, analysisResult, jdText, kb, sendSSE) → Rewrite[]`

**Algorithm**:
1. Build context from sections, ATS keywords, analysis issues (medium+ severity), KB learning resources
2. Call `classify_skills` once → get skill classification map
3. For each section with issues or JD keyword relevance:
   - SSE: `tailoring_section`
   - For each flagged item:
     - Call `rewrite_bullet` with classification context
     - Zod validate response
     - Fabrication check: REWRITTEN + missing keyword → downgrade to REFRAMED
     - Assign UUID, set `accepted: null`
     - SSE: `tailoring_rewrite`
4. Return all rewrites

**Pattern**: Same as `stage3_analysis.ts` — per-section loop, `callTool()` per item, graceful error handling.

**Depends on**: 3.1

**Acceptance**:
- Returns `Rewrite[]` with correct shape
- SSE events emitted in order
- Fabrication check runs and can downgrade
- Failed single bullet doesn't crash pipeline
- `tsc --noEmit` passes

---

### 3.3: Rewrite Persistence

**Files**: `server/src/db/rewrites.ts` (new)

**What**: Three functions following `sections.ts` pattern:

**`saveRewrites({ analysisId, rewrites })`**: Transaction, sectionIdMap for UUID resolution, DELETE + INSERT (upsert pattern)

**`loadRewrites(analysisId)`**: Join `resume_tailor_rewrites` with `resume_sections` to reconstruct `sectionId`. Return `Rewrite[]`.

**`updateRewriteAcceptance(rewriteId, accepted)`**: Simple UPDATE. Return updated row.

**Depends on**: Nothing (DB table exists from Phase 0)

**Acceptance**:
- Save/load round-trip produces equivalent data
- Parameterized queries throughout
- Transaction rollback on error
- `tsc --noEmit` passes

---

### 3.4: Tailor Pipeline + Route

**Files**: `server/src/services/pipelineService.ts` (edit), `server/src/routes/api.ts` (edit)

**What**:

**`runTailorPipeline({ analysisId, jobDescription }, sendSSE)`** in pipelineService:
1. Load document via `loadAnalysisDocument(analysisId)`
2. Load analysis results via `loadAnalysisResults(analysisId)`
3. Re-detect profession, get KB
4. Extract JD keywords (reuse `extractJdKeywordsTool`)
5. Call `runTailorAgent()`
6. Persist via `saveRewrites()`
7. SSE: `tailoring_complete`

**Routes in api.ts** (replace 503 stubs):
- `POST /tailor` — SSE streaming, requires auth, ownership check
- `GET /tailor/:analysisId` — load persisted rewrites, requires auth
- `PATCH /tailor/rewrite/:rewriteId` — accept/reject, requires auth, ownership check

**Depends on**: 3.2, 3.3

**Acceptance**:
- POST streams SSE events, returns rewrites
- GET returns persisted rewrites
- PATCH updates acceptance
- Ownership checks on all endpoints
- `tsc --noEmit` passes

---

### 3.5: Client API + SSE Types

**Files**: `client/src/types/api-responses.ts` (edit), `client/src/services/api.ts` (edit)

**What**:

SSE types: `SSETailoringStart`, `SSETailoringSection`, `SSETailoringRewrite`, `SSETailoringComplete`

API functions:
- `tailorResumeStream(analysisId, jobDescription, callbacks)` — SSE streaming, same pattern as `analyzeResumeStream()`
- `fetchRewrites(analysisId)` — GET
- `patchRewriteAcceptance(rewriteId, accepted)` — PATCH

**Depends on**: Nothing (can start parallel with server tasks)

**Acceptance**:
- `tailorResumeStream()` parses all SSE event types
- Error handling matches existing pattern
- `tsc --noEmit` passes

---

### 3.6: Store Extensions

**Files**: `client/src/store/useStore.ts` (edit)

**What**: Add tailor state:

```
tailorPhase: "idle" | "classifying" | "tailoring" | "complete" | "error"
tailorProgress: { sectionId, sectionTitle, index, total } | null
tailorRewrites: Rewrite[]
tailorStats: { rewritten, reframed, missing, total } | null
```

Actions: `setTailorPhase`, `setTailorProgress`, `addTailorRewrite` (incremental SSE append), `setTailorRewrites`, `acceptTailorRewrite`, `rejectTailorRewrite`, `clearTailorState`

`clearCurrentAnalysis` also clears tailor state.

**Depends on**: 3.5

**Acceptance**:
- Phase transitions correct
- `addTailorRewrite` appends incrementally
- Accept/reject update immutably
- Existing state unaffected
- `tsc --noEmit` passes

---

### 3.7: Tailor Results UI

**Files** (new): `client/src/components/tailor/TailorResults.tsx`, `RewriteCard.tsx`, `ClassificationBadge.tsx`, `LearningPathCard.tsx`, `RewriteDiff.tsx`, `RewriteManager.tsx`

**What**:

| Component | Purpose |
|-----------|---------|
| `ClassificationBadge` | REWRITTEN (success), REFRAMED (warning), MISSING (info) |
| `RewriteCard` | Before/after diff, rationale, keywords, accept/reject buttons |
| `LearningPathCard` | MISSING skill: courses, projects, timeline, target bullet |
| `RewriteDiff` | Word-level before/after comparison |
| `RewriteManager` | Accept All / Reject All / filter by classification |
| `TailorResults` | Container: groups by section, shows stats, streaming progress |

Integration: "Tailor Resume" button on analysis results page (when JD present + analysis complete).

**Depends on**: 3.6

**Acceptance**:
- All three classification badges render with correct colors
- Accept/reject updates visual state
- LearningPathCard renders for MISSING rewrites
- RewriteManager filters work
- Streaming progress shows during tailoring
- `tsc --noEmit` passes

---

### 3.8: Integration Verification

**What**: End-to-end validation against spec success criteria:
- `tsc --noEmit` all 3 packages
- `vitest run` server + client
- Manual: upload → extract → analyze → tailor → rewrites display
- Manual: accept/reject persists across page refresh
- Manual: no fabricated skills in REWRITTEN classification

**Depends on**: All previous

---

## Dependency Graph

```
3.1 (Tools) ──→ 3.2 (Agent) ──→ 3.4 (Pipeline+Route) ──┐
                                                          ├──→ 3.8 (Verify)
3.3 (DB) ─────────────────────→ 3.4 ────────────────────┘

3.5 (Client API) ──→ 3.6 (Store) ──→ 3.7 (UI) ──→ 3.8
```

**Parallel**: 3.1 + 3.3 + 3.5 can start simultaneously. 3.2 starts after 3.1.

**Critical path**: 3.1 → 3.2 → 3.4 → 3.8

---

## New Files Summary

| Location | File | Purpose |
|----------|------|---------|
| server/stages | `tailorTools.ts` | Tool definitions + Zod schemas |
| server/stages | `tailorPrompts.ts` | System/user prompt builders |
| server/stages | `stage4_tailoring.ts` | Tailor agent (`runTailorAgent`) |
| server/db | `rewrites.ts` | `saveRewrites`, `loadRewrites`, `updateRewriteAcceptance` |
| client/components/tailor | `TailorResults.tsx` | Main container |
| client/components/tailor | `RewriteCard.tsx` | Individual rewrite card |
| client/components/tailor | `ClassificationBadge.tsx` | REWRITTEN/REFRAMED/MISSING badge |
| client/components/tailor | `LearningPathCard.tsx` | MISSING learning path display |
| client/components/tailor | `RewriteDiff.tsx` | Before/after diff |
| client/components/tailor | `RewriteManager.tsx` | Accept All/Reject All/filter toolbar |

## Modified Files Summary

| File | Changes |
|------|---------|
| `server/src/services/pipelineService.ts` | Add `runTailorPipeline()` |
| `server/src/routes/api.ts` | Replace 3 x 503 stubs with real handlers |
| `client/src/types/api-responses.ts` | Add tailoring SSE types |
| `client/src/services/api.ts` | Add `tailorResumeStream`, `fetchRewrites`, `patchRewriteAcceptance` |
| `client/src/store/useStore.ts` | Add tailor state + actions |

## Verification

1. `cd shared && npx tsc --noEmit` — 0 errors
2. `cd server && npx tsc --noEmit` — 0 errors
3. `cd client && npx tsc --noEmit` — 0 errors
4. `cd server && npx vitest run` — all pass
5. `cd client && npx vitest run` — all pass
6. Manual: upload → extract → analyze → tailor → rewrites with correct classifications
7. Manual: accept/reject persists across page refresh
8. Manual: MISSING rewrites show learning path cards
