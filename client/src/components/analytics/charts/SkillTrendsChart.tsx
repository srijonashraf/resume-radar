import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SkillTrendsChartProps {
  data: Array<{
    skill_name: string;
    frequency: number;
    trend?: number;
  }>;
}

const SkillTrendsChart = ({ data }: SkillTrendsChartProps) => {
  // Transform data for the chart - take top 10 most frequent skills
  const chartData = data
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10)
    .map(item => ({
      skill: item.skill_name,
      frequency: item.frequency,
      trend: item.trend || 0
    }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="skill"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: '#94a3b8' }}
            label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px'
            }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#60a5fa' }}
          />
          <Legend
            wrapperStyle={{ color: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="frequency"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: '#60a5fa', r: 4 }}
            activeDot={{ r: 6 }}
          />
          {chartData.some(item => item.trend !== 0) && (
            <Line
              type="monotone"
              dataKey="trend"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ fill: '#34d399', r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default SkillTrendsChart;