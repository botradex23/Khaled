/**
 * Test Multi-Broker System
 * 
 * This script tests the multi-broker system's fallback capabilities
 * by attempting to fetch data from different brokers.
 */

import 'dotenv/config';
import { MultiBrokerService } from './server/api/brokers/multiBrokerService';
import { BrokerType } from './server/api/brokers/interfaces';

async function testMultiBrokerSystem() {
  console.log('Testing Multi-Broker System');
  console.log('---------------------------');
  
  // Create a multi-broker service
  const multiBroker = new MultiBrokerService();
  
  // Test API status
  console.log('\n1. Testing API Status:');
  try {
    const status = await multiBroker.getApiStatus();
    console.log(`Active Broker: ${status.name} (${status.active ? 'Active' : 'Inactive'})`);
    console.log(`Has API Key: ${status.hasApiKey}`);
    console.log(`Has Secret Key: ${status.hasSecretKey}`);
    console.log(`Testnet: ${status.testnet}`);
    
    if (status.fallbacks && status.fallbacks.length > 0) {
      console.log('\nFallback Brokers:');
      status.fallbacks.forEach(fallback => {
        console.log(`- ${fallback.name} (${fallback.hasApiKey ? 'Configured' : 'Not configured'})`);
      });
    }
  } catch (error) {
    console.error('Error getting API status:', error);
  }
  
  // Test getting symbol price
  console.log('\n2. Testing Symbol Price:');
  try {
    const btcPrice = await multiBroker.getSymbolPrice('BTCUSDT');
    console.log(`BTC Price: $${btcPrice?.price || 'N/A'} (from ${multiBroker.getName()})`);
    
    const ethPrice = await multiBroker.getSymbolPrice('ETHUSDT');
    console.log(`ETH Price: $${ethPrice?.price || 'N/A'} (from ${multiBroker.getName()})`);
  } catch (error) {
    console.error('Error getting symbol price:', error);
  }
  
  // Test getting all prices
  console.log('\n3. Testing All Prices:');
  try {
    const allPrices = await multiBroker.getAllPrices();
    console.log(`Retrieved ${allPrices.length} prices (from ${multiBroker.getName()})`);
    console.log('First 5 prices:');
    allPrices.slice(0, 5).forEach(ticker => {
      console.log(`${ticker.symbol}: $${ticker.price}`);
    });
  } catch (error) {
    console.error('Error getting all prices:', error);
  }
  
  // Test getting 24hr ticker
  console.log('\n4. Testing 24hr Ticker:');
  try {
    const btcTicker = await multiBroker.get24hrTicker('BTCUSDT');
    console.log(`BTC 24hr Change: ${btcTicker?.priceChangePercent || 'N/A'}% (from ${multiBroker.getName()})`);
    console.log(`Open: $${btcTicker?.openPrice || 'N/A'}`);
    console.log(`High: $${btcTicker?.highPrice || 'N/A'}`);
    console.log(`Low: $${btcTicker?.lowPrice || 'N/A'}`);
    console.log(`Volume: ${btcTicker?.volume || 'N/A'} BTC`);
  } catch (error) {
    console.error('Error getting 24hr ticker:', error);
  }
  
  // Test getting exchange info
  console.log('\n5. Testing Exchange Info:');
  try {
    const exchangeInfo = await multiBroker.getExchangeInfo();
    console.log(`Retrieved info for ${exchangeInfo.symbols.length} symbols (from ${multiBroker.getName()})`);
    console.log('First 3 symbols:');
    exchangeInfo.symbols.slice(0, 3).forEach(symbol => {
      console.log(`- ${symbol.symbol} (${symbol.baseAsset}/${symbol.quoteAsset})`);
    });
  } catch (error) {
    console.error('Error getting exchange info:', error);
  }
  
  // Test getting order book
  console.log('\n6. Testing Order Book:');
  try {
    const orderBook = await multiBroker.getOrderBook('BTCUSDT', 5);
    console.log(`Order book from ${multiBroker.getName()}`);
    console.log('Top 3 Bids:');
    orderBook.bids.slice(0, 3).forEach(bid => {
      console.log(`$${bid[0]} - ${bid[1]} BTC`);
    });
    console.log('Top 3 Asks:');
    orderBook.asks.slice(0, 3).forEach(ask => {
      console.log(`$${ask[0]} - ${ask[1]} BTC`);
    });
  } catch (error) {
    console.error('Error getting order book:', error);
  }
  
  // Test WebSocket with a short subscription
  console.log('\n7. Testing WebSocket Price Updates (3 seconds):');
  try {
    const cleanup = multiBroker.subscribeToTicker(['BTCUSDT', 'ETHUSDT'], (update) => {
      console.log(`${update.symbol} update: $${update.price} (from ${multiBroker.getName()})`);
    });
    
    // Wait for 3 seconds to get some updates
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Cleanup the subscription
    cleanup();
    console.log('WebSocket subscription cleaned up');
  } catch (error) {
    console.error('Error with WebSocket subscription:', error);
  }
  
  console.log('\nMulti-Broker System Test Completed');
}

// Run the test
testMultiBrokerSystem()
  .catch(error => {
    console.error('Test failed:', error);
  });