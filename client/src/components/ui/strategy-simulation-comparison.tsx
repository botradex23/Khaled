import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';
import { Loader2, CalendarIcon, ArrowRightIcon, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

// Lazy loading for recharts components if needed
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart,
  Line
} from 'recharts';

interface ComparisonResult {
  success: boolean;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  strategies: {
    [key: string]: {
      pnl: number;
      pnlPercent: number;
      winRate: number;
      maxDrawdown: number;
      sharpeRatio: number;
      tradeCount: number;
      chartDataUrl?: string;
    }
  }
}

interface StrategyChartData {
  name: string;
  pnl: number;
  pnlPercent: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export function StrategySimulationComparison() {
  const { toast } = useToast();
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  // Function to run the strategy comparison
  const runStrategyComparison = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Missing dates',
        description: 'Please select both start and end dates',
        variant: 'destructive',
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        title: 'Invalid date range',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsComparing(true);
      
      const response = await apiRequest('/api/ml/optimization/strategy-simulation/compare', 'POST', {
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      });
      
      if (response.success && response.data) {
        setComparisonResults(response.data);
        toast({
          title: 'Comparison Complete',
          description: 'Strategy comparison finished successfully',
          variant: 'default',
        });
        
        // Switch to result view
        setActiveTab('results');
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to compare strategies',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error comparing strategies:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during comparison',
        variant: 'destructive',
      });
    } finally {
      setIsComparing(false);
    }
  };

  // Convert comparison results to chart data
  const getChartData = (): StrategyChartData[] => {
    if (!comparisonResults || !comparisonResults.strategies) return [];
    
    return Object.entries(comparisonResults.strategies).map(([strategyType, data]) => ({
      name: strategyType.charAt(0).toUpperCase() + strategyType.slice(1), // Capitalize strategy name
      pnl: data.pnl,
      pnlPercent: data.pnlPercent * 100,
      winRate: data.winRate * 100,
      maxDrawdown: data.maxDrawdown * 100,
      sharpeRatio: data.sharpeRatio
    }));
  };

  // Get background color for PnL values
  const getPnLColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  // Get icon for trend direction
  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 inline ml-1 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 inline ml-1 text-red-500" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Setup</TabsTrigger>
          <TabsTrigger value="results" disabled={!comparisonResults}>Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Comparison Setup</CardTitle>
              <CardDescription>
                Compare different strategy types (conservative, balanced, aggressive) on the same market data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Trading Pair</Label>
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                    <SelectTrigger id="symbol">
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                    <SelectTrigger id="timeframe">
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        disabled={(date) => 
                          date > new Date() || (endDate ? date > endDate : false)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) => 
                          date > new Date() || (startDate ? date < startDate : false)
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Strategies to Compare:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">Conservative</Badge>
                    <span className="text-sm text-muted-foreground">Lower risk, moderate returns</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800">Balanced</Badge>
                    <span className="text-sm text-muted-foreground">Medium risk & returns</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800">Aggressive</Badge>
                    <span className="text-sm text-muted-foreground">Higher risk & potential returns</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={runStrategyComparison} 
                disabled={isComparing || !startDate || !endDate}
                className="w-full"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Comparison...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Compare Strategies
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          {comparisonResults ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Strategy Comparison Results</CardTitle>
                      <CardDescription>
                        Comparison for {comparisonResults.symbol} on {comparisonResults.timeframe} timeframe
                        <br />
                        Period: {format(new Date(comparisonResults.startDate), "MMM dd, yyyy")} to {format(new Date(comparisonResults.endDate), "MMM dd, yyyy")}
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab('overview')}>
                      New Comparison
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="pnlPercent" name="PnL %" fill="#8884d8" />
                        <Bar dataKey="winRate" name="Win Rate %" fill="#82ca9d" />
                        <Bar dataKey="sharpeRatio" name="Sharpe Ratio" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {Object.entries(comparisonResults.strategies).map(([strategyType, data]) => (
                      <Card key={strategyType}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">
                            {strategyType.charAt(0).toUpperCase() + strategyType.slice(1)} Strategy
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">PnL</span>
                            <span className={`text-sm font-medium ${getPnLColor(data.pnl)}`}>
                              ${data.pnl.toFixed(2)} ({(data.pnlPercent * 100).toFixed(2)}%)
                              {getTrendIcon(data.pnl)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Win Rate</span>
                            <span className="text-sm font-medium">
                              {(data.winRate * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Max Drawdown</span>
                            <span className="text-sm font-medium text-red-500">
                              {(data.maxDrawdown * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Trades</span>
                            <span className="text-sm font-medium">{data.tradeCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                            <span className="text-sm font-medium">{data.sharpeRatio.toFixed(2)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-2">Analysis Summary</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      This comparison shows how different risk strategies would have performed over the selected time period.
                    </p>
                    
                    {(() => {
                      // Determine best strategy based on PnL and Sharpe ratio
                      const strategies = Object.entries(comparisonResults.strategies);
                      if (strategies.length === 0) return null;
                      
                      // Find best by PnL
                      const bestByPnl = strategies.reduce((best, current) => {
                        return current[1].pnl > best[1].pnl ? current : best;
                      }, strategies[0]);
                      
                      // Find best by Sharpe ratio
                      const bestBySharpe = strategies.reduce((best, current) => {
                        return current[1].sharpeRatio > best[1].sharpeRatio ? current : best;
                      }, strategies[0]);
                      
                      return (
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">Best PnL:</span> {' '}
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              {bestByPnl[0].charAt(0).toUpperCase() + bestByPnl[0].slice(1)}
                            </Badge> 
                            {' '} with {(bestByPnl[1].pnlPercent * 100).toFixed(2)}% return
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Best Risk-Adjusted:</span> {' '}
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                              {bestBySharpe[0].charAt(0).toUpperCase() + bestBySharpe[0].slice(1)}
                            </Badge>
                            {' '} with Sharpe ratio of {bestBySharpe[1].sharpeRatio.toFixed(2)}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground mb-4">No comparison results available</p>
                <Button variant="outline" onClick={() => setActiveTab('overview')}>
                  Set Up Comparison
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}