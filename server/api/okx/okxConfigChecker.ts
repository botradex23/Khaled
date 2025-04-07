/**
 * OKX API Configuration Checker
 * 
 * This utility checks if OKX API credentials are properly configured and working.
 */

import * as okx from 'okx-api';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface OkxApiStatus {
  isConfigured: boolean;
  isWorking: boolean;
  errorMessage?: string;
}

/**
 * Check if OKX API credentials are configured and working
 * @param testnet Whether to check against testnet
 * @returns Status object indicating configuration and working state
 */
export async function checkOkxApiConfig(testnet: boolean = false): Promise<OkxApiStatus> {
  const apiKey = process.env.OKX_API_KEY;
  const apiSecret = process.env.OKX_API_SECRET;
  const passphrase = process.env.OKX_PASSPHRASE;
  
  // Check if all required credentials are present
  if (!apiKey || !apiSecret || !passphrase) {
    return {
      isConfigured: false,
      isWorking: false,
      errorMessage: 'OKX API credentials are not fully configured'
    };
  }
  
  try {
    // Initialize OKX REST client
    const client = new okx.RestClient({
      apiKey,
      apiSecret,
      passphrase,
      sandbox: testnet
    });
    
    // Test API connectivity with a simple public request
    const accountApi = typeof client.account !== 'undefined';
    
    // If account API is available, test with a private endpoint
    if (accountApi) {
      const response = await client.account.getBalance();
      
      // Check if response is valid
      if (response && response.code === '0') {
        return {
          isConfigured: true,
          isWorking: true
        };
      }
      
      return {
        isConfigured: true,
        isWorking: false,
        errorMessage: `API error: ${response?.msg || 'Unknown error'}`
      };
    }
    
    // If no account API available, use public endpoint
    const response = await client.market.getTickers('SPOT');
    
    if (response && response.code === '0') {
      return {
        isConfigured: true,
        isWorking: true,
        errorMessage: 'Public API working, but private API not tested'
      };
    }
    
    return {
      isConfigured: true,
      isWorking: false,
      errorMessage: `API error: ${response?.msg || 'Unknown error'}`
    };
  } catch (error) {
    return {
      isConfigured: true,
      isWorking: false,
      errorMessage: `API connection error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Verify OKX API connectivity
 * This function provides a simple way to check if OKX API is working
 */
export async function verifyOkxApiConnectivity(testnet: boolean = false): Promise<boolean> {
  const status = await checkOkxApiConfig(testnet);
  return status.isWorking;
}