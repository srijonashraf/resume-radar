import { motion } from "framer-motion";
import Card from "../ui/Card";
import { Spinner } from "../ui";
import RewriteManager from "./RewriteManager";
import type { TailorPhase, Rewrite } from "@resumetra/shared";

interface TailorResultsProps {
  tailorPhase: TailorPhase;
  tailorProgress: {
    sectionId: string;
    sectionTitle: string;
    index: number;
    total: number;
  } | null;
  rewrites: Rewrite[];
  stats: {
    rewritten: number;
    reframed: number;
    missing: number;
    total: number;
  } | null;
  sectionTitles: Map<string, string>;
  onAccept: (rewriteId: string) => void;
  onReject: (rewriteId: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export default function TailorResults({
  tailorPhase,
  tailorProgress,
  rewrites,
  stats,
  sectionTitles,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
}: TailorResultsProps) {
  if (tailorPhase === "idle") return null;

  // Loading states
  if (tailorPhase === "classifying" || tailorPhase === "tailoring") {
    return (
      <Card padding="xl" className="text-center">
        <Spinner size="lg" className="mb-6" />
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          Tailoring in Progress
        </h2>
        {tailorProgress && (
          <p className="text-stone-500 text-lg">
            Processing: {tailorProgress.sectionTitle} (
            {tailorProgress.index + 1}/{tailorProgress.total})
          </p>
        )}
      </Card>
    );
  }

  // Error state
  if (tailorPhase === "error") {
    return (
      <Card padding="lg" className="text-center border-red-200 bg-red-50">
        <h3 className="text-xl font-bold text-red-600 mb-2">
          Tailoring Failed
        </h3>
        <p className="text-red-500">
          An error occurred during tailoring. Please try again.
        </p>
      </Card>
    );
  }

  // Complete state
  if (stats && stats.total === 0) {
    return (
      <Card padding="lg" className="text-center">
        <h3 className="text-lg font-semibold text-stone-700 mb-2">
          No rewrites needed
        </h3>
        <p className="text-stone-500">
          Your resume is well-aligned with this job description.
        </p>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <h3 className="text-lg font-bold text-stone-900">
        Resume Tailoring Results
      </h3>

      <RewriteManager
        rewrites={rewrites}
        stats={stats!}
        onAccept={onAccept}
        onReject={onReject}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
        sectionTitles={sectionTitles}
      />
    </motion.div>
  );
}
