# CryptoTrade: Advanced Cryptocurrency Trading Platform

![CryptoTrade Logo](./generated-icon.png)

CryptoTrade is a cutting-edge cryptocurrency investment platform that combines advanced AI-driven trading solutions with an engaging, interactive user experience. The platform offers sophisticated trading algorithms, real-time market data, and comprehensive portfolio management in a user-friendly interface.

## Features

- **Multi-Source Exchange Integration**: Primary connectivity with Binance API, with OKX as a fallback source
- **AI-Powered Trading Bots**: 
  - AI Grid Bot: Uses machine learning to optimize grid parameters
  - DCA Bot: Executes regular purchases at fixed intervals
  - MACD Bot: Identifies market entry and exit points using MACD indicators
- **Comprehensive Market Data**: Real-time price visualization for 500+ cryptocurrencies with advanced filtering
- **Risk Management Suite**: Configure Stop Loss/Take Profit levels and portfolio risk percentages
- **Paper Trading Environment**: Test strategies without risking real capital
- **Advanced Portfolio Analytics**: Track performance metrics and ROI over time
- **Geo-Restricted API Solution**: Proxy functionality to access Binance from restricted regions
- **Responsive UI**: Professional SaaS design that works across all devices

## Technology Stack

- **Frontend**: React.js with TypeScript, Tailwind CSS
- **Backend**: Node.js/Express + Python Flask hybrid architecture
- **Database**: MongoDB for data persistence
- **Market Data**: Binance and OKX APIs
- **Trading Algorithms**: Python-based AI models using TensorFlow and scikit-learn
- **Data Visualization**: Chart.js for interactive charts
- **API Security**: AES encryption for API key storage

## Prerequisites

- Node.js >= 16.x
- Python >= 3.10
- MongoDB instance (local or cloud)
- Binance API keys (for live trading)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/crypto-trade.git
cd crypto-trade
```

### 2. Environment Configuration

Create a `.env` file in the root directory based on the provided `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file and fill in your credentials:

```
# Required environment variables
MONGO_URI=your_mongodb_connection_string
ENCRYPTION_KEY=your_encryption_key_min_32_chars
FLASK_SECRET_KEY=your_flask_secret_key

# Optional for testing
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# Proxy settings (for restricted regions)
USE_PROXY=true
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password
PROXY_IP=proxy_ip_address
PROXY_PORT=proxy_port
```

### 3. Install Dependencies

#### Node.js Dependencies

```bash
npm install
```

#### Python Dependencies

```bash
pip install -r requirements.txt
```

Or use the packager tool if you're on Replit:

```bash
python -m pip install binance-connector flask flask-cors matplotlib numpy pandas requests scikit-learn tensorflow websocket-client
```

### 4. Start the Application

#### Development Mode

```bash
# Start the full application (Node.js + Python services)
npm run dev
```

#### Start Services Individually

```bash
# Start Node.js server only
npm run server

# Start Python Flask service only
npm run python
```

## Architecture Overview

The application uses a hybrid architecture:

1. **Node.js Backend**: Handles authentication, database operations, and serves the React frontend
2. **Python Flask Service**: Processes trading algorithms and connects to the Binance API using the official SDK
3. **Frontend React App**: Provides the user interface and interacts with both backends

## Deployment

### Option 1: Render

1. Create a new Web Service in Render dashboard
2. Connect your repository
3. Set the build command: `npm install && pip install -r requirements.txt`
4. Set the start command: `npm start`
5. Add all environment variables from your `.env` file

### Option 2: Railway

1. Create a new project in Railway
2. Connect your repository
3. Add environment variables
4. Railway will automatically detect and deploy your application

### Option 3: Self-hosted

1. Set up a server with Node.js and Python installed
2. Clone the repository
3. Follow the installation steps above
4. Use PM2 or a similar process manager to keep the application running:
   ```bash
   npm install -g pm2
   pm2 start npm --name "crypto-trade" -- start
   ```

## API Documentation

The application exposes several API endpoints for market data and trading operations:

### Market Data Endpoints

- `/api/binance/market/24hr` - Get 24hr ticker price change statistics for all symbols
- `/api/binance/market/price/:symbol` - Get current price for a specific symbol
- `/api/binance/market/prices` - Get current prices for all symbols

### Trading Bot Endpoints

- `/api/trading-bots/ai-grid` - AI Grid bot operations
- `/api/trading-bots/dca` - DCA bot operations
- `/api/trading-bots/macd` - MACD bot operations

For a complete API reference, see the [API Documentation](./API.md)

## Security Considerations

- API keys are encrypted before being stored in the database
- The application includes HTTPS enforcing by default
- Proxy settings are available for secure connections from restricted regions

## Additional Documentation

For more detailed information, please refer to these documentation files:

- [Detailed Installation Guide](./INSTALLATION.md) - Step-by-step instructions for various deployment scenarios
- [Package Documentation](./PACKAGES.md) - Information about dependencies and their purposes
- [Environment Variables](./.env.example) - Template for required environment variables
- [API Documentation](./API.md) - Complete API reference with request/response examples
- [System Architecture](./docs/ARCHITECTURE.md) - High-level architecture diagrams and component details
- [Load Test Report Template](./load_test/LOAD_TEST_REPORT_TEMPLATE.md) - Template for creating load test reports

## Load Testing

The platform includes a comprehensive load testing suite to evaluate system performance, reliability, and scalability under various load conditions. The load testing tools are located in the `load_test` directory.

### Running Load Tests

You can run the load tests using the provided shell script:

```bash
./run_load_tests.sh
```

This will present a menu with different testing options:

1. General API Load Test
2. Trade Execution Queue Stress Test
3. ML Prediction Load Test
4. Run All Tests
5. Generate Charts

### Test Components

- **General API Load Test**: Tests various API endpoints under concurrent user load
- **Trade Execution Queue Test**: Stress tests the trade execution queue with high volumes of concurrent trades
- **ML Prediction Test**: Tests ML prediction services under high request load

### Test Results

Test results are stored in the `load_test/results` directory, including:

- Raw test data for each scenario and load level
- Consolidated reports with findings and recommendations
- Performance charts visualizing system behavior under load

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Binance API for market data and trading capabilities
- OKX API for providing backup market data
- Open-source community for various libraries and tools used in this project