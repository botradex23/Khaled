/**
 * Markets Python All Routes
 * 
 * This module provides Express routes that use the Python Binance SDK directly
 * to access Binance market data via the Flask application for the all-markets endpoint.
 * This uses ONLY the official Binance SDK for data access - no API calls or fallbacks.
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { log } from '../vite';

const router = Router();
const pythonServiceUrl = 'http://localhost:5001';

/**
 * GET /api/markets/python/all-markets
 * Get all market data directly from the official Binance SDK via Python service
 * This endpoint exclusively uses the SDK, not any public API
 */
router.get('/all-markets', async (req: Request, res: Response) => {
  try {
    log('Fetching market data directly from the official Binance SDK via Python Flask service');
    
    // Get top cryptocurrency pairs from the direct-binance Python service
    // The Python endpoint uses the official Binance SDK for spot markets
    // (binance-connector library with Spot client) for data access
    const response = await axios.get(`${pythonServiceUrl}/api/direct-binance/top-pairs`, {
      timeout: 10000 // 10-second timeout
    });
    
    // Check if the response has the expected structure
    if (!response.data || !response.data.success) {
      log('Binance SDK returned unsuccessful response', 'error');
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch markets data from Binance SDK',
        error: response.data?.message || 'Unknown error'
      });
    }
    
    // Transform the data to match the expected format in markets-full.tsx
    const prices = response.data.prices || [];
    
    // Process the raw prices into the required market data format
    const processedData = prices.map((price: any) => {
      // Extract symbol parts (e.g., "BTCUSDT" -> base: "BTC", quote: "USDT")
      const symbol = price.symbol;
      const quoteSymbols = ['USDT', 'USD', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB'];
      
      let baseSymbol = symbol;
      let quoteSymbol = '';
      
      // Find the quote currency by checking from the end of the symbol
      for (const quote of quoteSymbols) {
        if (symbol.endsWith(quote)) {
          quoteSymbol = quote;
          baseSymbol = symbol.slice(0, -quote.length);
          break;
        }
      }
      
      return {
        symbol: symbol,
        baseSymbol: baseSymbol,
        quoteSymbol: quoteSymbol,
        price: parseFloat(price.price),
        // Setting default values for fields not provided by the /top-pairs endpoint
        change24h: 0,
        volume24h: 0,
        quoteVolume: 0,
        high24h: 0,
        low24h: 0,
        volatility: 0
      };
    });
    
    // Return the transformed data in the expected format
    return res.json({
      success: true,
      source: 'binance-official-sdk', // Indicates this data comes from the SDK, not API
      using_api: false, // Explicitly mark we're using the SDK not the public API
      sdk_version: 'binance-connector',
      timestamp: new Date().toISOString(),
      count: processedData.length,
      data: processedData,
      // Include raw timestamp from the SDK
      apiTimestamp: response.data.timestamp
    });
    
  } catch (error: any) {
    log(`Error fetching all markets from Binance SDK: ${error.message}`, 'error');
    
    // Check if this is a geo-restriction error
    const isGeoRestricted = error.response?.status === 451 || 
                          (error.response?.data?.geo_restricted === true) ||
                          error.message.includes('restricted location');
    
    if (isGeoRestricted) {
      return res.status(403).json({
        success: false,
        error: 'geo_restricted',
        message: 'Binance API access is not available in your region',
        details: error.message
      });
    }
    
    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch markets data from official Binance SDK',
      error: error.message
    });
  }
});

export default router;