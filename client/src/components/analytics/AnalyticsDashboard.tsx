import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  fetchSkillTrends,
  fetchExperienceProgression,
  fetchHistorySummary,
} from "../../services/api";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  AcademicCapIcon,
  CalendarIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import SkillTrendsChart from "./charts/SkillTrendsChart";
import ExperienceProgressionChart from "./charts/ExperienceProgressionChart";

interface HistorySummary {
  total_analyses: number;
  latest_analysis: Date | null;
  score_trend: Array<{
    date: Date;
    score: number;
  }>;
}

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skillTrends, setSkillTrends] = useState<any[]>([]);
  const [experienceProgression, setExperienceProgression] = useState<any[]>([]);
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(
    null
  );

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [skillData, experienceData, summaryData] = await Promise.all([
          fetchSkillTrends(),
          fetchExperienceProgression(),
          fetchHistorySummary(),
        ]);

        setSkillTrends(skillData);
        setExperienceProgression(experienceData);
        setHistorySummary(summaryData);
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
        setError("Failed to load analytics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card p-6"
      >
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-3 text-slate-400">Loading analytics...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card p-6"
      >
        <div className="text-center py-8">
          <div className="bg-red-900/20 border border-red-900/50 text-red-300 p-4 rounded-lg">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Check if there's no data at all
  const hasNoData =
    skillTrends.length === 0 &&
    experienceProgression.length === 0 &&
    (!historySummary || historySummary.total_analyses === 0);

  if (hasNoData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card p-6"
      >
        <div className="text-center py-12">
          <ChartBarIcon className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-medium text-slate-400 mb-2">
            No Analytics Data Available
          </h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Start analyzing resumes to see your analytics dashboard with skill
            trends, experience progression insights.
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-white mb-6">
          Analytics Dashboard
        </h2>

        {/* Summary Cards */}
        {historySummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Analyses</p>
                  <p className="text-2xl font-bold text-white">
                    {historySummary.total_analyses}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Latest Analysis</p>
                  <p className="text-sm font-medium text-white">
                    {historySummary.latest_analysis
                      ? new Date(
                          historySummary.latest_analysis
                        ).toLocaleDateString()
                      : "No analyses yet"}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skill Trends */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">
              Skill Trends
            </h3>
            {skillTrends.length > 0 ? (
              <SkillTrendsChart data={skillTrends} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <AcademicCapIcon className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                  <p>No skill trends data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Experience Progression */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">
              Experience Progression
            </h3>
            {experienceProgression.length > 0 ? (
              <ExperienceProgressionChart data={experienceProgression} />
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <ArrowTrendingUpIcon className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                  <p>No experience progression data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AnalyticsDashboard;
