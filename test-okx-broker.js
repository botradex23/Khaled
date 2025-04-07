/**
 * Test OKX Broker Implementation
 * 
 * This script tests if the OKX broker implementation works correctly
 * by attempting to fetch market data from OKX exchange.
 */

import * as okx from 'okx-api';
import dotenv from 'dotenv';

dotenv.config();

async function testOkxConnection() {
  console.log('Testing OKX Broker Implementation...');
  
  try {
    // Check if API credentials are available
    const apiKey = process.env.OKX_API_KEY;
    const apiSecret = process.env.OKX_API_SECRET;
    const passphrase = process.env.OKX_PASSPHRASE;
    
    console.log('OKX credentials available:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      hasPassphrase: !!passphrase
    });
    
    if (!apiKey || !apiSecret || !passphrase) {
      console.error('Missing OKX API credentials in environment!');
      return;
    }
    
    // Initialize OKX client without API keys for public endpoints
    const client = new okx.RestClient();
    
    console.log('OKX client initialized, testing ticker endpoint...');
    
    // Test getting ticker data for BTC-USDT
    const ticker = await client.market.getTicker('BTC-USDT');
    console.log('OKX Ticker response:', JSON.stringify(ticker, null, 2));
    
    // Test getting all tickers
    console.log('Testing getAllTickers endpoint...');
    const tickers = await client.market.getTickers('SPOT');
    console.log(`OKX getAllTickers response: ${tickers.data.length} instruments received`);
    
    console.log('OKX Broker test completed successfully!');
  } catch (error) {
    console.error('Error testing OKX connection:', error);
  }
}

testOkxConnection();