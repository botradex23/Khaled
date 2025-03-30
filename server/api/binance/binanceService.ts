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
    // Clean and validate API key formatting - ensure it matches Binance's requirements
    // Remove ALL whitespace and control characters
    if (credentials.apiKey) {
      this.apiKey = credentials.apiKey.replace(/\s+/g, '').trim();
      
      // Extra verification for common formatting issues
      if (this.apiKey.startsWith('"') && this.apiKey.endsWith('"')) {
        console.log('Removing quote marks from API key');
        this.apiKey = this.apiKey.substring(1, this.apiKey.length - 1);
      }
    } else {
      this.apiKey = '';
    }
      
    // Clean and validate Secret key formatting
    if (credentials.secretKey) {
      this.secretKey = credentials.secretKey.replace(/\s+/g, '').trim();
      
      // Extra verification for common formatting issues
      if (this.secretKey.startsWith('"') && this.secretKey.endsWith('"')) {
        console.log('Removing quote marks from Secret key');
        this.secretKey = this.secretKey.substring(1, this.secretKey.length - 1);
      }
    } else {
      this.secretKey = '';
    }
    
    // Log the lengths and first few characters of the cleaned keys for debugging
    console.log(`API key length: ${this.apiKey.length}, Secret key length: ${this.secretKey.length}`);
    if (this.apiKey.length > 0) {
      console.log(`API key first chars: ${this.apiKey.substring(0, 4)}..., last chars: ...${this.apiKey.substring(this.apiKey.length - 4)}`);
    }
    
    // Basic validation for key formats
    if (this.apiKey && this.apiKey.length < 10) {
      console.error(`Warning: Binance API key appears to be too short (${this.apiKey.length} chars)`);
    }
    
    if (this.secretKey && this.secretKey.length < 10) {
      console.error(`Warning: Binance Secret key appears to be too short (${this.secretKey.length} chars)`);
    }
    
    // Always use the real production URL since we want to fetch real balances
    this.baseUrl = 'https://api.binance.com/api';
    
    // Create axios instance with VPN proxy if enabled
    if (VPN_CONFIG.enabled) {
      this.axiosInstance = createProxyInstance();
      console.log(`Binance Service initialized with VPN/Proxy: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
      
      // Set up default headers for better proxy compatibility
      // Ensure we don't pass invalid API key header
      if (this.apiKey && this.apiKey.length > 0) {
        console.log(`Setting up Binance API key in headers (length: ${this.apiKey.length})`);
        this.axiosInstance.defaults.headers['X-MBX-APIKEY'] = this.apiKey;
      } else {
        console.log('No valid Binance API key available, not setting X-MBX-APIKEY header');
      }
      
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
    // Verify API key format before proceeding
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('API key is missing or empty. Please configure your Binance API key.');
    }
    
    // Check for common format issues and try to fix
    if (/^".*"$/.test(this.apiKey) || /^'.*'$/.test(this.apiKey)) {
      console.warn('API key has quote marks - removing them before request');
      this.apiKey = this.apiKey.replace(/^["'](.*)["']$/, '$1');
    }
    
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
    
    // Log the API key format in use for this request
    console.log(`Using API key (length: ${this.apiKey.length}) for authenticated request`);
    if (this.apiKey.length > 0) {
      console.log(`API key starts with: ${this.apiKey.substring(0, 2)}, ends with: ${this.apiKey.substring(this.apiKey.length - 2)}`);
    }
    
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
      
      // Add specific handling for API key format errors
      if (errorMessage.includes('API-key format invalid')) {
        console.error('API key format error detected. Current API key details:');
        console.error(`- Length: ${this.apiKey.length}`);
        console.error(`- Contains non-alphanumeric: ${!/^[a-zA-Z0-9]+$/.test(this.apiKey)}`);
        if (this.apiKey.length > 0) {
          console.error(`- First two chars: ${this.apiKey.substring(0, 2)}`);
          console.error(`- Last two chars: ${this.apiKey.substring(this.apiKey.length - 2)}`);
        }
        console.error(`- Has whitespace: ${/\s/.test(this.apiKey)}`);
        console.error(`- Has quotes: ${/["']/.test(this.apiKey)}`);
      }
      
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
      // Validate the API keys first
      if (!this.apiKey || this.apiKey.trim() === '') {
        return {
          success: false,
          message: 'API key is missing or empty'
        };
      }
      
      if (!this.secretKey || this.secretKey.trim() === '') {
        return {
          success: false,
          message: 'Secret key is missing or empty'
        };
      }
      
      // Report on possible format issues
      if (/^".*"$/.test(this.apiKey)) {
        console.warn('Possible API key format issue - contains surrounding double quotes');
        // Remove quotes for the test
        this.apiKey = this.apiKey.replace(/^"(.*)"$/, '$1');
      }
      
      if (/^'.*'$/.test(this.apiKey)) {
        console.warn('Possible API key format issue - contains surrounding single quotes');
        // Remove quotes for the test
        this.apiKey = this.apiKey.replace(/^'(.*)'$/, '$1');
      }
      
      // Additional checks for other possible format issues
      if (/^[a-zA-Z0-9]+$/.test(this.apiKey) === false) {
        console.warn('API key contains non-alphanumeric characters. This might cause issues with Binance API.');
      }
      
      // Ensure API keys are in the correct format
      if (this.apiKey.includes(' ') || this.apiKey.includes('\n') || this.apiKey.includes('\t')) {
        console.warn('Warning: Binance API key contains whitespace. Cleaning up...');
        this.apiKey = this.apiKey.replace(/\s+/g, '');
      }
      
      if (this.secretKey.includes(' ') || this.secretKey.includes('\n') || this.secretKey.includes('\t')) {
        console.warn('Warning: Binance Secret key contains whitespace. Cleaning up...');
        this.secretKey = this.secretKey.replace(/\s+/g, '');
      }
      
      // Log the API key format for debugging
      console.log(`Testing Binance API connectivity with API key: ${this.apiKey.substring(0, 4)}... to ${this.baseUrl}`);
      console.log(`API key length: ${this.apiKey.length}, Secret key length: ${this.secretKey.length}`);
      console.log(`API key format inspection: alphanumeric only: ${/^[a-zA-Z0-9]+$/.test(this.apiKey)}`);
      
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
      
      // Add more diagnostic information if it's an API key format error
      if (error.message && error.message.includes('API-key format invalid')) {
        console.error('API key format issue detected. Current API key format:');
        console.error(`- Length: ${this.apiKey.length}`);
        console.error(`- Contains non-alphanumeric: ${!/^[a-zA-Z0-9]+$/.test(this.apiKey)}`);
        console.error(`- Starts with: ${this.apiKey.substring(0, 2)}...`);
        console.error(`- Ends with: ...${this.apiKey.substring(this.apiKey.length - 2)}`);
        
        return {
          success: false,
          message: 'API key format invalid. Please check that you copied the key correctly without any extra characters, quotes, or whitespace.'
        };
      }
      
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // Get all account balances with USD values
  async getAccountBalancesWithUSD(): Promise<any[]> {
    try {
      console.log('Fetching Binance account balances with USD values');
      
      // Get account information
      const accountInfo = await this.getAccountInfo();
      
      // Get ticker prices for USD conversion
      const tickers = await this.getAllTickers();
      const tickerMap = new Map();
      tickers.forEach((ticker: any) => {
        tickerMap.set(ticker.symbol, parseFloat(ticker.price));
      });
      
      // Always include SHIB and other important coins, even with zero balances
      const importantCoins = ['SHIB', 'BNB', 'BTC', 'ETH', 'USDT'];
      
      // Filter out zero balances except for important coins
      const balances = accountInfo.balances
        .filter((balance: any) => {
          const total = parseFloat(balance.free) + parseFloat(balance.locked);
          // Keep important coins regardless of balance
          if (importantCoins.includes(balance.asset)) {
            return true;
          }
          return total > 0;
        })
        .map((balance: any) => {
          const currency = balance.asset;
          const available = parseFloat(balance.free);
          const frozen = parseFloat(balance.locked);
          const total = available + frozen;
          
          // Calculate USD value
          let valueUSD = 0;
          let pricePerUnit = 0;
          
          if (currency === 'USDT' || currency === 'BUSD' || currency === 'USDC' || currency === 'DAI') {
            // Stablecoins are approximately $1
            valueUSD = total;
            pricePerUnit = 1;
          } else if (currency === 'BTC') {
            // BTC direct conversion if BTC/USDT exists
            pricePerUnit = tickerMap.get('BTCUSDT') || 0;
            valueUSD = total * pricePerUnit;
          } else {
            // Try to find direct pair with USDT
            const symbol = `${currency}USDT`;
            if (tickerMap.has(symbol)) {
              pricePerUnit = tickerMap.get(symbol);
              valueUSD = total * pricePerUnit;
            } else {
              // Try to find a BTC pair and convert through BTC
              const btcSymbol = `${currency}BTC`;
              if (tickerMap.has(btcSymbol) && tickerMap.has('BTCUSDT')) {
                const btcPrice = tickerMap.get(btcSymbol);
                const btcUsdtPrice = tickerMap.get('BTCUSDT');
                pricePerUnit = btcPrice * btcUsdtPrice;
                valueUSD = total * pricePerUnit;
              }
            }
          }
          
          return {
            currency,
            available,
            frozen,
            total,
            valueUSD,
            pricePerUnit,
            calculatedTotalValue: valueUSD
          };
        });
      
      console.log('First few Binance balances after processing:', balances.slice(0, 3));
      // כדי למנוע בעיות בהצגת נתונים, נהפוך את כל הערכים המספריים למחרוזות
      const normalizedBalances = balances.map((balance: any) => ({
        currency: balance.currency,   // שם המטבע (לפי הפורמט שלנו)
        asset: balance.currency,      // שם המטבע (מקביל ל-asset בפורמט ביננס)
        available: String(balance.available),  // כמות זמינה (מקביל ל-free בפורמט ביננס)
        free: String(balance.available),       // כמות זמינה בפורמט ביננס
        frozen: String(balance.frozen || 0),   // כמות נעולה (מקביל ל-locked בפורמט ביננס)
        locked: String(balance.frozen || 0),   // כמות נעולה בפורמט ביננס
        total: String(balance.total),          // סה"כ כמות
        valueUSD: balance.valueUSD,            // שווי ב-USD
        pricePerUnit: balance.pricePerUnit     // מחיר ליחידה
      }));
      
      console.log('First few Binance balances after normalization:', normalizedBalances.slice(0, 3));
      return normalizedBalances;
    } catch (error: any) {
      console.error('Failed to fetch Binance account balances:', error.message);
      throw new Error(`Binance API Error: ${error.message}`);
    }
  }

  // Create a new order
  async createOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT',
    quantity: number,
    price?: number,
    timeInForce?: 'GTC' | 'IOC' | 'FOK',
    stopPrice?: number
  ): Promise<any> {
    const params: any = {
      symbol: symbol.toUpperCase(),
      side,
      type,
      quantity: quantity.toString()
    };
    
    // Add optional parameters based on order type
    if (type === 'LIMIT' || type.includes('LIMIT')) {
      params.price = price!.toString();
      params.timeInForce = timeInForce || 'GTC';
    }
    
    if (type.includes('STOP_LOSS') || type.includes('TAKE_PROFIT')) {
      params.stopPrice = stopPrice!.toString();
    }
    
    try {
      console.log(`Creating ${side} ${type} order for ${symbol} - quantity: ${quantity}${price ? `, price: ${price}` : ''}`);
      return await this.makeAuthenticatedRequest('/v3/order', 'POST', params);
    } catch (error: any) {
      console.error('Failed to create order:', error.message);
      throw new Error(`Binance Order Error: ${error.message}`);
    }
  }

  // Cancel an order
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    try {
      console.log(`Cancelling order ${orderId} for ${symbol}`);
      return await this.makeAuthenticatedRequest('/v3/order', 'DELETE', {
        symbol: symbol.toUpperCase(),
        orderId
      });
    } catch (error: any) {
      console.error('Failed to cancel order:', error.message);
      throw new Error(`Binance Cancel Order Error: ${error.message}`);
    }
  }

  // Get open orders
  async getOpenOrders(symbol?: string): Promise<any[]> {
    try {
      const params: any = {};
      if (symbol) {
        params.symbol = symbol.toUpperCase();
      }
      
      console.log(`Fetching open orders${symbol ? ` for ${symbol}` : ''}`);
      return await this.makeAuthenticatedRequest('/v3/openOrders', 'GET', params);
    } catch (error: any) {
      console.error('Failed to fetch open orders:', error.message);
      throw new Error(`Binance Open Orders Error: ${error.message}`);
    }
  }

  // Get order history
  async getOrderHistory(symbol: string, limit: number = 50): Promise<any[]> {
    try {
      console.log(`Fetching order history for ${symbol}`);
      return await this.makeAuthenticatedRequest('/v3/allOrders', 'GET', {
        symbol: symbol.toUpperCase(),
        limit
      });
    } catch (error: any) {
      console.error('Failed to fetch order history:', error.message);
      throw new Error(`Binance Order History Error: ${error.message}`);
    }
  }

  // Get trade history
  async getTradeHistory(symbol: string, limit: number = 50): Promise<any[]> {
    try {
      console.log(`Fetching trade history for ${symbol}`);
      return await this.makeAuthenticatedRequest('/v3/myTrades', 'GET', {
        symbol: symbol.toUpperCase(),
        limit
      });
    } catch (error: any) {
      console.error('Failed to fetch trade history:', error.message);
      throw new Error(`Binance Trade History Error: ${error.message}`);
    }
  }
}