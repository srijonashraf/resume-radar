import type { DynamicSection } from "@resumetra/shared";
import { useResumeEditorStore } from "../../../store/useResumeEditorStore";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import { cn } from "../../../utils/cn";

interface ExperienceEditorProps {
  section: DynamicSection;
}

function getOverflowLevel(charCount: number): "green" | "amber" | "red" {
  if (charCount < 80) return "green";
  if (charCount <= 120) return "amber";
  return "red";
}

const overflowColors: Record<string, string> = {
  green: "border-green-400",
  amber: "border-amber-400",
  red: "border-red-400",
};

export default function ExperienceEditor({ section }: ExperienceEditorProps) {
  const { setUserEdit, addBullet, removeBullet, addEntry, removeEntry } =
    useResumeEditorStore();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-stone-900">{section.title}</h3>

      {section.items.map((item) => (
        <div
          key={item.id}
          className="space-y-3 rounded-xl border border-stone-200 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  Company
                </label>
                <Input
                  value={item.heading ?? ""}
                  onChange={(e) =>
                    setUserEdit(
                      `${section.id}.${item.id}.heading`,
                      e.target.value,
                    )
                  }
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  Title
                </label>
                <Input
                  value={item.subheading ?? ""}
                  onChange={(e) =>
                    setUserEdit(
                      `${section.id}.${item.id}.subheading`,
                      e.target.value,
                    )
                  }
                  placeholder="Job title"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">
                  Dates
                </label>
                <Input
                  value={item.dateRange ?? ""}
                  onChange={(e) =>
                    setUserEdit(
                      `${section.id}.${item.id}.dateRange`,
                      e.target.value,
                    )
                  }
                  placeholder="e.g. 2020 - 2023"
                />
              </div>
            </div>

            <Button
              variant="danger-outline"
              size="sm"
              onClick={() => removeEntry(section.id, item.id)}
              aria-label="Remove entry"
              className="mt-5 shrink-0"
            >
              Remove entry
            </Button>
          </div>

          {/* Bullets */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-stone-500">
              Bullet Points
            </label>
            {(item.bullets ?? []).map((bullet, index) => {
              const overflow = getOverflowLevel(bullet.length);
              return (
                <div
                  key={index}
                  data-bullet-indicator={overflow}
                  className="flex items-start gap-2"
                >
                  <div className="flex-1">
                    <Input
                      value={bullet}
                      onChange={(e) =>
                        setUserEdit(
                          `${section.id}.${item.id}.bullets.${index}`,
                          e.target.value,
                        )
                      }
                      className={cn(overflowColors[overflow])}
                      placeholder="Describe an achievement..."
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      removeBullet(section.id, item.id, index)
                    }
                    aria-label="Remove bullet"
                    className="mt-1 shrink-0 text-stone-400 hover:text-red-500"
                  >
                    &times;
                  </Button>
                </div>
              );
            })}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addBullet(section.id, item.id, "")}
              aria-label="Add bullet"
            >
              + Add bullet
            </Button>
          </div>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => addEntry(section.id)}
        aria-label="Add entry"
      >
        + Add entry
      </Button>
    </div>
  );
}
