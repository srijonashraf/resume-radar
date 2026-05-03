import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { formatScore } from "../../utils/formatScore";
import type { AtsReport } from "@resumetra/shared";

interface AtsKeywordReportProps {
  report: AtsReport;
}

export default function AtsKeywordReport({ report }: AtsKeywordReportProps) {
  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-stone-900">
          ATS Keyword Report
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-500">Match Score</span>
          <span
            className={`text-2xl font-bold ${
              report.matchScore >= 70
                ? "text-emerald-600"
                : report.matchScore >= 40
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {formatScore(report.matchScore)}%
          </span>
        </div>
      </div>

      {report.matchedKeywords.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-emerald-700 mb-2">
            Matched Keywords ({report.matchedKeywords.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {report.matchedKeywords.map((kw) => (
              <Badge key={kw} variant="success">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {report.partialMatches.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-amber-700 mb-2">
            Partial Matches ({report.partialMatches.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {report.partialMatches.map((pm, i) => (
              <Badge key={i} variant="warning">
                {pm.resumeKeyword} ≈ {pm.jdKeyword} ({Math.round(pm.similarity * 100)}%)
              </Badge>
            ))}
          </div>
        </div>
      )}

      {report.missingKeywords.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-red-700 mb-2">
            Missing Keywords ({report.missingKeywords.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {report.missingKeywords.map((kw) => (
              <Badge key={kw} variant="danger">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {Object.keys(report.sectionCoverage).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-stone-700 mb-2">
            Section Coverage
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(report.sectionCoverage).map(([section, present]) => (
              <Badge key={section} variant={present ? "success" : "danger"}>
                {section}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
