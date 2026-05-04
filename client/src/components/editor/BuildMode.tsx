import { useMemo } from "react";
import { useResumeEditorStore } from "../../store/useResumeEditorStore";
import Button from "../ui/Button";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

interface SuggestedBulletTarget {
  sectionId: string;
  itemId: string;
}

const BULLET_TEMPLATES = [
  "Implemented [feature] resulting in [metric]% improvement",
  "Led cross-functional initiative that delivered [outcome]",
  "Optimized [process/system] reducing [metric] by [amount]",
  "Developed [tool/framework] adopted by [N] team members",
  "Increased [KPI] by [metric]% through [strategy]",
];

export default function BuildMode() {
  const sourceDocument = useResumeEditorStore((s) => s.sourceDocument);
  const rewrites = useResumeEditorStore((s) => s.rewrites);
  const isThinResume = useResumeEditorStore((s) => s.isThinResume);
  const buildModeActive = useResumeEditorStore((s) => s.buildModeActive);
  const toggleBuildMode = useResumeEditorStore((s) => s.toggleBuildMode);
  const addBullet = useResumeEditorStore((s) => s.addBullet);

  const { checklist, bulletTargets } = useMemo(() => {
    if (!sourceDocument) {
      return { checklist: [], bulletTargets: [] };
    }

    const items: ChecklistItem[] = [];
    const targets: SuggestedBulletTarget[] = [];

    for (const section of sourceDocument.sections) {
      if (section.type === "experience") {
        for (const entry of section.items) {
          const bulletCount = entry.bullets?.length ?? 0;
          if (bulletCount < 3) {
            items.push({
              id: `${section.id}.${entry.id}.bullets`,
              label: `Add more bullets to "${entry.heading || "Untitled entry"}" (${bulletCount}/3 minimum)`,
              completed: false,
            });
            targets.push({ sectionId: section.id, itemId: entry.id });
          }
        }
      }

      if (section.type === "text" && section.items.length === 0) {
        items.push({
          id: `${section.id}.summary`,
          label: `Add summary`,
          completed: false,
        });
      }
    }

    const missingRewrites = rewrites.filter(
      (rw) => rw.gapClassification === "MISSING" && rw.accepted !== true,
    );

    if (missingRewrites.length > 0) {
      items.push({
        id: "missing-skills",
        label: `Add missing skills from JD (${missingRewrites.length} skill${missingRewrites.length > 1 ? "s" : ""})`,
        completed: false,
      });
    }

    return { checklist: items, bulletTargets: targets };
  }, [sourceDocument, rewrites]);

  if (!buildModeActive || !isThinResume || !sourceDocument) {
    return null;
  }

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  function handleAddBullet(target: SuggestedBulletTarget) {
    const templateIndex = Math.floor(Math.random() * BULLET_TEMPLATES.length);
    addBullet(target.sectionId, target.itemId, BULLET_TEMPLATES[templateIndex]);
  }

  return (
    <div
      data-testid="build-mode-panel"
      className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-900">Build Mode</h3>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Dismiss build mode"
          onClick={toggleBuildMode}
          className="!text-blue-600 !px-2 !py-1 text-xs"
        >
          Dismiss
        </Button>
      </div>

      {/* Progress indicator */}
      <div data-testid="build-mode-progress" className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-blue-700">
          <span>Content progress</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-blue-200">
          <div
            className="h-1.5 rounded-full bg-blue-600 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <ul className="flex flex-col gap-2">
        {checklist.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2 text-sm text-blue-800"
          >
            <span className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${item.completed ? "border-blue-400 bg-blue-400" : "border-blue-300 bg-white"}`} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>

      {/* Suggested bullet buttons per thin experience entry */}
      {bulletTargets.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-blue-200 pt-2">
          <p className="text-xs font-medium text-blue-700">Quick-add template bullets</p>
          {bulletTargets.map((target) => {
            const entry = sourceDocument.sections
              .find((s) => s.id === target.sectionId)
              ?.items.find((i) => i.id === target.itemId);
            return (
              <Button
                key={`${target.sectionId}.${target.itemId}`}
                variant="secondary"
                size="sm"
                aria-label={`Add suggested bullet to ${entry?.heading || "entry"}`}
                onClick={() => handleAddBullet(target)}
                className="!text-xs !py-1.5"
              >
                + Add suggested bullet
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
