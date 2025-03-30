import { createHmac, randomBytes } from 'crypto';
import axios, { AxiosRequestConfig } from 'axios';

/**
 * OKX API Service - DEPRECATED
 * This service is maintained for backward compatibility only.
 * The system now uses Binance API exclusively.
 * All methods return simulated/dummy data instead of making actual API calls.
 */
export class OkxService {
  private baseUrl: string;
  apiKey: string;
  secretKey: string;
  passphrase: string;
  private isTestnet: boolean;

  constructor(
    apiKey: string = 'deprecated', 
    secretKey: string = 'deprecated', 
    passphrase: string = 'deprecated', 
    isTestnet: boolean = true
  ) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passphrase = passphrase;
    this.isTestnet = isTestnet;
    
    // Using dummy URL since we're not actually connecting
    this.baseUrl = 'https://www.okx.com';
    
    console.log('OKX Service initialized with dummy credentials - actual OKX connectivity is disabled');
  }
  
  /**
   * Always returns true for compatibility
   * @returns boolean indicating if API keys are configured
   */
  isConfigured(): boolean {
    return true; // Always return true to prevent API errors
  }
  
  /**
   * Check if the service has empty credentials
   * This is used by the AI trading system to avoid making API calls with empty credentials
   * @returns boolean indicating if API keys are empty
   */
  hasEmptyCredentials(): boolean {
    return !(this.apiKey && this.secretKey && this.passphrase);
  }
  
  /**
   * Get the base URL
   * Used by diagnostic tools to check connectivity
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Test the connection to the OKX API
   * Returns success response as we're not actually connecting
   */
  async ping(): Promise<{ success: boolean; message: string }> {
    console.log('OKX Service ping called (deprecated) - returning simulated success');
    return { 
      success: true, 
      message: 'OKX integration is deprecated. Using simulated responses.'
    };
  }

  /**
   * Get account information - simulated response
   * No actual API call is made
   */
  async getAccountInfo() {
    console.log('OKX Service getAccountInfo called (deprecated) - returning simulated data');
    return {
      code: '0',
      data: [{
        details: [
          {
            ccy: "BTC",
            availBal: "1.2",
            frozenBal: "0.2",
            bal: "1.4",
            eq: "116650.8", 
            eqUsd: "116650.8"
          },
          {
            ccy: "ETH",
            availBal: "10",
            frozenBal: "2",
            bal: "12",
            eq: "22981.44",
            eqUsd: "22981.44"
          },
          {
            ccy: "USDT",
            availBal: "14000",
            frozenBal: "1000",
            bal: "15000",
            eq: "15000",
            eqUsd: "15000"
          }
        ]
      }]
    };
  }
  
  /**
   * Get ticker information for a specific trading pair
   * @param symbol The trading pair symbol (e.g., "BTC-USDT")
   */
  async getTicker(symbol: string) {
    console.log(`OKX Service getTicker called (deprecated) for ${symbol} - using simulated data`);
    return {
      code: '0',
      data: [{
        instId: symbol,
        last: "69000.5",
        lastSz: "0.1",
        askPx: "69001.2",
        askSz: "0.5",
        bidPx: "68999.8",
        bidSz: "0.3",
        open24h: "68000.1",
        high24h: "69500.0",
        low24h: "67800.0",
        volCcy24h: "1250.5",
        vol24h: "86000000",
        ts: Date.now().toString()
      }]
    };
  }
  
  /**
   * Get market tickers for all available trading pairs
   * @returns Array of market tickers
   */
  async getMarketTickers() {
    console.log('OKX Service getMarketTickers called (deprecated) - using simulated data');
    const tickers = [
      { instId: 'BTC-USDT', last: '69000.5', askPx: '69001.2', bidPx: '68999.8', vol24h: '86000000', open24h: '68000.1', high24h: '69500.0', low24h: '67800.0' },
      { instId: 'ETH-USDT', last: '3800.2', askPx: '3801.5', bidPx: '3799.6', vol24h: '45000000', open24h: '3750.0', high24h: '3850.0', low24h: '3700.0' },
      { instId: 'SOL-USDT', last: '175.5', askPx: '175.8', bidPx: '175.3', vol24h: '12000000', open24h: '170.0', high24h: '178.0', low24h: '168.0' }
    ];
    return tickers;
  }
  
  /**
   * Get candlestick/kline data for a trading pair
   * @param symbol The trading pair symbol (e.g., "BTC-USDT")
   * @param timeframe The candlestick timeframe (e.g., "1m", "5m", "15m", "1H", "4H", "1D")
   * @param limit Number of candles to retrieve (max 100)
   */
  async getKlineData(symbol: string, timeframe: string = "15m", limit: number = 100) {
    console.log(`OKX Service getKlineData called (deprecated) for ${symbol} ${timeframe} - using simulated data`);
    
    // Generate simulated candle data
    const now = Date.now();
    const interval = 15 * 60 * 1000; // Default to 15 minutes
    
    const data = [];
    let price = 69000 + Math.random() * 1000;
    
    for (let i = 0; i < limit; i++) {
      const time = now - (limit - i) * interval;
      const open = price;
      const high = open * (1 + (Math.random() * 0.02));
      const low = open * (1 - (Math.random() * 0.02));
      const close = low + Math.random() * (high - low);
      const vol = 100000 + Math.random() * 900000;
      
      data.push([
        time.toString(),
        open.toFixed(2),
        high.toFixed(2),
        low.toFixed(2),
        close.toFixed(2),
        vol.toFixed(2)
      ]);
      
      price = close;
    }
    
    return {
      code: '0',
      data: data
    };
  }

  /**
   * Place an order on the exchange - simulated
   * @param symbol Trading pair symbol (e.g., "BTC-USDT")
   * @param side Buy or sell
   * @param type Market or limit order type
   * @param amount Amount to buy/sell
   * @param price Price for limit orders
   */
  async placeOrder(
    symbol: string,
    side: 'buy' | 'sell',
    type: 'market' | 'limit',
    amount: string,
    price?: string
  ): Promise<any> {
    console.log(`OKX Service placeOrder called (deprecated) - ${side} ${amount} ${symbol} at ${price || 'market price'}`);
    
    return {
      code: '0',
      data: [{
        clOrdId: 'mock-' + Date.now(),
        ordId: 'okx-mock-' + Date.now(),
        tag: '',
        sCode: '0',
        sMsg: 'Order placed successfully (simulated)'
      }]
    };
  }

  /**
   * Cancel an existing order - simulated
   * @param symbol Trading pair symbol
   * @param orderId Order ID to cancel
   */
  async cancelOrder(symbol: string, orderId: string): Promise<any> {
    console.log(`OKX Service cancelOrder called (deprecated) - ${symbol} order ${orderId}`);
    
    return {
      code: '0',
      data: [{
        clOrdId: '',
        ordId: orderId,
        sCode: '0',
        sMsg: 'Order cancelled successfully (simulated)'
      }]
    };
  }

  /**
   * Make a public request to the OKX API - SIMULATED
   * Returns dummy data instead of making actual API calls
   * @param endpoint The API endpoint to request
   * @param method The HTTP method to use
   * @param params Optional parameters to include in the request
   */
  async makePublicRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params: Record<string, any> = {}
  ): Promise<T> {
    console.log(`OKX Service makePublicRequest called (deprecated) - ${method} ${endpoint}`);
    
    // Return simulated time data for time endpoint
    if (endpoint.includes('/public/time')) {
      return {
        code: '0',
        data: [{ ts: Date.now().toString() }]
      } as unknown as T;
    }
    
    // Return simulated ticker data
    if (endpoint.includes('/market/ticker')) {
      const symbol = params.instId || endpoint.split('instId=')[1]?.split('&')[0] || 'BTC-USDT';
      return {
        code: '0',
        data: [{
          instId: symbol,
          last: "69000.5",
          lastSz: "0.1",
          askPx: "69001.2",
          askSz: "0.5",
          bidPx: "68999.8",
          bidSz: "0.3",
          open24h: "68000.1",
          high24h: "69500.0",
          low24h: "67800.0",
          volCcy24h: "1250.5",
          vol24h: "86000000",
          ts: Date.now().toString()
        }]
      } as unknown as T;
    }
    
    // Return simulated tickers data
    if (endpoint.includes('/market/tickers')) {
      const tickers = [
        { instId: 'BTC-USDT', last: '69000.5', askPx: '69001.2', bidPx: '68999.8', vol24h: '86000000', open24h: '68000.1', high24h: '69500.0', low24h: '67800.0' },
        { instId: 'ETH-USDT', last: '3800.2', askPx: '3801.5', bidPx: '3799.6', vol24h: '45000000', open24h: '3750.0', high24h: '3850.0', low24h: '3700.0' },
        { instId: 'SOL-USDT', last: '175.5', askPx: '175.8', bidPx: '175.3', vol24h: '12000000', open24h: '170.0', high24h: '178.0', low24h: '168.0' }
      ];
      return {
        code: '0',
        data: tickers
      } as unknown as T;
    }
    
    // Return simulated candles data
    if (endpoint.includes('/market/candles')) {
      const symbol = params.instId || endpoint.split('instId=')[1]?.split('&')[0] || 'BTC-USDT';
      const limit = params.limit || endpoint.split('limit=')[1]?.split('&')[0] || 100;
      
      // Generate simulated candle data
      const now = Date.now();
      const interval = 15 * 60 * 1000; // Default to 15 minutes
      
      const data = [];
      let price = 69000 + Math.random() * 1000;
      
      for (let i = 0; i < limit; i++) {
        const time = now - (limit - i) * interval;
        const open = price;
        const high = open * (1 + (Math.random() * 0.02));
        const low = open * (1 - (Math.random() * 0.02));
        const close = low + Math.random() * (high - low);
        const vol = 100000 + Math.random() * 900000;
        
        data.push([
          time.toString(),
          open.toFixed(2),
          high.toFixed(2),
          low.toFixed(2),
          close.toFixed(2),
          vol.toFixed(2)
        ]);
        
        price = close;
      }
      
      return {
        code: '0',
        data: data
      } as unknown as T;
    }
    
    // Default simulated response for other endpoints
    return {
      code: '0',
      data: [{ success: true, message: 'Simulated response for ' + endpoint }]
    } as unknown as T;
  }

  /**
   * Make an authenticated request to the OKX API - SIMULATED
   * Returns dummy data instead of making actual API calls
   * @param method The HTTP method to use
   * @param endpoint The API endpoint to request
   * @param params Optional parameters to include in the request
   */
  async makeAuthenticatedRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    console.log(`OKX Service makeAuthenticatedRequest called (deprecated) - ${method} ${endpoint}`);
    
    // Simulated account balance response
    if (endpoint.includes('/account/balance')) {
      return {
        code: '0',
        data: [{
          details: [
            {
              ccy: "BTC",
              availBal: "1.2",
              frozenBal: "0.2",
              bal: "1.4",
              eq: "116650.8", 
              eqUsd: "116650.8"
            },
            {
              ccy: "ETH",
              availBal: "10",
              frozenBal: "2",
              bal: "12",
              eq: "22981.44",
              eqUsd: "22981.44"
            },
            {
              ccy: "USDT",
              availBal: "14000",
              frozenBal: "1000",
              bal: "15000",
              eq: "15000",
              eqUsd: "15000"
            }
          ]
        }]
      } as unknown as T;
    }
    
    // Simulated order placement response
    if (endpoint.includes('/trade/order')) {
      return {
        code: '0',
        data: [{
          clOrdId: 'mock-' + Date.now(),
          ordId: 'okx-mock-' + Date.now(),
          tag: '',
          sCode: '0',
          sMsg: 'Order placed successfully (simulated)'
        }]
      } as unknown as T;
    }
    
    // Simulated order cancellation response
    if (endpoint.includes('/trade/cancel-order')) {
      return {
        code: '0',
        data: [{
          clOrdId: '',
          ordId: params.ordId || 'unknown',
          sCode: '0',
          sMsg: 'Order cancelled successfully (simulated)'
        }]
      } as unknown as T;
    }
    
    // Default simulated response for other endpoints
    return {
      code: '0',
      data: [{ success: true, message: 'Simulated authenticated response for ' + endpoint }]
    } as unknown as T;
  }
}

/**
 * Create a OKX service with custom credentials
 * Used for validating API keys and testing connections
 * @param apiKey The OKX API key
 * @param secretKey The OKX API secret
 * @param passphrase The OKX API passphrase
 * @param useTestnet Whether to use testnet (default: true)
 * @param userId Optional user ID for logging purposes
 */
export function createOkxServiceWithCustomCredentials(
  apiKey: string,
  secretKey: string,
  passphrase: string,
  useTestnet: boolean = true,
  userId?: number
): OkxService {
  // Just ignore the userId parameter - it's only used for logging
  return new OkxService(apiKey, secretKey, passphrase, useTestnet);
}

// Create a default service with no credentials
// Only for public endpoints - authenticated requests will fail
export const okxService = new OkxService('', '', '', true);