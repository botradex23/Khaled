/**
 * Format Conversion Utilities
 * 
 * This utility file provides functions for converting between different symbol formats
 * used by various cryptocurrency exchanges, ensuring consistent display and functionality
 * across the Tradeliy platform regardless of which exchange provides the data.
 */

// Constants for reference
const BINANCE_FORMAT = 'BTCUSDT'; // No separator
const OKX_FORMAT = 'BTC-USDT';    // Hyphen separator

/**
 * Convert any exchange symbol format to Binance format (no separator)
 * Example: 'BTC-USDT' -> 'BTCUSDT'
 * 
 * @param {string} symbol - The symbol in any format
 * @returns {string} - The symbol in Binance format
 */
function toBinanceFormat(symbol) {
  // Handle null or undefined input
  if (!symbol) return '';
  
  // If the symbol already has no separator, assume it's already in Binance format
  if (!symbol.includes('-')) return symbol;
  
  // Remove any separators
  return symbol.replace(/-/g, '');
}

/**
 * Convert any exchange symbol format to OKX format (hyphen separator)
 * Example: 'BTCUSDT' -> 'BTC-USDT'
 * 
 * @param {string} symbol - The symbol in any format 
 * @returns {string} - The symbol in OKX format
 */
function toOkxFormat(symbol) {
  // Handle null or undefined input
  if (!symbol) return '';
  
  // If the symbol already contains a hyphen, assume it's already in OKX format
  if (symbol.includes('-')) return symbol;
  
  // Common quote currencies to look for
  const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH'];
  
  // Find the quote currency
  for (const quote of quoteCurrencies) {
    if (symbol.endsWith(quote)) {
      // Insert hyphen before the quote currency
      const base = symbol.slice(0, symbol.length - quote.length);
      return `${base}-${quote}`;
    }
  }
  
  // Default fallback - try to make a best guess by using the last 4 characters
  // as the quote currency if we can't identify a standard one
  const potentialQuote = symbol.slice(-4);
  const base = symbol.slice(0, -4);
  return `${base}-${potentialQuote}`;
}

/**
 * Extract the base currency from a symbol in any format
 * Examples: 'BTCUSDT' -> 'BTC', 'BTC-USDT' -> 'BTC'
 * 
 * @param {string} symbol - The symbol in any format
 * @returns {string} - The base currency
 */
function extractBaseCurrency(symbol) {
  if (!symbol) return '';
  
  // Convert to OKX format first which makes it easier to extract
  const okxFormat = toOkxFormat(symbol);
  
  // Split by hyphen and take the first part
  return okxFormat.split('-')[0];
}

/**
 * Extract the quote currency from a symbol in any format
 * Examples: 'BTCUSDT' -> 'USDT', 'BTC-USDT' -> 'USDT'
 * 
 * @param {string} symbol - The symbol in any format
 * @returns {string} - The quote currency
 */
function extractQuoteCurrency(symbol) {
  if (!symbol) return '';
  
  // Convert to OKX format first which makes it easier to extract
  const okxFormat = toOkxFormat(symbol);
  
  // Split by hyphen and take the second part
  const parts = okxFormat.split('-');
  return parts.length > 1 ? parts[1] : '';
}

/**
 * Determine if a symbol is a stablecoin pair
 * A stablecoin pair has a stablecoin as the quote currency
 * 
 * @param {string} symbol - The symbol in any format
 * @returns {boolean} - True if the symbol is a stablecoin pair
 */
function isStablecoinPair(symbol) {
  const quoteCurrency = extractQuoteCurrency(symbol);
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'USD', 'DAI', 'TUSD'];
  return stablecoins.includes(quoteCurrency);
}

/**
 * Group an array of market data by quote currency
 * 
 * @param {Array} markets - Array of market data objects with a symbol property
 * @returns {Object} - Object with quote currencies as keys and arrays of market data as values
 */
function groupMarketsByQuoteCurrency(markets) {
  if (!Array.isArray(markets)) return {};
  
  const grouped = {};
  
  markets.forEach(market => {
    const quoteCurrency = extractQuoteCurrency(market.symbol);
    
    if (!grouped[quoteCurrency]) {
      grouped[quoteCurrency] = [];
    }
    
    grouped[quoteCurrency].push(market);
  });
  
  return grouped;
}

