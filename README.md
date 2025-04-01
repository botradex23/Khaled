# Advanced Cryptocurrency Trading Platform

A cutting-edge cryptocurrency investment platform leveraging advanced AI and multi-source data processing to provide intelligent, adaptive trading solutions.

## Core Features

- **Multi-Source Data Processing**: Primary data from Binance API with OKX as fallback
- **AI-Driven Trading Strategies**: Multiple bot types with adaptive parameters
- **Paper Trading Integration**: Test strategies without risking real funds
- **Comprehensive Market Data**: View and analyze 500+ cryptocurrencies
- **Risk Management Tools**: Configure Stop Loss/Take Profit and risk levels

## Bot Strategies

1. **AI Grid Bot**: Uses machine learning to optimize grid parameters based on market conditions
2. **DCA Bot**: Dollar-Cost Averaging strategy for regular purchases at fixed intervals
3. **MACD Bot**: Technical analysis using Moving Average Convergence Divergence indicator

## Technical Stack

- React.js (TypeScript) frontend
- Node.js backend
- Python Flask microservice for Binance API integration
- Tailwind CSS for styling
- PostgreSQL database
- Binance & OKX API integrations
- Advanced AI trading algorithms
- Multi-source cryptocurrency data processing
- Internationalization support

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Install Python dependencies with `pip install flask flask-cors binance-connector requests`
4. Start the development server with `npm run dev`
5. In a separate terminal, start the Python Binance service with `node start_python_service.js`
6. Navigate to the provided URL in your browser

## Paper Trading

All bot strategies are integrated with a paper trading system that simulates real trading without using actual funds. This allows for risk-free testing of strategies before deploying with real cryptocurrency.

## Market Data

The platform provides comprehensive market data for over 500 cryptocurrencies, with filtering options by category, performance, and other metrics.

## Project Structure

- `client/`: Frontend React application
- `server/`: Backend Node.js API
- `shared/`: Shared types and utilities
- `server/api/`: API endpoints and services
- `server/api/ai/`: AI trading algorithms
- `server/api/paper-trading/`: Paper trading implementation
- `python_app/`: Python Flask service for Binance API integration

## License

This project is proprietary and confidential.

## Contact

For support or inquiries, please contact the development team.