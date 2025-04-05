import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, WifiOff, Loader2 } from 'lucide-react';

interface ApiStatus {
  endpoint: string;
  status: 'success' | 'error' | 'loading';
  responseTime?: number;
  error?: string;
  data?: any;
}

const API_ENDPOINTS = [
  { name: 'Health Check', path: '/api/health' },
  { name: 'AI Trading Signals', path: '/api/ai/trading/signals' },
  { name: 'Database Status', path: '/api/db/status' }
];

export function ConnectivityStatus() {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [networkInfo, setNetworkInfo] = useState<{
    online: boolean;
    hostname: string;
    protocol: string;
    origin: string;
  }>({
    online: navigator.onLine,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    origin: window.location.origin
  });

  const checkApi = async (endpoint: string) => {
    setApiStatuses(prev => {
      const existing = [...prev];
      const index = existing.findIndex(item => item.endpoint === endpoint);
      if (index >= 0) {
        existing[index] = { ...existing[index], status: 'loading' };
      } else {
        existing.push({ endpoint, status: 'loading' });
      }
      return existing;
    });

    try {
      console.log(`Checking API endpoint: ${endpoint}`);
      
      // Determine if we're in Replit environment
      const isReplit = window.location.hostname.includes('.replit.dev');
      
      // In Replit we need to use the full URL including origin
      const fullUrl = isReplit && endpoint.startsWith('/api') 
        ? `${window.location.origin}${endpoint}`
        : endpoint;
        
      console.log(`Full URL: ${fullUrl}`);
      
      const startTime = performance.now();
      const response = await fetch(fullUrl, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        },
        // Add cache busting parameter
        cache: 'no-cache',
      });
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText || response.statusText}`);
      }

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setApiStatuses(prev => {
        const existing = [...prev];
        const index = existing.findIndex(item => item.endpoint === endpoint);
        if (index >= 0) {
          existing[index] = { 
            endpoint, 
            status: 'success', 
            responseTime,
            data
          };
        } else {
          existing.push({ 
            endpoint, 
            status: 'success', 
            responseTime,
            data
          });
        }
        return existing;
      });
    } catch (error: any) {
      console.error(`API check failed for ${endpoint}:`, error);
      
      setApiStatuses(prev => {
        const existing = [...prev];
        const index = existing.findIndex(item => item.endpoint === endpoint);
        if (index >= 0) {
          existing[index] = { 
            endpoint, 
            status: 'error', 
            error: error.message
          };
        } else {
          existing.push({ 
            endpoint, 
            status: 'error', 
            error: error.message
          });
        }
        return existing;
      });
    }
  };

  const checkAllApis = async () => {
    setIsLoading(true);
    
    // Update network info
    setNetworkInfo({
      online: navigator.onLine,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      origin: window.location.origin
    });
    
    // Check all endpoints sequentially
    for (const endpoint of API_ENDPOINTS) {
      await checkApi(endpoint.path);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    checkAllApis();
    
    // Update online status on network changes
    const handleOnline = () => setNetworkInfo(prev => ({ ...prev, online: true }));
    const handleOffline = () => setNetworkInfo(prev => ({ ...prev, online: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {networkInfo.online ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          API Connectivity Status
        </CardTitle>
        <CardDescription>
          Check the connection status of critical API endpoints
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Network Status:</span>
              <Badge variant={networkInfo.online ? "default" : "destructive"}>
                {networkInfo.online ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Hostname:</span>
              <code className="bg-muted px-1 rounded">{networkInfo.hostname}</code>
            </div>
            <div className="flex justify-between">
              <span>Protocol:</span>
              <code className="bg-muted px-1 rounded">{networkInfo.protocol}</code>
            </div>
            <div className="flex justify-between">
              <span>Origin:</span>
              <code className="bg-muted px-1 rounded">{networkInfo.origin}</code>
            </div>
          </div>
          
          <div className="space-y-4">
            {isLoading && apiStatuses.length === 0 ? (
              API_ENDPOINTS.map((endpoint, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : (
              API_ENDPOINTS.map((endpoint) => {
                const statusData = apiStatuses.find(s => s.endpoint === endpoint.path);
                
                return (
                  <div 
                    key={endpoint.path} 
                    className={`border rounded-lg p-4 ${
                      statusData?.status === 'error' ? 'border-red-300 bg-red-50' : 
                      statusData?.status === 'success' ? 'border-green-300 bg-green-50' : 
                      'border-yellow-300 bg-yellow-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        {statusData?.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />}
                        {statusData?.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {statusData?.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                        {endpoint.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {statusData?.responseTime && (
                          <span className="text-xs text-muted-foreground">
                            {statusData.responseTime}ms
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => checkApi(endpoint.path)}
                          disabled={statusData?.status === 'loading'}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="mb-1">
                        <code className="bg-muted px-2 py-1 rounded text-xs">{endpoint.path}</code>
                      </div>
                      {statusData?.status === 'error' && (
                        <div className="text-red-600 mt-2">
                          <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                          {statusData.error}
                        </div>
                      )}
                      {statusData?.status === 'success' && (
                        <div className="text-green-700 mt-1 text-xs">
                          Response received successfully
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={checkAllApis}
          disabled={isLoading} 
          className="w-full flex gap-2 items-center"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isLoading ? 'Checking APIs...' : 'Refresh All'}
        </Button>
      </CardFooter>
    </Card>
  );
}