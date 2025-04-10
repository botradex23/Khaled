# Binance Integration Module

## Overview

This module centralizes all Binance-related functionality for the Tradeliy platform. It provides a consistent interface for interacting with Binance's REST API and WebSocket streams, handling market data, account management, and trading operations.

## Architecture

The integration is divided into several specialized components:

- **binanceConfig.ts** - Configuration parameters, constants, and types
- **binanceClient.ts** - REST API client for direct API requests 
- **binanceWebSocket.ts** - WebSocket client for real-time data streams
- **marketPriceService.ts** - Central repository for cryptocurrency prices
- **accountService.ts** - Account management and trading functionality
- **binanceUtils.ts** - Utility functions for formatting and data handling
- **index.ts** - Main entry point that exports all components

## Usage Examples

### Initializing the Binance Integration

```typescript
import { initializeBinanceIntegration } from '@/integrations/binance';

// Initialize with environment variables
const { 
  apiService, 
  marketService, 
  webSocketService,
  accountService 
} = await initializeBinanceIntegration();

// Or with custom credentials
const { 
  apiService, 
  marketService, 
  webSocketService,
  accountService 
} = await initializeBinanceIntegration('your-api-key', 'your-secret-key');
```

### Working with Market Data

```typescript
import { binanceMarketService } from '@/integrations/binance';

// Get price for a specific symbol
const btcPrice = binanceMarketService.getPrice('BTCUSDT');

// Listen for price updates
binanceMarketService.on('price-update', (data) => {
  console.log(`${data.symbol}: ${data.price}`);
});

// Get top cryptocurrencies
const topCryptos = binanceMarketService.getTopCryptocurrencies();
```

### Working with Account Data

```typescript
import { binanceService, createAccountService } from '@/integrations/binance';

const accountService = createAccountService(binanceService);

// Get account balances
const balances = await accountService.getAccountBalances();

// Place a market order
const order = await accountService.placeMarketOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  quantity: 0.001
});

// Get open orders
const openOrders = await accountService.getOpenOrders();
```

### Working with WebSockets

```typescript
import { BinanceWebSocketService } from '@/integrations/binance';

const webSocketService = new BinanceWebSocketService(binanceMarketService);

// Connect to WebSocket
webSocketService.connect();

// Listen for price updates
webSocketService.on('price-update', (data) => {
  console.log(`${data.symbol}: ${data.price}`);
});

// Listen for significant price changes
webSocketService.on('significant-price-change', (data) => {
  console.log(`Significant change for ${data.symbol}: ${data.changePercent}%`);
});
```

## Features

- **Failover Capability**: Automatically handles connection issues and geo-restrictions
- **Proxy Support**: Configurable proxy settings for regions with API restrictions
- **Simulation Mode**: Falls back to simulation for when direct API access isn't available
- **Error Handling**: Comprehensive error handling and logging
- **Typed Interfaces**: Full TypeScript support with proper interfaces
- **Event-Driven**: Uses EventEmitter pattern for real-time updates

## Dependencies

- **axios**: For HTTP requests to the REST API
- **ws**: For WebSocket connections
- **https-proxy-agent**: For proxy support
- **crypto**: For API signature generation