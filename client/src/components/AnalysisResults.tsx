import { motion } from "framer-motion";
import { AnalysisResult } from "../state/useStore";
import AnalysisRadarChart from "./AnalysisRadarChart";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface AnalysisResultsProps {
  analysisResults: AnalysisResult;
}

const AnalysisResults = ({ analysisResults }: AnalysisResultsProps) => {
  const { suggestions, missingSkills } = analysisResults;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-6"
    >
      <h2 className="text-2xl font-bold text-white mb-6">
        Resume Analysis Results
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Radar Chart */}
        <div className="bg-slate-950/50 rounded-xl p-4 items-center flex flex-col justify-center border border-slate-800">
          <h3 className="text-lg font-semibold text-slate-300 mb-4">
            Score Breakdown
          </h3>
          <AnalysisRadarChart analysisResults={analysisResults} />
        </div>

        {/* Suggestions and Missing Skills */}
        <div>
          {/* Suggestions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-300 mb-3">
              Improvement Suggestions
            </h3>
            <ul className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                  className="flex items-start p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300 text-sm leading-relaxed">
                    {suggestion}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Missing Skills */}
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-3">
              Missing Skills
            </h3>
            <ul className="space-y-2">
              {missingSkills.map((skill, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                  className="flex items-center p-2 bg-red-900/10 rounded-lg border border-red-900/20"
                >
                  <XCircleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                  <span className="text-red-200 text-sm">{skill}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AnalysisResults;
