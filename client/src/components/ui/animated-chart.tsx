import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// Chart animation
const chartVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, valuePrefix, valueSuffix }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: item.color }}>
            {item.name}: {valuePrefix || ''}{item.value.toLocaleString()}{valueSuffix || ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface AnimatedChartProps {
  data: any[];
  type?: 'line' | 'area' | 'bar';
  height?: number | string;
  lines?: Array<{
    dataKey: string;
    stroke?: string;
    fill?: string;
    name?: string;
  }>;
  xAxisDataKey?: string;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
  gradientColors?: [string, string];
  animate?: boolean;
}

export function AnimatedChart({
  data,
  type = 'line',
  height = 300,
  lines = [{ dataKey: 'value', stroke: 'hsl(var(--primary))' }],
  xAxisDataKey = 'date',
  showGrid = false,
  showXAxis = true,
  showYAxis = true,
  showLegend = false,
  valuePrefix = '',
  valueSuffix = '',
  className = '',
  gradientColors,
  animate = true
}: AnimatedChartProps) {
  const [chartData, setChartData] = useState(data);

  // Animation logic to progressively show data
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setChartData(data);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setChartData(data);
    }
  }, [data, animate]);

  // Format the date for xAxis if it's a date string
  const formatXAxis = (tickItem: any) => {
    if (typeof tickItem === 'string' && tickItem.includes('-')) {
      try {
        const date = new Date(tickItem);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch (e) {
        return tickItem;
      }
    }
    return tickItem;
  };

  // Render the appropriate chart type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    // Chart gradient definition
    const gradientDef = gradientColors ? (
      <defs>
        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={gradientColors[0]} stopOpacity={0.8} />
          <stop offset="95%" stopColor={gradientColors[1]} stopOpacity={0.1} />
        </linearGradient>
      </defs>
    ) : null;

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gradientDef}
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />}
            {showXAxis && <XAxis dataKey={xAxisDataKey} tickFormatter={formatXAxis} axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />}
            {showYAxis && <YAxis axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${valuePrefix}${value}${valueSuffix}`} />}
            <Tooltip content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />} />
            {showLegend && <Legend />}
            {lines.map((line, index) => (
              <Area 
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke || `hsl(var(--chart-${(index % 5) + 1}, 1))`}
                fill={line.fill || (gradientColors ? "url(#colorGradient)" : `hsl(var(--chart-${(index % 5) + 1}, 0.2))`)}
                name={line.name || line.dataKey}
                activeDot={{ r: 6, fill: line.stroke || `hsl(var(--chart-${(index % 5) + 1}, 1))` }}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {gradientDef}
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />}
            {showXAxis && <XAxis dataKey={xAxisDataKey} tickFormatter={formatXAxis} axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />}
            {showYAxis && <YAxis axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${valuePrefix}${value}${valueSuffix}`} />}
            <Tooltip content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />} />
            {showLegend && <Legend />}
            {lines.map((line, index) => (
              <Bar 
                key={index}
                dataKey={line.dataKey}
                fill={line.fill || gradientColors ? "url(#colorGradient)" : line.stroke || `hsl(var(--chart-${(index % 5) + 1}, 0.8))`}
                name={line.name || line.dataKey}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
            
      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />}
            {showXAxis && <XAxis dataKey={xAxisDataKey} tickFormatter={formatXAxis} axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />}
            {showYAxis && <YAxis axisLine={false} tickLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${valuePrefix}${value}${valueSuffix}`} />}
            <Tooltip content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />} />
            {showLegend && <Legend />}
            {lines.map((line, index) => (
              <Line 
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke || `hsl(var(--chart-${(index % 5) + 1}, 1))`}
                name={line.name || line.dataKey}
                activeDot={{ r: 6, fill: line.stroke || `hsl(var(--chart-${(index % 5) + 1}, 1))` }}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <motion.div
      variants={chartVariants}
      initial="hidden"
      animate="visible"
      className={className}
      style={{ width: '100%', height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </motion.div>
  );
}