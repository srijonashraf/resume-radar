# Spec: Resumetra 2.0 — Full Product Rebuild

## Objective

Build Resumetra 2.0: an AI-powered resume intelligence tool for software engineers featuring honest tailoring, deterministic ATS scoring, a structured live editor with per-item accept/reject, and WYSIWYG PDF export.

**User**: Software engineers at any experience level (zero-experience students through 10+ year seniors) actively or passively job hunting.

**Core value prop**: Honest AI that tells you what to fix, what you're missing, and how to get there — never fabricates skills.

**Success**: Users trust the tool enough to submit tailored resumes to real job applications, and the resumes reflect their actual abilities.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >=20 LTS |
| Server | Express | Latest |
| Database | PostgreSQL | >=15 |
| DB Driver | pg (node-postgres) | Latest |
| Migrations | node-pg-migrate | Latest |
| AI Model | GPT-4o (OpenAI API) | gpt-4o |
| AI SDK | openai (official) | Latest |
| Validation | Zod | Latest |
| Client | React 18+ | Latest |
| Build | Vite | Latest |
| State | Zustand | Latest |
| PDF | @react-pdf/renderer | Latest |
| Styling | Tailwind CSS | Latest |
| Testing | Vitest | Latest |
| Types | Shared TypeScript package | 5.x |

## Commands

### Server (`server/`)
```
npm run dev          — tsx watch + dotenv
npm run build        — tsup production build
npm run start        — run compiled build
npm run test         — vitest run
npm run test:watch   — vitest --watch
npm run migrate      — node-pg-migrate up
npm run migrate:create — node-pg-migrate create <name>
npx tsc --noEmit     — type check only
```

### Client (`client/`)
```
npm run dev          — Vite dev server (localhost:5173)
npm run build        — tsc --noEmit + vite build
npm run lint         — eslint
npm run test         — vitest run
npm run test:watch   — vitest --watch
npx tsc --noEmit     — type check only
```

### Shared (`shared/`)
```
npm run build        — tsc build
npx tsc --noEmit     — type check
```

## Project Structure

