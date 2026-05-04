import { useCallback } from "react";
import type { DynamicSection } from "@resumetra/shared";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import Textarea from "../../ui/Textarea";

interface CustomSectionEditorProps {
  section: DynamicSection;
}

export function CustomSectionEditor({ section }: CustomSectionEditorProps) {
  const setUserEdit = useResumeEditorStore((s) => s.setUserEdit);

  const sectionId = section.id;
  const itemId = section.items[0]?.id ?? "";
  const rawText = section.items[0]?.rawText ?? "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setUserEdit(`${sectionId}.${itemId}.rawText`, e.target.value);
    },
    [sectionId, itemId, setUserEdit],
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-700">{section.title}</h3>

      <Textarea
        value={rawText}
        onChange={handleChange}
        placeholder="Enter content..."
        rows={4}
        className="text-sm"
      />
    </div>
  );
}
