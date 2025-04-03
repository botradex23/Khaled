/**
 * Test script for Binance TypeScript client proxy support
 * 
 * This script tests the TypeScript Binance client with proxy support
 * to verify that requests are being routed through the proxy.
 */

import 'dotenv/config';
import axios from 'axios';
import { binanceService } from './server/api/binance/binanceService.js';

// Log important environment variables
console.log('Environment check:');
console.log(`- BINANCE_PROXY_HOST: ${process.env.BINANCE_PROXY_HOST ? 'Set' : 'Not set'}`);
console.log(`- BINANCE_PROXY_PORT: ${process.env.BINANCE_PROXY_PORT ? 'Set' : 'Not set'}`);
console.log(`- BINANCE_PROXY_USERNAME: ${process.env.BINANCE_PROXY_USERNAME ? 'Set' : 'Not set'}`);
console.log(`- BINANCE_PROXY_PASSWORD: ${process.env.BINANCE_PROXY_PASSWORD ? 'Set' : 'Not set'}`);
console.log(`- BINANCE_API_KEY: ${process.env.BINANCE_API_KEY ? 'Set' : 'Not set'}`);
console.log(`- BINANCE_SECRET_KEY: ${process.env.BINANCE_SECRET_KEY ? 'Set' : 'Not set'}`);

/**
 * Test if proxy is working by checking IP
 */
async function checkIp() {
  try {
    console.log('\nChecking IP address...');
    const response = await axios.get('https://api.ipify.org?format=json');
    console.log(`Current IP: ${response.data.ip}`);
    console.log('This should match your proxy IP if the proxy is working correctly.');
    return response.data.ip;
  } catch (error) {
    console.error('Error checking IP:', error.message);
    return null;
  }
}

/**
 * Test Binance API ping with proxy
 */
async function testBinancePing() {
  try {
    console.log('\nTesting Binance API ping...');
    const result = await binanceService.ping();
    console.log('Ping result:', result);
    return result;
  } catch (error) {
    console.error('Error pinging Binance API:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test getting ticker price with proxy
 */
async function testGetTickerPrice() {
  try {
    console.log('\nTesting getting BTCUSDT ticker price...');
    const result = await binanceService.getTickerPrice('BTCUSDT');
    console.log('BTCUSDT price:', result);
    return result;
  } catch (error) {
    console.error('Error getting ticker price:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test getting account info with proxy (requires API keys)
 */
async function testGetAccountInfo() {
  if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_SECRET_KEY) {
    console.log('\nSkipping account info test - API keys not provided');
    return { skipped: true };
  }
  
  try {
    console.log('\nTesting getting account info...');
    const result = await binanceService.getAccountInfo();
    console.log('Account info retrieved successfully!');
    console.log(`- Account type: ${result.accountType}`);
    console.log(`- Can trade: ${result.canTrade}`);
    console.log(`- Number of balances: ${result.balances.length}`);
    // Show a few non-zero balances
    const nonZeroBalances = result.balances.filter(
      b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    ).slice(0, 3);
    if (nonZeroBalances.length > 0) {
      console.log('- Sample balances:');
      nonZeroBalances.forEach(b => {
        console.log(`  * ${b.asset}: Free=${b.free}, Locked=${b.locked}`);
      });
    }
    return result;
  } catch (error) {
    console.error('Error getting account info:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('======= BINANCE TYPESCRIPT CLIENT PROXY TEST =======');
  
  // Check current IP
  await checkIp();
  
  // Test Binance API
  await testBinancePing();
  await testGetTickerPrice();
  await testGetAccountInfo();
  
  console.log('\n======= TEST COMPLETE =======');
}

// Run the tests
runTests().catch(error => {
  console.error('Test failed with error:', error);
});