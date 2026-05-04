import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../ui/Card";
import { Tabs } from "../ui";
import {
  DocumentArrowUpIcon,
  InformationCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useStore } from "../../store/useStore";
import { useAuth } from "../../hooks/useAuth";
import Button from "../ui/Button";
import AnalysisHistory from "./AnalysisHistory";

const DashboardTabs = () => {
  const [activeTab, setActiveTab] = useState("history");
  const resumeData = useStore((state) => state.resumeData);
  const clearCurrentAnalysis = useStore(
    (state) => state.clearCurrentAnalysis
  );
  const activeEditorTab = useStore((state) => state.activeEditorTab);
  const setActiveEditorTab = useStore((state) => state.setActiveEditorTab);
  const { user } = useAuth();

  useEffect(() => {
    if (activeEditorTab) {
      setActiveTab(activeEditorTab);
      setActiveEditorTab(null);
    }
  }, [activeEditorTab, setActiveEditorTab]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const tabs = [
    {
      id: "history",
      name: "History",
      icon: ClockIcon,
      disabled: false,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "history":
        return user ? (
          <AnalysisHistory />
        ) : (
          <Card padding="lg" className="text-center">
            <ClockIcon className="h-16 w-16 mx-auto text-stone-300 mb-4" />
            <h3 className="text-xl font-medium text-stone-600 mb-2">
              Sign in to Save History
            </h3>
            <p className="text-stone-400">
              Your analysis history will be saved and accessible across sessions
              when you sign in with Google.
            </p>
          </Card>
        );
      default:
        return (
          <Card padding="lg" className="text-center">
            <DocumentArrowUpIcon className="h-16 w-16 mx-auto text-stone-300 mb-4" />
            <h3 className="text-xl font-medium text-stone-600 mb-2">
              Coming Soon
            </h3>
            <p className="text-stone-400">
              More features will be available soon.
            </p>
          </Card>
        );
    }
  };

  return (
    <div>
      {resumeData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 p-4 bg-white border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
              <DocumentArrowUpIcon className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="text-stone-800 font-medium">Current Resume</h4>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs rounded-full truncate max-w-[200px] border border-emerald-200">
                  {resumeData.file?.name || "Resume Uploaded"}
                </span>
              </div>
              <p className="text-stone-400 text-sm truncate">
                {resumeData.rawText
                  ? `${resumeData.rawText.substring(0, 100)}...`
                  : "Resume content preview"}
              </p>
            </div>
          </div>

          <Button
            variant="danger-outline"
            size="sm"
            onClick={clearCurrentAnalysis}
            className="flex-shrink-0 w-full sm:w-auto"
          >
            Clear Resume
          </Button>
        </motion.div>
      )}

      {/* Pill-style Tab Navigation */}
      <div className="mb-6">
        <Tabs
          variant="pill"
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: (
              <>
                <tab.icon className="h-4 w-4 mr-1.5" />
                {tab.name}
              </>
            ),
            disabled: tab.disabled,
          }))}
          activeTab={activeTab}
          onTabChange={handleTabClick}
        />
      </div>

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

      {!resumeData && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="fixed top-20 right-6 max-w-sm hidden sm:block z-50"
        >
          <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-4 flex items-center gap-3 shadow-lg">
            <InformationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-stone-800 text-sm font-medium">
                Ready to analyze your resume?
              </p>
              <p className="text-stone-400 text-xs">
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
