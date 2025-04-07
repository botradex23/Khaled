/**
 * Test file to check how binance-api-node should be imported and used
 */
import * as BinanceLib from 'binance-api-node';

console.log('BinanceLib import type:', typeof BinanceLib);
console.log('BinanceLib properties:', Object.keys(BinanceLib));
console.log('Default export type:', typeof BinanceLib.default);

// Print more details about the default export
console.log('Default export props:', Object.keys(BinanceLib.default));

// Let's see if default is not a function but a factory object
if (typeof BinanceLib.default === 'object') {
  console.log('Default export is an object, checking its properties');
  for (const key in BinanceLib.default) {
    console.log(`- ${key}:`, typeof BinanceLib.default[key]);
  }
}

try {
  // Try BinanceLib.default.default which is a function
  console.log('\nTrying to use BinanceLib.default.default');
  const createBinanceClient = BinanceLib.default.default;
  console.log('createBinanceClient type:', typeof createBinanceClient);
  
  if (typeof createBinanceClient === 'function') {
    const client = createBinanceClient();
    console.log('Successfully created client using BinanceLib.default.default()');
    console.log('Client methods:', Object.keys(client).slice(0, 5), '...');
  }
} catch (error) {
  console.error('Error creating client:', error);
}