```
resumetra/
├── shared/                          # Shared types (imported by both client and server)
│   ├── src/
│   │   ├── types/
│   │   │   ├── resumeDocument.ts    # ResumeDocument, DynamicSection, SectionItem
│   │   │   ├── rewrite.ts           # Rewrite, GapClassification
│   │   │   ├── metrics.ts           # DeterministicMetrics, AtsReport, FormattingIssue
│   │   │   ├── contact.ts           # ContactInfo
│   │   │   ├── templateConfig.ts    # TemplateConfig, TemplateStyle
│   │   │   └── index.ts             # Barrel export
│   │   └── schemas/
│   │       ├── resumeDocument.ts    # Zod schemas for all types
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── api.ts               # All HTTP endpoints + SSE handlers
│   │   │   └── auth.ts              # Google OAuth routes
│   │   │
│   │   ├── services/
│   │   │   ├── pipeline/
│   │   │   │   ├── orchestrator.ts  # Chains stages, emits SSE events
│   │   │   │   ├── stage0-validation.ts
│   │   │   │   ├── stage1-extraction.ts
│   │   │   │   ├── stage2-metrics.ts
│   │   │   │   ├── stage3-analysis.ts
│   │   │   │   └── stage4-tailoring.ts
│   │   │   │
│   │   │   ├── agents/
│   │   │   │   ├── baseAgent.ts     # Shared agent logic (model, retry, tool parsing)
│   │   │   │   ├── extractionAgent.ts
│   │   │   │   ├── analysisAgent.ts
│   │   │   │   └── tailorAgent.ts
│   │   │   │
│   │   │   ├── aiService.ts         # GPT-4o client, generateJson<T>, tool-calling helpers
│   │   │   ├── deterministicMetrics.ts  # Pure code: word counts, bullet checks, ATS format
│   │   │   ├── atsScoring.ts        # Keyword matching (exact + trigram partial)
│   │   │   └── professionDetector.ts # Auto-detect profession from resume content
│   │   │
│   │   ├── knowledge/
│   │   │   ├── types.ts             # ProfessionKnowledgeBase interface
│   │   │   ├── registry.ts          # professionId → knowledge base lookup
│   │   │   ├── software_engineer.ts # SWE knowledge base (v1)
│   │   │   └── generic.ts           # Fallback knowledge base
│   │   │
│   │   ├── db/
│   │   │   ├── migrations/          # node-pg-migrate migration files
│   │   │   ├── queries/
│   │   │   │   ├── analyses.ts
│   │   │   │   ├── sections.ts
│   │   │   │   ├── rewrites.ts
│   │   │   │   └── atsKeywords.ts
│   │   │   ├── pool.ts              # pg Pool singleton
│   │   │   └── client.ts            # Query helpers
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts              # requireAuth, optionalAuth
│   │   │   ├── errorHandler.ts      # AppError hierarchy → JSON responses
│   │   │   ├── rateLimit.ts
│   │   │   └── validate.ts          # Zod request validation middleware
│   │   │
│   │   ├── utils/
│   │   │   ├── pdfExtractor.ts      # pdfjs-dist server-side text extraction
│   │   │   ├── sseEmitter.ts        # SSE event helper
│   │   │   └── env.ts               # requireEnv() fail-fast
│   │   │
│   │   └── types/
│   │       ├── api-responses.ts     # Response DTOs
│   │       └── request-types.ts     # Request body types
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── tsup.config.ts
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── upload/
│   │   │   │   ├── UploadPanel.tsx
│   │   │   │   └── ValidationFeedback.tsx    # Stage 0 outcome messages
│   │   │   │
│   │   │   ├── analysis/
│   │   │   │   ├── HealthCheck.tsx           # Section coverage, quick issues
│   │   │   │   ├── AtsReport.tsx             # Keyword match, score breakdown
│   │   │   │   └── IssueList.tsx             # Ordered by severity
│   │   │   │
│   │   │   ├── editor/
│   │   │   │   ├── ResumeEditorPanel.tsx     # Split-pane container
│   │   │   │   ├── EditorSidebar.tsx         # Section list, AI badges, reorder
│   │   │   │   ├── EditorToolbar.tsx         # Template switcher, download, rewrite manager
│   │   │   │   ├── LivePreview.tsx           # HTML preview of selected template
│   │   │   │   ├── RewriteManager.tsx        # Accept All / Reject All / filter / reset
│   │   │   │   ├── RewriteDiff.tsx           # Per-item pending/accepted/rejected
│   │   │   │   ├── BuildMode.tsx             # Guided content creation for thin resumes
│   │   │   │   └── sections/
│   │   │   │       ├── ExperienceEditor.tsx  # Work experience, projects, volunteer
│   │   │   │       ├── TextSectionEditor.tsx # Summary, objective
│   │   │   │       ├── SkillsEditor.tsx      # Tag input with JD suggestions
│   │   │   │       ├── EducationEditor.tsx   # Table-shape editor
│   │   │   │       └── CustomSectionEditor.tsx # Raw-shape fallback
│   │   │   │
│   │   │   ├── pdf/
│   │   │   │   ├── ResumePdfDocument.tsx     # PDF generation entry point
│   │   │   │   ├── GenericTemplate.tsx       # Config-driven PDF template
│   │   │   │   ├── GenericTemplatePreview.tsx # Config-driven HTML preview
│   │   │   │   ├── fonts.ts                  # Font registration (embedded)
│   │   │   │   └── templates/
│   │   │   │       ├── professional.config.ts
│   │   │   │       ├── modern.config.ts
│   │   │   │       └── templateRegistry.ts
│   │   │   │
│   │   │   └── dashboard/
│   │   │       ├── DashboardTabs.tsx
│   │   │       └── ...existing dashboard components
│   │   │
│   │   ├── store/
│   │   │   ├── useStore.ts                   # Global store (analysis state, history, auth)
│   │   │   ├── useResumeEditorStore.ts       # Editor store (3-layer state + getResolvedDocument)
│   │   │   └── useTemplateStore.ts           # Template selection + config
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                        # API calls + SSE subscription
│   │   │   └── errors.ts                     # ApiError class
│   │   │
│   │   ├── utils/
│   │   │   ├── pdfUtils.ts                   # Client-side PDF text extraction (upload flow)
│   │   │   ├── editorTransforms.ts           # Editor state → PDF data transforms
│   │   │   └── formatScore.ts                # Score display formatting
│   │   │
│   │   └── types/
│   │       └── api-responses.ts              # Backend response DTOs
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── package.json                    # Root package.json (workspaces or scripts)
└── CLAUDE.md
```

## Code Style

### TypeScript

