import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../store/useStore";
import { toast } from "sonner";
import {
  BriefcaseIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { compareWithJobDescription } from "../../services/api";
import { smartRewrite } from "../../services/api";

const JobAnalysisPanel = () => {
  const jobDescription = useStore((state) => state.jobDescription);
  const [jobInput, setJobInput] = useState(jobDescription || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobMatchResults, setJobMatchResults] = useState<any>(null);
  const [selectedText, setSelectedText] = useState("");
  const [variations, setVariations] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<"input" | "editor">(
    "input"
  );

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getMatchBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const handleJobAnalysis = async () => {
    if (!jobInput.trim()) {
      toast.error("Please enter a job description", {
        description: "Job description is required for analysis",
      });
      return;
    }

    try {
      setIsAnalyzing(true);

      // Get resume data from store
      const resumeData = useStore.getState().resumeData;
      if (!resumeData?.rawText) {
        toast.error("No resume data found", {
          description: "Please upload a resume first",
        });
        return;
      }

      const results = await compareWithJobDescription(
        resumeData.rawText,
        jobInput
      );

      setJobMatchResults(results);
      // Update job description in store
      useStore.getState().setJobDescription(jobInput);

      toast.success("Job analysis completed!", {
        description: "Your resume has been compared with the job description",
      });
    } catch (error: any) {
      console.error("Job match analysis error:", error);
      toast.error("Failed to analyze job description", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRewrite = async () => {
    if (!selectedText.trim()) {
      toast.error("Please select text to rewrite", {
        description: "Select some text from your resume to improve it",
      });
      return;
    }

    if (!jobInput.trim()) {
      toast.error("Please enter a job description first", {
        description: "Job description is required for smart rewriting",
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      const result = await smartRewrite(selectedText, jobInput);

      if (result && result.variations && result.variations.length > 0) {
        setVariations(result.variations);
        toast.success("Smart rewrite completed!", {
          description: "Enhanced suggestions generated for your resume text",
        });
      }
    } catch (error: any) {
      console.error("Smart rewrite error:", error);
      toast.error("Failed to rewrite text", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <BriefcaseIcon className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Job Analysis & Smart Editor
            </h3>
            <p className="text-slate-300">
              Compare your resume with job descriptions and use AI-powered text
              enhancement
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveSection("input")}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "input"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          <BriefcaseIcon className="h-4 w-4 mr-2" />
          Job Analysis
        </button>
        <button
          onClick={() => setActiveSection("editor")}
          disabled={!jobMatchResults}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "editor"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
              : jobMatchResults
              ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          <SparklesIcon className="h-4 w-4 mr-2" />
          Smart Editor
          {!jobMatchResults && (
            <span className="text-xs text-slate-500 ml-1">
              (Complete analysis first)
            </span>
          )}
        </button>
      </div>

      {/* Job Description Input Section */}
      <AnimatePresence mode="wait">
        {activeSection === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Job Description
                </label>
                <textarea
                  value={jobInput}
                  onChange={(e) => setJobInput(e.target.value)}
                  className="input-field h-32 resize-none"
                  placeholder="Paste the job description here to compare with your resume..."
                  disabled={isAnalyzing}
                />
              </div>

              <button
                onClick={handleJobAnalysis}
                disabled={isAnalyzing || !jobInput.trim()}
                className="w-full btn-primary bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 10a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 10a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <BriefcaseIcon className="h-4 w-4 mr-2" />
                    Analyze Resume vs Job
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section */}
      {jobMatchResults && activeSection === "input" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-6">
            {/* Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Overall Match</span>
                  <span
                    className={`text-2xl font-bold ${getMatchColor(
                      jobMatchResults.matchScore
                    )}`}
                  >
                    {jobMatchResults.matchScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getMatchBgColor(
                      jobMatchResults.matchScore
                    )}`}
                    style={{ width: `${jobMatchResults.matchScore}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Skills Match</span>
                  <span
                    className={`text-2xl font-bold ${getMatchColor(
                      jobMatchResults.skillsScore
                    )}`}
                  >
                    {jobMatchResults.skillsScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getMatchBgColor(
                      jobMatchResults.skillsScore
                    )}`}
                    style={{ width: `${jobMatchResults.skillsScore}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">
                    Experience Match
                  </span>
                  <span
                    className={`text-2xl font-bold ${getMatchColor(
                      jobMatchResults.experienceScore
                    )}`}
                  >
                    {jobMatchResults.experienceScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getMatchBgColor(
                      jobMatchResults.experienceScore
                    )}`}
                    style={{ width: `${jobMatchResults.experienceScore}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Analysis Details */}
            <div className="card p-6">
              <h4 className="text-lg font-semibold text-white mb-4">
                Analysis Results
              </h4>
              {jobMatchResults.analysis && (
                <div className="space-y-4">
                  {jobMatchResults.analysis.strengths &&
                    jobMatchResults.analysis.strengths.length > 0 && (
                      <div>
                        <h5 className="text-green-400 font-medium mb-2">
                          Strengths
                        </h5>
                        <ul className="space-y-2">
                          {jobMatchResults.analysis.strengths.map(
                            (item: any, index: number) => (
                              <li
                                key={index}
                                className="flex items-start p-3 bg-green-900/20 border border-green-800/30 rounded-lg"
                              >
                                <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                                <span className="text-green-200 text-sm">
                                  {item}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {jobMatchResults.analysis.gaps &&
                    jobMatchResults.analysis.gaps.length > 0 && (
                      <div>
                        <h5 className="text-orange-400 font-medium mb-2">
                          Gaps to Address
                        </h5>
                        <ul className="space-y-2">
                          {jobMatchResults.analysis.gaps.map(
                            (item: any, index: number) => (
                              <li
                                key={index}
                                className="flex items-start p-3 bg-orange-900/20 border border-orange-800/30 rounded-lg"
                              >
                                <ClipboardDocumentIcon className="h-5 w-5 text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
                                <span className="text-orange-200 text-sm">
                                  {item}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {jobMatchResults.analysis.recommendations && (
                    <div>
                      <h5 className="text-blue-400 font-medium mb-2">
                        Recommendations
                      </h5>
                      <ul className="space-y-2">
                        {jobMatchResults.analysis.recommendations.map(
                          (item: any, index: number) => (
                            <li
                              key={index}
                              className="flex items-start p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg"
                            >
                              <SparklesIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                              <span className="text-blue-200 text-sm">
                                {item}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Smart Editor Section */}
      {jobMatchResults && activeSection === "editor" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Text to Enhance
              </label>
              <textarea
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                className="input-field h-32 resize-none custom-scrollbar"
                placeholder="Select text from your resume to enhance it for this job..."
              />
            </div>

            <button
              onClick={handleRewrite}
              disabled={isAnalyzing || !selectedText.trim()}
              className="w-full btn-primary bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20"
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 10a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 10a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                  Generating Suggestions...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Generate AI Suggestions
                </span>
              )}
            </button>

            {/* Variations */}
            {variations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-white mb-4">
                  AI-Powered Variations
                </h4>
                <div className="space-y-3">
                  {variations.map((variation: any, index: number) => (
                    <div
                      key={index}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-slate-400">
                          Option {index + 1}
                        </span>
                        <button
                          onClick={() => copyToClipboard(variation)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                          title="Copy to clipboard"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {variation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default JobAnalysisPanel;
