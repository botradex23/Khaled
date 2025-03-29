import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { createProxyInstance, VPN_CONFIG } from './proxy-config';

interface BinanceCredentials {
  apiKey: string;
  secretKey: string;
  testnet: boolean;
}

export class BinanceService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(credentials: BinanceCredentials) {
    this.apiKey = credentials.apiKey;
    this.secretKey = credentials.secretKey;
    
    // Always use the real production URL since we want to fetch real balances
    this.baseUrl = 'https://api.binance.com/api';
    
    // Create axios instance with VPN proxy if enabled
    if (VPN_CONFIG.enabled) {
      this.axiosInstance = createProxyInstance();
      console.log(`Binance Service initialized with VPN/Proxy: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
      
      // Set up default headers for better proxy compatibility
      this.axiosInstance.defaults.headers['X-MBX-APIKEY'] = this.apiKey;
      this.axiosInstance.defaults.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      this.axiosInstance.defaults.headers['Accept-Language'] = 'en-US,en;q=0.9';
    } else {
      this.axiosInstance = axios.create();
      console.log('Binance Service initialized with direct connection (no VPN/proxy)');
    }
    
    console.log(`Binance Service initialized with production API (ignoring testnet flag: ${credentials.testnet})`);
  }

  // Create a signature for authentication
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  // Make a request to Binance API with authentication
  private async makeAuthenticatedRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, any> = {}
  ): Promise<any> {
    // Add timestamp parameter required for signed requests
    const timestamp = Date.now();
    const queryParams = new URLSearchParams({
      ...params,
      timestamp: timestamp.toString(),
      recvWindow: '60000', // Add longer receive window for proxy compatibility (60 seconds)
    });
    
    const queryString = queryParams.toString();
    const signature = this.generateSignature(queryString);
    
    // Append signature to query params
    queryParams.append('signature', signature);
    
    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
    
    const config = {
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout for more reliable connection via proxy
    };
    
    try {
      console.log(`Making authenticated Binance API request to ${endpoint} (${method}) via ${VPN_CONFIG.enabled ? 'VPN/proxy' : 'direct connection'}`);
      let response;
      
      if (method === 'GET') {
        response = await this.axiosInstance.get(url, config);
      } else if (method === 'POST') {
        response = await this.axiosInstance.post(url, null, config);
      } else if (method === 'DELETE') {
        response = await this.axiosInstance.delete(url, config);
      }
      
      return response?.data;
    } catch (error: any) {
      // Extract more detailed error information
      const errorData = error.response?.data;
      const errorMessage = errorData?.msg || error.message || 'Unknown error';
      const errorCode = errorData?.code || error.code || 'UNKNOWN';
      
      console.error(`Binance API Error (${endpoint}): Code: ${errorCode}, Message: ${errorMessage}`);
      
      // Check if it's a proxy-related error
      if (VPN_CONFIG.enabled && error.code) {
        console.error(`VPN/Proxy error (${error.code}): This might be related to the proxy configuration.`);
      }
      
      // Provide more meaningful error to client
      throw new Error(`Binance API Error: ${errorMessage} (Code: ${errorCode})`);
    }
  }

  // Make an unauthenticated request to Binance API
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams(params);
    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
    
    const config = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout for more reliability
    };
    
    try {
      // Debug the proxy configuration
      if (VPN_CONFIG.enabled) {
        console.log(`Making public Binance API request to ${endpoint} via VPN/proxy using URL: ${url}`);
        console.log(`Proxy configuration: ${VPN_CONFIG.type} proxy at ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
      } else {
        console.log(`Making public Binance API request to ${endpoint} via direct connection`);
      }

      // Actually make the request
      const response = await this.axiosInstance.get(url, config);
      return response.data;
    } catch (error: any) {
      // Extract more detailed error information
      const errorData = error.response?.data;
      const errorMessage = errorData?.msg || error.message || 'Unknown error';
      const errorCode = errorData?.code || error.code || 'UNKNOWN';
      
      console.error(`Binance API Error (${endpoint}): Code: ${errorCode}, Message: ${errorMessage}`);
      
      // Add more detailed logging for proxy-related errors
      if (VPN_CONFIG.enabled) {
        console.error(`VPN/Proxy error details for debugging:`);
        console.error(`- Error code: ${error.code}`);
        console.error(`- URL attempted: ${url}`);
        console.error(`- Proxy host: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
        console.error(`- Proxy type: ${VPN_CONFIG.type}`);
        
        if (error.request) {
          console.error('- Request was made but no response received');
        }
        
        if (error.response) {
          console.error(`- Response status: ${error.response.status}`);
          console.error(`- Response headers:`, error.response.headers);
        }
      }
      
      // Provide more meaningful error to client
      throw new Error(`Binance API Error: ${errorMessage} (Code: ${errorCode})`);
    }
  }

  // Get account information (requires API key with read permissions)
  async getAccountInfo(): Promise<any> {
    return this.makeAuthenticatedRequest('/v3/account');
  }

  // Get account balances (extract from account info)
  async getAccountBalances(): Promise<any[]> {
    try {
      console.log('Fetching real account balances from Binance API...');
      console.log(`Using API key: ${this.apiKey.substring(0, 4)}... Secret key length: ${this.secretKey ? this.secretKey.length : 0}`);
      console.log(`Proxy Configuration: ${VPN_CONFIG.enabled ? 'Enabled' : 'Disabled'}, Host: ${VPN_CONFIG.host}, Port: ${VPN_CONFIG.port}`);
      
      const accountInfo = await this.getAccountInfo();
      
      // Process and enrich account balances
      const balances = accountInfo.balances || [];
      console.log(`Retrieved ${balances.length} balances from Binance account`);
      
      // Get latest prices to calculate USD values
      const prices = await this.getAllTickers();
      const priceMap = new Map<string, number>();
      
      // Map all prices for all trading pairs
      prices.forEach((price: any) => {
        // Handle USDT pairs
        if (price.symbol.endsWith('USDT')) {
          const asset = price.symbol.replace('USDT', '');
          priceMap.set(asset, parseFloat(price.price));
        }
        // Also handle other trading pairs (BTC, ETH, etc)
        else if (price.symbol.endsWith('BTC')) {
          const asset = price.symbol.replace('BTC', '');
          // Need to also get BTC price to convert to USD
          const btcPrice = priceMap.get('BTC') || 0;
          if (btcPrice > 0) {
            priceMap.set(asset, parseFloat(price.price) * btcPrice);
          }
        }
      });
      
      // Log some major currency prices for debugging
      console.log('Current market prices:');
      ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'].forEach(symbol => {
        if (priceMap.has(symbol)) {
          console.log(`${symbol}: $${priceMap.get(symbol)}`);
        }
      });
      
      // Special case for stablecoins
      priceMap.set('USDT', 1);
      priceMap.set('USDC', 1);
      priceMap.set('BUSD', 1);
      priceMap.set('DAI', 1);
      priceMap.set('TUSD', 1);
      priceMap.set('FDUSD', 1);
      
      // Calculate total portfolio value for logging
      let totalPortfolioValue = 0;
      
      // Enrich balances with USD value and filter out zero balances
      const enrichedBalances = balances
        .map((balance: { 
          asset: string; 
          free: string; 
          locked: string; 
          total?: string;
        }) => {
          const asset = balance.asset;
          const free = balance.free;
          const locked = balance.locked;
          const total = (parseFloat(free) + parseFloat(locked)).toString();
          const totalValue = parseFloat(total);
          
          // Calculate USD value
          let usdValue = 0;
          let pricePerUnit = 0;
          
          if (priceMap.has(asset)) {
            pricePerUnit = priceMap.get(asset)!;
            usdValue = totalValue * pricePerUnit;
          } else if (priceMap.has(`${asset}USDT`)) {
            pricePerUnit = priceMap.get(`${asset}USDT`)!;
            usdValue = totalValue * pricePerUnit;
          }
          
          // Add to total portfolio value
          totalPortfolioValue += usdValue;
          
          return {
            asset,
            free,
            locked,
            total,
            usdValue,
            pricePerUnit
          };
        })
        // Filter out zero or extremely small balances
        .filter((balance: { 
          total: string; 
          usdValue: number;
        }) => parseFloat(balance.total) > 0.000001 || balance.usdValue > 0.01);
      
      // Sort by USD value descending
      enrichedBalances.sort((a: { usdValue: number }, b: { usdValue: number }) => b.usdValue - a.usdValue);
      
      console.log(`Total portfolio value (simple calculation): ${totalPortfolioValue.toFixed(2)}`);
      console.log(`Returning ${enrichedBalances.length} non-zero balances`);
      
      return enrichedBalances;
    } catch (error) {
      console.error('Error fetching Binance account balances:', error);
      throw error;
    }
  }

  // Get all ticker prices
  async getAllTickers(): Promise<any[]> {
    return this.makeRequest('/v3/ticker/price');
  }
  
  // Get price for a specific symbol
  async getSymbolPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    const data = await this.makeRequest('/v3/ticker/price', { symbol });
    return data;
  }
  
  // Get 24hr ticker data for all symbols
  async getAllTickers24hr(): Promise<any[]> {
    return this.makeRequest('/v3/ticker/24hr');
  }

  // Get 24hr ticker for specific symbol
  async get24hrTicker(symbol: string): Promise<any> {
    return this.makeRequest('/v3/ticker/24hr', { symbol });
  }

  // Get recent trades
  async getRecentTrades(symbol: string, limit: number = 500): Promise<any[]> {
    return this.makeAuthenticatedRequest('/v3/myTrades', 'GET', { symbol, limit });
  }

  // Get exchange information
  async getExchangeInfo(): Promise<any> {
    return this.makeRequest('/v3/exchangeInfo');
  }

  // Ping the server to test connectivity
  async ping(): Promise<boolean> {
    try {
      await this.makeRequest('/v3/ping');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Test connectivity with authentication
  async testConnectivity(): Promise<{ success: boolean; message?: string }> {
    try {
      // Try to get account information as a connectivity test
      console.log(`Testing Binance API connectivity with API key: ${this.apiKey.substring(0, 4)}... to ${this.baseUrl}`);
      
      // Set up headers directly for better proxy compatibility
      this.axiosInstance.defaults.headers['X-MBX-APIKEY'] = this.apiKey;
      
      // Try with exchange info instead of ping for better compatibility
      console.log('Getting Binance exchange info to test API connectivity');
      await this.makeRequest('/v3/exchangeInfo');
      
      // Now try getting account data
      console.log('Getting Binance account info to test API key validity');
      const accountInfo = await this.getAccountInfo();
      console.log(`Successfully connected to Binance API. Account has ${accountInfo.balances?.length || 0} balances.`);
      return { success: true };
    } catch (error: any) {
      console.error('Binance connectivity test failed:', error.message);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
}