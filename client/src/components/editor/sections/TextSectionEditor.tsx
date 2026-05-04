import { useState } from "react";
import type { DynamicSection } from "@resumetra/shared";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import Textarea from "../../ui/Textarea";
import { cn } from "../../../utils/cn";

interface TextSectionEditorProps {
  section: DynamicSection;
}

function getWordCountLevel(wordCount: number): "green" | "amber" | "red" {
  if (wordCount < 50) return "green";
  if (wordCount <= 75) return "amber";
  return "red";
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

const levelColors: Record<string, string> = {
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
};

export default function TextSectionEditor({ section }: TextSectionEditorProps) {
  const setUserEdit = useResumeEditorStore((s) => s.setUserEdit);
  const firstItem = section.items[0];
  const initialValue = firstItem?.description ?? "";

  const [value, setValue] = useState(initialValue);
  const wordCount = countWords(value);
  const level = getWordCountLevel(wordCount);

  if (!firstItem) return null;

  const editKey = `${section.id}.${firstItem.id}.description`;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    setUserEdit(editKey, next);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-stone-900">{section.title}</h3>

      <Textarea
        value={value}
        onChange={handleChange}
        rows={6}
        placeholder="Write your summary..."
      />

      <div
        data-testid="word-count-indicator"
        data-word-count-level={level}
        className={cn("text-xs font-medium", levelColors[level])}
      >
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </div>
    </div>
  );
}
