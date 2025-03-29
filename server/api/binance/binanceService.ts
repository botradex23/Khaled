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
    
    // Set the base URL based on testnet flag
    this.baseUrl = credentials.testnet 
      ? 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';
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
      const accountInfo = await this.getAccountInfo();
      
      // Process and enrich account balances
      const balances = accountInfo.balances || [];
      
      // Get latest prices to calculate USD values
      const prices = await this.getAllTickers();
      const priceMap = new Map<string, number>();
      
      prices.forEach((price: any) => {
        if (price.symbol.endsWith('USDT')) {
          const asset = price.symbol.replace('USDT', '');
          priceMap.set(asset, parseFloat(price.price));
        }
      });
      
      // Special case for stablecoins
      priceMap.set('USDT', 1);
      priceMap.set('USDC', 1);
      priceMap.set('BUSD', 1);
      priceMap.set('DAI', 1);
      
      // Enrich balances with USD value
      return balances.map((balance: any) => {
        const asset = balance.asset;
        const free = balance.free;
        const locked = balance.locked;
        const total = (parseFloat(free) + parseFloat(locked)).toString();
        
        // Calculate USD value
        let usdValue = 0;
        if (priceMap.has(asset)) {
          usdValue = parseFloat(total) * priceMap.get(asset)!;
        } else if (priceMap.has(`${asset}USDT`)) {
          usdValue = parseFloat(total) * priceMap.get(`${asset}USDT`)!;
        }
        
        return {
          asset,
          free,
          locked,
          total,
          usdValue
        };
      });
    } catch (error) {
      console.error('Error fetching Binance account balances:', error);
      throw error;
    }
  }

  // Get all ticker prices
  async getAllTickers(): Promise<any[]> {
    return this.makeRequest('/v3/ticker/price');
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