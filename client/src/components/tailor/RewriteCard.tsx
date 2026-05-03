import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ClassificationBadge from "./ClassificationBadge";
import RewriteDiff from "./RewriteDiff";
import LearningPathCard from "./LearningPathCard";
import type { Rewrite } from "@resumetra/shared";

interface RewriteCardProps {
  rewrite: Rewrite;
  sectionTitle: string;
  onAccept: (rewriteId: string) => void;
  onReject: (rewriteId: string) => void;
  learningPath?: {
    courses: string[];
    projects: string[];
    timeline: string;
    targetBullet: string;
  };
}

export default function RewriteCard({
  rewrite,
  sectionTitle,
  onAccept,
  onReject,
  learningPath,
}: RewriteCardProps) {
  const isDecided = rewrite.accepted !== null;

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-500">{sectionTitle}</span>
          <ClassificationBadge classification={rewrite.gapClassification} />
        </div>
        {isDecided && (
          <Badge variant={rewrite.accepted ? "success" : "danger"}>
            {rewrite.accepted ? "Accepted" : "Rejected"}
          </Badge>
        )}
      </div>

      <RewriteDiff before={rewrite.before} after={rewrite.after} />

      <p className="text-sm text-stone-600 mt-3">{rewrite.rationale}</p>

      {rewrite.keywordsAdded.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {rewrite.keywordsAdded.map((kw) => (
            <Badge key={kw} variant="neutral">{kw}</Badge>
          ))}
        </div>
      )}

      {rewrite.gapClassification === "MISSING" && learningPath && (
        <div className="mt-4">
          <LearningPathCard {...learningPath} />
        </div>
      )}

      {!isDecided && (
        <div className="flex gap-2 mt-4">
          <button
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            onClick={() => onAccept(rewrite.id)}
          >
            Accept
          </button>
          <button
            className="px-4 py-2 text-sm font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            onClick={() => onReject(rewrite.id)}
          >
            Reject
          </button>
        </div>
      )}
    </Card>
  );
}
