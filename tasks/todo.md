# Phase 4: Live Editor — Task Checklist

Full plan: `tasks/plan.md`

## Execution Order

| # | Task | Status | Depends on |
|---|------|--------|------------|
| 1 | 4.1: Three-layer editor store | ✅ | — |
| 2 | 4.2: Resolved document → PdfResumeData mapper | ✅ | 4.1 |
| 3 | 4.3: Section editors — Experience + Text | ✅ | 4.1 |
| 4 | 4.4: Section editors — Skills + Education + Custom | ✅ | 4.1 |
| 5 | 4.5: EditorSidebar | ✅ | 4.1 |
| 6 | 4.6: EditorToolbar + RewriteManager | ✅ | 4.1, 4.2 |
| 7 | 4.7: LivePreview | ✅ | 4.1, 4.2 |
| 8 | 4.8: ResumeEditorPanel (split-pane container) | ✅ | 4.3–4.7 |
| 9 | 4.9: Dashboard integration | ✅ | 4.8 |
| 10 | 4.10: Integration verification | ✅ | 4.9 |

## Parallel Groups

- **Group A** (start immediately): 4.1
- **Group B** (after 4.1): 4.2 + 4.3 + 4.4 + 4.5 in parallel
- **Group C** (after 4.2): 4.6 + 4.7 in parallel
- **Group D** (after all): 4.8
- **Group E** (after 4.8): 4.9
- **Group F** (after 4.9): 4.10

## Critical Path

4.1 → 4.2 → 4.6/4.7 → 4.8 → 4.9 → 4.10

## Key Decisions

- Full rewrite of `useResumeEditorStore.ts` around `ResumeDocument` (not TipTap HTML)
- Edit key: `${sectionId}.${itemId}.${field}` — flat, parseable
- Template selection merged into editor store (not separate store)
- Reuse existing `ProfessionalTemplatePreview` / `ModernTemplatePreview` for live preview
- New `resolvedDocumentToPdfData()` replaces old HTML-parsing `editorToPdfData()`
- Up/down arrows for reorder (no drag-and-drop in Phase 4)
- Delete TipTap dependency after Phase 4

## Verification Gate

After 4.10:
- [ ] `tsc --noEmit` passes all 3 packages
- [ ] `vitest run` passes server + client
- [ ] Manual: upload → extract → analyze → tailor → open editor → live preview
- [ ] Manual: accept/reject persists across page refresh
- [ ] Manual: template switch preserves edits
- [ ] Manual: PDF download matches preview
- [ ] Manual: section reorder reflects in preview
- [ ] Manual: add/remove bullets and entries works
