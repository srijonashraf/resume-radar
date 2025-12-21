import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DocumentTextIcon,
  DocumentArrowUpIcon,
  ChartBarIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import AnalysisHistory from "../analytics/AnalysisHistory";
import AnalyticsDashboard from "../analytics/AnalyticsDashboard";
import CareerMap from "../editor/CareerMap";
import JobAnalysisPanel from "../editor/JobAnalysisPanel";
import AnalysisResults from "../analytics/AnalysisResults";
import { useStore } from "../../store/useStore";

const DashboardTabs = () => {
  const [activeTab, setActiveTab] = useState("analysis");
  const analysisResults = useStore((state) => state.analysisResults);
  const resumeData = useStore((state) => state.resumeData);
  const clearCurrentAnalysis = useStore((state) => state.clearCurrentAnalysis);

  const handleTabClick = (tabId: string) => {
    // Check if tab requires resume and if no resume is uploaded
    const tabsNeedingResume = ["analysis", "job-analysis", "career-map"];

    if (tabsNeedingResume.includes(tabId) && !resumeData) {
      toast.error("Please upload a resume first to access this feature", {
        description:
          "Upload a PDF resume from the main dashboard to get started",
      });
      return;
    }

    setActiveTab(tabId);
  };

  const tabs = [
    {
      id: "analysis",
      name: "Analysis",
      icon: DocumentTextIcon,
      disabled: !resumeData,
    },
    {
      id: "job-analysis",
      name: "Job Analysis & Tailor Resume",
      icon: BriefcaseIcon,
      disabled: !resumeData,
    },
    {
      id: "career-map",
      name: "Career Map",
      icon: AcademicCapIcon,
      disabled: !resumeData,
    },
    {
      id: "analytics",
      name: "Analytics",
      icon: ChartBarIcon,
      disabled: false,
    },
    {
      id: "history",
      name: "History",
      icon: ClockIcon,
      disabled: false,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "analysis":
        return analysisResults ? (
          <AnalysisResults analysisResults={analysisResults} />
        ) : (
          <div className="card p-8 text-center">
            <DocumentTextIcon className="h-16 w-16 mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-medium text-slate-400 mb-2">
              No Analysis Available
            </h3>
            <p className="text-slate-500">
              Upload and analyze your resume to see results here.
            </p>
          </div>
        );

      case "job-analysis":
        return <JobAnalysisPanel />;

      case "career-map":
        return <CareerMap />;

      case "analytics":
        return <AnalyticsDashboard />;

      case "history":
        return <AnalysisHistory />;

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Current Resume Context */}
      {resumeData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
              <DocumentArrowUpIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="text-slate-200 font-medium">Current Resume</h4>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full truncate max-w-[200px]">
                  {resumeData.file?.name || "Resume Uploaded"}
                </span>
              </div>
              <p className="text-slate-400 text-sm truncate">
                {resumeData.rawText
                  ? `${resumeData.rawText.substring(0, 100)}...`
                  : "Resume content preview"}
              </p>
            </div>
          </div>

          <button
            onClick={clearCurrentAnalysis}
            className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition-colors border border-red-600/20 hover:border-red-600/40 flex-shrink-0 w-full sm:w-auto"
          >
            Clear Resume
          </button>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-800 mb-6">
        <nav className="flex space-x-1 overflow-x-auto pb-0 custom-scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                disabled={isDisabled}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-t-lg transition-all relative group
                  ${
                    isActive
                      ? "bg-slate-800 text-white border-l border-r border-t border-slate-700"
                      : isDisabled
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }
                `}
                title={isDisabled ? "Upload a resume first" : undefined}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>

      {/* Info Message for Users without Resume */}
      {!resumeData && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="fixed top-20 right-6 max-w-sm hidden sm:block z-50"
        >
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-4 flex items-center gap-3 shadow-2xl">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-slate-200 text-sm font-medium">
                Ready to analyze your resume?
              </p>
              <p className="text-slate-400 text-xs">
                Upload a PDF resume from the main dashboard to access all
                features
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardTabs;
