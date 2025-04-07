/**
 * Test OKX Client With Public APIs
 * 
 * This script tests the OKX client with public API endpoints
 * that don't require authentication.
 */

import * as dotenv from 'dotenv';
import { RestClient } from 'okx-api';

dotenv.config();

async function testOkxPublicAPIs() {
  console.log('Testing OKX Public APIs...');
  
  try {
    // Initialize OKX client without authentication
    const client = new RestClient();
    
    console.log('OKX client initialized');
    
    console.log('\nTesting public API endpoints...');
    
    // Test ticker API
    console.log('Getting ticker for BTC-USDT...');
    const ticker = await client.getTicker({ instId: 'BTC-USDT' });
    console.log('OKX Ticker response:', JSON.stringify(ticker, null, 2));
    
    // Test tickers API (all tickers)
    console.log('\nGetting all tickers for SPOT...');
    const tickers = await client.getTickers({ instType: 'SPOT' });
    console.log(`Retrieved ${tickers.data ? tickers.data.length : 0} tickers`);
    
    // Test instruments API
    console.log('\nGetting instruments...');
    const instruments = await client.getInstruments({ instType: 'SPOT' });
    console.log(`OKX instruments response: ${instruments.data ? instruments.data.length : 'no'} instruments received`);
    
    console.log('OKX Public API test completed successfully!');
  } catch (error) {
    console.error('Error testing OKX public APIs:', error);
  }
}

testOkxPublicAPIs();