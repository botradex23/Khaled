# CryptoTrade Installation Guide

This document provides detailed instructions for setting up the CryptoTrade platform on various environments.

## Table of Contents

1. [Local Development Environment](#local-development-environment)
2. [Deployment Options](#deployment-options)
   - [Render](#render)
   - [Railway](#railway)
   - [Self-hosted VPS](#self-hosted-vps)
3. [Troubleshooting](#troubleshooting)
4. [Database Setup](#database-setup)
5. [API Keys](#api-keys)
6. [Proxy Configuration](#proxy-configuration)

## Local Development Environment

### Prerequisites

- Node.js v16.x or higher
- Python 3.10 or higher
- MongoDB (local or remote instance)
- Git

### Step-by-Step Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/crypto-trade.git
   cd crypto-trade
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and add your configuration details:

   - Add MongoDB connection string
   - Generate a secure ENCRYPTION_KEY (32+ characters)
   - Add API keys for testing (optional)

3. **Install Node.js dependencies**

   ```bash
   npm install
   ```

4. **Install Python dependencies**

   ```bash
   # Create a virtual environment (recommended)
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   python -m pip install binance-connector flask flask-cors matplotlib numpy pandas requests scikit-learn tensorflow websocket-client python-dotenv pytz cryptography
   ```

5. **Start the development servers**

   ```bash
   # Start everything
   npm run dev
   
   # Alternatively, start servers separately:
   # Terminal 1 - Node.js server
   npm run server
   
   # Terminal 2 - Python Flask service
   npm run python
   ```

6. **Access the application**

   Open your browser and navigate to `http://localhost:5000`

## Deployment Options

### Render

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `crypto-trade` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && python -m pip install -r python_app/requirements.txt`
   - **Start Command**: `npm start`
4. Add all the environment variables from your `.env` file
5. Click **Create Web Service**

### Railway

1. Create a new project in Railway
2. Connect your GitHub repository
3. Configure the project:
   - Add a **MongoDB** plugin
   - Add environment variables from your `.env` file
   - Update the `MONGO_URI` to use the Railway-provided MongoDB connection string
4. Deploy the application

### Self-hosted VPS

1. Provision a VPS with at least 2GB RAM (recommended)
2. Install Node.js, Python, and MongoDB:

   ```bash
   # Example for Ubuntu
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   sudo apt-get install -y python3 python3-pip python3-venv
   
   # MongoDB
   wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

3. Clone and set up the project:

   ```bash
   git clone https://github.com/your-username/crypto-trade.git
   cd crypto-trade
   cp .env.example .env
   # Edit the .env file with your configuration
   
   npm install
   python -m venv venv
   source venv/bin/activate
   python -m pip install binance-connector flask flask-cors matplotlib numpy pandas requests scikit-learn tensorflow websocket-client
   ```

4. Set up PM2 for process management:

   ```bash
   npm install -g pm2
   pm2 start npm --name "crypto-trade-node" -- run server
   pm2 start npm --name "crypto-trade-python" -- run python
   pm2 startup
   pm2 save
   ```

5. Set up Nginx as a reverse proxy:

   ```bash
   sudo apt-get install -y nginx
   ```

   Create a new Nginx configuration:

   ```
   server {
     listen 80;
     server_name your-domain.com;
     
     location / {
       proxy_pass http://localhost:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

6. Set up SSL with Certbot:

   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Troubleshooting

### MongoDB Connection Issues

If you experience MongoDB connection problems:

1. Check if MongoDB is running:
   ```bash
   sudo systemctl status mongod
   ```

2. Verify your connection string in the `.env` file

3. If using Atlas, ensure your IP is whitelisted in the Atlas dashboard

### Python Service Not Starting

1. Check for proper Python version:
   ```bash
   python --version
   ```

2. Verify all dependencies are installed:
   ```bash
   pip list
   ```

3. Check logs for errors:
   ```bash
   npm run python:debug
   ```

### API Key Issues

1. Ensure ENCRYPTION_KEY has not changed after API keys were saved
2. Verify that API keys are properly formatted and active
3. **Important**: Binance restricts API access from certain geographic regions (including the US, Canada, and many other countries). If you're in a restricted region, you must configure a proxy to access Binance services. See the [Proxy Configuration](#proxy-configuration) section below.

## Database Setup

### MongoDB Schema

The application uses MongoDB with the following main collections:

- `users`: User accounts and authentication data
- `api_keys`: Encrypted exchange API keys (linked to users)
- `trading_bots`: Bot configurations and settings
- `trading_history`: Record of trades executed

### Initial Setup

The application will automatically create these collections on first run.

For a production environment, consider creating a dedicated MongoDB user:

```javascript
db.createUser({
  user: "crypto_trade_app",
  pwd: "secure_password_here",
  roles: [{ role: "readWrite", db: "crypto_trade" }]
})
```

## API Keys

### Obtaining Binance API Keys

1. Login to your Binance account
2. Navigate to API Management
3. Create a new API key (consider using IP restriction for security)
4. Set the following permissions:
   - Enable Reading
   - Enable Spot & Margin Trading (if using real trading)
5. Save the API key and Secret key securely

**Note**: Binance API is not accessible from many countries due to regulatory restrictions. If you're in a restricted region (including the US and Canada), you'll need to set up a proxy as described in the [Proxy Configuration](#proxy-configuration) section below.

### Obtaining OKX API Keys

1. Login to your OKX account
2. Navigate to My Account > API Management
3. Create a new API key
4. Set appropriate permissions
5. Save the API key, Secret key, and Passphrase securely

Remember that this application encrypts API keys in the database using the ENCRYPTION_KEY environment variable. Changing this key after API keys are stored will make them unrecoverable!

## Proxy Configuration

If you're in a geographical region where Binance API access is restricted, you'll need to configure a proxy to access Binance services.

### Setting Up Proxy Environment Variables

Add these variables to your `.env` file:

```
# Proxy Settings
USE_PROXY=true
PROXY_IP=your_proxy_ip_or_hostname
PROXY_PORT=your_proxy_port
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password
FALLBACK_TO_DIRECT=false
```

### Obtaining a Suitable Proxy

For reliable access to Binance API, you should use a UK-based proxy as Binance is fully accessible from the UK. Options include:

1. **DataCenter Proxies**: Services like SmartProxy, Bright Data, or Oxylabs offer UK-based datacenter proxies
2. **Residential Proxies**: For higher reliability (but more expensive)
3. **VPN Services**: Some VPN services offer API-accessible proxy endpoints

### Testing Your Proxy Connection

After configuring your proxy, test the connection with:

```bash
python test_binance_proxy_simple.py
```

A successful test will show:
```
=== Test Results ===
Proxy connection:  SUCCESS
Direct connection: FAILED
```

For detailed instructions and troubleshooting, refer to the complete [Proxy Setup Guide](docs/PROXY_SETUP.md).