/**
 * Format market prices appropriately based on their value
 * - Very small prices use scientific notation
 * - Regular prices use regular formatting with appropriate decimals
 * - Large prices use comma formatting
 * 
 * @param {number} price - The price to format
 * @returns {string} - Formatted price string
 */
function formatPrice(price) {
  if (price === undefined || price === null) return 'N/A';
  
  // For very small prices (less than 0.000001), use scientific notation
  if (price < 0.000001) {
    return price.toExponential(2);
  }
  
  // For small prices (less than 0.01), show more decimals
  if (price < 0.01) {
    return price.toFixed(6);
  }
  
  // For medium prices (less than 1000), show 2 decimals
  if (price < 1000) {
    return price.toFixed(2);
  }
  
  // For large prices, use comma formatting
  return price.toLocaleString(undefined, { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format large numbers with K, M, B suffixes
 * 
 * @param {number} value - The number to format
 * @returns {string} - Formatted number with appropriate suffix
 */
function formatLargeNumber(value) {
  if (value === undefined || value === null) return 'N/A';
  
  if (value === 0) return '0';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'B';
  }
  
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  
  if (absValue >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  
  return value.toFixed(1);
}

/**
 * Format percentage changes with appropriate sign and precision
 * 
 * @param {number} change - The percentage change
 * @returns {string} - Formatted percentage with sign
 */
function formatPercentage(change) {
  if (change === undefined || change === null) return '0.00%';
  
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change.toFixed(2)}%`;
}

// A test function that demonstrates the conversions
function testFormatConversions() {
  const testSymbols = [
    'BTCUSDT',    // Binance format
    'BTC-USDT',   // OKX format
    'ETHBUSD',    // Binance format with different quote
    'SOL-USDC',   // OKX format with different quote
    'DOGEBTC',    // Crypto-to-crypto pair
    'SHIBUSDT'    // Small cap token
  ];
  
  console.log('Symbol Format Conversion Examples:');
  console.log('----------------------------------');
  testSymbols.forEach(symbol => {
    console.log(`Original: ${symbol}`);
    console.log(`  → Binance format: ${toBinanceFormat(symbol)}`);
    console.log(`  → OKX format: ${toOkxFormat(symbol)}`);
    console.log(`  → Base currency: ${extractBaseCurrency(symbol)}`);
    console.log(`  → Quote currency: ${extractQuoteCurrency(symbol)}`);
    console.log(`  → Is stablecoin pair: ${isStablecoinPair(symbol)}`);
    console.log('');
  });
  
  console.log('Price Formatting Examples:');
  console.log('-------------------------');
  const testPrices = [
    0.00000001,  // Very small price (scientific notation)
    0.000123,    // Small price (more decimals)
    0.12345,     // Medium price
    123.45,      // Standard price
    1234.56,     // Large price (comma formatting)
    123456.78,   // Very large price
    76543210.12  // Extremely large price
  ];
  
  testPrices.forEach(price => {
    console.log(`Original: ${price}`);
    console.log(`  → Formatted: ${formatPrice(price)}`);
  });
  
  console.log('\nLarge Number Formatting Examples:');
  console.log('--------------------------------');
  const testVolumes = [
    123,         // Small volume
    1234,        // K range
    1234567,     // M range
    1234567890   // B range
  ];
  
  testVolumes.forEach(volume => {
    console.log(`Original: ${volume}`);
    console.log(`  → Formatted: ${formatLargeNumber(volume)}`);
  });
  
  console.log('\nPercentage Formatting Examples:');
  console.log('------------------------------');
  const testPercentages = [
    5.62,      // Positive change
    -3.21,     // Negative change
    0,         // No change
    0.0045,    // Very small positive change
    -0.0072    // Very small negative change
  ];
  
  testPercentages.forEach(percentage => {
    console.log(`Original: ${percentage}`);
    console.log(`  → Formatted: ${formatPercentage(percentage)}`);
  });
}

// If running this file directly, run the test function
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Check if this file is being run directly
if (typeof import.meta !== 'undefined') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  // Check if this module is being run directly
  if (import.meta.url === `file://${process.argv[1]}`) {
    testFormatConversions();
  }
}

// Export all the functions for use in other modules
export {
  toBinanceFormat,
  toOkxFormat,
  extractBaseCurrency,
  extractQuoteCurrency,
  isStablecoinPair,
  groupMarketsByQuoteCurrency,
  formatPrice,
  formatLargeNumber,
  formatPercentage,
  testFormatConversions
};