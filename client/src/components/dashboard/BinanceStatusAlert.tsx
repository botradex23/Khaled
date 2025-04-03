import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Server, Wifi, WifiOff, Clock, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { useToast } from "@/hooks/use-toast";

/**
 * Component for displaying Binance connection status with detailed information
 * and helpful guidance when connection issues are detected
 */
interface BinanceStatusData {
  timestamp: string;
  connection: {
    websocket: {
      connected: boolean;
      simulationMode: boolean;
      lastMessageTime: number;
    };
    marketData: {
      recentData: boolean;
      lastUpdateTime: string;
    };
    proxy: {
      usingProxy: boolean;
      current: { host: string; port: number } | null;
      connectionAttempts: number;
      maxRetries: number;
    };
  };
  credentials: {
    hasApiKeys: boolean;
  };
  errors: {
    lastConnectionError: string | null;
  };
}

interface BinanceStatusResponse {
  success: boolean;
  status: BinanceStatusData;
}

const BinanceStatusAlert: React.FC = () => {
  const [status, setStatus] = useState<BinanceStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to fetch connection status
  const fetchConnectionStatus = async () => {
    setLoading(true);
    try {
      // Use fetch directly for this simple GET request
      const response = await fetch('/api/status/binance-connection');
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json() as BinanceStatusResponse;
      if (data.success && data.status) {
        setStatus(data.status);
        setError(null);
      } else {
        setError('Could not retrieve status information');
      }
    } catch (err) {
      console.error('Error fetching Binance connection status:', err);
      setError('Failed to connect to status service');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch status on component mount and every 30 seconds
  useEffect(() => {
    fetchConnectionStatus();
    
    // Polling for updates every 30 seconds
    const intervalId = setInterval(fetchConnectionStatus, 30000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Format time difference for display
  const formatTimeDiff = (timestamp: string | number) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };
  
  // Determine overall status
  const determineStatusSeverity = (): 'ok' | 'warning' | 'error' => {
    if (!status) return 'error';
    
    // Critical connection issues
    if (!status.connection.websocket.connected && !status.connection.websocket.simulationMode) {
      return 'error';
    }
    
    // Working but with warnings (simulation mode or no API keys)
    if (status.connection.websocket.simulationMode || !status.credentials.hasApiKeys) {
      return 'warning';
    }
    
    // All systems go!
    return 'ok';
  };
  
  // Get status colors based on severity
  const getStatusStyles = () => {
    const severity = determineStatusSeverity();
    switch (severity) {
      case 'ok':
        return { 
          color: 'text-green-600', 
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          title: 'Connected to Binance'
        };
      case 'warning':
        return { 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
          title: 'Limited Connectivity'
        };
      case 'error':
        return { 
          color: 'text-red-600', 
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: <AlertCircle className="h-5 w-5 text-red-600" />,
          title: 'Connection Issues Detected'
        };
    }
  };
  
  const statusStyles = getStatusStyles();
  
  // Show loading state
  if (loading && !status) {
    return (
      <Alert className="border border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <AlertTitle className="text-blue-600">Checking Binance Connection...</AlertTitle>
        </div>
      </Alert>
    );
  }
  
  // Show error state if there's an issue with the status check itself
  if (error && !status) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Status Error</AlertTitle>
        <AlertDescription>
          Could not retrieve Binance connection status: {error}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Show nothing if status isn't yet loaded
  if (!status) {
    return null;
  }
  
  // If in simulation mode, show a prominent warning
  if (status.connection.websocket.simulationMode) {
    return (
      <Alert className="border-2 border-amber-400 bg-amber-50">
        <div className="flex justify-between items-start">
          <div className="flex gap-3 items-start">
            <div className="bg-amber-100 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <AlertTitle className="text-amber-800 font-semibold text-lg flex items-center gap-2">
                <span>Simulation Mode Active</span>
                <div className="px-2 py-0.5 text-xs bg-amber-200 text-amber-800 rounded-full font-medium animate-pulse">
                  Using Simulated Data
                </div>
              </AlertTitle>
              <AlertDescription className="text-gray-700 mt-2">
                <p className="mb-2 font-medium">
                  The application is currently running with simulated cryptocurrency price data. This is not real market data.
                </p>
                <div className="flex flex-col gap-1.5 mt-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>
                      Last update: {formatTimeDiff(status.connection.marketData.lastUpdateTime)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-amber-600" />
                    <span>
                      Server time: {formatTimeDiff(status.timestamp)}
                    </span>
                  </div>
                </div>
                
                {status.errors.lastConnectionError && (
                  <div className="mt-3 p-2.5 bg-amber-100 rounded-md text-sm border border-amber-200">
                    <div className="font-medium text-amber-800 mb-1">Connection Status:</div>
                    <div className="text-gray-700">{status.errors.lastConnectionError}</div>
                  </div>
                )}
                
                <div className="mt-4 p-2.5 bg-blue-50 rounded-md text-sm border border-blue-200">
                  <div className="font-medium text-blue-800 mb-1">What does this mean?</div>
                  <div className="text-gray-700">
                    The system is unable to connect to Binance API. 
                    The displayed prices are generated for demonstration purposes only and should not be used for actual trading decisions.
                  </div>
                </div>
              </AlertDescription>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchConnectionStatus}
              className="text-sm"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry Connection
            </Button>
          </div>
        </div>
      </Alert>
    );
  }
  
  // If missing API keys, show guidance on how to add them
  if (!status.credentials.hasApiKeys) {
    return (
      <Alert className={`border ${statusStyles.borderColor} ${statusStyles.bgColor}`}>
        <div className="flex justify-between items-start">
          <div className="flex gap-2 items-start">
            {statusStyles.icon}
            <div>
              <AlertTitle className={statusStyles.color}>
                Binance API Keys Required
              </AlertTitle>
              <AlertDescription className="text-gray-600 mt-1">
                <p>
                  To access your Binance account data and execute trades, you need to add your API keys.
                </p>
                
                <div className="mt-3 flex items-center gap-2">
                  <Link to="/settings">
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="text-sm"
                    >
                      Add API Keys
                    </Button>
                  </Link>
                </div>
              </AlertDescription>
            </div>
          </div>
        </div>
      </Alert>
    );
  }
  
  // If connected but with proxy issues, show information
  if (status.connection.proxy.usingProxy && status.connection.proxy.connectionAttempts > 0) {
    return (
      <Alert className={`border ${statusStyles.borderColor} ${statusStyles.bgColor}`}>
        <div className="flex justify-between items-start">
          <div className="flex gap-2 items-start">
            {statusStyles.icon}
            <div>
              <AlertTitle className={statusStyles.color}>
                {statusStyles.title}
              </AlertTitle>
              <AlertDescription className="text-gray-600 mt-1">
                <div className="flex items-center gap-2 mb-2">
                  {status.connection.websocket.connected ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-amber-500" />
                  )}
                  <span>
                    WebSocket: {status.connection.websocket.connected ? 'Connected' : 'Disconnected'}
                  </span>
                  
                  <Clock className="h-4 w-4 text-gray-500 ml-2" />
                  <span>
                    Last update: {formatTimeDiff(status.connection.marketData.lastUpdateTime)}
                  </span>
                </div>
                
                {status.connection.proxy.current && (
                  <div className="text-sm text-gray-500 mb-2">
                    <span>Using proxy: </span>
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                      {status.connection.proxy.current.host}:{status.connection.proxy.current.port}
                    </code>
                    <span className="ml-1">
                      (Attempt {status.connection.proxy.connectionAttempts}/{status.connection.proxy.maxRetries})
                    </span>
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchConnectionStatus}
              className="text-sm"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </Alert>
    );
  }
  
  // Default OK status with minimal info
  return (
    <Alert className={`border ${statusStyles.borderColor} ${statusStyles.bgColor}`}>
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          {statusStyles.icon}
          <AlertTitle className={statusStyles.color}>
            {statusStyles.title}
          </AlertTitle>
          
          <div className="ml-4 text-sm text-gray-500">
            Last update: {formatTimeDiff(status.connection.marketData.lastUpdateTime)}
          </div>
        </div>
        
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={fetchConnectionStatus}
          className="text-sm"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>
    </Alert>
  );
};

export default BinanceStatusAlert;