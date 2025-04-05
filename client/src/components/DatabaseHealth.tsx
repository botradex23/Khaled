import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Database, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DatabaseStatus {
  mongodb: {
    connected: boolean;
    isSimulated?: boolean;
    description?: string;
    error?: string | null;
  };
  timestamp: string;
  environment: string;
  critical: boolean;
}

export function DatabaseHealth() {
  const { data, error, isLoading, isError, refetch } = useQuery<DatabaseStatus>({
    queryKey: ['/api/database-status'],
    refetchInterval: 60000, // Refetch every minute
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Health
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        <CardDescription>
          Current database connection status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-6">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to fetch database status: {error?.toString()}
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">MongoDB Atlas:</span>
                {data.mongodb.connected ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Disconnected
                  </Badge>
                )}
              </div>
              
              {data.mongodb.description && (
                <p className="text-sm text-muted-foreground">
                  {data.mongodb.description}
                </p>
              )}
              
              {data.mongodb.error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Database Error</AlertTitle>
                  <AlertDescription>{data.mongodb.error}</AlertDescription>
                </Alert>
              )}
              
              {data.mongodb.isSimulated && (
                <Alert className="mt-2 bg-yellow-50 text-yellow-800 border-yellow-300">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Simulated Connection</AlertTitle>
                  <AlertDescription>
                    Using simulated database. Some features may not work correctly.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
              <span>Environment: {data.environment}</span>
              <span>Last checked: {formatTime(data.timestamp)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}