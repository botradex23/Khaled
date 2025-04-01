# Dependencies Documentation

## Python Packages

CryptoTrade uses the following Python packages for its backend services and AI algorithms:

| Package | Version | Purpose |
|---------|---------|---------|
| binance-connector | 3.12.0+ | Official Binance API client for connecting to the Binance exchange |
| ccxt | 4.4.70+ | Multi-exchange cryptocurrency trading library (used as backup) |
| flask | 3.1.0+ | Web framework for building the Python service API |
| flask-cors | 5.0.1+ | CORS support for Flask applications |
| matplotlib | 3.10.1+ | Data visualization library for chart generation |
| numpy | 2.2.4+ | Scientific computing library for data manipulation |
| pandas | 2.2.3+ | Data analysis and manipulation library |
| requests | 2.32.3+ | HTTP library for API requests |
| scikit-learn | 1.6.1+ | Machine learning library for prediction models |
| tensorflow | 2.14.0+ | Deep learning framework for neural network models |
| websocket-client | 1.8.0+ | WebSocket client for real-time data streams |
| python-dotenv | 1.0.0+ | Loading environment variables from .env files |
| pytz | 2022.7.1+ | Timezone calculations for market data |
| cryptography | 40.0.2+ | Cryptographic functions for secure operations |

## Node.js Packages

The frontend and main backend use various Node.js packages including:

- React.js and React DOM for the user interface
- TypeScript for type safety
- Express.js for the API server
- MongoDB/Mongoose for database operations
- Chart.js for data visualization
- Tailwind CSS for styling
- Passport.js for authentication

For a complete list of Node.js dependencies, refer to the `package.json` file.

## Deployment Considerations

When deploying the application, ensure that:

1. Both Node.js and Python environments are properly configured
2. All required packages are installed in their respective environments
3. Environment variables are properly set
4. Database connection is established
5. Proxy settings are configured if deploying in regions with Binance restrictions