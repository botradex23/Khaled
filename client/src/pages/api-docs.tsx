import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '../components/ui/accordion';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { Loader2, AlertCircle, Terminal, Send, ArrowRight, FileJson, Play, Settings, Database, BrainCircuit, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

export default function ApiDocs() {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState('GET');
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  
  // Query to check the ML API status
  const { data: mlApiStatus, isLoading: isLoadingMlStatus, error: mlApiError } = useQuery({
    queryKey: ['/api/python/status'],
    queryFn: async () => {
      const response = await fetch('/api/python/status');
      if (!response.ok) throw new Error('Failed to fetch ML API status');
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  // Query to get ML API documentation
  const { data: mlApiDocs, isLoading: isLoadingMlDocs } = useQuery({
    queryKey: ['/api/python/docs'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/python/docs');
        if (response.ok) {
          return response.json();
        }
        
        // If the Python API docs endpoint is not available yet, return a default structure
        return {
          endpoints: [
            {
              path: '/api/status',
              methods: ['GET'],
              description: 'Check the status of the ML API',
              parameters: [],
              response: {
                example: {
                  success: true,
                  version: '1.0.0',
                  environment: 'production'
                }
              }
            },
            {
              path: '/api/models',
              methods: ['GET'],
              description: 'Get information about all available ML models',
              parameters: [],
              response: {
                example: {
                  success: true,
                  models: [
                    {
                      id: 'btcusd_1h',
                      name: 'Bitcoin USD (1h)',
                      timeframe: '1h',
                      symbol: 'BTCUSD',
                      accuracy: 0.78,
                      last_trained: '2025-04-09T10:15:23Z'
                    }
                  ]
                }
              }
            },
            {
              path: '/api/models/:id',
              methods: ['GET'],
              description: 'Get detailed information about a specific ML model',
              parameters: [
                {
                  name: 'id',
                  type: 'path',
                  description: 'The model ID (e.g., btcusd_1h)',
                  required: true
                }
              ],
              response: {
                example: {
                  success: true,
                  model: {
                    id: 'btcusd_1h',
                    name: 'Bitcoin USD (1h)',
                    timeframe: '1h',
                    symbol: 'BTCUSD',
                    accuracy: 0.78,
                    last_trained: '2025-04-09T10:15:23Z',
                    performance_metrics: {
                      precision: 0.81,
                      recall: 0.75,
                      f1_score: 0.78
                    },
                    features: ['close', 'volume', 'rsi', 'macd']
                  }
                }
              }
            },
            {
              path: '/api/predictions/:symbol',
              methods: ['GET'],
              description: 'Get price predictions for a specific trading pair',
              parameters: [
                {
                  name: 'symbol',
                  type: 'path',
                  description: 'The trading pair symbol (e.g., BTCUSD)',
                  required: true
                },
                {
                  name: 'timeframe',
                  type: 'query',
                  description: 'Timeframe for the prediction (1h, 4h, 1d)',
                  required: false
                }
              ],
              response: {
                example: {
                  success: true,
                  symbol: 'BTCUSD',
                  timeframe: '1h',
                  predictions: [
                    {
                      timestamp: '2025-04-09T13:00:00Z',
                      predicted_price: 75234.45,
                      confidence: 0.85,
                      direction: 'up'
                    }
                  ]
                }
              }
            },
            {
              path: '/api/optimization/performance',
              methods: ['GET'],
              description: 'Get performance metrics for optimization strategies',
              parameters: [],
              response: {
                example: {
                  success: true,
                  strategies: [
                    {
                      id: 'xgboost_btcusd',
                      name: 'XGBoost BTC/USD Strategy',
                      performance: {
                        sharpe_ratio: 1.85,
                        max_drawdown: 0.15,
                        annual_return: 0.45
                      }
                    }
                  ]
                }
              }
            },
            {
              path: '/api/optimization/start',
              methods: ['POST'],
              description: 'Start optimization process for a specific strategy',
              parameters: [
                {
                  name: 'strategy_id',
                  type: 'body',
                  description: 'The strategy ID to optimize',
                  required: true
                },
                {
                  name: 'parameters',
                  type: 'body',
                  description: 'Configuration parameters for the optimization',
                  required: false
                }
              ],
              response: {
                example: {
                  success: true,
                  job_id: 'opt_12345',
                  estimated_completion: '2025-04-09T14:30:00Z'
                }
              }
            }
          ]
        };
      } catch (error) {
        console.error('Error fetching ML API docs:', error);
        return {
          endpoints: []
        };
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  // Main Express API endpoints
  const expressApiEndpoints = [
    {
      path: '/api/global-market/prices',
      methods: ['GET'],
      description: 'Get current market prices for all trading pairs',
      parameters: [
        {
          name: 'symbol',
          type: 'query',
          description: 'Filter by specific symbol (e.g., BTCUSD)',
          required: false
        },
        {
          name: 'limit',
          type: 'query',
          description: 'Limit the number of results',
          required: false
        }
      ],
      response: {
        example: {
          success: true,
          prices: [
            {
              symbol: 'BTCUSD',
              price: 75000.45,
              timestamp: '2025-04-09T12:00:00Z'
            }
          ]
        }
      }
    },
    {
      path: '/api/global-market/tickers',
      methods: ['GET'],
      description: 'Get detailed ticker information for trading pairs',
      parameters: [
        {
          name: 'symbol',
          type: 'query',
          description: 'Filter by specific symbol (e.g., BTCUSD)',
          required: false
        }
      ],
      response: {
        example: {
          success: true,
          tickers: [
            {
              symbol: 'BTCUSD',
              price: 75000.45,
              high: 76000.00,
              low: 74500.00,
              volume: 1250.34,
              change: 2.5,
              timestamp: '2025-04-09T12:00:00Z'
            }
          ]
        }
      }
    },
    {
      path: '/api/user-trading/balance',
      methods: ['GET'],
      description: 'Get user account balance information',
      auth: true,
      parameters: [],
      response: {
        example: {
          success: true,
          balances: [
            {
              asset: 'BTC',
              free: 0.25,
              locked: 0.0,
              total: 0.25
            },
            {
              asset: 'USD',
              free: 15000.0,
              locked: 0.0,
              total: 15000.0
            }
          ]
        }
      }
    },
    {
      path: '/api/user-trading/orders',
      methods: ['GET', 'POST'],
      description: 'Get user orders or create a new order',
      auth: true,
      parameters: [
        {
          name: 'symbol',
          type: 'body',
          description: 'Trading pair symbol (e.g., BTCUSD)',
          required: true,
          methods: ['POST']
        },
        {
          name: 'side',
          type: 'body',
          description: 'Order side (BUY or SELL)',
          required: true,
          methods: ['POST']
        },
        {
          name: 'type',
          type: 'body',
          description: 'Order type (LIMIT or MARKET)',
          required: true,
          methods: ['POST']
        },
        {
          name: 'quantity',
          type: 'body',
          description: 'Order quantity',
          required: true,
          methods: ['POST']
        },
        {
          name: 'price',
          type: 'body',
          description: 'Order price (required for LIMIT orders)',
          required: false,
          methods: ['POST']
        }
      ],
      response: {
        example: {
          success: true,
          order: {
            id: 'ord_12345',
            symbol: 'BTCUSD',
            side: 'BUY',
            type: 'LIMIT',
            quantity: 0.1,
            price: 74500.0,
            status: 'NEW',
            created_at: '2025-04-09T12:05:23Z'
          }
        }
      }
    },
    {
      path: '/api/binance/api-keys',
      methods: ['GET', 'POST'],
      description: 'Get or configure Binance API keys',
      auth: true,
      parameters: [
        {
          name: 'apiKey',
          type: 'body',
          description: 'Binance API key',
          required: true,
          methods: ['POST']
        },
        {
          name: 'secretKey',
          type: 'body',
          description: 'Binance Secret key',
          required: true,
          methods: ['POST']
        },
        {
          name: 'allowedIp',
          type: 'body',
          description: 'IP address allowed for API access',
          required: false,
          methods: ['POST']
        },
        {
          name: 'testnet',
          type: 'body',
          description: 'Whether to use Binance testnet',
          required: false,
          methods: ['POST']
        }
      ],
      response: {
        example: {
          success: true,
          hasBinanceApiKey: true,
          hasBinanceSecretKey: true
        }
      }
    },
    {
      path: '/api/status',
      methods: ['GET'],
      description: 'Check the status of the API server',
      parameters: [],
      response: {
        example: {
          status: 'ok',
          timestamp: '2025-04-09T12:00:00Z',
          message: 'Server is running',
          version: '1.0.0'
        }
      }
    }
  ];
  
  // Render the parameters table for the selected endpoint
  const renderParametersTable = (endpoint: any) => {
    const parameters = endpoint?.parameters || [];
    if (parameters.length === 0) return <p className="text-muted-foreground italic">No parameters required</p>;
    
    // Filter parameters by HTTP method if specified
    const filteredParams = parameters.filter((param: any) => 
      !param.methods || param.methods.includes(selectedMethod)
    );
    
    if (filteredParams.length === 0) return <p className="text-muted-foreground italic">No parameters required for {selectedMethod} requests</p>;
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredParams.map((param: any, index: number) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{param.name}</TableCell>
              <TableCell>
                <Badge variant={
                  param.type === 'path' ? 'default' :
                  param.type === 'query' ? 'outline' :
                  param.type === 'body' ? 'secondary' : 'destructive'
                }>
                  {param.type}
                </Badge>
              </TableCell>
              <TableCell>{param.required ? 'Yes' : 'No'}</TableCell>
              <TableCell>{param.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Format JSON for display
  const formatJson = (json: any) => {
    return JSON.stringify(json, null, 2);
  };
  
  // Handle endpoint selection
  const handleEndpointSelect = (endpoint: any, method: string) => {
    setSelectedEndpoint(endpoint);
    setSelectedMethod(method);
  };
  
  // Render the API status indicator
  const renderApiStatus = (apiType: 'express' | 'ml') => {
    if (apiType === 'express') {
      return (
        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-300">
          Online
        </Badge>
      );
    } else if (apiType === 'ml') {
      if (isLoadingMlStatus) {
        return (
          <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-300">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        );
      } else if (mlApiError || !mlApiStatus) {
        return (
          <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-300">
            Offline
          </Badge>
        );
      } else {
        return (
          <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-300">
            Online
          </Badge>
        );
      }
    }
  };
  
  return (
    <div className="container py-20 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Complete documentation for the Tradeliy API endpoints
        </p>
      </div>
      
      {!mlApiStatus && !isLoadingMlStatus && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ML API Unavailable</AlertTitle>
          <AlertDescription>
            The Machine Learning API is currently unavailable. Some features may not work as expected.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="express" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="express" className="flex items-center">
            <Terminal className="h-4 w-4 mr-2" />
            Express API {renderApiStatus('express')}
          </TabsTrigger>
          <TabsTrigger value="ml" className="flex items-center">
            <BrainCircuit className="h-4 w-4 mr-2" />
            ML API {renderApiStatus('ml')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="express" className="w-full">
          <div className="grid md:grid-cols-5 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  API Endpoints
                </CardTitle>
                <CardDescription>Select an endpoint to view details</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {expressApiEndpoints.map((endpoint, index) => (
                    <AccordionItem value={`endpoint-${index}`} key={index}>
                      <AccordionTrigger className="hover:no-underline">
                        <span className="text-sm font-medium">{endpoint.path}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {endpoint.methods.map((method) => (
                              <Button 
                                key={method} 
                                variant={selectedMethod === method && selectedEndpoint?.path === endpoint.path ? "default" : "outline"} 
                                size="sm"
                                onClick={() => handleEndpointSelect(endpoint, method)}
                                className={
                                  method === 'GET' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                  method === 'POST' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                  method === 'PUT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                                  method === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : ''
                                }
                              >
                                {method}
                              </Button>
                            ))}
                          </div>
                          {endpoint.auth && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              Requires Authentication
                            </Badge>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileJson className="h-4 w-4 mr-2" />
                  {selectedEndpoint ? (
                    <span>
                      <span className={
                        selectedMethod === 'GET' ? 'text-blue-600' :
                        selectedMethod === 'POST' ? 'text-green-600' :
                        selectedMethod === 'PUT' ? 'text-yellow-600' :
                        selectedMethod === 'DELETE' ? 'text-red-600' : ''
                      }>
                        {selectedMethod}
                      </span>
                      {' '}
                      {selectedEndpoint.path}
                    </span>
                  ) : (
                    <span>Endpoint Details</span>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedEndpoint?.description || 'Select an endpoint to view its details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEndpoint ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Parameters</h3>
                      {renderParametersTable(selectedEndpoint)}
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Example Response</h3>
                      <pre className="p-4 rounded-md bg-muted text-xs overflow-auto">
                        {formatJson(selectedEndpoint.response.example)}
                      </pre>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Try it</h3>
                      <Button className="w-full flex items-center justify-center gap-2">
                        <Play className="h-4 w-4" />
                        Test Endpoint
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Settings className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select an endpoint from the list to view its details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="ml" className="w-full">
          <div className="grid md:grid-cols-5 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BrainCircuit className="h-4 w-4 mr-2" />
                  ML API Endpoints
                </CardTitle>
                <CardDescription>
                  Machine Learning and Prediction Endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingMlDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {(mlApiDocs?.endpoints || []).map((endpoint: any, index: number) => (
                      <AccordionItem value={`ml-endpoint-${index}`} key={index}>
                        <AccordionTrigger className="hover:no-underline">
                          <span className="text-sm font-medium">{endpoint.path}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {endpoint.methods.map((method: string) => (
                                <Button 
                                  key={method} 
                                  variant={selectedMethod === method && selectedEndpoint?.path === endpoint.path ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => handleEndpointSelect(endpoint, method)}
                                  className={
                                    method === 'GET' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                    method === 'POST' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                    method === 'PUT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                                    method === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : ''
                                  }
                                >
                                  {method}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileJson className="h-4 w-4 mr-2" />
                  {selectedEndpoint ? (
                    <span>
                      <span className={
                        selectedMethod === 'GET' ? 'text-blue-600' :
                        selectedMethod === 'POST' ? 'text-green-600' :
                        selectedMethod === 'PUT' ? 'text-yellow-600' :
                        selectedMethod === 'DELETE' ? 'text-red-600' : ''
                      }>
                        {selectedMethod}
                      </span>
                      {' '}
                      {selectedEndpoint.path}
                    </span>
                  ) : (
                    <span>Endpoint Details</span>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedEndpoint?.description || 'Select an endpoint to view its details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEndpoint ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Parameters</h3>
                      {renderParametersTable(selectedEndpoint)}
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Example Response</h3>
                      <pre className="p-4 rounded-md bg-muted text-xs overflow-auto">
                        {formatJson(selectedEndpoint.response.example)}
                      </pre>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Try it</h3>
                      <Button className="w-full flex items-center justify-center gap-2">
                        <Play className="h-4 w-4" />
                        Test Endpoint
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BrainCircuit className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select an ML API endpoint from the list to view its details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}