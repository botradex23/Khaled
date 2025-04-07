/**
 * Test OKX Fallback System
 * 
 * This script tests if the OKX fallback is working correctly when Binance is unavailable.
 * It specifically checks for the price data that is fetched from OKX when Binance returns errors.
 */

import { brokerService } from './server/api/brokers/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runTest() {
  console.log('Testing Multi-Broker Fallback System');
  console.log('===================================');
  
  try {
    console.log('\n1. Testing broker service API status');
    const apiStatus = await brokerService.getApiStatus();
    console.log(JSON.stringify(apiStatus, null, 2));
    
    console.log('\n2. Getting current prices from broker service');
    console.log('This should automatically fall back to OKX if Binance is unavailable');
    const prices = await brokerService.getAllPrices();
    
    console.log(`Retrieved ${prices.length} cryptocurrency prices`);
    
    // Display a sample of the prices
    console.log('\nSample of prices:');
    const samplePrices = prices.slice(0, 5);
    console.table(samplePrices);
    
    // Test specific cryptocurrency symbols
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    console.log('\n3. Testing specific cryptocurrency symbols:');
    
    for (const symbol of symbols) {
      try {
        const price = await brokerService.getSymbolPrice(symbol);
        console.log(`${symbol}: ${price ? price.price : 'Not available'}`);
      } catch (error) {
        console.error(`Error fetching price for ${symbol}: ${error.message}`);
      }
    }
    
    // Test order book data
    console.log('\n4. Testing order book data for BTC/USDT:');
    try {
      const orderBook = await brokerService.getOrderBook('BTCUSDT', 5);
      console.log('Order book data:');
      console.log('- Bids:', orderBook.bids.length ? 'Available' : 'Not available');
      console.log('- Asks:', orderBook.asks.length ? 'Available' : 'Not available');
      
      if (orderBook.bids.length > 0) {
        console.log('\nTop 3 bids:');
        console.table(orderBook.bids.slice(0, 3));
      }
      
      if (orderBook.asks.length > 0) {
        console.log('\nTop 3 asks:');
        console.table(orderBook.asks.slice(0, 3));
      }
    } catch (error) {
      console.error(`Error fetching order book: ${error.message}`);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error(`Test failed with error: ${error.message}`);
    console.error(error);
  }
}

runTest();