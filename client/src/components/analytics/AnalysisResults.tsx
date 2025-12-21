import { motion } from "framer-motion";
import { AnalysisResult } from "../../store/useStore";
import AnalysisRadarChart from "./AnalysisRadarChart";
import {
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  BriefcaseIcon,
  ChartBarIcon,
  TrophyIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface AnalysisResultsProps {
  analysisResults: AnalysisResult;
}

const AnalysisResults = ({ analysisResults }: AnalysisResultsProps) => {
  const getScoreColor = (score: number, maxScore: number = 10) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-400";
    if (percentage >= 60) return "text-yellow-400";
    if (percentage >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBgColor = (score: number, maxScore: number = 10) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    if (percentage >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "Strong Hire":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "Hire":
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "Maybe":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "No Hire":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Resume Analysis Results
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Comprehensive analysis of your resume with actionable insights and
          recommendations
        </p>
      </div>

      {/* Overall Score & Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <StarIcon className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">Overall Score</h3>
          </div>
          <div className="text-center">
            <div
              className={`text-6xl font-bold mb-3 ${getScoreColor(
                analysisResults.overallScore,
                10
              )}`}
            >
              {analysisResults.overallScore}/10
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 mb-2">
              <div
                className={`h-4 rounded-full transition-all ${getScoreBgColor(
                  analysisResults.overallScore,
                  10
                )}`}
                style={{
                  width: `${(analysisResults.overallScore / 10) * 100}%`,
                }}
              ></div>
            </div>
            <p className="text-slate-400 text-sm">
              {analysisResults.overallScore >= 8
                ? "Excellent"
                : analysisResults.overallScore >= 6
                ? "Good"
                : analysisResults.overallScore >= 4
                ? "Fair"
                : "Needs Improvement"}
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrophyIcon className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">
              Hiring Recommendation
            </h3>
          </div>
          <div className="text-center">
            <div
              className={`inline-flex items-center px-4 py-3 rounded-xl border text-lg font-medium ${getRecommendationColor(
                analysisResults.hiringRecommendation
              )}`}
            >
              {analysisResults.hiringRecommendation}
            </div>
            <p className="text-slate-400 text-sm mt-3">
              Based on overall resume quality and industry standards
            </p>
          </div>
        </div>
      </div>

      {/* Experience Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <BriefcaseIcon className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Experience Level
            </h3>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {analysisResults.experienceLevel}
            </div>
            <p className="text-slate-400 text-sm">
              Career stage based on your resume content
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Years of Experience
            </h3>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {analysisResults.yearsOfExperience}+
            </div>
            <p className="text-slate-400 text-sm">
              Total professional experience detected
            </p>
          </div>
        </div>
      </div>

      {/* ATS Compatibility */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <ShieldCheckIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            ATS Compatibility
          </h3>
          <div className="text-right">
            <span
              className={`text-2xl font-bold ${getScoreColor(
                analysisResults.atsCompatibility.score,
                100
              )}`}
            >
              {analysisResults.atsCompatibility.score}/100
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getScoreBgColor(
                analysisResults.atsCompatibility.score,
                100
              )}`}
              style={{ width: `${analysisResults.atsCompatibility.score}%` }}
            ></div>
          </div>
          {(() => {
            const realIssues = analysisResults.atsCompatibility.issues.filter(
              (issue) =>
                !issue.toLowerCase().includes("none") && issue.trim() !== ""
            );
            if (realIssues.length > 0) {
              return (
                <div>
                  <h4 className="text-sm font-medium text-orange-400 mb-2">
                    Issues to Fix:
                  </h4>
                  <ul className="space-y-1">
                    {realIssues.map((issue, index) => (
                      <li
                        key={index}
                        className="flex items-start text-sm text-orange-200"
                      >
                        <ExclamationTriangleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            return (
              <div className="flex items-center text-sm text-green-400">
                <CheckCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                No ATS issues detected - your resume is well-formatted!
              </div>
            );
          })()}
        </div>
      </div>

      {/* Summary */}
      {analysisResults.summary && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Analysis Summary
            </h3>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {analysisResults.summary}
          </p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Radar Chart */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-300 mb-4 text-center">
              Score Breakdown
            </h3>
            <AnalysisRadarChart analysisResults={analysisResults} />
          </div>

          {/* Strengths */}
          {analysisResults.strengthAreas.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Strength Areas
                </h3>
              </div>
              <ul className="space-y-3">
                {analysisResults.strengthAreas.map((strength, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-start p-3 bg-green-900/20 border border-green-800/30 rounded-lg"
                  >
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-green-200 text-sm leading-relaxed">
                      {strength}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Red Flags */}
          {analysisResults.redFlags.length > 0 && (
            <div className="card p-6 border-red-900/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-red-400">
                  Red Flags
                </h3>
              </div>
              <ul className="space-y-3">
                {analysisResults.redFlags.map((flag, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-start p-3 bg-red-900/20 border border-red-800/30 rounded-lg"
                  >
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-red-200 text-sm leading-relaxed">
                      {flag}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Key Achievements */}
          {analysisResults.keyAchievements.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <TrophyIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Key Achievements
                </h3>
              </div>
              <ul className="space-y-3">
                {analysisResults.keyAchievements.map((achievement, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-start p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg"
                  >
                    <TrophyIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-yellow-200 text-sm leading-relaxed">
                      {achievement}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Detected Skills */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <SparklesIcon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Detected Skills
              </h3>
            </div>
            <div className="space-y-4">
              {analysisResults.detectedSkills.technical.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-2">
                    Technical Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResults.detectedSkills.technical.map(
                      (skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-900/20 text-blue-200 text-xs rounded-full border border-blue-800/30"
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
              {analysisResults.detectedSkills.soft.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-2">
                    Soft Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResults.detectedSkills.soft.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-900/20 text-green-200 text-xs rounded-full border border-green-800/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Improvement Areas */}
          {analysisResults.improvementAreas.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Improvement Areas
                </h3>
              </div>
              <ul className="space-y-3">
                {analysisResults.improvementAreas.map((area, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-start p-3 bg-orange-900/20 border border-orange-800/30 rounded-lg"
                  >
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-orange-200 text-sm leading-relaxed">
                      {area}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Skills */}
          {analysisResults.missingSkills.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <XCircleIcon className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Missing Skills
                </h3>
              </div>
              <ul className="space-y-2">
                {analysisResults.missingSkills.map((skill, index) => (
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
          )}

          {/* Recommendations */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <SparklesIcon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Recommendations
              </h3>
            </div>
            <div className="space-y-4">
              {analysisResults.recommendations.immediate.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-2">
                    Immediate Actions
                  </h4>
                  <ul className="space-y-2">
                    {analysisResults.recommendations.immediate.map(
                      (rec, index) => (
                        <li
                          key={index}
                          className="flex items-start text-sm text-red-200"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {analysisResults.recommendations.shortTerm.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-400 mb-2">
                    Short-term Goals
                  </h4>
                  <ul className="space-y-2">
                    {analysisResults.recommendations.shortTerm.map(
                      (rec, index) => (
                        <li
                          key={index}
                          className="flex items-start text-sm text-yellow-200"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {analysisResults.recommendations.longTerm.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-2">
                    Long-term Goals
                  </h4>
                  <ul className="space-y-2">
                    {analysisResults.recommendations.longTerm.map(
                      (rec, index) => (
                        <li
                          key={index}
                          className="flex items-start text-sm text-green-200"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AnalysisResults;
