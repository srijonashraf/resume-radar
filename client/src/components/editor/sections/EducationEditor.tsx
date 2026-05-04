import { useCallback } from "react";
import type { DynamicSection } from "@resumetra/shared";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import { cn } from "../../../utils/cn";
import Input from "../../ui/Input";
import Button from "../../ui/Button";

interface EducationEditorProps {
  section: DynamicSection;
}

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
}

const FIELDS: FieldConfig[] = [
  { key: "institution", label: "Institution", placeholder: "Institution" },
  { key: "degree", label: "Degree", placeholder: "Degree" },
  { key: "field", label: "Field", placeholder: "Field" },
  { key: "year", label: "Year", placeholder: "Year" },
];

export function EducationEditor({ section }: EducationEditorProps) {
  const setUserEdit = useResumeEditorStore((s) => s.setUserEdit);
  const addEntry = useResumeEditorStore((s) => s.addEntry);
  const removeEntry = useResumeEditorStore((s) => s.removeEntry);

  const sectionId = section.id;

  const handleFieldChange = useCallback(
    (itemId: string, rowIdx: number, fieldKey: string, value: string) => {
      setUserEdit(`${sectionId}.${itemId}.rows.${rowIdx}.${fieldKey}`, value);
    },
    [sectionId, setUserEdit],
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-stone-700">{section.title}</h3>

      {section.items.map((item) => {
        const rows = item.rows ?? [];

        return rows.map((row, rowIdx) => (
          <div
            key={`${item.id}-${rowIdx}`}
            className={cn(
              "space-y-2 rounded-lg border border-stone-200 p-3",
              "bg-stone-50/50",
            )}
          >
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map((field) => (
                <Input
                  key={field.key}
                  type="text"
                  placeholder={field.placeholder}
                  value={row[field.key] ?? ""}
                  onChange={(e) =>
                    handleFieldChange(item.id, rowIdx, field.key, e.target.value)
                  }
                  className="text-sm"
                />
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                variant="danger-outline"
                size="sm"
                onClick={() => removeEntry(sectionId, item.id)}
              >
                Remove
              </Button>
            </div>
          </div>
        ));
      })}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => addEntry(sectionId)}
      >
        + Add Entry
      </Button>
    </div>
  );
}
