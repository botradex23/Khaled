# Proxy Configuration for Binance API Access

This document provides detailed information about the proxy configuration used for accessing Binance APIs from geo-restricted locations.

## Overview

In certain regions, Binance API services may be restricted due to regulatory requirements. To overcome these geographical restrictions, this application supports connecting to Binance APIs via a proxy server.

## Environment Variables

The following environment variables control proxy behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_PROXY` | Enable or disable proxy for API connections | `false` |
| `PROXY_IP` | IP address of the proxy server | - |
| `PROXY_PORT` | Port number of the proxy server | - |
| `PROXY_USERNAME` | Username for proxy authentication (if required) | - |
| `PROXY_PASSWORD` | Password for proxy authentication (if required) | - |
| `PROXY_PROTOCOL` | Protocol to use (`http`, `https`, `socks4`, or `socks5`) | `http` |
| `FALLBACK_TO_DIRECT` | Attempt direct connection if proxy fails | `false` |

## Implementation Details

The proxy functionality is implemented in two main service files:

1. `python_app/services/binance/market_service.py` - For market data requests
2. `python_app/services/binance/trading_service.py` - For trading operations

### URL Encoding of Credentials

When using proxy authentication with special characters in usernames or passwords, the credentials are URL-encoded to prevent authentication failures:

```python
import urllib.parse
username = urllib.parse.quote_plus(proxy_username)
password = urllib.parse.quote_plus(proxy_password)
proxy_url = f"http://{username}:{password}@{proxy_ip}:{proxy_port}"
```

### Fallback Mechanism

When `FALLBACK_TO_DIRECT` is enabled, the system will:
1. First attempt to connect via the configured proxy
2. If proxy connection fails, fall back to direct connection
3. Log appropriate warning messages

## Testing Proxy Configuration

We provide two test scripts to verify proxy functionality:

### 1. Basic Proxy Test Script

```bash
python test_binance_proxy_simple.py
```

This script performs:
- Basic connectivity test with proxy
- Test with direct connection for comparison
- Test with authenticated endpoints (if API credentials are provided)

### 2. Trade Execution Test Script

```bash
python test_binance_trade_execution.py
```

This script:
- Tests market data retrieval via proxy
- Tests paper trading functionality
- Tests real trading in testnet (when explicitly enabled)

## Common Issues and Solutions

### 1. Connection Refused (Error 111)

```
HTTPSConnectionPool(host='api.binance.com', port=443): Max retries exceeded 
with url: /api/v3/ping (Caused by ProxyError('Unable to connect to proxy', 
NewConnectionError('<urllib3.connection.HTTPSConnection object at 0x7fc944acdc10>': 
Failed to establish a new connection: [Errno 111] Connection refused')))
```

**Solution:**
- Verify the proxy IP and port are correct
- Check if the proxy server is running and accessible
- Test if the proxy requires authentication

### 2. Proxy Authentication Failed (407)

```
HTTPSConnectionPool(host='api.binance.com', port=443): Max retries exceeded 
with url: /api/v3/ping (Caused by ProxyError('Proxy Authentication Required'))
```

**Solution:**
- Ensure `PROXY_USERNAME` and `PROXY_PASSWORD` are correctly set
- Check if credentials need URL encoding (implemented as of latest update)
- Verify with proxy provider that credentials are valid

### 3. Geo-Restriction Error (451)

```
(451, 0, "Service unavailable from a restricted location according to 
'b. Eligibility' in https://www.binance.com/en/terms.)
```

**Solution:**
- Ensure the proxy is from a non-restricted region
- Verify the proxy is correctly forwarding requests
- Contact your proxy provider to ensure it's suitable for Binance API access

## Recommended Proxy Providers

For reliable access to Binance APIs from restricted regions, consider using proxies from:

1. Datacenter proxies from European regions 
2. Residential proxies from UK, EU, or Singapore
3. VPN services with API support (less recommended due to potential performance issues)

## Best Practices

1. **Test First**: Always test proxy configuration with the provided test scripts
2. **Use Testnet**: Initially test with Binance Testnet to avoid real funds
3. **Enable Fallback**: In production, consider enabling fallback for better reliability
4. **Secure Credentials**: Store proxy credentials securely and never commit them to code
5. **Monitor Logs**: Regularly check logs for proxy-related issues