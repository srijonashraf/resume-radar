import { motion } from "framer-motion";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Button from "../ui/Button";
import Card from "../ui/Card";
import type { ExtractionResult } from "../../store/useStore";

interface ResumeHealthCheckProps {
  profession: ExtractionResult["profession"];
  careerLevel: ExtractionResult["careerLevel"];
  sectionCoverage: ExtractionResult["sectionCoverage"];
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const formatProfessionName = (id: string) =>
  id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

type CoverageTier = "required" | "recommended" | "optional";

interface CoverageGroup {
  tier: CoverageTier;
  label: string;
  items: { name: string; present: boolean }[];
}

const TIER_STYLES: Record<
  CoverageTier,
  { present: string; missing: string; badge: string; header: string }
> = {
  required: {
    present: "text-emerald-700 bg-emerald-50 border-emerald-200",
    missing: "text-red-700 bg-red-50 border-red-200",
    badge: "bg-emerald-100 text-emerald-700",
    header: "text-emerald-800",
  },
  recommended: {
    present: "text-amber-700 bg-amber-50 border-amber-200",
    missing: "text-amber-500 bg-amber-50/50 border-amber-100",
    badge: "bg-amber-100 text-amber-700",
    header: "text-amber-800",
  },
  optional: {
    present: "text-stone-600 bg-stone-50 border-stone-200",
    missing: "text-stone-400 bg-stone-50/50 border-stone-100",
    badge: "bg-stone-100 text-stone-600",
    header: "text-stone-600",
  },
};

export default function ResumeHealthCheck({
  profession,
  careerLevel,
  sectionCoverage,
  onAnalyze,
  isAnalyzing,
}: ResumeHealthCheckProps) {
  const groups: CoverageGroup[] = [
    { tier: "required", label: "Required", items: sectionCoverage.required },
    {
      tier: "recommended",
      label: "Recommended",
      items: sectionCoverage.recommended,
    },
    { tier: "optional", label: "Optional", items: sectionCoverage.optional },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card padding="lg">
        <h2 className="text-2xl font-bold text-stone-900 mb-2 text-center">
          Resume Health Check
        </h2>
        <p className="text-stone-500 text-center mb-8">
          {formatProfessionName(profession.professionId)} &mdash;{" "}
          {careerLevel.label}
          {careerLevel.totalMonths > 0 && (
            <span className="text-stone-400">
              {" "}
              (
              {careerLevel.totalMonths < 12
                ? `${careerLevel.totalMonths} month${careerLevel.totalMonths !== 1 ? "s" : ""}`
                : (() => {
                    const yrs = Math.round(careerLevel.totalMonths / 12);
                    return `${yrs} year${yrs !== 1 ? "s" : ""}`;
                  })()}{" "}
              experience)
            </span>
          )}
        </p>

        <div className="space-y-6">
          {groups.map((group) => {
            const styles = TIER_STYLES[group.tier];
            const presentCount = group.items.filter((i) => i.present).length;

            if (group.items.length === 0) return null;

            return (
              <div key={group.tier}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={`text-sm font-semibold ${styles.header}`}>
                    {group.label} Sections
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}
                  >
                    {presentCount}/{group.items.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <div
                      key={item.name}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm ${
                        item.present ? styles.present : styles.missing
                      }`}
                    >
                      {item.present ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <XMarkIcon className="h-4 w-4" />
                      )}
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button className="w-full" onClick={onAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "Analyzing..." : "Continue to Analysis"}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
