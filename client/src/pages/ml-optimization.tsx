import { useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// Lazy load recharts components to improve initial load time
import { Loader2, ArrowUpRight, BarChart3, LineChart as LineChartIcon, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Lazy load chart components more granularly to improve startup performance
const CartesianGrid = lazy(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })));
const XAxis = lazy(() => import('recharts').then(mod => ({ default: mod.XAxis })));
const YAxis = lazy(() => import('recharts').then(mod => ({ default: mod.YAxis })));
const Tooltip = lazy(() => import('recharts').then(mod => ({ default: mod.Tooltip })));
const Legend = lazy(() => import('recharts').then(mod => ({ default: mod.Legend })));
const Bar = lazy(() => import('recharts').then(mod => ({ default: mod.Bar })));
const Line = lazy(() => import('recharts').then(mod => ({ default: mod.Line })));
const BarChart = lazy(() => import('recharts').then(mod => ({ default: mod.BarChart })));
const LineChart = lazy(() => import('recharts').then(mod => ({ default: mod.LineChart })));
const ResponsiveContainer = lazy(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })));

// Create individual chart components with suspense
const LazyBarChart = (props: any) => (
  <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
    <BarChart {...props} />
  </Suspense>
);

const LazyLineChart = (props: any) => (
  <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
    <LineChart {...props} />
  </Suspense>
);

const LazyResponsiveContainer = (props: any) => (
  <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
    <ResponsiveContainer {...props} />
  </Suspense>
);

// Create a component wrapper for chart elements
const ChartComponents = {
  CartesianGrid: (props: any) => <Suspense fallback={<div />}><CartesianGrid {...props} /></Suspense>,
  XAxis: (props: any) => <Suspense fallback={<div />}><XAxis {...props} /></Suspense>,
  YAxis: (props: any) => <Suspense fallback={<div />}><YAxis {...props} /></Suspense>,
  Tooltip: (props: any) => <Suspense fallback={<div />}><Tooltip {...props} /></Suspense>,
  Legend: (props: any) => <Suspense fallback={<div />}><Legend {...props} /></Suspense>,
  Bar: (props: any) => <Suspense fallback={<div />}><Bar {...props} /></Suspense>,
  Line: (props: any) => <Suspense fallback={<div />}><Line {...props} /></Suspense>
};

