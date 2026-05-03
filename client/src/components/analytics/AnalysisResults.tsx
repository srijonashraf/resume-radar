import { motion } from "framer-motion";
import type { AnalysisResultV2, FormattingIssue } from "@resumetra/shared";
import Card from "../ui/Card";
import ScoreCard from "../ui/ScoreCard";
import Badge from "../ui/Badge";
import SectionScoreCard from "./SectionScoreCard";
import AtsKeywordReport from "./AtsKeywordReport";
import AnalysisRadarChart from "./AnalysisRadarChart";

interface AnalysisResultsProps {
  result: AnalysisResultV2;
  sectionTitles: Map<string, string>;
}

const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
const severityVariant: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export default function AnalysisResults({
  result,
  sectionTitles,
}: AnalysisResultsProps) {
  const { deterministicMetrics: m, readability, sectionScores, atsReport } = result;

  const allIssues = sectionScores.flatMap((s) => s.issues);
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const avgContent =
    sectionScores.length > 0
      ? sectionScores.reduce((sum, s) => sum + s.contentScore, 0) / sectionScores.length
      : 0;
  const avgImpact =
    sectionScores.length > 0
      ? sectionScores.reduce((sum, s) => sum + s.impactScore, 0) / sectionScores.length
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Score Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ScoreCard title="Readability" score={readability.score} />
        <ScoreCard title="Avg Content" score={Math.round(avgContent * 10) / 10} />
        <ScoreCard title="Avg Impact" score={Math.round(avgImpact * 10) / 10} />
        {atsReport && (
          <ScoreCard
            title="ATS Match"
            score={atsReport.matchScore / 10}
            maxScore={10}
          />
        )}
      </div>

      {/* Metrics Summary */}
      <Card padding="lg">
        <h3 className="text-lg font-bold text-stone-900 mb-4">
          Resume Metrics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Metric label="Words" value={m.wordCount} />
          <Metric label="Bullets" value={m.bulletCount} />
          <Metric label="Avg Bullet Words" value={m.avgBulletWordCount} />
          <Metric label="Action Verb Bullets" value={m.bulletsWithActionVerb} />
          <Metric label="Metric Bullets" value={m.bulletsWithMetric} />
          <Metric
            label="Experience"
            value={
              m.totalExperienceMonths < 12
                ? `${m.totalExperienceMonths}mo`
                : `${Math.round(m.totalExperienceMonths / 12)}y`
            }
          />
        </div>

        {m.formattingIssues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <h4 className="text-sm font-semibold text-stone-700 mb-2">
              Formatting Issues
            </h4>
            <div className="space-y-2">
              {m.formattingIssues
                .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
                .map((issue: FormattingIssue, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Badge variant={severityVariant[issue.severity]}>
                      {issue.severity}
                    </Badge>
                    <span className="text-stone-600">
                      {issue.description}
                      {issue.location && (
                        <span className="text-stone-400"> — {issue.location}</span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* Radar Chart */}
      <AnalysisRadarChart result={result} />

      {/* Section Scores */}
      <div>
        <h3 className="text-lg font-bold text-stone-900 mb-4">
          Section Scores
        </h3>
        <div className="space-y-4">
          {sectionScores.map((s) => (
            <SectionScoreCard
              key={s.sectionId}
              section={s}
              sectionTitle={sectionTitles.get(s.sectionId) ?? s.sectionId}
            />
          ))}
        </div>
      </div>

      {/* ATS Report */}
      {atsReport && <AtsKeywordReport report={atsReport} />}

      {/* All Issues (consolidated) */}
      {allIssues.length > 0 && (
        <Card padding="lg">
          <h3 className="text-lg font-bold text-stone-900 mb-4">
            All Issues ({allIssues.length})
          </h3>
          <div className="space-y-3">
            {allIssues.map((issue, i) => (
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
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-stone-500 text-xs">{label}</p>
      <p className="text-stone-900 font-semibold">{value}</p>
    </div>
  );
}
