import axios from 'axios';
import crypto from 'crypto';

interface BinanceCredentials {
  apiKey: string;
  secretKey: string;
  testnet: boolean;
}

export class BinanceService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(credentials: BinanceCredentials) {
    this.apiKey = credentials.apiKey;
    this.secretKey = credentials.secretKey;
    
    // Always use the real production URL since we want to fetch real balances
    this.baseUrl = 'https://api.binance.com/api';
    
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
    });
    
    const queryString = queryParams.toString();
    const signature = this.generateSignature(queryString);
    
    // Append signature to query params
    queryParams.append('signature', signature);
    
    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
    
    const config = {
      headers: {
        'X-MBX-APIKEY': this.apiKey
      }
    };
    
    try {
      let response;
      
      if (method === 'GET') {
        response = await axios.get(url, config);
      } else if (method === 'POST') {
        response = await axios.post(url, null, config);
      } else if (method === 'DELETE') {
        response = await axios.delete(url, config);
      }
      
      return response?.data;
    } catch (error: any) {
      console.error('Binance API Error:', error.response?.data || error.message);
      throw new Error(`Binance API Error: ${JSON.stringify(error.response?.data || error.message)}`);
    }
  }

  // Make an unauthenticated request to Binance API
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams(params);
    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
    
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Binance API Error:', error.response?.data || error.message);
      throw new Error(`Binance API Error: ${JSON.stringify(error.response?.data || error.message)}`);
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
      await this.getAccountInfo();
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
}