export default function MlOptimizationPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [showDialog, setShowDialog] = useState(false);
  const [optimizationType, setOptimizationType] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
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
    symbol: string;
    timeframe: string;
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
  
  // Function to open the optimization dialog
  const showOptimizationDialog = () => {
    setShowDialog(true);
  };
  
  // Function to handle the optimization request
  const handleStartOptimization = async () => {
    try {
      setIsSubmitting(true);
      
      const response = await apiRequest('/api/ml/optimization/start-optimization', 'POST', {
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        optimizationType: optimizationType
      });
      
      if (response.success) {
        toast({
          title: 'Optimization Started',
          description: `XGBoost optimization process started for ${selectedSymbol} on ${selectedTimeframe} timeframe.`,
          variant: 'default',
        });
        
        // Refresh the tuning runs data
        queryClient.invalidateQueries({ queryKey: ['/api/ml/optimization/tuning-runs'] });
        
        // Close the dialog
        setShowDialog(false);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to start optimization',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      console.error('Error starting optimization:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        <Button onClick={() => showOptimizationDialog()}>
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
                  <LazyResponsiveContainer width="100%" height={300}>
                    <LazyBarChart data={performanceChartData}>
                      <ChartComponents.CartesianGrid strokeDasharray="3 3" />
                      <ChartComponents.XAxis dataKey="name" />
                      <ChartComponents.YAxis />
                      <ChartComponents.Tooltip />
                      <ChartComponents.Legend />
                      <ChartComponents.Bar dataKey="accuracy" fill="#8884d8" name="Accuracy %" />
                      <ChartComponents.Bar dataKey="precision" fill="#82ca9d" name="Precision %" />
                      <ChartComponents.Bar dataKey="recall" fill="#ffc658" name="Recall %" />
                    </LazyBarChart>
                  </LazyResponsiveContainer>
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
                  <LazyResponsiveContainer width="100%" height={300}>
                    <LazyLineChart data={marketConditionsChartData.slice(-10)}>
                      <ChartComponents.CartesianGrid strokeDasharray="3 3" />
                      <ChartComponents.XAxis dataKey="date" />
                      <ChartComponents.YAxis />
                      <ChartComponents.Tooltip />
                      <ChartComponents.Legend />
                      <ChartComponents.Line type="monotone" dataKey="volatility" stroke="#8884d8" name="Volatility" />
                      <ChartComponents.Line type="monotone" dataKey="trendStrength" stroke="#82ca9d" name="Trend Strength" />
                    </LazyLineChart>
                  </LazyResponsiveContainer>
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
              ) : (tuningRunsData?.data && (tuningRunsData.data as any[]).length > 0) ? (
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
                    {tuningRunsData?.data?.map((run) => (
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
              ) : (topModelsData?.data && (topModelsData.data as any[]).length > 0) ? (
                <>
                  <div className="mb-6">
                    <LazyResponsiveContainer width="100%" height={300}>
                      <LazyBarChart data={performanceChartData}>
                        <ChartComponents.CartesianGrid strokeDasharray="3 3" />
                        <ChartComponents.XAxis dataKey="name" />
                        <ChartComponents.YAxis />
                        <ChartComponents.Tooltip />
                        <ChartComponents.Legend />
                        <ChartComponents.Bar dataKey="accuracy" fill="#8884d8" name="Accuracy %" />
                        <ChartComponents.Bar dataKey="precision" fill="#82ca9d" name="Precision %" />
                        <ChartComponents.Bar dataKey="f1Score" fill="#ffc658" name="F1 Score %" />
                      </LazyBarChart>
                    </LazyResponsiveContainer>
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
                      {topModelsData?.data?.map((model) => (
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
              ) : (simulationsData?.data && (simulationsData.data as any[]).length > 0) ? (
                <>
                  <div className="mb-6">
                    <LazyResponsiveContainer width="100%" height={300}>
                      <LazyBarChart data={simulationChartData}>
                        <ChartComponents.CartesianGrid strokeDasharray="3 3" />
                        <ChartComponents.XAxis dataKey="name" />
                        <ChartComponents.YAxis />
                        <ChartComponents.Tooltip />
                        <ChartComponents.Legend />
                        <ChartComponents.Bar dataKey="pnl" fill="#8884d8" name="PnL" />
                        <ChartComponents.Bar dataKey="winRate" fill="#82ca9d" name="Win Rate %" />
                        <ChartComponents.Bar dataKey="drawdown" fill="#ff8042" name="Max Drawdown %" />
                      </LazyBarChart>
                    </LazyResponsiveContainer>
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
                      {simulationsData?.data?.map((sim) => (
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
              ) : (marketConditionsData?.data && (marketConditionsData.data as any[]).length > 0) ? (
                <>
                  <div className="mb-6">
                    <LazyResponsiveContainer width="100%" height={300}>
                      <LazyLineChart data={marketConditionsChartData.slice(-30)}>
                        <ChartComponents.CartesianGrid strokeDasharray="3 3" />
                        <ChartComponents.XAxis dataKey="date" />
                        <ChartComponents.YAxis />
                        <ChartComponents.Tooltip />
                        <ChartComponents.Legend />
                        <ChartComponents.Line type="monotone" dataKey="volatility" stroke="#8884d8" name="Volatility" />
                        <ChartComponents.Line type="monotone" dataKey="volume" stroke="#82ca9d" name="Volume (M)" />
                        <ChartComponents.Line type="monotone" dataKey="trendStrength" stroke="#ffc658" name="Trend Strength" />
                        <ChartComponents.Line type="monotone" dataKey="trendDirection" stroke="#ff8042" name="Trend Direction" />
                      </LazyLineChart>
                    </LazyResponsiveContainer>
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
                      {marketConditionsData?.data?.slice(0, 10).map((condition) => (
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
      
      {/* Optimization Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start XGBoost Optimization</DialogTitle>
            <DialogDescription>
              Configure the optimization process for {selectedSymbol} on {selectedTimeframe} timeframe.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base">Optimization Type</Label>
                <RadioGroup
                  value={optimizationType}
                  onValueChange={setOptimizationType}
                  className="flex flex-col space-y-2 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="font-normal">All Methods (Grid Search, Random Search, Bayesian)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="grid_search" id="grid_search" />
                    <Label htmlFor="grid_search" className="font-normal">Grid Search Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="random_search" id="random_search" />
                    <Label htmlFor="random_search" className="font-normal">Random Search Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bayesian" id="bayesian" />
                    <Label htmlFor="bayesian" className="font-normal">Bayesian Optimization Only</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                <p className="mb-2">Optimization run information:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Symbol: {selectedSymbol}</li>
                  <li>Timeframe: {selectedTimeframe}</li>
                  <li>Method: {optimizationType === 'all' ? 'All methods' : 
                      optimizationType === 'grid_search' ? 'Grid Search' :
                      optimizationType === 'random_search' ? 'Random Search' : 'Bayesian Optimization'}</li>
                </ul>
                <p className="mt-2 text-xs">This process will train multiple models with different hyperparameters and may take several minutes to complete.</p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleStartOptimization} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Optimization'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}