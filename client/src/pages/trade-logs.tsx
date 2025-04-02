import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Type definitions
interface TradeLog {
  id: number;
  timestamp: string;
  symbol: string;
  action: string;
  entry_price: string;
  quantity: string;
  predicted_confidence?: number;
  trade_source: string;
  status: string;
  reason?: string;
  user_id?: number;
  position_id?: number;
  trade_id?: string;
  metadata?: any;
}

// Filter types
interface Filters {
  symbol: string;
  action: string;
  source: string;
  status: string;
  userId: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
}

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'EXECUTED':
      return <CheckCircle className="text-green-500" />;
    case 'FAILED':
      return <XCircle className="text-red-500" />;
    case 'QUEUED':
    case 'PROCESSING':
      return <Clock className="text-yellow-500" />;
    case 'CANCELED':
      return <XCircle className="text-gray-500" />;
    case 'REJECTED':
      return <AlertCircle className="text-red-400" />;
    default:
      return <Activity className="text-blue-500" />;
  }
};

const getActionIcon = (action: string) => {
  switch (action.toUpperCase()) {
    case 'BUY':
      return <TrendingUp className="text-green-500" />;
    case 'SELL':
      return <TrendingDown className="text-red-500" />;
    default:
      return <Activity className="text-blue-500" />;
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'EXECUTED':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'FAILED':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    case 'QUEUED':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'CANCELED':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

export default function TradeLogsPage() {
  const [activeTab, setActiveTab] = useState('recent');
  const [filters, setFilters] = useState<Filters>({
    symbol: '',
    action: '',
    source: '',
    status: '',
    userId: '',
    fromDate: undefined,
    toDate: undefined,
  });

  // Helper function to build query parameters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (filters.symbol) params.append('symbol', filters.symbol);
    if (filters.action && filters.action !== 'ALL') params.append('action', filters.action);
    if (filters.source) params.append('source', filters.source);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.userId) params.append('userId', filters.userId);
    
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate.toISOString());
    }
    
    if (filters.toDate) {
      params.append('toDate', filters.toDate.toISOString());
    }
    
    return params.toString();
  }, [filters]);

  // Fetch trade logs data from API
  const { data: tradeLogs, isLoading, error, refetch } = useQuery({
    queryKey: ['/direct-api/trade-logs/search', buildQueryParams()],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      console.log(`Fetching trade logs with params: ${queryParams}`);
      const response = await fetch(`/direct-api/trade-logs/search?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trade logs');
      }
      
      const data = await response.json();
      console.log('Trade logs response:', data);
      // The API returns an array directly
      return Array.isArray(data) ? data : [];
    },
  });

  // Stats query for dashboard
  const { data: tradeStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['/direct-api/trade-logs'],
    queryFn: async () => {
      const response = await fetch('/direct-api/trade-logs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch trade stats');
      }
      
      const logs = await response.json();
      
      // Calculate summary statistics from logs
      const executedTrades = logs.filter((log: TradeLog) => log.status === 'EXECUTED').length;
      const totalTrades = logs.length;
      
      const summary = {
        totalTrades,
        executedTrades,
        failedTrades: logs.filter((log: TradeLog) => ['FAILED', 'REJECTED'].includes(log.status)).length,
        buyTrades: logs.filter((log: TradeLog) => log.action === 'BUY').length,
        sellTrades: logs.filter((log: TradeLog) => log.action === 'SELL').length,
        uniqueSymbols: new Set(logs.map((log: TradeLog) => log.symbol)).size,
        tradeSources: new Set(logs.map((log: TradeLog) => log.trade_source)).size,
        successRate: totalTrades ? (executedTrades / totalTrades) * 100 : 0
      };
      
      return summary;
    },
  });

  // Prepare chart data
  const prepareStatusChartData = useCallback(() => {
    if (!tradeLogs) return [];
    
    const statusCounts: Record<string, number> = {};
    
    tradeLogs.forEach((log: TradeLog) => {
      if (!statusCounts[log.status]) {
        statusCounts[log.status] = 0;
      }
      statusCounts[log.status]++;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count
    }));
  }, [tradeLogs]);
  
  const prepareActionChartData = useCallback(() => {
    if (!tradeLogs) return [];
    
    const actionCounts: Record<string, number> = {};
    
    tradeLogs.forEach((log: TradeLog) => {
      if (!actionCounts[log.action]) {
        actionCounts[log.action] = 0;
      }
      actionCounts[log.action]++;
    });
    
    return Object.entries(actionCounts).map(([action, count]) => ({
      name: action,
      value: count
    }));
  }, [tradeLogs]);

  const statusChartData = prepareStatusChartData();
  const actionChartData = prepareActionChartData();
  
  // Color arrays for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Handle filter changes
  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      symbol: '',
      action: '',
      source: '',
      status: '',
      userId: '',
      fromDate: undefined,
      toDate: undefined,
    });
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Trade Logs Dashboard</h1>
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent">Recent Trades</TabsTrigger>
            <TabsTrigger value="filtered">Filtered View</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

        {/* Recent Trades Tab */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trade Logs</CardTitle>
              <CardDescription>
                View the most recent trade activities across all users and systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p>Loading trade logs...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle />
                    <p>Failed to load trade logs</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>A list of your recent trades</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Timestamp</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>User ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tradeLogs && tradeLogs.length > 0 ? (
                        tradeLogs.map((log: TradeLog) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>{log.symbol}</TableCell>
                            <TableCell className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              {log.action}
                            </TableCell>
                            <TableCell>{log.entry_price}</TableCell>
                            <TableCell>{log.quantity}</TableCell>
                            <TableCell>{log.trade_source}</TableCell>
                            <TableCell>
                              <Badge className={cn(getStatusBadgeColor(log.status))}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(log.status)}
                                  {log.status}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>{log.user_id || 'N/A'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            No trade logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filtered View Tab */}
        <TabsContent value="filtered">
          <Card>
            <CardHeader>
              <CardTitle>Filtered Trade Logs</CardTitle>
              <CardDescription>
                Apply filters to search for specific trade logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g., BTCUSDT"
                    value={filters.symbol}
                    onChange={(e) => handleFilterChange('symbol', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={filters.action}
                    onValueChange={(value) => handleFilterChange('action', value)}
                  >
                    <SelectTrigger id="action">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="e.g., AI_GRID_BOT"
                    value={filters.source}
                    onChange={(e) => handleFilterChange('source', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="EXECUTED">EXECUTED</SelectItem>
                      <SelectItem value="FAILED">FAILED</SelectItem>
                      <SelectItem value="QUEUED">QUEUED</SelectItem>
                      <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                      <SelectItem value="CANCELED">CANCELED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    placeholder="User ID"
                    value={filters.userId}
                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Date Range</Label>
                  </div>
                  <div className="flex gap-2">
                    {/* From Date */}
                    <div className="w-1/2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.fromDate ? (
                              format(filters.fromDate, "PPP")
                            ) : (
                              <span>From date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.fromDate}
                            onSelect={(date) => handleFilterChange('fromDate', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* To Date */}
                    <div className="w-1/2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.toDate ? (
                              format(filters.toDate, "PPP")
                            ) : (
                              <span>To date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.toDate}
                            onSelect={(date) => handleFilterChange('toDate', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mb-6">
                <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Clear Filters
                </Button>
                <Button onClick={() => refetch()} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Apply Filters
                </Button>
              </div>

              <Separator className="my-6" />

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p>Loading filtered trade logs...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle />
                    <p>Failed to load trade logs</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>Filtered trade logs</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Timestamp</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tradeLogs && tradeLogs.length > 0 ? (
                        tradeLogs.map((log: TradeLog) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>{log.symbol}</TableCell>
                            <TableCell className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              {log.action}
                            </TableCell>
                            <TableCell>{log.entry_price}</TableCell>
                            <TableCell>{log.quantity}</TableCell>
                            <TableCell>{log.trade_source}</TableCell>
                            <TableCell>
                              <Badge className={cn(getStatusBadgeColor(log.status))}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(log.status)}
                                  {log.status}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>{log.reason || 'N/A'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            No matching trade logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trade Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Trade Status Distribution</CardTitle>
                <CardDescription>
                  Distribution of trades by status
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isStatsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Trade Action Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Trade Action Distribution</CardTitle>
                <CardDescription>
                  Distribution of trades by action type
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isStatsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={actionChartData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Trade Summary Stats */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Trade Summary Statistics</CardTitle>
                <CardDescription>
                  Overview of trading activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-muted-foreground text-sm">Total Trades</div>
                      <div className="text-2xl font-bold">{tradeStats?.totalTrades || 0}</div>
                    </div>
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-muted-foreground text-sm">Executed Trades</div>
                      <div className="text-2xl font-bold text-green-500">{tradeStats?.executedTrades || 0}</div>
                    </div>
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-muted-foreground text-sm">Failed Trades</div>
                      <div className="text-2xl font-bold text-red-500">{tradeStats?.failedTrades || 0}</div>
                    </div>
                    <div className="bg-card rounded-lg p-4 border">
                      <div className="text-muted-foreground text-sm">Success Rate</div>
                      <div className="text-2xl font-bold">
                        {tradeStats?.successRate ? `${tradeStats.successRate.toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}