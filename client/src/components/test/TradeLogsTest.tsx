import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTradeLog, getTradeLogsBySymbol, TradeLog } from '@/lib/tradeLogsApi';
import { Loader2 } from 'lucide-react';

export default function TradeLogsTest() {
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [quantity, setQuantity] = useState('0.1');
  const [entryPrice, setEntryPrice] = useState('65000');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<string[]>([]);

  // Add logging
  const addLog = (message: string) => {
    setApiLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...prev.slice(0, 19) // Keep only the last 20 logs
    ]);
  };

  // Load logs on mount
  useEffect(() => {
    addLog('Component mounted - using direct API mode');
    fetchLogs();
  }, []);

  const handleCreateLog = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      addLog(`Creating trade log: BUY ${quantity} ${symbol} @ ${entryPrice}`);
      
      const newLog = await createTradeLog({
        symbol,
        action: 'BUY',
        entry_price: entryPrice,
        quantity,
        trade_source: 'TEST_COMPONENT',
        status: 'EXECUTED',
        reason: 'Testing from TradeLogsTest component',
      });
      
      addLog(`Success! Created trade log with ID: ${newLog.id}`);
      setSuccess(`Successfully created trade log with ID: ${newLog.id}`);
      
      // Refresh logs
      fetchLogs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${errorMessage}`);
      setError(`Error creating trade log: ${errorMessage}`);
      console.error('Error creating trade log:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      addLog(`Fetching trade logs for symbol: ${symbol}`);
      
      const fetchedLogs = await getTradeLogsBySymbol(symbol, 10);
      
      addLog(`Received ${fetchedLogs.length} trade logs`);
      setLogs(fetchedLogs);
      setSuccess(`Successfully fetched ${fetchedLogs.length} trade logs`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${errorMessage}`);
      setError(`Error fetching trade logs: ${errorMessage}`);
      console.error('Error fetching trade logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trade Logs API Test</CardTitle>
          <CardDescription>
            Test the trade logs API using direct API endpoints
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form and Status Section */}
            <div>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="symbol" className="text-right">Symbol</Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">Quantity</Label>
                  <Input
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="entryPrice" className="text-right">Entry Price</Label>
                  <Input
                    id="entryPrice"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-4">
                <Button 
                  onClick={fetchLogs} 
                  variant="outline" 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : 'Fetch Logs'}
                </Button>
                
                <Button 
                  onClick={handleCreateLog} 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : 'Create Log'}
                </Button>
              </div>
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
                  <strong className="font-bold">Error:</strong>
                  <span className="block sm:inline"> {error}</span>
                </div>
              )}
              
              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative my-4">
                  <strong className="font-bold">Success:</strong>
                  <span className="block sm:inline"> {success}</span>
                </div>
              )}
            </div>
            
            {/* API Logs Section */}
            <div>
              <h3 className="font-semibold mb-2">API Communication Log:</h3>
              <div className="bg-slate-900 text-slate-50 p-3 rounded-md text-xs font-mono h-[240px] overflow-y-auto">
                {apiLogs.length === 0 ? (
                  <div className="text-slate-400 italic">No API logs yet...</div>
                ) : (
                  apiLogs.map((log, index) => (
                    <div key={index} className="mb-1 leading-relaxed">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Trade Logs</CardTitle>
          <CardDescription>
            Recent trade logs for {symbol}
            {logs.length > 0 && ` (${logs.length} entries)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p>Loading trade logs...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b">
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium">Symbol</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">Entry Price</th>
                    <th className="px-4 py-3 text-left font-medium">Quantity</th>
                    <th className="px-4 py-3 text-left font-medium">Source</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3">{log.id}</td>
                      <td className="px-4 py-3">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3">{log.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.action === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entry_price}</td>
                      <td className="px-4 py-3">{log.quantity}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {log.trade_source}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg text-slate-500">No trade logs found.</p>
              <p className="text-sm text-slate-400 mt-2">Create a log or fetch existing logs for {symbol}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}