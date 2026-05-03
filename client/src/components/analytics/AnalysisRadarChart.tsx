import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import Card from "../ui/Card";
import type { AnalysisResultV2 } from "@resumetra/shared";

interface AnalysisRadarChartProps {
  result: AnalysisResultV2;
}

export default function AnalysisRadarChart({ result }: AnalysisRadarChartProps) {
  const data = result.sectionScores.map((s) => ({
    section: s.sectionId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    content: s.contentScore,
    impact: s.impactScore,
  }));

  data.push({
    section: "Readability",
    content: result.readability.score,
    impact: result.readability.score,
  });

  return (
    <Card padding="lg">
      <h3 className="text-lg font-bold text-stone-900 mb-4 text-center">
        Section Scores
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#E7E5E4" />
          <PolarAngleAxis
            dataKey="section"
            tick={{ fontSize: 11, fill: "#78716C" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: "#A8A29E" }}
          />
          <Radar
            name="Content"
            dataKey="content"
            stroke="#F59E0B"
            fill="#F59E0B"
            fillOpacity={0.2}
          />
          <Radar
            name="Impact"
            dataKey="impact"
            stroke="#EF4444"
            fill="#EF4444"
            fillOpacity={0.1}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}
