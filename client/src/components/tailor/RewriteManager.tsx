import { useState } from "react";
import Button from "../ui/Button";
import RewriteCard from "./RewriteCard";
import type { GapClassification, Rewrite } from "@resumetra/shared";

type FilterType = "ALL" | GapClassification;

interface RewriteManagerProps {
  rewrites: Rewrite[];
  stats: { rewritten: number; reframed: number; missing: number; total: number };
  onAccept: (rewriteId: string) => void;
  onReject: (rewriteId: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  sectionTitles?: Map<string, string>;
}

const FILTERS: { label: string; value: FilterType }[] = [
  { label: "All", value: "ALL" },
  { label: "REWRITTEN", value: "REWRITTEN" },
  { label: "REFRAMED", value: "REFRAMED" },
  { label: "MISSING", value: "MISSING" },
];

export default function RewriteManager({
  rewrites,
  stats,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  sectionTitles = new Map(),
}: RewriteManagerProps) {
  const [filter, setFilter] = useState<FilterType>("ALL");

  const filtered =
    filter === "ALL"
      ? rewrites
      : rewrites.filter((r) => r.gapClassification === filter);

  // Group by section for display
  const grouped = new Map<string, Rewrite[]>();
  for (const r of filtered) {
    const existing = grouped.get(r.sectionId) ?? [];
    existing.push(r);
    grouped.set(r.sectionId, existing);
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-emerald-700">{stats.rewritten}</span>
          <span className="text-stone-500">Rewritten</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-amber-700">{stats.reframed}</span>
          <span className="text-stone-500">Reframed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-blue-700">{stats.missing}</span>
          <span className="text-stone-500">Missing</span>
        </div>
        <span className="text-stone-400">|</span>
        <span className="text-stone-600">{stats.total} total</span>
      </div>

      {/* Filter + Actions toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="button"
              aria-label={f.label}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filter === f.value
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
              }`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={onAcceptAll}>
            Accept All
          </Button>
          <Button variant="danger-outline" size="sm" onClick={onRejectAll}>
            Reject All
          </Button>
        </div>
      </div>

      {/* Rewrite cards grouped by section */}
      {Array.from(grouped.entries()).map(([sectionId, sectionRewrites]) => (
        <div key={sectionId} className="space-y-3">
          {sectionRewrites.map((rewrite) => (
            <RewriteCard
              key={rewrite.id}
              rewrite={rewrite}
              sectionTitle={sectionTitles.get(sectionId) ?? sectionId}
              onAccept={onAccept}
              onReject={onReject}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
