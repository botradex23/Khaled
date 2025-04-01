# Python Binance Service

This is a Flask-based microservice that provides access to the Binance API using the official Binance connector.

## Why a separate Python service?

The Python Binance connector offers several advantages over the Node.js alternatives:

1. It's the official SDK maintained by Binance
2. More reliable proxy support for accessing Binance from geo-restricted regions
3. Better error handling and rate limit management
4. Additional features and endpoints not available in third-party libraries

## Setup

1. Make sure you have Python 3.8+ installed
2. Install dependencies:

```bash
pip install flask flask-cors binance-connector requests
```

## Running the service

To start the Python Binance service:

```bash
node start_python_service.js
```

This will start the Flask service on port 5001.

## API Endpoints

The following endpoints are available:

### Health Check

```
GET /api/binance/ping
```

Returns a simple health check response to confirm the service is running.

### Get All Prices

```
GET /api/binance/prices
```

Returns current prices for all trading pairs on Binance.

### Get Symbol Price

```
GET /api/binance/price/<symbol>
```

Returns the current price for a specific symbol (e.g., BTCUSDT).

### Get 24hr Statistics

```
GET /api/binance/ticker/24hr?symbol=<symbol>
```

Returns 24-hour statistics for all symbols or a specific symbol if provided.

## Configuration

The service uses environment variables for configuration:

- `PORT`: Port to run the service on (default: 5001)
- `BINANCE_API_KEY`: Your Binance API key (optional)
- `BINANCE_SECRET_KEY`: Your Binance secret key (optional)
- `USE_PROXY`: Whether to use a proxy for Binance API requests (default: true)
- `PROXY_IP`: Proxy IP address (default: 185.199.228.220)
- `PROXY_PORT`: Proxy port (default: 7300)
- `PROXY_USERNAME`: Proxy username (if required)
- `PROXY_PASSWORD`: Proxy password (if required)

## Error Handling

The service provides detailed error messages with appropriate HTTP status codes:

- 200: Success
- 400: Bad request (validation error)
- 404: Resource not found
- 500: Server error

Each error response includes a `success` flag and a `message` with details about the error.