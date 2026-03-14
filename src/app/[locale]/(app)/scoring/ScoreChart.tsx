'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SeriesPoint {
  date: string;
  [nickname: string]: number | string;
}

interface ScoreChartProps {
  data: SeriesPoint[];
  members: string[];
}

const COLORS = [
  '#005982', '#3089AC', '#A91A1A', '#2E7D32', '#7B1FA2',
  '#E65100', '#00838F', '#4527A0', '#283593', '#1B5E20',
];

export default function ScoreChart({ data, members }: ScoreChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        {members.map((nickname, i) => (
          <Line
            key={nickname}
            type="monotone"
            dataKey={nickname}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
