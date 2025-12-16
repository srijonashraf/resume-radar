import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { AnalysisResult } from "../../store/useStore";

interface AnalysisRadarChartProps {
  analysisResults: AnalysisResult;
}

const AnalysisRadarChart = ({ analysisResults }: AnalysisRadarChartProps) => {
  // Transform analysis results into the format expected by Recharts
  const chartData = [
    { subject: "Technical", score: analysisResults.scores.technicalSkills },
    { subject: "Experience", score: analysisResults.scores.experience },
    { subject: "Presentation", score: analysisResults.scores.presentation },
    { subject: "Education", score: analysisResults.scores.education },
    { subject: "Leadership", score: analysisResults.scores.leadership },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full h-72 md:h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#4a5568", fontSize: 14 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 10]}
            tick={{ fill: "#4a5568" }}
          />
          <Radar
            name="Resume Score"
            dataKey="score"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default AnalysisRadarChart;
