import { useMemo } from "react";
import { useResumeEditorStore } from "../../store/useResumeEditorStore";
import { resolvedDocumentToPdfData } from "../../utils/resolvedDocumentToPdfData";
import { ProfessionalTemplatePreview } from "../pdf/templates/professionalTemplatePreview";
import { ModernTemplatePreview } from "../pdf/templates/modernTemplatePreview";

export function LivePreview() {
  const sourceDocument = useResumeEditorStore((s) => s.sourceDocument);
  const rewrites = useResumeEditorStore((s) => s.rewrites);
  const userEdits = useResumeEditorStore((s) => s.userEdits);
  const sectionOrder = useResumeEditorStore((s) => s.sectionOrder);
  const selectedTemplate = useResumeEditorStore((s) => s.selectedTemplate);

  const resolved = useMemo(() => {
    if (!sourceDocument) return null;
    return useResumeEditorStore
      .getState()
      .getResolvedDocument();
  }, [sourceDocument, rewrites, userEdits, sectionOrder]);

  if (!resolved) {
    return (
      <div className="flex h-full items-center justify-center text-stone-400">
        <p>No document loaded</p>
      </div>
    );
  }

  const data = resolvedDocumentToPdfData(resolved, sectionOrder);

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 shadow-lg">
      {selectedTemplate === "professional" ? (
        <ProfessionalTemplatePreview data={data} />
      ) : (
        <ModernTemplatePreview data={data} />
      )}
    </div>
  );
}
