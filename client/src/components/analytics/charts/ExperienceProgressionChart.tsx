import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ExperienceProgressionChartProps {
  data: Array<{
    date: Date;
    experience_level: string;
    score?: number;
  }>;
}

const EXPERIENCE_LEVEL_MAP: Record<string, number> = {
  "Entry-Level": 1,
  Junior: 2,
  "Mid-Level": 3,
  Senior: 4,
  "Lead/Principal": 5,
  Executive: 6,
};

const EXPERIENCE_LEVEL_LABELS: Record<number, string> = {
  1: "Entry",
  2: "Junior",
  3: "Mid",
  4: "Senior",
  5: "Lead",
  6: "Exec",
};

const ExperienceProgressionChart = ({
  data,
}: ExperienceProgressionChartProps) => {
  const chartData = data
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: item.date,
      experienceLevel: item.experience_level,
      levelValue: EXPERIENCE_LEVEL_MAP[item.experience_level] || 1,
    }))
    .sort(
      (a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
    );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <p className="text-slate-300 text-sm mb-1">
            {new Date(payload[0].payload.fullDate).toLocaleDateString()}
          </p>
          <p className="text-blue-400 text-sm">
            Level: {payload[0].payload.experienceLevel}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxisTick = (value: number) => {
    return EXPERIENCE_LEVEL_LABELS[value] || "";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            domain={[0, 7]}
            ticks={[1, 2, 3, 4, 5, 6]}
            tickFormatter={formatYAxisTick}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="levelValue"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ fill: "#8b5cf6", r: 6 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default ExperienceProgressionChart;
