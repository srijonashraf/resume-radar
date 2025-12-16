import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, AnalysisHistoryEntry } from "../../store/useStore";
import {
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

import { deleteHistoryEntry } from "../../services/api";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

const AnalysisHistory = () => {
  const analysisHistory = useStore((state) => state.analysisHistory);
  const removeFromHistory = useStore((state) => state.removeFromHistory);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();

  // Show login prompt for non-authenticated users
  if (isLoggedIn === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card p-6"
      >
        <div className="text-center py-12">
          <LockClosedIcon className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-medium text-slate-400 mb-2">
            Login Required
          </h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Sign in to access your analysis history and track your resume
            improvements over time.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Login to View History
          </Link>
        </div>
      </motion.div>
    );
  }

  // Show empty state for authenticated users with no history
  if (analysisHistory.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card p-6"
      >
        <div className="text-center py-12">
          <ClockIcon className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-medium text-slate-400 mb-2">
            No History Available
          </h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Your previous resume analyses will appear here. Start analyzing to
            build your history.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Analyze Your First Resume
          </button>
        </div>
      </motion.div>
    );
  }

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to remove this analysis from history?"
      )
    ) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await deleteHistoryEntry(id);
        }
        removeFromHistory(id);
      } catch (error) {
        console.error("Failed to delete history:", error);
        alert("Failed to delete history entry.");
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-6"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Analysis History</h2>

      <div className="space-y-4">
        {analysisHistory.map((entry: AnalysisHistoryEntry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="border border-slate-800 rounded-xl p-4 hover:bg-slate-900/50 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DocumentTextIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-200 text-lg">
                    Resume Analysis
                  </h3>
                  <div className="flex items-center text-sm text-slate-500 mt-1">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>
                      {new Date(entry.date).toLocaleDateString()} at{" "}
                      {new Date(entry.date).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleExpand(entry.id)}
                  className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer p-2 hover:bg-blue-500/10 rounded-lg"
                  title="View details"
                >
                  {expandedId === entry.id ? (
                    <ChevronUpIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors cursor-pointer p-2 hover:bg-red-500/10 rounded-lg"
                  title="Remove from history"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-800/50 pt-4">
              <div className="text-sm">
                <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">
                  Skills
                </span>
                <span className="font-bold text-blue-400">
                  {entry.analysisResults.scores.technicalSkills}/10
                </span>
              </div>
              <div className="text-sm">
                <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">
                  Experience
                </span>
                <span className="font-bold text-purple-400">
                  {entry.analysisResults.scores.experience}/10
                </span>
              </div>
              <div className="text-sm">
                <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1">
                  Format
                </span>
                <span className="font-bold text-green-400">
                  {entry.analysisResults.scores.presentation}/10
                </span>
              </div>
            </div>

            <AnimatePresence>
              {expandedId === entry.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-4">
                    {/* Missing Skills */}
                    {entry.analysisResults.missingSkills &&
                      entry.analysisResults.missingSkills.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center">
                            <XCircleIcon className="h-4 w-4 text-red-400 mr-2" />
                            Missing Skills
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {entry.analysisResults.missingSkills.map(
                              (skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-red-900/20 border border-red-900/30 rounded-full text-xs text-red-300"
                                >
                                  {skill}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Suggestions */}
                    {entry.analysisResults.recommendations && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center">
                          <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2" />
                          Improvement Suggestions
                        </h4>

                        {/* Immediate suggestions */}
                        {entry.analysisResults.recommendations.immediate &&
                          entry.analysisResults.recommendations.immediate
                            .length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-xs font-semibold text-orange-400 mb-1">
                                Immediate Actions
                              </h5>
                              <ul className="space-y-1">
                                {entry.analysisResults.recommendations.immediate.map(
                                  (suggestion, idx) => (
                                    <li
                                      key={idx}
                                      className="text-sm text-slate-400 pl-4 border-l-2 border-green-500/30"
                                    >
                                      {suggestion}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        {/* Short-term suggestions */}
                        {entry.analysisResults.recommendations.shortTerm &&
                          entry.analysisResults.recommendations.shortTerm
                            .length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-xs font-semibold text-blue-400 mb-1">
                                Short-term Goals
                              </h5>
                              <ul className="space-y-1">
                                {entry.analysisResults.recommendations.shortTerm.map(
                                  (suggestion, idx) => (
                                    <li
                                      key={idx}
                                      className="text-sm text-slate-400 pl-4 border-l-2 border-blue-500/30"
                                    >
                                      {suggestion}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AnalysisHistory;
