import { useState, useCallback } from "react";
import type { DynamicSection } from "@resumetra/shared";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import { cn } from "../../../utils/cn";
import Input from "../../ui/Input";

interface SkillsEditorProps {
  section: DynamicSection;
}

export function SkillsEditor({ section }: SkillsEditorProps) {
  const [newSkill, setNewSkill] = useState("");
  const setUserEdit = useResumeEditorStore((s) => s.setUserEdit);
  const clearUserEdit = useResumeEditorStore((s) => s.clearUserEdit);

  const skills = section.items[0]?.items ?? [];
  const sectionId = section.id;
  const itemId = section.items[0]?.id ?? "";

  const handleRemove = useCallback(
    (index: number) => {
      clearUserEdit(`${sectionId}.${itemId}.items.${index}`);
    },
    [clearUserEdit, sectionId, itemId],
  );

  const handleAdd = useCallback(() => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;

    const nextIndex = skills.length;
    setUserEdit(`${sectionId}.${itemId}.items.${nextIndex}`, trimmed);
    setNewSkill("");
  }, [newSkill, skills.length, sectionId, itemId, setUserEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-700">{section.title}</h3>

      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span
            key={`${skill}-${index}`}
            data-testid={`skill-chip-${index}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1",
              "text-sm text-stone-700 border border-stone-200",
            )}
          >
            {skill}
            <button
              type="button"
              aria-label={`Remove ${skill}`}
              onClick={() => handleRemove(index)}
              className="ml-1 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              &times;
            </button>
          </span>
        ))}
      </div>

      <Input
        type="text"
        placeholder="Add a skill..."
        value={newSkill}
        onChange={(e) => setNewSkill(e.target.value)}
        onKeyDown={handleKeyDown}
        className="text-sm"
      />
    </div>
  );
}
