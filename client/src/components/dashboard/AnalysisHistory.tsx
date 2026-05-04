import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../../store/useStore";
import {
  fetchHistory,
  fetchHistoryDetail,
  deleteHistoryEntry,
} from "../../services/api";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { Spinner } from "../ui";
import {
  ClockIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { HistoryDetail } from "../../services/api";

const AnalysisHistory = () => {
  const historyList = useStore((s) => s.historyList);
  const historyTotal = useStore((s) => s.historyTotal);
  const historyPage = useStore((s) => s.historyPage);
  const historyLoading = useStore((s) => s.historyLoading);
  const setHistoryList = useStore((s) => s.setHistoryList);
  const setHistoryLoading = useStore((s) => s.setHistoryLoading);
  const removeHistoryEntry = useStore((s) => s.removeHistoryEntry);

  const setExtractionResult = useStore((s) => s.setExtractionResult);
  const setExtractionPhase = useStore((s) => s.setExtractionPhase);
  const setExtractionConfirmed = useStore((s) => s.setExtractionConfirmed);
  const setAnalysisResult = useStore((s) => s.setAnalysisResult);
  const setAnalysisPhase = useStore((s) => s.setAnalysisPhase);
  const setTailorRewrites = useStore((s) => s.setTailorRewrites);
  const setTailorStats = useStore((s) => s.setTailorStats);
  const setTailorPhase = useStore((s) => s.setTailorPhase);

  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadHistory = async (page: number) => {
    setHistoryLoading(true);
    try {
      const result = await fetchHistory(page);
      setHistoryList(result.items, result.total, result.page);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, []);

  const handleLoadEntry = async (id: string) => {
    setLoadingDetail(id);
    try {
      const detail: HistoryDetail = await fetchHistoryDetail(id);

      if (detail.document) {
        setExtractionResult({
          document: detail.document,
          profession: { professionId: "generic", confidence: 0.5 },
          careerLevel: {
            levelId: "all_levels",
            label: "All Levels",
            totalMonths: 0,
          },
          sectionCoverage: { required: [], recommended: [], optional: [] },
          analysisId: id,
        });
        setExtractionPhase("complete");
        setExtractionConfirmed(true);
      }

      if (detail.analysisResults) {
        setAnalysisResult(detail.analysisResults as import("@resumetra/shared").AnalysisResultV2);
        setAnalysisPhase("complete");
      }

      if (detail.rewrites && detail.rewrites.length > 0) {
        setTailorRewrites(detail.rewrites);
        const rewritten = detail.rewrites.filter(
          (r) => r.gapClassification === "REWRITTEN",
        ).length;
        const reframed = detail.rewrites.filter(
          (r) => r.gapClassification === "REFRAMED",
        ).length;
        const missing = detail.rewrites.filter(
          (r) => r.gapClassification === "MISSING",
        ).length;
        setTailorStats({ rewritten, reframed, missing, total: detail.rewrites.length });
        setTailorPhase("complete");
      }
    } catch (err) {
      console.error("Failed to load history detail:", err);
    } finally {
      setLoadingDetail(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteHistoryEntry(id);
      removeHistoryEntry(id);
    } catch (err) {
      console.error("Failed to delete history entry:", err);
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(historyTotal / 10);

  if (historyLoading && historyList.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <Spinner size="lg" className="mb-4" />
        <p className="text-stone-500">Loading history...</p>
      </Card>
    );
  }

  if (historyList.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <DocumentTextIcon className="h-16 w-16 mx-auto text-stone-300 mb-4" />
        <h3 className="text-xl font-medium text-stone-600 mb-2">
          No Analysis History
        </h3>
        <p className="text-stone-400">
          Your analysis history will appear here after you analyze resumes.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {historyList.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
          >
            <Card padding="md" className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-stone-800 font-medium truncate">
                      {item.originalFileName || "Text Resume"}
                    </h4>
                    {item.hasTailoring && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 text-xs rounded-full border border-violet-200">
                        <SparklesIcon className="h-3 w-3" />
                        Tailored
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-stone-400 text-sm">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span>
                      {item.sectionCount}{" "}
                      {item.sectionCount === 1 ? "section" : "sections"}
                    </span>
                    <span className="uppercase text-xs px-1.5 py-0.5 bg-stone-100 rounded">
                      {item.sourceType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLoadEntry(item.id)}
                    disabled={loadingDetail === item.id}
                  >
                    {loadingDetail === item.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                    )}
                    Load
                  </Button>
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                  >
                    {deleting === item.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={historyPage <= 1}
            onClick={() => loadHistory(historyPage - 1)}
          >
            Previous
          </Button>
          <span className="text-stone-500 text-sm">
            Page {historyPage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={historyPage >= totalPages}
            onClick={() => loadHistory(historyPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;
