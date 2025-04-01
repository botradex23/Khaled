# CryptoTrade API Documentation

This document provides information about the API endpoints available in the CryptoTrade platform, including request/response examples and error handling.

## Table of Contents

- [Authentication](#authentication)
- [Binance API Endpoints](#binance-api-endpoints)
- [OKX API Endpoints](#okx-api-endpoints)
- [Trading Bot Endpoints](#trading-bot-endpoints)
- [Risk Management Endpoints](#risk-management-endpoints)
- [Paper Trading Endpoints](#paper-trading-endpoints)
- [System Status Endpoints](#system-status-endpoints)
- [Python Service Endpoints](#python-service-endpoints)
- [Standard Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

Most endpoints require authentication. The authentication is handled via session cookies.

### Authentication Endpoints

#### `POST /api/auth/login`

Authenticates a user and creates a session.

**Request Body:**
```json
{
  "username": "example_user",
  "password": "secure_password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "username": "example_user",
    "email": "user@example.com",
    "defaultBroker": "binance"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials",
  "message": "Username or password is incorrect"
}
```

#### `POST /api/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "username": "new_user",
  "email": "newuser@example.com",
  "password": "secure_password123",
  "confirmPassword": "secure_password123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "id": 124,
    "username": "new_user",
    "email": "newuser@example.com"
  },
  "message": "Account created successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Username already exists"
}
```

#### `GET /api/auth/logout`

Logs out the current user by destroying the session.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### `GET /api/auth/user`

Returns the currently authenticated user's information.

**Success Response (200):**
```json
{
  "isAuthenticated": true,
  "user": {
    "id": 123,
    "username": "example_user",
    "email": "user@example.com",
    "defaultBroker": "binance"
  }
}
```

**Not Authenticated Response (200):**
```json
{
  "isAuthenticated": false,
  "user": null
}
```

#### `GET /api/auth/google`

Initiates Google OAuth authentication flow.

#### `GET /api/auth/google/callback`

Callback endpoint for Google OAuth authentication.

## Binance API Endpoints

### Market Data

#### `GET /api/binance/market/24hr`

Returns 24-hour price change statistics for all trading pairs.

**Success Response (200):**
```json
[
  {
    "symbol": "ETHBTC",
    "priceChange": "0.00013000",
    "priceChangePercent": "0.150",
    "weightedAvgPrice": "0.06891000",
    "prevClosePrice": "0.06799000",
    "lastPrice": "0.06812000",
    "lastQty": "0.15200000",
    "bidPrice": "0.06812000",
    "bidQty": "0.15000000",
    "askPrice": "0.06813000",
    "askQty": "4.57200000",
    "openPrice": "0.06799000",
    "highPrice": "0.06988000",
    "lowPrice": "0.06781000",
    "volume": "69718.32900000",
    "quoteVolume": "4803.91387766",
    "openTime": 1743429060000,
    "closeTime": 1743515460000,
    "firstId": 301047983,
    "lastId": 301467577,
    "count": 419595
  },
  // Additional symbols...
]
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Exchange error",
  "message": "Failed to fetch market data from Binance API"
}
```

#### `GET /api/binance/market/price/:symbol`

Returns the current price for a specific symbol (e.g., BTCUSDT).

**Parameters:**
- `symbol` (path): Trading pair symbol (e.g., BTCUSDT)

**Success Response (200):**
```json
{
  "symbol": "BTCUSDT",
  "price": "68995.20000000"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Symbol not found",
  "message": "The requested symbol INVALIDBTC is not available"
}
```

#### `GET /api/binance/market/prices`

Returns the current prices for all symbols.

**Success Response (200):**
```json
[
  {
    "symbol": "ETHBTC",
    "price": "0.06812000"
  },
  {
    "symbol": "BTCUSDT",
    "price": "68995.20000000"
  },
  // Additional symbols...
]
```

#### `GET /api/binance/market/tickers`

Returns detailed ticker information for all symbols.

**Success Response (200):**
```json
[
  {
    "symbol": "ETHBTC",
    "price": "0.06812000"
  },
  {
    "symbol": "BTCUSDT",
    "price": "68995.20000000"
  },
  // Additional symbols...
]
```

### Account & Trading

#### `GET /api/binance/account/balance`

Returns the account balance for the authenticated user.

**Authentication Required:** Yes

**Success Response (200):**
```json
{
  "balances": [
    {
      "asset": "BTC",
      "free": "0.00000000",
      "locked": "0.00000000",
      "total": "0.00000000",
      "valueUSD": 0
    },
    {
      "asset": "ETH",
      "free": "0.05000000",
      "locked": "0.00000000",
      "total": "0.05000000",
      "valueUSD": 95.75
    },
    {
      "asset": "USDT",
      "free": "500.00000000",
      "locked": "0.00000000",
      "total": "500.00000000",
      "valueUSD": 500
    }
  ],
  "totalValueUSD": 595.75
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "You must be logged in to access account balance"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "error": "API keys required",
  "message": "You must configure valid Binance API keys to access account balance"
}
```

#### `POST /api/binance/api-keys`

Saves Binance API keys for the authenticated user.

**Authentication Required:** Yes

**Request Headers:**
- `Content-Type: application/json`
- `X-Test-User-Id: 123` (optional, for development only)

**Request Body:**
```json
{
  "apiKey": "your_binance_api_key",
  "secretKey": "your_binance_secret_key",
  "allowedIp": "185.199.228.220",
  "testnet": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Binance API keys saved successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid API Key format",
  "message": "API Key should be at least 10 characters long. Please check your API key format."
}
```

#### `GET /api/binance/api-keys`

Returns (masked) Binance API keys for the authenticated user.

**Authentication Required:** Yes

**Success Response (200):**
```json
{
  "success": true,
  "apiKeys": {
    "binanceApiKey": "AbCd...XyZ1",
    "binanceSecretKey": "1234...6789",
    "binanceAllowedIp": "185.199.228.220"
  },
  "hasBinanceApiKey": true,
  "hasBinanceSecretKey": true
}
```

#### `GET /api/binance/api-keys/status`

Checks if the user has configured valid Binance API keys.

**Authentication Required:** Yes

**Success Response (200):**
```json
{
  "configured": true,
  "hasBinanceApiKey": true,
  "hasBinanceSecretKey": true
}
```

**Not Configured Response (200):**
```json
{
  "configured": false,
  "hasBinanceApiKey": false,
  "hasBinanceSecretKey": false
}
```

## OKX API Endpoints

### Market Data

#### `GET /api/okx/market/tickers`

Returns detailed ticker information for all symbols.

**Success Response (200):**
```json
[
  {
    "instId": "BTC-USDT",
    "last": "69000.5",
    "lastSz": "0.1",
    "askPx": "69001.2",
    "askSz": "0.5",
    "bidPx": "68999.8",
    "bidSz": "0.3",
    "open24h": "68000.1",
    "high24h": "69500.0",
    "low24h": "67800.0",
    "volCcy24h": "1250.5",
    "vol24h": "86000000",
    "ts": "1743515607717"
  },
  // Additional symbols...
]
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Exchange error",
  "message": "Failed to fetch market data from OKX API"
}
```

### Account & Trading

#### `GET /api/okx/account/balance`

Returns the account balance for the authenticated user.

**Authentication Required:** Yes

**Success Response (200):**
```json
[
  {
    "currency": "BTC",
    "available": "1.2",
    "frozen": "0.2",
    "total": "1.4",
    "valueUSD": 96600.7
  },
  {
    "currency": "ETH",
    "available": "12",
    "frozen": "0",
    "total": "12",
    "valueUSD": 22981.44
  },
  {
    "currency": "USDT",
    "available": "15000",
    "frozen": "0",
    "total": "15000",
    "valueUSD": 15000
  }
],
"totalValueUSD": 134582.14
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "You must be logged in to access account balance"
}
```

**Demo Mode Response (200):**
When API keys are not configured, the system returns demo data:
```json
{
  "demoMode": true,
  "balances": [
    // Demo balances similar to above format
  ]
}
```

#### `POST /api/okx/api-keys`

Saves OKX API keys for the authenticated user.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "apiKey": "your_okx_api_key",
  "secretKey": "your_okx_secret_key",
  "passphrase": "your_okx_passphrase",
  "testnet": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OKX API keys saved successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid API Key format",
  "message": "API Key, Secret Key, and Passphrase are all required"
}
```

#### `GET /api/okx/api-keys`

Returns (masked) OKX API keys for the authenticated user.

**Authentication Required:** Yes

**Success Response (200):**
```json
{
  "success": true,
  "apiKeys": {
    "okxApiKey": "AbCd...XyZ1",
    "okxSecretKey": "1234...6789",
    "okxPassphrase": "pass...word"
  },
  "hasOkxApiKey": true,
  "hasOkxSecretKey": true,
  "hasOkxPassphrase": true
}
```

## Trading Bot Endpoints

### AI Grid Bot

#### `GET /api/trading-bots/ai-grid`

Returns all AI Grid bots for the authenticated user.

**Authentication Required:** Yes

**Success Response (200):**
```json
{
  "success": true,
  "bots": [
    {
      "id": 1,
      "userId": 123,
      "symbol": "BTCUSDT",
      "status": "RUNNING",
      "gridLevels": 10,
      "upperLimit": 72000,
      "lowerLimit": 66000,
      "investmentAmount": 1000,
      "profitPercentage": 2.34,
      "createdAt": "2025-03-15T12:00:00Z",
      "updatedAt": "2025-04-01T10:15:22Z",
      "exchange": "binance",
      "aiOptimized": true,
      "aiConfidenceScore": 0.87,
      "tradeHistory": [
        {
          "tradeId": "grid-bot-123",
          "side": "BUY",
          "price": 68750.5,
          "quantity": 0.0073,
          "timestamp": "2025-04-01T08:30:15Z"
        }
      ]
    }
  ]
}
```

#### `POST /api/trading-bots/ai-grid`

Creates a new AI Grid bot.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "symbol": "ETHUSDT",
  "gridLevels": 8,
  "upperLimit": 2100,
  "lowerLimit": 1800,
  "investmentAmount": 500,
  "exchange": "binance",
  "aiOptimized": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "bot": {
    "id": 2,
    "userId": 123,
    "symbol": "ETHUSDT",
    "status": "CREATED",
    "gridLevels": 8,
    "upperLimit": 2100,
    "lowerLimit": 1800,
    "investmentAmount": 500,
    "profitPercentage": 0,
    "createdAt": "2025-04-01T14:22:15Z",
    "updatedAt": "2025-04-01T14:22:15Z",
    "exchange": "binance",
    "aiOptimized": true,
    "aiConfidenceScore": 0.81
  },
  "message": "AI Grid bot created successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "message": "Upper limit must be greater than lower limit"
}
```

#### `GET /api/trading-bots/ai-grid/:id`

Returns a specific AI Grid bot by ID.

**Authentication Required:** Yes

**Parameters:**
- `id` (path): Bot ID

**Success Response (200):**
```json
{
  "success": true,
  "bot": {
    "id": 1,
    "userId": 123,
    "symbol": "BTCUSDT",
    "status": "RUNNING",
    "gridLevels": 10,
    "upperLimit": 72000,
    "lowerLimit": 66000,
    "investmentAmount": 1000,
    "profitPercentage": 2.34,
    "createdAt": "2025-03-15T12:00:00Z",
    "updatedAt": "2025-04-01T10:15:22Z",
    "exchange": "binance",
    "aiOptimized": true,
    "aiConfidenceScore": 0.87,
    "tradeHistory": [
      {
        "tradeId": "grid-bot-123",
        "side": "BUY",
        "price": 68750.5,
        "quantity": 0.0073,
        "timestamp": "2025-04-01T08:30:15Z"
      }
    ]
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Not found",
  "message": "Bot with ID 999 not found"
}
```

#### `PUT /api/trading-bots/ai-grid/:id`

Updates a specific AI Grid bot.

**Authentication Required:** Yes

**Parameters:**
- `id` (path): Bot ID

**Request Body:**
```json
{
  "gridLevels": 12,
  "upperLimit": 74000,
  "lowerLimit": 65000,
  "investmentAmount": 1200
}
```

**Success Response (200):**
```json
{
  "success": true,
  "bot": {
    "id": 1,
    "userId": 123,
    "symbol": "BTCUSDT",
    "status": "RUNNING",
    "gridLevels": 12,
    "upperLimit": 74000,
    "lowerLimit": 65000,
    "investmentAmount": 1200,
    "profitPercentage": 2.34,
    "createdAt": "2025-03-15T12:00:00Z",
    "updatedAt": "2025-04-01T14:25:18Z",
    "exchange": "binance",
    "aiOptimized": true,
    "aiConfidenceScore": 0.87
  },
  "message": "AI Grid bot updated successfully"
}
```

#### `DELETE /api/trading-bots/ai-grid/:id`

Deletes a specific AI Grid bot.

**Authentication Required:** Yes

**Parameters:**
- `id` (path): Bot ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "AI Grid bot deleted successfully"
}
```

#### `POST /api/trading-bots/ai-grid/:id/start`

Starts a specific AI Grid bot.

**Authentication Required:** Yes

**Parameters:**
- `id` (path): Bot ID

**Success Response (200):**
```json
{
  "success": true,
  "bot": {
    "id": 1,
    "status": "RUNNING",
    "updatedAt": "2025-04-01T14:28:45Z"
  },
  "message": "AI Grid bot started successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid operation",
  "message": "Bot is already running"
}
```

#### `POST /api/trading-bots/ai-grid/:id/stop`

Stops a specific AI Grid bot.

**Authentication Required:** Yes

**Parameters:**
- `id` (path): Bot ID

**Success Response (200):**
```json
{
  "success": true,
  "bot": {
    "id": 1,
    "status": "STOPPED",
    "updatedAt": "2025-04-01T14:30:12Z"
  },
  "message": "AI Grid bot stopped successfully"
}
```

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