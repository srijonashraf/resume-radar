import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SkillTrendsChartProps {
  data: Array<{
    skill?: string;
    skill_name?: string;
    frequency: number;
    trend?: number;
  }>;
}

const SkillTrendsChart = ({ data }: SkillTrendsChartProps) => {
  const chartData = (data || [])
    .filter((item) => item && (item.skill || item.skill_name))
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
    .slice(0, 10)
    .map((item) => {
      const skillName = item.skill || item.skill_name || "";
      return {
        skill:
          skillName.length > 12 ? skillName.slice(0, 10) + "..." : skillName,
        fullSkill: skillName,
        frequency: item.frequency || 0,
      };
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <p className="text-slate-200 text-sm font-medium mb-1">
            {payload[0].payload.fullSkill}
          </p>
          <p className="text-blue-400 text-sm">Frequency: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const colors = [
    "#3b82f6",
    "#60a5fa",
    "#93c5fd",
    "#bfdbfe",
    "#dbeafe",
    "#60a5fa",
    "#3b82f6",
    "#2563eb",
    "#1d4ed8",
    "#1e40af",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
          />
          <XAxis
            dataKey="skill"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis
            tick={{ fill: "#94a3b8" }}
            label={{
              value: "Frequency",
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              fontSize: 12,
            }}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
          />
          <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default SkillTrendsChart;
