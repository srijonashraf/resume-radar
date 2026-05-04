import { useEffect, useMemo } from "react";
import type { DynamicSection } from "@resumetra/shared";
import { useStore } from "../../store/useStore";
import { useResumeEditorStore } from "../../store/useResumeEditorStore";
import EditorToolbar from "./EditorToolbar";
import EditorSidebar from "./EditorSidebar";
import { LivePreview } from "./LivePreview";
import ExperienceEditor from "./sections/ExperienceEditor";
import TextSectionEditor from "./sections/TextSectionEditor";
import { SkillsEditor } from "./sections/SkillsEditor";
import { EducationEditor } from "./sections/EducationEditor";
import { CustomSectionEditor } from "./sections/CustomSectionEditor";

function SectionEditorRouter({ section }: { section: DynamicSection }) {
  switch (section.type) {
    case "experience":
      return <ExperienceEditor section={section} />;
    case "text":
      return <TextSectionEditor section={section} />;
    case "list":
      return <SkillsEditor section={section} />;
    case "table":
      return <EducationEditor section={section} />;
    case "raw":
      return <CustomSectionEditor section={section} />;
    default:
      return null;
  }
}

function ResumeEditorPanel() {
  const extractionResult = useStore((s) => s.extractionResult);
  const tailorRewrites = useStore((s) => s.tailorRewrites);

  const sourceDocument = useResumeEditorStore((s) => s.sourceDocument);
  const activeSectionId = useResumeEditorStore((s) => s.activeSectionId);

  // Hydrate editor store from pipeline data on mount and when pipeline data changes
  useEffect(() => {
    const document = extractionResult?.document;
    if (!document) return;
    useResumeEditorStore.getState().initialize(document, tailorRewrites);
  }, [extractionResult, tailorRewrites]);

  const activeSection = useMemo(() => {
    if (!sourceDocument || !activeSectionId) return null;
    return sourceDocument.sections.find((s) => s.id === activeSectionId) ?? null;
  }, [sourceDocument, activeSectionId]);

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left column (40%): sidebar + section editor */}
        <div className="flex w-2/5 shrink-0">
          <EditorSidebar />

          <div className="flex-1 overflow-y-auto bg-stone-50 p-4">
            {activeSection && <SectionEditorRouter section={activeSection} />}
          </div>
        </div>

        {/* Right column (60%): live preview */}
        <div className="w-3/5 overflow-auto border-l border-stone-200 bg-stone-100">
          <LivePreview />
        </div>
      </div>
    </div>
  );
}

export default ResumeEditorPanel;
