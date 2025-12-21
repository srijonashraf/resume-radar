import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, TailorResult, TailorSection } from "../../store/useStore";
import { toast } from "sonner";
import {
  BriefcaseIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { compareWithJobDescription, tailorResume } from "../../services/api";

const JobAnalysisPanel = () => {
  const jobDescription = useStore((state) => state.jobDescription);
  const [jobInput, setJobInput] = useState(jobDescription || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [jobMatchResults, setJobMatchResults] = useState<any>(null);
  const [tailorResults, setTailorResults] = useState<TailorResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"input" | "tailor">(
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "Low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  /**
   * Handles job description analysis against the uploaded resume
   */
  const handleJobAnalysis = async () => {
    if (!jobInput.trim()) {
      toast.error("Please enter a job description", {
        description: "Job description is required for analysis",
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      setTailorResults(null);

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

  /**
   * Handles tailoring the resume to match the job description
   */
  const handleTailorResume = async () => {
    try {
      setIsTailoring(true);

      const resumeData = useStore.getState().resumeData;
      if (!resumeData?.rawText) {
        toast.error("No resume data found", {
          description: "Please upload a resume first",
        });
        return;
      }

      const results = await tailorResume(resumeData.rawText, jobInput);
      setTailorResults(results);
      setActiveSection("tailor");
      setExpandedSections(new Set([0]));

      toast.success("Resume tailoring completed!", {
        description: "Section-by-section suggestions are ready",
      });
    } catch (error: any) {
      console.error("Tailor resume error:", error);
      toast.error("Failed to tailor resume", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsTailoring(false);
    }
  };

  /**
   * Toggles the expansion state of a tailoring section
   */
  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  /**
   * Copies text to clipboard with visual feedback
   */
  const copyToClipboard = async (text: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
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
              Job Analysis & Resume Tailoring
            </h3>
            <p className="text-slate-300">
              Compare your resume with job descriptions and get AI-powered
              tailoring suggestions
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveSection("input")}
          className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "input"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          <BriefcaseIcon className="h-4 w-4 mr-2" />
          Job Analysis
        </button>
        <button
          onClick={() => setActiveSection("tailor")}
          disabled={!tailorResults}
          className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "tailor"
              ? "bg-green-600 text-white shadow-lg shadow-green-500/20"
              : tailorResults
              ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
              : "bg-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Tailor Results
          {!tailorResults && (
            <span className="text-xs text-slate-500 ml-1">
              (
              {!jobMatchResults
                ? "Analyze Job Match first"
                : "Click Tailor Resume first"}
              )
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
                  disabled={isAnalyzing || isTailoring}
                />
              </div>

              <button
                onClick={handleJobAnalysis}
                disabled={isAnalyzing || !jobInput.trim()}
                className="w-full btn-primary"
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
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Analyze Job Match
                  </span>
                )}
              </button>

              {/* Job Match Results */}
              {jobMatchResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 mt-6"
                >
                  {/* Score Overview */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-semibold text-white">
                        Match Score
                      </h4>
                      <span
                        className={`text-4xl font-bold ${getMatchColor(
                          jobMatchResults.matchPercentage
                        )}`}
                      >
                        {jobMatchResults.matchPercentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${getMatchBgColor(
                          jobMatchResults.matchPercentage
                        )}`}
                        style={{
                          width: `${jobMatchResults.matchPercentage}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Match Level:</span>
                      <span
                        className={`font-medium ${getMatchColor(
                          jobMatchResults.matchPercentage
                        )}`}
                      >
                        {jobMatchResults.matchLevel}
                      </span>
                    </div>

                    {/* Keyword Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-700">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {jobMatchResults.keyword_analysis?.total_keywords ||
                            0}
                        </div>
                        <div className="text-xs text-slate-400">
                          Total Keywords
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {jobMatchResults.keyword_analysis?.matched_keywords ||
                            0}
                        </div>
                        <div className="text-xs text-slate-400">Matched</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">
                          {(jobMatchResults.keyword_analysis?.total_keywords ||
                            0) -
                            (jobMatchResults.keyword_analysis
                              ?.matched_keywords || 0)}
                        </div>
                        <div className="text-xs text-slate-400">Missing</div>
                      </div>
                    </div>
                  </div>

                  {/* Present Skills */}
                  {jobMatchResults.presentSkills && (
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                        Skills Found in Your Resume
                      </h4>
                      <div className="space-y-3">
                        {jobMatchResults.presentSkills.exact_matches?.length >
                          0 && (
                          <div>
                            <span className="text-xs text-green-400 font-medium">
                              Exact Matches
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {jobMatchResults.presentSkills.exact_matches.map(
                                (skill: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-md border border-green-500/30"
                                  >
                                    {skill}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {jobMatchResults.presentSkills.partial_matches?.length >
                          0 && (
                          <div>
                            <span className="text-xs text-yellow-400 font-medium">
                              Partial Matches
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {jobMatchResults.presentSkills.partial_matches.map(
                                (skill: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-md border border-yellow-500/30"
                                  >
                                    {skill}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {jobMatchResults.presentSkills.transferable_skills
                          ?.length > 0 && (
                          <div>
                            <span className="text-xs text-blue-400 font-medium">
                              Transferable Skills
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {jobMatchResults.presentSkills.transferable_skills.map(
                                (skill: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-md border border-blue-500/30"
                                  >
                                    {skill}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {jobMatchResults.missingSkills && (
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="text-lg font-semibold text-white mb-4">
                        Skills to Add
                      </h4>
                      <div className="space-y-3">
                        {jobMatchResults.missingSkills.critical?.length > 0 && (
                          <div>
                            <span className="text-xs text-red-400 font-medium">
                              Critical
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {jobMatchResults.missingSkills.critical.map(
                                (skill: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-md border border-red-500/30"
                                  >
                                    {skill}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {jobMatchResults.missingSkills.important?.length >
                          0 && (
                          <div>
                            <span className="text-xs text-orange-400 font-medium">
                              Important
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {jobMatchResults.missingSkills.important.map(
                                (skill: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-md border border-orange-500/30"
                                  >
                                    {skill}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        {jobMatchResults.missingSkills.nice_to_have?.length >
                          0 && (
                          <div>
                            <span className="text-xs text-slate-400 font-medium">
                              Nice to Have
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {jobMatchResults.missingSkills.nice_to_have.map(
                                (skill: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-md border border-slate-500/30"
                                  >
                                    {skill}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {jobMatchResults.recommendation && (
                    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/20">
                      <h4 className="text-sm font-semibold text-blue-400 mb-2">
                        AI Recommendation
                      </h4>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {jobMatchResults.recommendation}
                      </p>
                    </div>
                  )}

                  {/* Tailor Resume Button */}
                  <button
                    onClick={handleTailorResume}
                    disabled={isTailoring}
                    className="w-full btn-primary bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20"
                  >
                    {isTailoring ? (
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
                        Tailoring Your Resume...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <SparklesIcon className="h-4 w-4 mr-2" />✨ Tailor My
                        Resume for This Job
                      </span>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tailor Results Section */}
        {activeSection === "tailor" && tailorResults && (
          <motion.div
            key="tailor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* ATS Score Improvement */}
            <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-500/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">
                Estimated ATS Score Improvement
              </h4>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-400">
                    {tailorResults.ats_improvement.before_score}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Before</div>
                </div>
                <ArrowRightIcon className="h-6 w-6 text-green-400" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {tailorResults.ats_improvement.after_score}%
                  </div>
                  <div className="text-xs text-green-400/70 mt-1">After</div>
                </div>
                <div className="ml-4 px-3 py-1 bg-green-500/20 rounded-full">
                  <span className="text-sm font-medium text-green-400">
                    +
                    {tailorResults.ats_improvement.after_score -
                      tailorResults.ats_improvement.before_score}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Strategy */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">
                Tailoring Strategy
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                {tailorResults.overall_strategy}
              </p>
            </div>

            {/* Keywords Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm font-semibold text-green-400 mb-2">
                  Keywords Already Present
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {tailorResults.keywords_already_present.map(
                    (keyword, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-md"
                      >
                        {keyword}
                      </span>
                    )
                  )}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                  Keywords to Add
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {tailorResults.keywords_to_add.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-md"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Section-by-Section Rewrites */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-white">
                Section-by-Section Tailoring
              </h4>
              {tailorResults.sections.map(
                (section: TailorSection, index: number) => (
                  <div
                    key={index}
                    className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
                  >
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(index)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="h-5 w-5 text-blue-400" />
                        <span className="font-medium text-white">
                          {section.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-md border ${getPriorityColor(
                            section.priority
                          )}`}
                        >
                          {section.priority} Priority
                        </span>
                      </div>
                      {expandedSections.has(index) ? (
                        <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedSections.has(index) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-700"
                        >
                          <div className="p-4 space-y-4">
                            {/* Before */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-red-400 uppercase">
                                  Before
                                </span>
                              </div>
                              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                                <p className="text-slate-400 text-sm whitespace-pre-wrap">
                                  {section.before}
                                </p>
                              </div>
                            </div>

                            {/* After */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-green-400 uppercase">
                                  After (Tailored)
                                </span>
                                <button
                                  onClick={() =>
                                    copyToClipboard(section.after, index)
                                  }
                                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  {copiedIndex === index ? (
                                    <>
                                      <CheckCircleIcon className="h-4 w-4" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <ClipboardDocumentIcon className="h-4 w-4" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/20">
                                <p className="text-slate-200 text-sm whitespace-pre-wrap">
                                  {section.after}
                                </p>
                              </div>
                            </div>

                            {/* Changes Made */}
                            {section.changes.length > 0 && (
                              <div className="pt-3 border-t border-slate-700">
                                <span className="text-xs font-medium text-slate-400 mb-2 block">
                                  Changes Made:
                                </span>
                                <ul className="list-disc list-inside space-y-1">
                                  {section.changes.map((change, i) => (
                                    <li
                                      key={i}
                                      className="text-xs text-slate-400"
                                    >
                                      {change}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Keywords Added */}
                            {section.keywords_added.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-700">
                                <span className="text-xs text-slate-500 mr-2">
                                  Keywords added:
                                </span>
                                {section.keywords_added.map((keyword, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-md"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobAnalysisPanel;
