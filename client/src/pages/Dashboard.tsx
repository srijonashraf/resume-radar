import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "../store/useStore";
import { extractResumeStream, analyzeResumeStream } from "../services/api";
import { ApiError } from "../services/errors";
import PdfUploader from "../components/upload/PdfUploader";
import SectionConfirmation from "../components/upload/SectionConfirmation";
import ResumeHealthCheck from "../components/upload/ResumeHealthCheck";
import AnalysisResults from "../components/analytics/AnalysisResults";
import DashboardTabs from "../components/dashboard/DashboardTabs";
import AppShell from "../components/app/AppShell";
import { fetchUsage } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Spinner } from "../components/ui";
import type { SSEExtractionProgress } from "../types";
import { NoSymbolIcon } from "@heroicons/react/24/outline";

const Dashboard = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  const resumeData = useStore((state) => state.resumeData);
  const setUsage = useStore((state) => state.setUsage);
  const usage = useStore((state) => state.usage);
  const extractionResult = useStore((state) => state.extractionResult);
  const extractionPhase = useStore((state) => state.extractionPhase);
  const setExtractionResult = useStore((state) => state.setExtractionResult);
  const setExtractionPhase = useStore((state) => state.setExtractionPhase);
  const extractionProgress = useStore((state) => state.extractionProgress);
  const extractionConfirmed = useStore((state) => state.extractionConfirmed);
  const setExtractionConfirmed = useStore((state) => state.setExtractionConfirmed);
  const setExtractionProgress = useStore((state) => state.setExtractionProgress);
  const clearCurrentAnalysis = useStore((state) => state.clearCurrentAnalysis);
  const analysisResult = useStore((state) => state.analysisResult);
  const analysisPhase = useStore((state) => state.analysisPhase);
  const analysisProgress = useStore((state) => state.analysisProgress);
  const setAnalysisResult = useStore((state) => state.setAnalysisResult);
  const setAnalysisPhase = useStore((state) => state.setAnalysisPhase);
  const setAnalysisProgress = useStore((state) => state.setAnalysisProgress);
  const jobDescription = useStore((state) => state.jobDescription);

  useEffect(() => {
    const loadUsage = async () => {
      try {
        const usageData = await fetchUsage();
        setUsage(usageData);
      } catch (err) {
        console.error("Failed to load usage:", err);
      }
    };

    if (user) {
      loadUsage();
    } else {
      setUsage(null);
    }
  }, [user, setUsage]);

  // Extraction flow: trigger when PDF file is set and no extraction in progress
  useEffect(() => {
    const runExtraction = async () => {
      if (
        !resumeData?.file ||
        extractionPhase !== "idle" ||
        extractionResult !== null
      ) return;

      setIsAnalyzing(true);
      setError(null);

      try {
        const result = await extractResumeStream(
          { file: resumeData.file },
          () => setExtractionPhase("validating"),
          (data: SSEExtractionProgress) => {
            setExtractionPhase("extracting");
            setExtractionProgress(data);
          },
        );

        setExtractionResult(result);
        setExtractionPhase("complete");
      } catch (err: unknown) {
        console.error("Extraction error:", err);
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Extraction failed. Please try again.");
        }
        setExtractionPhase("error");
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Only run extraction for PDF uploads (file set, no rawText)
    if (resumeData?.file && !resumeData.rawText) {
      runExtraction();
    }
  }, [
    resumeData,
    extractionPhase,
    extractionResult,
    setExtractionResult,
    setExtractionPhase,
    setExtractionProgress,
  ]);

  const handleNewAnalysis = () => {
    clearCurrentAnalysis();
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!extractionResult?.analysisId) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisPhase("computing_metrics");

    try {
      const result = await analyzeResumeStream(
        extractionResult.analysisId,
        jobDescription || null,
        {
          onComputingMetrics: () => setAnalysisPhase("computing_metrics"),
          onMetricsComplete: () => {},
          onAnalyzing: (data) => {
            setAnalysisPhase("analyzing");
            setAnalysisProgress(data);
          },
        },
      );

      setAnalysisResult(result);
      setAnalysisPhase("complete");
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Analysis failed. Please try again.");
      }
      setAnalysisPhase("error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-0">
        {!resumeData ? (
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <Card padding="lg">
                {usage && usage.remaining === 0 ? (
                  <div className="text-center py-6 space-y-4">
                    <NoSymbolIcon className="h-16 w-16 mx-auto text-red-400" />
                    <h2 className="text-2xl font-bold text-red-600">
                      Analysis Limit Reached
                    </h2>
                    <p className="text-stone-500 text-sm">
                      You have used all your analyses ({usage.used}/
                      {usage.limit})
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-stone-900 mb-4 text-center">
                      Upload Your Resume
                    </h2>
                    <p className="text-stone-500 mb-8 text-center max-w-2xl mx-auto text-lg">
                      Our AI will analyze your resume and provide personalized
                      feedback to help you improve it.
                    </p>
                    <PdfUploader />
                  </>
                )}
              </Card>
            </motion.div>

            {user && (
              <div className="mt-8">
                <DashboardTabs />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {error ? (
              <Card
                padding="lg"
                className="text-center border-red-200 bg-red-50"
              >
                <div className="text-4xl mb-4">!</div>
                <h2 className="text-xl font-bold text-red-600">
                  Analysis Error
                </h2>
                <p className="text-red-500 mt-2 mb-6">{error}</p>
                <button
                  className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                  onClick={handleNewAnalysis}
                >
                  Try Again
                </button>
              </Card>
            ) : extractionPhase === "validating" ? (
              <Card padding="xl" className="text-center">
                <Spinner size="lg" className="mb-6" />
                <h2 className="text-2xl font-bold text-stone-900 mb-2">
                  Validating your document...
                </h2>
                <p className="text-stone-500 text-lg">
                  Checking document structure and content.
                </p>
              </Card>
            ) : extractionPhase === "extracting" ? (
              <Card padding="xl" className="text-center">
                <Spinner size="lg" className="mb-6" />
                <h2 className="text-2xl font-bold text-stone-900 mb-2">
                  Extracting sections...
                </h2>
                {extractionProgress && (
                  <p className="text-stone-500 text-lg">
                    Processing: {extractionProgress.sectionName} (
                    {extractionProgress.index + 1}/{extractionProgress.total})
                  </p>
                )}
              </Card>
            ) : extractionResult && !extractionConfirmed ? (
              <SectionConfirmation
                sections={extractionResult.document.sections}
                onConfirm={() => setExtractionConfirmed(true)}
              />
            ) : extractionConfirmed && extractionResult && analysisPhase === "idle" ? (
              <ResumeHealthCheck
                profession={extractionResult.profession}
                careerLevel={extractionResult.careerLevel}
                sectionCoverage={extractionResult.sectionCoverage}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            ) : analysisPhase === "computing_metrics" ? (
              <Card padding="xl" className="text-center">
                <Spinner size="lg" className="mb-6" />
                <h2 className="text-2xl font-bold text-stone-900 mb-2">
                  Computing metrics...
                </h2>
                <p className="text-stone-500 text-lg">
                  Analyzing word counts, bullet quality, and formatting.
                </p>
              </Card>
            ) : analysisPhase === "analyzing" ? (
              <Card padding="xl" className="text-center">
                <Spinner size="lg" className="mb-6" />
                <h2 className="text-2xl font-bold text-stone-900 mb-2">
                  AI Analysis in Progress
                </h2>
                {analysisProgress && (
                  <p className="text-stone-500 text-lg">
                    Scoring: {analysisProgress.sectionTitle}
                  </p>
                )}
              </Card>
            ) : analysisPhase === "complete" && analysisResult && extractionResult ? (
              <div className="space-y-6">
                <AnalysisResults
                  result={analysisResult}
                  sectionTitles={
                    new Map(
                      extractionResult.document.sections.map((s) => [s.id, s.title]),
                    )
                  }
                />
                <div className="text-center">
                  <Button variant="secondary" onClick={handleNewAnalysis}>
                    Analyze Another Resume
                  </Button>
                </div>
              </div>
            ) : isAnalyzing ? (
              <Card padding="xl" className="text-center">
                <Spinner size="lg" className="mb-6" />
                <h2 className="text-2xl font-bold text-stone-900 mb-2">
                  Processing your resume...
                </h2>
                <p className="text-stone-500 text-lg">
                  Please wait while we analyze your document.
                </p>
              </Card>
            ) : (
              <DashboardTabs />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Dashboard;
