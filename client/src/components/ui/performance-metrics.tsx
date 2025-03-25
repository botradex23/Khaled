import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { performanceChartData, assetAllocationData } from "@/lib/chart-data";

const timeFrames = ["Day", "Week", "Month", "Year"];

export default function PerformanceMetrics() {
  return (
    <section className="bg-card py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Real-Time Performance Metrics</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Track your bot performance with advanced analytics and make data-driven decisions.
          </p>
        </div>
        
        <div className="mb-8">
          <Card className="gradient-border">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <h3 className="text-xl font-bold">Portfolio Performance</h3>
                <div className="flex space-x-2 mt-2 md:mt-0">
                  {timeFrames.map((frame, index) => (
                    <Button 
                      key={frame}
                      variant={index === 2 ? "default" : "secondary"} 
                      className={index === 2 ? "bg-primary" : "bg-muted text-muted-foreground hover:bg-muted/90"}
                      size="sm"
                    >
                      {frame}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="h-[300px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceChartData}>
                    <defs>
                      <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem' 
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPerformance)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-muted-foreground text-sm">Total Value</p>
                  <p className="text-2xl font-bold font-mono">$12,452.86</p>
                  <p className="text-emerald-500 text-sm">↑ 18.2%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Monthly Profit</p>
                  <p className="text-2xl font-bold font-mono">$1,842.32</p>
                  <p className="text-emerald-500 text-sm">↑ 12.5%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Win/Loss Ratio</p>
                  <p className="text-2xl font-bold font-mono">3.2</p>
                  <p className="text-emerald-500 text-sm">↑ 0.4</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Active Bots</p>
                  <p className="text-2xl font-bold font-mono">5</p>
                  <p className="text-white text-sm">of 10 available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="gradient-border">
            <CardContent className="p-6">
              <CardTitle className="text-xl font-bold mb-4">Asset Allocation</CardTitle>
              <div className="flex flex-col lg:flex-row items-center">
                <div className="w-full lg:w-1/2 h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={1}
                        dataKey="value"
                      >
                        {assetAllocationData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.5rem' 
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: any) => [`${value}%`, 'Allocation']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2 mt-4 lg:mt-0">
                  {assetAllocationData.map((asset, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: asset.color }}
                      ></div>
                      <span>{asset.name}</span>
                      <span className="ml-auto font-mono">{asset.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="gradient-border">
            <CardContent className="p-6">
              <CardTitle className="text-xl font-bold mb-4">Bot Activity</CardTitle>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 text-left text-sm font-medium text-muted-foreground">Bot Name</th>
                      <th className="py-3 text-left text-sm font-medium text-muted-foreground">Last Trade</th>
                      <th className="py-3 text-left text-sm font-medium text-muted-foreground">Profit/Loss</th>
                      <th className="py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-3 text-white">BTC Grid</td>
                      <td className="py-3 text-muted-foreground">5 min ago</td>
                      <td className="py-3 text-emerald-500">+$32.45</td>
                      <td className="py-3">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Active</Badge>
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 text-white">ETH MACD</td>
                      <td className="py-3 text-muted-foreground">26 min ago</td>
                      <td className="py-3 text-emerald-500">+$104.20</td>
                      <td className="py-3">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Active</Badge>
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 text-white">SOL DCA</td>
                      <td className="py-3 text-muted-foreground">1 hour ago</td>
                      <td className="py-3 text-red-500">-$12.35</td>
                      <td className="py-3">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Active</Badge>
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 text-white">ADA RSI</td>
                      <td className="py-3 text-muted-foreground">2 hours ago</td>
                      <td className="py-3 text-emerald-500">+$18.72</td>
                      <td className="py-3">
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Paused</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-white">XRP VWAP</td>
                      <td className="py-3 text-muted-foreground">5 hours ago</td>
                      <td className="py-3 text-red-500">-$8.16</td>
                      <td className="py-3">
                        <Badge variant="outline" className="bg-muted/10 text-muted-foreground">Stopped</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