```typescript
// Prefer interface for objects, type for unions/intersections
interface ResumeDocument {
  contact: ContactInfo;
  sections: DynamicSection[];
  detectedProfession: string;
  detectedCareerLevel: string;
}

type GapClassification = 'REWRITTEN' | 'REFRAMED' | 'MISSING';
type SectionType = 'experience' | 'text' | 'list' | 'table' | 'raw';

// Never use any — type properly or use unknown
// Async/await over .then()
// Meaningful variable names — no abbreviations except widely known ones (ATS, JD, SWE)
// Comments answer why, not what
```

### Server Pattern

```typescript
// Route handler: thin orchestration only
router.post('/api/v1/analyze',
  optionalAuth,
  validate(analyzeSchema),
  asyncHandler(analysisController.analyze)
);

// Controller: orchestrate services
async analyze(req: Request, res: Response): Promise<void> {
  const { resumeText } = req.validated.body;
  const userId = req.user?.id;

  const sse = new SseEmitter(res);
  const result = await orchestrator.run(resumeText, { userId, onProgress: sse.emit });
  sse.complete(result);
}

// Service: core logic
async function computeAtsScore(resumeText: string, jdKeywords: string[]): Promise<AtsReport> {
  const resumeTokens = tokenize(resumeText);
  const matched = findExactMatches(resumeTokens, jdKeywords);
  // ...
}

// All numbers users see come from code, not AI
```

### Client Pattern

