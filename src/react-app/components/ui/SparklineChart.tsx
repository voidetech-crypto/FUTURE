import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineChartProps {
  data?: number[];
  color?: string;
  height?: number;
}

export default function SparklineChart({ 
  data, 
  color = '#10b981',
  height = 32 
}: SparklineChartProps) {
  // Generate synthetic trend data based on price changes if no data provided
  const chartData = data 
    ? data.map((value, index) => ({ index, value }))
    : Array.from({ length: 20 }, (_, i) => ({ 
        index: i, 
        value: Math.random() * 0.5 + 0.25 
      }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={1.5} 
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
