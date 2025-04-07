import { ChartData, AssetAllocation } from "../types/index.ts";

// Hero chart data
export const heroChartData: ChartData[] = Array.from({ length: 30 }, (_, i) => ({
  name: `Day ${i + 1}`,
  value: 10 + Math.floor(Math.random() * 40)
}));

// Strategy chart data
export const gridChartData: ChartData[] = [
  { name: "1", value: 25 },
  { name: "2", value: 28 },
  { name: "3", value: 24 },
  { name: "4", value: 26 },
  { name: "5", value: 29 },
  { name: "6", value: 31 },
  { name: "7", value: 30 },
  { name: "8", value: 33 },
  { name: "9", value: 35 },
  { name: "10", value: 34 },
  { name: "11", value: 36 },
  { name: "12", value: 38 },
  { name: "13", value: 37 },
  { name: "14", value: 39 },
  { name: "15", value: 42 }
];

export const dcaChartData: ChartData[] = [
  { name: "1", value: 30 },
  { name: "2", value: 28 },
  { name: "3", value: 25 },
  { name: "4", value: 22 },
  { name: "5", value: 24 },
  { name: "6", value: 26 },
  { name: "7", value: 28 },
  { name: "8", value: 27 },
  { name: "9", value: 25 },
  { name: "10", value: 28 },
  { name: "11", value: 30 },
  { name: "12", value: 33 },
  { name: "13", value: 35 },
  { name: "14", value: 38 },
  { name: "15", value: 40 }
];

export const macdChartData: ChartData[] = [
  { name: "1", value: 20 },
  { name: "2", value: 25 },
  { name: "3", value: 28 },
  { name: "4", value: 32 },
  { name: "5", value: 35 },
  { name: "6", value: 38 },
  { name: "7", value: 35 },
  { name: "8", value: 38 },
  { name: "9", value: 42 },
  { name: "10", value: 45 },
  { name: "11", value: 43 },
  { name: "12", value: 47 },
  { name: "13", value: 50 },
  { name: "14", value: 53 },
  { name: "15", value: 58 }
];

// Performance chart data
export const performanceChartData: ChartData[] = [
  { name: "Jan 1", value: 10500 },
  { name: "Jan 5", value: 10800 },
  { name: "Jan 10", value: 11200 },
  { name: "Jan 15", value: 11000 },
  { name: "Jan 20", value: 11500 },
  { name: "Jan 25", value: 12000 },
  { name: "Jan 30", value: 12500 }
];

// Asset allocation data
export const assetAllocationData: AssetAllocation[] = [
  { name: "Bitcoin (BTC)", value: 42, color: "hsl(var(--primary))" },
  { name: "Ethereum (ETH)", value: 28, color: "hsl(var(--secondary))" },
  { name: "Solana (SOL)", value: 15, color: "hsl(35.5 91.7% 32.9%)" },
  { name: "Cardano (ADA)", value: 10, color: "hsl(0 84.2% 60.2%)" },
  { name: "Others", value: 5, color: "hsl(215 20.2% 65.1%)" }
];
