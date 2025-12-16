import { motion } from "framer-motion";
import { JobMatchResult } from "../../store/useStore";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface JobMatchResultsProps {
  jobMatchResults: JobMatchResult;
}

const JobMatchResults = ({ jobMatchResults }: JobMatchResultsProps) => {
  const {
    matchPercentage,
    matchLevel,
    missingSkills,
    suggestions,
    keyword_analysis,
    experience_gap,
    presentSkills
  } = jobMatchResults;

  // Flatten missing skills from categories
  const allMissingSkills = [
    ...(missingSkills.critical || []),
    ...(missingSkills.important || []),
    ...(missingSkills.nice_to_have || [])
  ];

  // Determine color based on match percentage
  const getMatchColor = () => {
    if (matchPercentage >= 80) return "text-green-600";
    if (matchPercentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-6"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Job Match Analysis</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Match Percentage */}
        <div className="bg-slate-950/50 rounded-xl p-6 flex flex-col items-center justify-center border border-slate-800">
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            Match Score
          </h3>
          <div className={`text-2xl font-bold ${getMatchColor()} mb-2`}>
            {matchLevel}
          </div>
          <div
            className={`text-5xl font-bold ${getMatchColor()} drop-shadow-lg`}
          >
            {matchPercentage}%
          </div>

          {/* Keyword Analysis */}
          <div className="mt-4 w-full max-w-xs">
            <div className="flex justify-between text-sm text-slate-400 mb-1">
              <span>Keyword Match</span>
              <span>{keyword_analysis.matched_keywords}/{keyword_analysis.total_keywords}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  matchPercentage >= 80 ? 'bg-green-500' :
                  matchPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${(keyword_analysis.matched_keywords / keyword_analysis.total_keywords) * 100}%` }}
              />
            </div>
          </div>

          <p className="text-slate-400 mt-4 text-center max-w-xs">
            {matchPercentage >= 80
              ? "Great match! You're well qualified for this position."
              : matchPercentage >= 60
              ? "Good match with some areas for improvement."
              : "Consider enhancing your resume to better match this job."}
          </p>
        </div>

        {/* Present Skills */}
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-300 mb-3">
              Your Matching Skills
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <h4 className="text-xs font-semibold text-green-400 uppercase mb-2">Exact Matches</h4>
                <ul className="space-y-1">
                  {presentSkills.exact_matches.slice(0, 5).map((skill, idx) => (
                    <li key={idx} className="text-slate-300 flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-green-400 mr-2" />
                      {skill}
                    </li>
                  ))}
                  {presentSkills.exact_matches.length > 5 && (
                    <li className="text-slate-500 text-xs">+{presentSkills.exact_matches.length - 5} more</li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-blue-400 uppercase mb-2">Partial Matches</h4>
                <ul className="space-y-1">
                  {presentSkills.partial_matches.slice(0, 5).map((skill, idx) => (
                    <li key={idx} className="text-slate-300 flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-blue-400 mr-2" />
                      {skill}
                    </li>
                  ))}
                  {presentSkills.partial_matches.length > 5 && (
                    <li className="text-slate-500 text-xs">+{presentSkills.partial_matches.length - 5} more</li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase mb-2">Transferable Skills</h4>
                <ul className="space-y-1">
                  {presentSkills.transferable_skills.slice(0, 5).map((skill, idx) => (
                    <li key={idx} className="text-slate-300 flex items-center">
                      <CheckCircleIcon className="h-3 w-3 text-purple-400 mr-2" />
                      {skill}
                    </li>
                  ))}
                  {presentSkills.transferable_skills.length > 5 && (
                    <li className="text-slate-500 text-xs">+{presentSkills.transferable_skills.length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Missing Skills */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-300 mb-3">
              Missing Skills
            </h3>
            <ul className="space-y-2">
              {allMissingSkills.map((skill, index) => (
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

          {/* Suggestions */}
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-3">
              Improvement Suggestions
            </h3>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                  className="flex items-start p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        suggestion.priority === 'High' ? 'bg-red-900/30 text-red-300' :
                        suggestion.priority === 'Medium' ? 'bg-yellow-900/30 text-yellow-300' :
                        'bg-green-900/30 text-green-300'
                      }`}>
                        {suggestion.priority}
                      </span>
                      <span className="text-xs text-slate-400">{suggestion.category}</span>
                    </div>
                    <span className="text-slate-300 text-sm leading-relaxed">
                      {suggestion.action}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* Experience Gap Analysis */}
        {experience_gap && (
          <div className="mt-8 bg-slate-950/50 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">
              Experience Gap Analysis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {experience_gap.required_years} yrs
                </div>
                <div className="text-sm text-slate-400">Required</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  experience_gap.gap >= 0 ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {experience_gap.candidate_years} yrs
                </div>
                <div className="text-sm text-slate-400">Your Experience</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  experience_gap.gap >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {experience_gap.gap > 0 ? `+${experience_gap.gap}` : experience_gap.gap} yrs
                </div>
                <div className="text-sm text-slate-400">Gap/Surplus</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4 text-center italic">
              {experience_gap.assessment}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default JobMatchResults;
