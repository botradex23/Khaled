import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTradeLog, getTradeLogsBySymbol, TradeLog } from '@/lib/tradeLogsApi';

export default function TradeLogsTest() {
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [quantity, setQuantity] = useState('0.1');
  const [entryPrice, setEntryPrice] = useState('50000');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateLog = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const newLog = await createTradeLog({
        symbol,
        action: 'BUY',
        entry_price: entryPrice,
        quantity,
        trade_source: 'TEST_COMPONENT',
        status: 'EXECUTED',
        reason: 'Testing from TradeLogsTest component',
      });
      
      setSuccess(`Successfully created trade log with ID: ${newLog.id}`);
      
      // Refresh logs
      fetchLogs();
    } catch (err) {
      setError(`Error creating trade log: ${(err as Error).message}`);
      console.error('Error creating trade log:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedLogs = await getTradeLogsBySymbol(symbol, 10);
      setLogs(fetchedLogs);
      setSuccess(`Successfully fetched ${fetchedLogs.length} trade logs`);
    } catch (err) {
      setError(`Error fetching trade logs: ${(err as Error).message}`);
      console.error('Error fetching trade logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Trade Logs API Test</CardTitle>
        <CardDescription>
          Test the trade logs API by creating and fetching logs
        </CardDescription>
      </CardHeader>
      
      <CardContent>
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
        
        <div className="mt-6">
          <h3 className="text-lg font-medium">Trade Logs</h3>
          
          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse mt-4">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Timestamp</th>
                    <th className="px-4 py-2 text-left">Symbol</th>
                    <th className="px-4 py-2 text-left">Action</th>
                    <th className="px-4 py-2 text-left">Entry Price</th>
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Source</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b">
                      <td className="px-4 py-2">{log.id}</td>
                      <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-2">{log.symbol}</td>
                      <td className="px-4 py-2">{log.action}</td>
                      <td className="px-4 py-2">{log.entry_price}</td>
                      <td className="px-4 py-2">{log.quantity}</td>
                      <td className="px-4 py-2">{log.trade_source}</td>
                      <td className="px-4 py-2">{log.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 mt-2">No trade logs found. Create a log or fetch existing logs.</p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-4">
        <Button 
          onClick={fetchLogs} 
          variant="outline" 
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Fetch Logs'}
        </Button>
        
        <Button 
          onClick={handleCreateLog} 
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Log'}
        </Button>
      </CardFooter>
    </Card>
  );
}