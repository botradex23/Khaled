import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Loader2, ArrowUpRight, BarChart3, LineChart as LineChartIcon, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

export default function MlOptimizationPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  
  // Define the data types
  interface TuningRun {
    id: number;
    symbol: string;
    timeframe: string;
    status: string;
    startedAt: string;
    completedAt: string;
    improvement: number | null;
    bestAccuracy: number | null;
    optimizationType: string;
  }

  interface ModelData {
    id: number;
    modelName: string;
    modelType: string;
    symbol: string;
    timeframe: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  }

  interface SimulationData {
    id: number;
    name: string;
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    pnl: number | string;
    pnlPercent: number | string;
    winRate: number;
    drawdown: number;
    totalTrades: number;
  }

  interface MarketConditionData {
    id: number;
    timestamp: string;
    volatility: number;
    volume: number;
    trendStrength: number;
    trendDirection: number;
    rsi: number | null;
    macdHistogram: number | null;
  }

  interface ApiResponse<T> {
    data: T[];
  }
  
  // Fetch tuning runs
  const { 
    data: tuningRunsData,
    isLoading: isTuningRunsLoading,
    error: tuningRunsError
  } = useQuery<ApiResponse<TuningRun>>({
    queryKey: ['/api/ml/optimization/tuning-runs'],
    refetchInterval: 60000 // Refresh every minute
  });
  
  // Fetch top performing models
  const { 
    data: topModelsData,
    isLoading: isTopModelsLoading,
    error: topModelsError
  } = useQuery<ApiResponse<ModelData>>({
    queryKey: ['/api/ml/optimization/model-performance/top'],
    refetchInterval: 60000
  });
  
  // Fetch strategy simulations for the selected symbol
  const { 
    data: simulationsData,
    isLoading: isSimulationsLoading, 
    error: simulationsError
  } = useQuery<ApiResponse<SimulationData>>({
    queryKey: ['/api/ml/optimization/strategy-simulations', { symbol: selectedSymbol, timeframe: selectedTimeframe }],
    refetchInterval: 60000
  });

  // Fetch market conditions
  const { 
    data: marketConditionsData,
    isLoading: isMarketConditionsLoading,
    error: marketConditionsError
  } = useQuery<ApiResponse<MarketConditionData>>({
    queryKey: ['/api/ml/optimization/market-conditions', { symbol: selectedSymbol, timeframe: selectedTimeframe }],
    refetchInterval: 60000
  });

  // Helper function to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // These interfaces are already defined above

  // Prepare chart data for model performance
  const performanceChartData = topModelsData?.data?.map((model: ModelData) => ({
    name: model.modelName,
    accuracy: model.accuracy * 100,
    precision: model.precision * 100,
    recall: model.recall * 100,
    f1Score: model.f1Score * 100,
  })) || [];
  
  // Prepare chart data for strategy simulations
  const simulationChartData = simulationsData?.data?.map((sim: SimulationData) => ({
    name: sim.name,
    pnl: parseFloat(sim.pnl as any),
    winRate: sim.winRate * 100,
    drawdown: Math.abs(sim.drawdown) * 100,
  })) || [];

  // Market conditions chart data
  const marketConditionsChartData = marketConditionsData?.data?.map((condition: MarketConditionData) => ({
    date: formatDate(condition.timestamp),
    volatility: condition.volatility,
    volume: condition.volume / 1000000, // Normalize volume for display
    trendStrength: condition.trendStrength,
    trendDirection: condition.trendDirection,
  })) || [];

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">ML Optimization Dashboard</h1>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
              <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
              <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
              <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
              <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="30m">30m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="4h">4h</SelectItem>
              <SelectItem value="1d">1d</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button>
          Start New Optimization
        </Button>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tuning-runs">Tuning Runs</TabsTrigger>
          <TabsTrigger value="model-performance">Model Performance</TabsTrigger>
          <TabsTrigger value="strategy-simulations">Strategy Simulations</TabsTrigger>
          <TabsTrigger value="market-conditions">Market Conditions</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Active Tuning Runs</CardTitle>
                <CardDescription>Current XGBoost optimization processes</CardDescription>
              </CardHeader>
              <CardContent>
                {isTuningRunsLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="text-3xl font-bold">
                    {tuningRunsData?.data?.filter(run => run.status === 'running')?.length || 0}
                    <span className="text-sm font-normal text-muted-foreground ml-2">Active</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Top Model Accuracy</CardTitle>
                <CardDescription>Highest prediction accuracy achieved</CardDescription>
              </CardHeader>
              <CardContent>
                {isTopModelsLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="text-3xl font-bold">
                    {topModelsData?.data?.[0]?.accuracy ? (topModelsData.data[0].accuracy * 100).toFixed(2) : 'N/A'}
                    <span className="text-sm font-normal text-muted-foreground ml-2">%</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Best Strategy PnL</CardTitle>
                <CardDescription>Highest return from strategy simulation</CardDescription>
              </CardHeader>
              <CardContent>
                {isSimulationsLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="text-3xl font-bold">
                    {simulationsData?.data?.[0]?.pnlPercent ? (parseFloat(simulationsData.data[0].pnlPercent as any) * 100).toFixed(2) : 'N/A'}
                    <span className="text-sm font-normal text-muted-foreground ml-2">%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Top Model Performance</span>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                <CardDescription>Comparison of performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {isTopModelsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : performanceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accuracy" fill="#8884d8" name="Accuracy %" />
                      <Bar dataKey="precision" fill="#82ca9d" name="Precision %" />
                      <Bar dataKey="recall" fill="#ffc658" name="Recall %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <p>No model performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Market Conditions</span>
                  <LineChartIcon className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                <CardDescription>Recent market volatility and trend strength</CardDescription>
              </CardHeader>
              <CardContent>
                {isMarketConditionsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : marketConditionsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={marketConditionsChartData.slice(-10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="volatility" stroke="#8884d8" name="Volatility" />
                      <Line type="monotone" dataKey="trendStrength" stroke="#82ca9d" name="Trend Strength" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <p>No market conditions data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tuning Runs Tab */}
        <TabsContent value="tuning-runs">
          <Card>
            <CardHeader>
              <CardTitle>XGBoost Tuning Runs</CardTitle>
              <CardDescription>History of hyperparameter optimization processes</CardDescription>
            </CardHeader>
            <CardContent>
              {isTuningRunsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tuningRunsData?.data?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Timeframe</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started At</TableHead>
                      <TableHead>Completed At</TableHead>
                      <TableHead>Improvement</TableHead>
                      <TableHead>Best Accuracy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tuningRunsData.data.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>{run.id}</TableCell>
                        <TableCell>{run.symbol}</TableCell>
                        <TableCell>{run.timeframe}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(run.status)}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(run.startedAt)}</TableCell>
                        <TableCell>{formatDate(run.completedAt)}</TableCell>
                        <TableCell>
                          {run.improvement !== null ? (
                            <span className={run.improvement > 0 ? "text-green-500" : "text-red-500"}>
                              {(run.improvement * 100).toFixed(2)}%
                            </span>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {run.bestAccuracy !== null ? (run.bestAccuracy * 100).toFixed(2) + '%' : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>No tuning runs available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Model Performance Tab */}
        <TabsContent value="model-performance">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Metrics</CardTitle>
              <CardDescription>Detailed metrics for trained ML models</CardDescription>
            </CardHeader>
            <CardContent>
              {isTopModelsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : topModelsData?.data?.length > 0 ? (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={performanceChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="accuracy" fill="#8884d8" name="Accuracy %" />
                        <Bar dataKey="precision" fill="#82ca9d" name="Precision %" />
                        <Bar dataKey="f1Score" fill="#ffc658" name="F1 Score %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Timeframe</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Precision</TableHead>
                        <TableHead>Recall</TableHead>
                        <TableHead>F1 Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topModelsData.data.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell>{model.modelName}</TableCell>
                          <TableCell>{model.modelType}</TableCell>
                          <TableCell>{model.symbol}</TableCell>
                          <TableCell>{model.timeframe}</TableCell>
                          <TableCell>{(model.accuracy * 100).toFixed(2)}%</TableCell>
                          <TableCell>{(model.precision * 100).toFixed(2)}%</TableCell>
                          <TableCell>{(model.recall * 100).toFixed(2)}%</TableCell>
                          <TableCell>{(model.f1Score * 100).toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>No model performance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Strategy Simulations Tab */}
        <TabsContent value="strategy-simulations">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Backtesting Results</CardTitle>
              <CardDescription>Performance metrics for trading strategies</CardDescription>
            </CardHeader>
            <CardContent>
              {isSimulationsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : simulationsData?.data?.length > 0 ? (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={simulationChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="pnl" fill="#8884d8" name="PnL" />
                        <Bar dataKey="winRate" fill="#82ca9d" name="Win Rate %" />
                        <Bar dataKey="drawdown" fill="#ff8042" name="Max Drawdown %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Strategy Name</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Timeframe</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>PnL</TableHead>
                        <TableHead>PnL %</TableHead>
                        <TableHead>Win Rate</TableHead>
                        <TableHead>Trade Count</TableHead>
                        <TableHead>Drawdown</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulationsData.data.map((sim) => (
                        <TableRow key={sim.id}>
                          <TableCell>{sim.name}</TableCell>
                          <TableCell>{sim.symbol}</TableCell>
                          <TableCell>{sim.timeframe}</TableCell>
                          <TableCell>
                            {formatDate(sim.startDate).split(',')[0]} - {formatDate(sim.endDate).split(',')[0]}
                          </TableCell>
                          <TableCell>${sim.pnl}</TableCell>
                          <TableCell>{(parseFloat(sim.pnlPercent as any) * 100).toFixed(2)}%</TableCell>
                          <TableCell>{(sim.winRate * 100).toFixed(2)}%</TableCell>
                          <TableCell>{sim.totalTrades}</TableCell>
                          <TableCell className="text-red-500">
                            {(Math.abs(sim.drawdown) * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>No strategy simulation data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Market Conditions Tab */}
        <TabsContent value="market-conditions">
          <Card>
            <CardHeader>
              <CardTitle>Market Conditions Analysis</CardTitle>
              <CardDescription>Analysis of market conditions affecting model performance</CardDescription>
            </CardHeader>
            <CardContent>
              {isMarketConditionsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : marketConditionsData?.data?.length > 0 ? (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={marketConditionsChartData.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="volatility" stroke="#8884d8" name="Volatility" />
                        <Line type="monotone" dataKey="volume" stroke="#82ca9d" name="Volume (M)" />
                        <Line type="monotone" dataKey="trendStrength" stroke="#ffc658" name="Trend Strength" />
                        <Line type="monotone" dataKey="trendDirection" stroke="#ff8042" name="Trend Direction" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" className="p-0">
                            <span>Timestamp</span>
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Timeframe</TableHead>
                        <TableHead>Volatility</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Trend Strength</TableHead>
                        <TableHead>Trend Direction</TableHead>
                        <TableHead>RSI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketConditionsData.data.slice(0, 10).map((condition) => (
                        <TableRow key={condition.id}>
                          <TableCell>{formatDate(condition.timestamp)}</TableCell>
                          <TableCell>{condition.symbol}</TableCell>
                          <TableCell>{condition.timeframe}</TableCell>
                          <TableCell>{condition.volatility.toFixed(4)}</TableCell>
                          <TableCell>{(condition.volume / 1000000).toFixed(2)}M</TableCell>
                          <TableCell>{condition.trendStrength.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={condition.trendDirection > 0 ? "text-green-500" : "text-red-500"}>
                              {condition.trendDirection.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>{condition.rsi !== null ? condition.rsi.toFixed(2) : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>No market conditions data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}