```typescript
// Components: UI only, no business logic
// Store: state + actions, no components
// API calls: in services/api.ts, not in components
// Handlers passed down via props from parent/container

// Store pattern (Zustand)
interface EditorStore {
  sourceDocument: ResumeDocument;
  acceptedRewrites: Map<string, boolean>;
  userEdits: Map<string, string>;
  getResolvedDocument: () => ResumeDocument;
  acceptRewrite: (id: string) => void;
  rejectRewrite: (id: string) => void;
  editField: (sectionId: string, itemId: string, field: string, value: string) => void;
}
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Files (TS) | camelCase | `atsScoring.ts` |
| Files (TSX) | PascalCase | `ExperienceEditor.tsx` |
| DB columns | snake_case | `career_level_detected` |
| API fields | camelCase | `careerLevelDetected` |
| Constants | SCREAMING_SNAKE | `MAX_BULLET_LENGTH` |
| Types/Interfaces | PascalCase | `ResumeDocument` |
| Functions | camelCase | `getResolvedDocument` |
| Zod schemas | camelCase + Schema | `atsReportSchema` |
| React components | PascalCase | `LivePreview` |

## Testing Strategy

### Framework

**Vitest** for both client and server. Single config per package.

### Test Locations

```
server/src/**/*.test.ts       — Unit tests alongside source
client/src/**/*.test.tsx      — Component tests alongside source
client/src/**/*.test.ts       — Utility tests alongside source
```

### Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Deterministic metrics | 90%+ | Pure functions, no AI — must be fully tested |
| ATS scoring | 90%+ | Pure code, keyword matching — must be provably correct |
| Agent tool schemas | 80%+ | Zod validation — ensure contracts hold |
| Editor store | 80%+ | Three-layer state merge logic is complex |
| API routes | 70%+ | Integration tests with mocked services |
| React components | 50%+ | Key interactions only — rendering tests are low value |

### Test Levels

1. **Unit tests** — Pure functions: metrics computation, ATS matching, store state, transforms
2. **Schema tests** — Zod schemas parse valid input, reject invalid input
3. **Integration tests** — API routes with mocked DB and AI services
4. **Manual verification** — SSE streaming, PDF output, editor interactions

### What NOT to test

- AI model output (non-deterministic — test schemas, not content)
- Third-party library internals
- CSS/styling

## Boundaries

### Always Do
- Run `tsc --noEmit` before committing
- Run tests before committing (once they exist)
- Validate all external input at system boundaries (API requests, AI output)
- Use parameterized queries for all DB operations
- Transform snake_case ↔ camelCase at API boundary only
- Update the spec when decisions change
- Zod-validate all AI tool call outputs before use

### Ask First
- Adding new dependencies
- Changing database schema (new migrations)
- Modifying AI model or prompt strategy
- Changing API response shapes
- Modifying pricing or auth flow
- Removing existing features

### Never Do
- Commit secrets, tokens, .env files
- Use `any` type
- Fabricate skills in AI tailoring (core brand promise)
- Let AI overwrite user edits (user is final authority)
- Drop sections silently (always preserve as raw fallback)
- Skip Zod validation on AI outputs

## Success Criteria by Phase

### Phase 0: Pre-Build
- [ ] `shared/` package compiles and exports all core types
- [ ] `ResumeDocument`, `DynamicSection`, `SectionItem`, `Rewrite`, `AtsReport`, `DeterministicMetrics` types defined with Zod schemas
- [ ] `TemplateConfig` schema defined
- [ ] `node-pg-migrate` installed and configured
- [ ] Migration for new tables created (`resume_sections`, `resume_tailor_rewrites`, `resume_ats_keywords`, `resume_section_scores`)
- [ ] `ProfessionKnowledgeBase` interface defined in `knowledge/types.ts`
- [ ] SWE knowledge base config authored
- [ ] Generic knowledge base config authored
- [ ] AI model switched to GPT-4o with tool calling enabled
- [ ] All existing tests (once added) pass
- [ ] `tsc --noEmit` passes on all three packages

### Phase 1: Validation + Extraction
- [ ] Stage 0 rejects bad inputs with specific helpful messages (scanned PDF, encrypted, corrupted, too long, not a resume, non-English)
- [ ] Stage 1 extracts all sections dynamically (no fixed schema)
- [ ] Upload a resume with 10 sections (including non-standard: volunteer, languages, awards) — all 10 extracted and displayed
- [ ] Upload a scanned PDF — helpful error message, no crash
- [ ] Upload a two-column resume — text correctly grouped by semantic section
- [ ] Section confirmation UI: "We found these N sections — anything missing?"
- [ ] Resume Health Check UI renders section coverage summary
- [ ] SSE events stream per-section extraction progress
- [ ] Failed section extraction falls back to raw text — pipeline continues

### Phase 2: Analysis + ATS Scoring
- [ ] Deterministic word counts match manual count within ±2 words
- [ ] Bullet quality scoring: action verb presence, metric presence — all code, no AI
- [ ] Career level detection from date ranges matches manual assessment
- [ ] ATS formatting checks detect: tables, columns, header/footer content, decorative bullets
- [ ] With JD: keyword extraction (AI), then exact + partial matching (code)
- [ ] ATS score traces back to specific keywords, sections, and formatting checks — fully explainable
- [ ] Running same resume twice produces identical scores
- [ ] Analysis Results UI shows issue list ordered by severity with specific fixes
- [ ] ATS Report UI shows matched/missing keywords with match score breakdown

### Phase 3: Honest Tailoring
- [ ] Per-bullet rewrites with honest gap classification
- [ ] Given JD with 3 skills user has, 2 adjacent, 2 genuinely lacking:
  - 3 classified REWRITTEN with accurate rewrites
  - 2 classified REFRAMED with honest reframes and awareness notes
  - 2 classified MISSING with learning paths
  - 0 fabricated skills added
- [ ] Learning paths include: resource, project, timeline, target bullet
- [ ] Skill suggestions only surface implicit skills (already implied by experience)
- [ ] Rewrite data persisted with accept/reject/pending state
- [ ] Tailor results UI shows classification badges and learning path cards

### Phase 4: Live Editor
- [ ] Split-pane layout: structured editors left, live preview right
- [ ] Work experience editor: company, title, dates, per-bullet text inputs
- [ ] Skills editor: tag input with JD-suggested chips
- [ ] Summary editor: textarea with word count indicator
- [ ] Education editor: table-shape structured fields
- [ ] Custom editor: plain textarea for raw sections
- [ ] Per-bullet accept/reject with before/after diff
- [ ] Rewrite Manager toolbar: Accept All, Reject All, filter, reset
- [ ] Three-layer state: user edits always win over AI rewrites over source
- [ ] `getResolvedDocument()` produces correct merge of all three layers
- [ ] Template switching preserves editor state
- [ ] Section reordering reflects in preview
- [ ] Add/remove bullets and entries works
- [ ] Preview updates on every keystroke, accept, reject, reorder
- [ ] Overflow indicator per bullet (green/amber/red)

### Phase 5: PDF Export
- [ ] PDF matches live preview (WYSIWYG)
- [ ] ATS-compatible: no tables in body, no headers/footers with content, standard fonts
- [ ] Every section from editor appears in PDF
- [ ] Consistent fonts: Outfit headings, DM Sans body
- [ ] Two templates: Professional (single-column) and Modern (two-column sidebar)
- [ ] Fonts embedded (not CDN) for offline reliability
- [ ] `getResolvedDocument()` is single data source for both preview and PDF
- [ ] Run generated PDF through ATS parser — all sections parsed, all keywords detected

### Phase 6: Polish + Launch Prep
- [ ] Onboarding flow explains: what Resumetra does, font replacement, honest tailoring
- [ ] Empty states for all major UI states
- [ ] Error boundaries with recovery actions
- [ ] Resume history access for authenticated users
- [ ] All SSE events stream correctly
- [ ] Security review: no retained PDFs beyond session, input sanitization
- [ ] Landing page with positioning and pricing

## Key Architectural Decisions

### 1. Three-Layer Editor State

```
Layer 1 (Source):    What AI extracted from the original resume — immutable after load
Layer 2 (Rewrites):  What AI suggested as improvements — accepted/rejected/pending
Layer 3 (Edits):     What the user typed — always wins

