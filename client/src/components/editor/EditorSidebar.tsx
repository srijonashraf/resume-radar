import { useMemo } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useResumeEditorStore } from "../../store/useResumeEditorStore";
import Button from "../ui/Button";
import { cn } from "../../utils/cn";
import BuildMode from "./BuildMode";

export default function EditorSidebar() {
  const sourceDocument = useResumeEditorStore((s) => s.sourceDocument);
  const sectionOrder = useResumeEditorStore((s) => s.sectionOrder);
  const activeSectionId = useResumeEditorStore((s) => s.activeSectionId);
  const rewrites = useResumeEditorStore((s) => s.rewrites);
  const isThinResume = useResumeEditorStore((s) => s.isThinResume);
  const buildModeActive = useResumeEditorStore((s) => s.buildModeActive);
  const setActiveSection = useResumeEditorStore((s) => s.setActiveSection);
  const reorderSection = useResumeEditorStore((s) => s.reorderSection);
  const toggleBuildMode = useResumeEditorStore((s) => s.toggleBuildMode);

  const pendingCountBySection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const rewrite of rewrites) {
      if (rewrite.accepted === null) {
        counts.set(rewrite.sectionId, (counts.get(rewrite.sectionId) ?? 0) + 1);
      }
    }
    return counts;
  }, [rewrites]);

  if (!sourceDocument) return null;

  const sectionById = new Map(sourceDocument.sections.map((s) => [s.id, s]));

  return (
    <nav
      aria-label="Resume sections"
      className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-stone-200 bg-white p-3"
    >
      {/* Build Mode banner for thin resumes */}
      {isThinResume && !buildModeActive && (
        <button
          type="button"
          data-testid="build-mode-banner"
          className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
          onClick={toggleBuildMode}
        >
          Build Mode — your resume looks thin. Get guided suggestions.
        </button>
      )}

      {/* Build Mode panel (shown above section list when active) */}
      {buildModeActive && (
        <div className="mb-2">
          <BuildMode />
        </div>
      )}

      {sectionOrder.map((sectionId, index) => {
        const section = sectionById.get(sectionId);
        if (!section) return null;

        const isActive = activeSectionId === sectionId;
        const pendingCount = pendingCountBySection.get(sectionId) ?? 0;
        const isFirst = index === 0;
        const isLast = index === sectionOrder.length - 1;

        return (
          <div
            key={sectionId}
            data-testid={`section-row-${sectionId}`}
            data-active={isActive}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              isActive && "bg-blue-50",
            )}
          >
            <button
              type="button"
              aria-label={`Select ${section.title} section`}
              className={cn(
                "flex-1 cursor-pointer text-left",
                isActive ? "font-medium text-blue-700" : "text-stone-700",
              )}
              onClick={() => setActiveSection(sectionId)}
            >
              {section.title}
            </button>

            {pendingCount > 0 && (
              <span
                data-testid={`badge-${sectionId}`}
                className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
              >
                {pendingCount}
              </span>
            )}

            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${section.title} section up`}
                disabled={isFirst}
                onClick={() => reorderSection(sectionId, index - 1)}
                className="!p-0.5"
              >
                <ChevronUpIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${section.title} section down`}
                disabled={isLast}
                onClick={() => reorderSection(sectionId, index + 1)}
                className="!p-0.5"
              >
                <ChevronDownIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
