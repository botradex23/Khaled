/**
 * Binance Utility Functions Module
 * Contains helper functions for Binance API integration
 */

/**
 * Format a number to standard precision for display
 * @param value The numeric value to format
 * @param symbol The trading symbol to determine precision
 */
export function formatPriceBySymbol(value: number, symbol: string): string {
  if (!value && value !== 0) return 'N/A';
  
  // Determine appropriate decimal places based on symbol
  let decimals = 2; // Default for most currencies
  
  // Special cases for different price ranges
  if (symbol.includes('BTC') || symbol.includes('ETH')) {
    decimals = 2;
  } else if (symbol.includes('BNB') || symbol.includes('SOL')) {
    decimals = 2;
  } else if (symbol.includes('DOGE') || symbol.includes('SHIB')) {
    // Very low-priced assets need more decimal places
    decimals = 6;
  }
  
  // For specific price ranges
  if (value > 10000) {
    decimals = 0; // Very high prices don't need decimals
  } else if (value > 1000) {
    decimals = 1;
  } else if (value > 100) {
    decimals = 2;
  } else if (value > 1) {
    decimals = 3;
  } else if (value > 0.1) {
    decimals = 4;
  } else if (value > 0.01) {
    decimals = 5;
  } else if (value > 0.001) {
    decimals = 6;
  } else if (value > 0.0001) {
    decimals = 7;
  } else {
    decimals = 8; // Maximum precision for very small values
  }
  
  return value.toFixed(decimals);
}

/**
 * Format a currency amount with proper symbol
 * @param value The currency value
 * @param currency The currency code (e.g., 'USD', 'BTC')
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  if (!value && value !== 0) return 'N/A';
  
  let symbol = '$';
  let decimals = 2;
  
  // Determine symbol and decimals based on currency
  switch (currency) {
    case 'USD':
    case 'USDT':
    case 'BUSD':
    case 'USDC':
      symbol = '$';
      decimals = value > 1000 ? 0 : value > 10 ? 2 : 4;
      break;
    case 'EUR':
      symbol = '€';
      decimals = value > 1000 ? 0 : 2;
      break;
    case 'BTC':
      symbol = '₿';
      decimals = 8;
      break;
    case 'ETH':
      symbol = 'Ξ';
      decimals = 6;
      break;
    default:
      symbol = '';
      decimals = 4;
  }
  
  const formattedValue = value.toFixed(decimals);
  return currency === 'BTC' || currency === 'ETH' 
    ? `${formattedValue} ${symbol}` 
    : `${symbol}${formattedValue}`;
}

/**
 * Calculate percentage change between two values
 * @param currentValue The current value
 * @param previousValue The previous value
 */
export function calculatePercentageChange(currentValue: number, previousValue: number): number {
  if (!previousValue) return 0;
  return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * Format a percentage value for display
 * @param value The percentage value
 * @param includeSign Whether to include + sign for positive values
 */
export function formatPercentage(value: number, includeSign = true): string {
  if (!value && value !== 0) return 'N/A';
  
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Convert Unix timestamp to formatted date/time string
 * @param timestamp Unix timestamp in milliseconds
 * @param includeSeconds Whether to include seconds in the format
 */
export function formatTimestamp(timestamp: number, includeSeconds = true): string {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  if (includeSeconds) {
    options.second = '2-digit';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Convert order type to readable string
 * @param orderType The order type from Binance API
 */
export function formatOrderType(orderType: string): string {
  switch (orderType.toUpperCase()) {
    case 'LIMIT':
      return 'Limit';
    case 'MARKET':
      return 'Market';
    case 'STOP_LOSS':
      return 'Stop Loss';
    case 'STOP_LOSS_LIMIT':
      return 'Stop Loss Limit';
    case 'TAKE_PROFIT':
      return 'Take Profit';
    case 'TAKE_PROFIT_LIMIT':
      return 'Take Profit Limit';
    case 'LIMIT_MAKER':
      return 'Limit Maker';
    default:
      return orderType;
  }
}

/**
 * Convert order status to readable string with appropriate styling class
 * @param status The order status from Binance API
 */
export function formatOrderStatus(status: string): { text: string, className: string } {
  switch (status.toUpperCase()) {
    case 'NEW':
      return { text: 'New', className: 'status-new' };
    case 'PARTIALLY_FILLED':
      return { text: 'Partially Filled', className: 'status-partial' };
    case 'FILLED':
      return { text: 'Filled', className: 'status-filled' };
    case 'CANCELED':
      return { text: 'Canceled', className: 'status-canceled' };
    case 'PENDING_CANCEL':
      return { text: 'Canceling', className: 'status-pending' };
    case 'REJECTED':
      return { text: 'Rejected', className: 'status-rejected' };
    case 'EXPIRED':
      return { text: 'Expired', className: 'status-expired' };
    default:
      return { text: status, className: 'status-unknown' };
  }
}

/**
 * Format trade side (BUY/SELL) with appropriate styling class
 * @param side The trade side from Binance API
 */
export function formatTradeSide(side: string): { text: string, className: string } {
  switch (side.toUpperCase()) {
    case 'BUY':
      return { text: 'Buy', className: 'side-buy' };
    case 'SELL':
      return { text: 'Sell', className: 'side-sell' };
    default:
      return { text: side, className: 'side-unknown' };
  }
}

/**
 * Extract base and quote assets from a symbol
 * @param symbol The trading symbol (e.g., BTCUSDT)
 */
export function parseSymbol(symbol: string): { baseAsset: string, quoteAsset: string } {
  // Common quote assets
  const quoteAssets = ['USDT', 'USD', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB'];
  
  // Find the appropriate quote asset
  const quoteAsset = quoteAssets.find(quote => symbol.endsWith(quote)) || 'USDT';
  const baseAsset = symbol.substring(0, symbol.length - quoteAsset.length);
  
  return { baseAsset, quoteAsset };
}

/**
 * Check if a string is a valid Binance API key
 * @param apiKey The API key to validate
 */
export function isValidBinanceApiKey(apiKey: string): boolean {
  // Binance API keys are typically 64 characters long
  return typeof apiKey === 'string' && apiKey.length === 64;
}

/**
 * Validate a Binance request response for common error patterns
 * @param response The response object from Binance API
 */
export function validateBinanceResponse(response: any): { valid: boolean, error?: string } {
  // Check if response contains error code or message
  if (response && response.code && response.code < 0) {
    return {
      valid: false,
      error: `Error ${response.code}: ${response.msg || 'Unknown error'}`
    };
  }
  
  // Check for missing data in expected format
  if (response === null || response === undefined) {
    return {
      valid: false,
      error: 'Empty response received from Binance API'
    };
  }
  
  return { valid: true };
}

/**
 * Safely parse a numeric value from Binance API (handles string representations)
 * @param value The value to parse
 * @param defaultValue Default value if parsing fails
 */
export function safeParseFloat(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}