getResolvedDocument():
  For each field:
    if userEdits.has(key) → use user edit           // Layer 3
    else if accepted rewrite exists → use rewrite    // Layer 2
    else → use source document value                 // Layer 1
```

One function, two consumers (preview + PDF), one source of truth.

### 2. Pipeline Stage Isolation

Each stage is independent. Each has its own input/output types. Each can be tested in isolation.

```
Stage 0: Raw text → ValidationResult
Stage 1: Raw text → ResumeDocument (via ExtractionAgent)
Stage 2: ResumeDocument + (optional JD) → DeterministicMetrics + AtsReport
Stage 3: ResumeDocument + Metrics → AnalysisIssues[] + SectionScores[]
Stage 4: ResumeDocument + AtsReport + Issues → Rewrite[]
```

### 3. AI Decides What, Code Verifies How

- AI: extraction, quality evaluation, rewriting suggestions
- Code: word counts, bullet quality, ATS format checks, keyword matching, score computation
- Never let AI produce a number without code verifying it

### 4. Knowledge Base Injection

Agents receive `ProfessionKnowledgeBase` at runtime. No SWE-specific rules in agent code. Adding a profession = authoring a config file.

### 5. Cost Budget per Analysis

| Stage | Estimated API Calls | Estimated Tokens |
|-------|-------------------|-----------------|
| Stage 0 | 0 (code only) | 0 |
| Stage 1 (extraction) | 1-3 tool calls | ~4,000 input + 2,000 output |
| Stage 2 (JD keywords) | 1 call (if JD provided) | ~1,000 input + 500 output |
| Stage 3 (analysis) | 2-4 tool calls | ~5,000 input + 2,000 output |
| Stage 4 (tailoring) | 3-8 tool calls | ~6,000 input + 3,000 output |
| **Total per analysis** | **7-16 calls** | **~16,000 input + 7,500 output** |

At GPT-4o pricing ($2.50/1M input, $10/1M output): ~$0.04-0.12 per analysis.
At 1,000 analyses/day: ~$40-120/day. Feasible at $19/month subscription with ~5 analyses/user/month.

## Resolved Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Shared package setup | npm workspaces | Standard monorepo approach. `shared/` listed as dependency in both client and server. |
| PDF text extraction | Server-side | Stage 2 ATS formatting checks require PDF structural data (X/Y coordinates, layout analysis, column detection). Client-side text extraction loses this information. Server uses pdfjs-dist to extract text + position data. |
| Legacy features | Rebuild immediately | Career map and job matching rebuilt against new ResumeDocument structure. Old endpoints removed once new pipeline is stable. |
| Font loading | Base64 embedded | Fonts imported as arraybuffer via Vite, encoded as Base64 for @react-pdf/renderer registration. ~500KB added to bundle. Works offline. |
| AI model | GPT-4o via OpenAI API | Tool calling required for multi-stage agent pipeline. Switch from OpenRouter to direct OpenAI API. |
| DB migrations | node-pg-migrate | Lightweight, SQL-first, PostgreSQL-focused. Fits raw pg setup. |
| Free tier paywall | Implement during Phase 4+ | Paywall logic added when editor and PDF are built. Analysis remains free. Restrict: PDF download, accept rewrites, full issue list. |

## Open Questions

1. **Free tier limits specifics**: Plan says "first 3 issues only" and "one tailor run." Need exact limits defined before Phase 6.
2. **Rate limiting per tier**: Free tier analysis rate limit vs. paid tier. Current rate limit applies to all. Needs tiered approach.
