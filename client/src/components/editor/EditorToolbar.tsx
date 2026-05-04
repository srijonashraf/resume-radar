import { useCallback, useMemo, useState } from "react";
import { useResumeEditorStore } from "../../store/useResumeEditorStore";
import { resolvedDocumentToPdfData } from "../../utils/resolvedDocumentToPdfData";
import { generatePdf, downloadBlob } from "../pdf/ResumePdfDocument";
import type { GapClassification } from "@resumetra/shared";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { cn } from "../../utils/cn";
import PaywallGate from "../paywall/PaywallGate";

// ── Classification badge config ────────────────────────────────────────────

const CLASSIFICATION_CONFIG: Record<
  GapClassification,
  { variant: "success" | "warning" | "info"; label: string }
> = {
  REWRITTEN: { variant: "success", label: "REWRITTEN" },
  REFRAMED: { variant: "warning", label: "REFRAMED" },
  MISSING: { variant: "info", label: "MISSING" },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function EditorToolbar() {
  const {
    sourceDocument,
    rewrites,
    selectedTemplate,
    sectionOrder,
    setTemplate,
    acceptAllRewrites,
    rejectAllRewrites,
    resetRewrites,
    getResolvedDocument,
  } = useResumeEditorStore();

  const [isGenerating, setIsGenerating] = useState(false);

  // ── Rewrite counts ─────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const pending = rewrites.filter((rw) => rw.accepted === null).length;
    const accepted = rewrites.filter((rw) => rw.accepted === true).length;
    const rejected = rewrites.filter((rw) => rw.accepted === false).length;
    return { pending, accepted, rejected };
  }, [rewrites]);

  // ── Classification breakdown ───────────────────────────────────────────

  const classificationCounts = useMemo(() => {
    const map = new Map<GapClassification, number>();
    for (const rw of rewrites) {
      map.set(rw.gapClassification, (map.get(rw.gapClassification) ?? 0) + 1);
    }
    return map;
  }, [rewrites]);

  const hasRewrites = rewrites.length > 0;

  // ── Download PDF handler ───────────────────────────────────────────────

  const handleDownloadPdf = useCallback(async () => {
    const resolved = getResolvedDocument();
    if (!resolved) return;

    setIsGenerating(true);
    try {
      const pdfData = resolvedDocumentToPdfData(resolved, sectionOrder);
      const blob = await generatePdf(pdfData, selectedTemplate);
      const filename = resolved.contact.fullName
        ? `${resolved.contact.fullName.replace(/\s+/g, "_")}_Resume.pdf`
        : "Resume.pdf";
      downloadBlob(blob, filename);
    } finally {
      setIsGenerating(false);
    }
  }, [getResolvedDocument, sectionOrder, selectedTemplate]);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-3">
      {/* ── Left: Template switcher ── */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="template-select"
          className="text-sm font-medium text-stone-700"
        >
          Template
        </label>
        <select
          id="template-select"
          aria-label="Template"
          value={selectedTemplate}
          onChange={(e) =>
            setTemplate(e.target.value as "professional" | "modern")
          }
          className={cn(
            "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700",
            "focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all",
          )}
        >
          <option value="professional">Professional</option>
          <option value="modern">Modern</option>
        </select>
      </div>

      {/* ── Center: Rewrite summary ── */}
      <div className="flex items-center gap-3">
        {!hasRewrites && (
          <span className="text-sm text-stone-400">No rewrites</span>
        )}
        {hasRewrites && (
          <>
            {counts.pending > 0 && (
              <span className="text-sm font-medium text-stone-700">
                {counts.pending} pending rewrites
              </span>
            )}
            {counts.accepted > 0 && (
              <span className="text-sm text-stone-500">
                {counts.accepted} accepted
              </span>
            )}
            {counts.rejected > 0 && (
              <span className="text-sm text-stone-500">
                {counts.rejected} rejected
              </span>
            )}

            {/* Classification badges */}
            {Array.from(classificationCounts.entries()).map(
              ([classification, count]) => {
                const config = CLASSIFICATION_CONFIG[classification];
                return (
                  <span
                    key={classification}
                    className="flex items-center gap-1"
                  >
                    <span className="text-sm font-medium text-stone-600">
                      {count}
                    </span>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </span>
                );
              },
            )}
          </>
        )}
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasRewrites}
          onClick={acceptAllRewrites}
        >
          Accept All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasRewrites}
          onClick={rejectAllRewrites}
        >
          Reject All
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasRewrites}
          onClick={resetRewrites}
        >
          Reset
        </Button>
        <PaywallGate
          feature="pdf_download"
          fallback={
            <Button
              variant="primary"
              size="sm"
              disabled
            >
              Download PDF
            </Button>
          }
        >
          <Button
            variant="primary"
            size="sm"
            disabled={!sourceDocument || isGenerating}
            onClick={handleDownloadPdf}
          >
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </PaywallGate>
      </div>
    </div>
  );
}
