import React from 'react';
import { ConnectivityStatus } from "../components/connectivity-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { TradingInsightsSummaryNew } from "../components/ui/trading-insights-summary-new";
import { Link } from "wouter";
import { ArrowLeft, Home, RefreshCw } from "lucide-react";

interface EnvironmentVariable {
  name: string;
  exists: boolean;
}

interface ServerInfo {
  name: string;
  value: string;
}

function EnvironmentCard() {
  const [envInfo, setEnvInfo] = React.useState<EnvironmentVariable[]>([
    { name: 'VITE_API_URL', exists: Boolean(import.meta.env.VITE_API_URL) },
    { name: 'NODE_ENV', exists: Boolean(import.meta.env.MODE) }
  ]);

  const [serverInfo, setServerInfo] = React.useState<ServerInfo[]>([
    { name: 'User Agent', value: navigator.userAgent },
    { name: 'URL', value: window.location.href },
    { name: 'Pathname', value: window.location.pathname },
    { name: 'Origin', value: window.location.origin },
  ]);

  const hostType = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('.replit.dev')) return 'Replit';
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'Localhost';
    return 'Production';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Info</CardTitle>
        <CardDescription>
          Information about the current environment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <h3 className="font-medium mb-2">Host Information</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Host Type:</span>
              <span className="font-medium">{hostType()}</span>
              
              <span className="text-muted-foreground">Environment:</span>
              <span className="font-medium">{import.meta.env.MODE}</span>
              
              <span className="text-muted-foreground">Development:</span>
              <span className="font-medium">{import.meta.env.DEV ? 'Yes' : 'No'}</span>
              
              <span className="text-muted-foreground">Production:</span>
              <span className="font-medium">{import.meta.env.PROD ? 'Yes' : 'No'}</span>
            </div>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <h3 className="font-medium mb-2">Environment Variables</h3>
            <div className="space-y-1 text-sm">
              {envInfo.map((env) => (
                <div key={env.name} className="flex justify-between">
                  <span>{env.name}</span>
                  <span className={env.exists ? "text-green-600" : "text-red-600"}>
                    {env.exists ? "Defined" : "Not Defined"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <h3 className="font-medium mb-2">Server Information</h3>
            <div className="space-y-2 text-sm">
              {serverInfo.map((info) => (
                <div key={info.name}>
                  <div className="text-muted-foreground">{info.name}</div>
                  <code className="bg-muted block px-2 py-1 rounded text-xs break-all">
                    {info.value}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NetworkCard() {
  const [dnsResolvedIp, setDnsResolvedIp] = React.useState('Checking...');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Diagnostic</CardTitle>
        <CardDescription>
          Network configuration and connectivity information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <h3 className="font-medium mb-2">Connection Info</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Navigator Online:</span>
              <span className={navigator.onLine ? "text-green-600" : "text-red-600"}>
                {navigator.onLine ? "Online" : "Offline"}
              </span>
              
              <span className="text-muted-foreground">Connection Type:</span>
              <span className="font-medium">
                {/* @ts-ignore */}
                {navigator.connection ? navigator.connection.effectiveType : "Unknown"}
              </span>
              
              <span className="text-muted-foreground">Secure Context:</span>
              <span className={window.isSecureContext ? "text-green-600" : "text-yellow-600"}>
                {window.isSecureContext ? "Yes" : "No"}
              </span>
            </div>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <h3 className="font-medium mb-2">API Base URL</h3>
            <div className="space-y-1 text-sm">
              <div>
                <code className="bg-muted block px-2 py-1 rounded text-xs break-all">
                  {import.meta.env.VITE_API_URL || window.location.origin}
                </code>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiagnosticPage() {
  return (
    <div className="container py-8 max-w-6xl">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">System Diagnostics</h1>
          <p className="text-muted-foreground">
            Check system connectivity and troubleshoot API issues
          </p>
          
          {window.location.hostname.includes('.replit.dev') && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
              <strong>Note:</strong> This page may not render properly in Replit's embedded browser. 
              Try opening it directly at: <a 
                href={`https://${window.location.host}/diagnostics`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-blue-600"
              >
                https://{window.location.host}/diagnostics
              </a>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </header>
      
      <Tabs defaultValue="connectivity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connectivity">API Connectivity</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="trading-insights">Trading Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connectivity" className="space-y-4">
          <ConnectivityStatus />
        </TabsContent>
        
        <TabsContent value="environment" className="space-y-4">
          <EnvironmentCard />
        </TabsContent>
        
        <TabsContent value="network" className="space-y-4">
          <NetworkCard />
        </TabsContent>
        
        <TabsContent value="trading-insights" className="space-y-4">
          <TradingInsightsSummaryNew />
        </TabsContent>
      </Tabs>
    </div>
  );
}