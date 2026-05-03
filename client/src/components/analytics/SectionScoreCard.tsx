import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { formatScore } from "../../utils/formatScore";
import type { SectionScore } from "@resumetra/shared";

interface SectionScoreCardProps {
  section: SectionScore;
  sectionTitle: string;
}

const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
const severityVariant: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export default function SectionScoreCard({
  section,
  sectionTitle,
}: SectionScoreCardProps) {
  const sortedIssues = [...section.issues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const contentColor =
    section.contentScore >= 7
      ? "text-emerald-600"
      : section.contentScore >= 4
        ? "text-amber-600"
        : "text-red-600";
  const impactColor =
    section.impactScore >= 7
      ? "text-emerald-600"
      : section.impactScore >= 4
        ? "text-amber-600"
        : "text-red-600";

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-stone-900 text-sm">{sectionTitle}</h4>
        {sortedIssues.length > 0 && (
          <Badge variant={severityVariant[sortedIssues[0].severity]}>
            {sortedIssues.length} issue{sortedIssues.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="flex gap-6 mb-3">
        <div>
          <p className="text-xs text-stone-500 mb-1">Content</p>
          <p className={`text-2xl font-bold ${contentColor}`}>
            {formatScore(section.contentScore)}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500 mb-1">Impact</p>
          <p className={`text-2xl font-bold ${impactColor}`}>
            {formatScore(section.impactScore)}
          </p>
        </div>
      </div>

      {sortedIssues.length > 0 && (
        <Disclosure>
          {({ open }) => (
            <div>
              <DisclosureButton className="flex w-full items-center justify-between text-sm text-stone-500 hover:text-stone-700 py-2 border-t border-stone-100">
                <span>View issues</span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </DisclosureButton>
              <DisclosurePanel className="space-y-2 pt-2">
                {sortedIssues.map((issue, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-stone-100 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={severityVariant[issue.severity]}>
                        {issue.severity}
                      </Badge>
                      <span className="font-medium text-stone-700">
                        {issue.type}
                      </span>
                    </div>
                    <p className="text-stone-600">{issue.description}</p>
                    <p className="text-amber-700 mt-1 text-xs">
                      {issue.suggestion}
                    </p>
                  </div>
                ))}
              </DisclosurePanel>
            </div>
          )}
        </Disclosure>
      )}
    </Card>
  );
}
