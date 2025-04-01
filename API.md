# CryptoTrade API Documentation

This document provides information about the API endpoints available in the CryptoTrade platform.

## Authentication

Most endpoints require authentication. The authentication is handled via session cookies.

### Authentication Endpoints

```
POST /api/auth/login
POST /api/auth/register
GET /api/auth/logout
GET /api/auth/user
GET /api/auth/google
GET /api/auth/google/callback
```

## Binance API Endpoints

### Market Data

```
GET /api/binance/market/24hr
```
Returns 24-hour price change statistics for all trading pairs.

```
GET /api/binance/market/price/:symbol
```
Returns the current price for a specific symbol (e.g., BTCUSDT).

```
GET /api/binance/market/prices
```
Returns the current prices for all symbols.

```
GET /api/binance/market/tickers
```
Returns detailed ticker information for all symbols.

### Account & Trading

```
GET /api/binance/account/balance
```
Returns the account balance for the authenticated user.

```
POST /api/binance/api-keys
```
Saves Binance API keys for the authenticated user.

```
GET /api/binance/api-keys
```
Returns (masked) Binance API keys for the authenticated user.

```
GET /api/binance/api-keys/status
```
Checks if the user has configured valid Binance API keys.

## OKX API Endpoints

### Market Data

```
GET /api/okx/market/tickers
```
Returns detailed ticker information for all symbols.

### Account & Trading

```
GET /api/okx/account/balance
```
Returns the account balance for the authenticated user.

```
POST /api/okx/api-keys
```
Saves OKX API keys for the authenticated user.

```
GET /api/okx/api-keys
```
Returns (masked) OKX API keys for the authenticated user.

## Trading Bot Endpoints

### AI Grid Bot

```
GET /api/trading-bots/ai-grid
```
Returns all AI Grid bots for the authenticated user.

```
POST /api/trading-bots/ai-grid
```
Creates a new AI Grid bot.

```
GET /api/trading-bots/ai-grid/:id
```
Returns a specific AI Grid bot by ID.

```
PUT /api/trading-bots/ai-grid/:id
```
Updates a specific AI Grid bot.

```
DELETE /api/trading-bots/ai-grid/:id
```
Deletes a specific AI Grid bot.

```
POST /api/trading-bots/ai-grid/:id/start
```
Starts a specific AI Grid bot.

```
POST /api/trading-bots/ai-grid/:id/stop
```
Stops a specific AI Grid bot.

### DCA Bot

```
GET /api/trading-bots/dca
```
Returns all DCA bots for the authenticated user.

```
POST /api/trading-bots/dca
```
Creates a new DCA bot.

```
GET /api/trading-bots/dca/:id
```
Returns a specific DCA bot by ID.

```
PUT /api/trading-bots/dca/:id
```
Updates a specific DCA bot.

```
DELETE /api/trading-bots/dca/:id
```
Deletes a specific DCA bot.

```
POST /api/trading-bots/dca/:id/start
```
Starts a specific DCA bot.

```
POST /api/trading-bots/dca/:id/stop
```
Stops a specific DCA bot.

### MACD Bot

```
GET /api/trading-bots/macd
```
Returns all MACD bots for the authenticated user.

```
POST /api/trading-bots/macd
```
Creates a new MACD bot.

```
GET /api/trading-bots/macd/:id
```
Returns a specific MACD bot by ID.

```
PUT /api/trading-bots/macd/:id
```
Updates a specific MACD bot.

```
DELETE /api/trading-bots/macd/:id
```
Deletes a specific MACD bot.

```
POST /api/trading-bots/macd/:id/start
```
Starts a specific MACD bot.

```
POST /api/trading-bots/macd/:id/stop
```
Stops a specific MACD bot.

## Risk Management Endpoints

```
GET /api/risk/settings
```
Returns the risk management settings for the authenticated user.

```
PUT /api/risk/settings
```
Updates the risk management settings for the authenticated user.

## Paper Trading Endpoints

```
GET /api/paper-trading/account
```
Returns the paper trading account for the authenticated user.

```
POST /api/paper-trading/account/reset
```
Resets the paper trading account to initial balance.

```
GET /api/paper-trading/positions
```
Returns all open paper trading positions.

```
GET /api/paper-trading/trades
```
Returns all paper trading trade history.

```
POST /api/paper-trading/trade
```
Executes a paper trade (buy/sell).

## System Status Endpoints

```
GET /api/status
```
Returns the system status including connectivity to exchanges.

```
GET /api/database/status
```
Returns the database connection status.

## Python Service Endpoints

The Python Flask service exposes these endpoints (internally):

```
GET /api/binance/ping
```
Pings the Binance API to check connectivity.

```
GET /api/binance/prices
```
Returns all current prices from Binance.

```
GET /api/binance/price/:symbol
```
Returns the current price for a specific symbol.

```
GET /api/binance/ticker/24hr
```
Returns 24-hour statistics for all symbols.

## Response Format

All API responses follow this standard format:

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error code or type",
  "message": "Human-readable error message"
}
```

## Rate Limiting

Public endpoints are rate-limited to 60 requests per minute.
Authenticated endpoints are rate-limited to 120 requests per minute per user.

## Authentication Errors

If an endpoint requires authentication and the user is not authenticated, the API will return:

```json
{
  "success": false,
  "error": "Authentication required",
  "message": "You must be logged in to access this resource"
}
```

## API Key Requirements

For endpoints that interact with exchanges (Binance, OKX), valid API keys must be configured. Otherwise, the API will return:

```json
{
  "success": false,
  "error": "API keys required",
  "message": "You must configure API keys for this exchange to access this resource"
}
```