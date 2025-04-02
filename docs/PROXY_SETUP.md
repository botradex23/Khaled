# Proxy Setup Guide for Binance API Access

This guide provides detailed instructions for configuring and troubleshooting proxy access to Binance APIs, which is necessary for users in regions where Binance services are restricted.

## Understanding Geographic Restrictions

Binance restricts API access from many countries due to regulatory requirements, including:
- United States
- Canada
- United Kingdom (certain services)
- Hong Kong
- Singapore
- Many other regions

When accessing Binance from a restricted region, you'll typically receive one of the following errors:
- HTTP 451 "Unavailable for legal reasons"
- HTTP 403 "Access Denied"
- Connection timeout errors
- "IP address is restricted" messages

## Proxy Configuration

### Required Environment Variables

Add the following variables to your `.env` file:

```
# Proxy Settings
USE_PROXY=true              # Enable proxy usage
PROXY_IP=123.45.67.89       # Your proxy server IP/hostname
PROXY_PORT=8080             # Proxy port number
PROXY_USERNAME=username     # Optional: proxy authentication username
PROXY_PASSWORD=password     # Optional: proxy authentication password
FALLBACK_TO_DIRECT=false    # Whether to try direct connection if proxy fails
```

### Proxy Types and Recommendations

For reliable Binance API access, we recommend using proxies based in countries with full Binance support, such as:
- United Kingdom (preferred)
- Germany
- Switzerland
- Japan
- South Korea

#### Proxy Options:

1. **Data Center Proxies**
   - More stable connections
   - Lower latency
   - Examples: Bright Data, SmartProxy, Oxylabs

2. **Residential Proxies**
   - Less likely to be blocked
   - More expensive
   - Examples: Luminati/Bright Data, Smartproxy

3. **SSH Tunnels**
   - If you have your own VPS in a supported country
   - Example setup:
     ```bash
     ssh -D 1080 user@your-server-in-supported-country
     # Then configure as SOCKS5 proxy with localhost:1080
     ```

### Testing Your Proxy Connection

After configuring your proxy settings, run the test script:

```bash
python test_binance_proxy_simple.py
```

This script will:
1. Try connecting through your configured proxy
2. Try connecting directly (as a fallback/comparison)
3. Report the results

Successful output should look like:

```
=== Configuration ===
Using proxy: 123.45.67.89:8080
Username: username
Proxy authentication: Enabled

=== Test Results ===
Proxy connection:  SUCCESS
Direct connection: FAILED
Proxy server time: 2023-04-02 12:34:56
BTC/USDT price:    $69,420.00
```

## Troubleshooting

### Common Issues and Solutions

| Problem | Possible Solutions |
|---------|-------------------|
| "Cannot connect to proxy" | 1. Verify proxy IP and port<br>2. Check if proxy server is online<br>3. Try different proxy provider |
| "Proxy authentication failed" | 1. Verify username and password<br>2. Check if proxy requires special auth format |
| Timeouts with proxy | 1. Proxy may be overloaded<br>2. Try a proxy with better performance<br>3. Check your network connection |
| Working yesterday, failing today | Binance may have blocked the proxy IP - rotate to a new proxy |
| "SSL certificate verification failed" | Your proxy may be performing SSL interception - use a different proxy |

### Verifying Proxy Access Outside the Application

You can test your proxy independently using curl:

```bash
# Test with proxy
curl -x http://username:password@proxyip:port https://api.binance.com/api/v3/ping

# Expected successful response:
{}
```

## Advanced Configuration

### Using a SOCKS5 Proxy

The application supports SOCKS5 proxies. To use a SOCKS5 proxy, set:

```
USE_PROXY=true
PROXY_PROTOCOL=socks5   # Add this line to specify SOCKS5
PROXY_IP=123.45.67.89
PROXY_PORT=1080
```

### Proxy Fallback Behavior

If `FALLBACK_TO_DIRECT=true` and the proxy connection fails, the application will attempt to connect directly to Binance.

This is useful for:
- Development environments
- Deployment in regions where Binance is sometimes accessible
- Testing new proxy configurations

Set to `false` in production to prevent unexpected behavior.

### Multiple Proxy Configuration

For advanced users, you can set up multiple proxies by creating a `proxies.json` file:

```json
{
  "proxies": [
    {
      "name": "primary",
      "ip": "123.45.67.89",
      "port": 8080,
      "username": "user1",
      "password": "pass1",
      "protocol": "http"
    },
    {
      "name": "backup",
      "ip": "98.76.54.32",
      "port": 3128,
      "username": "user2",
      "password": "pass2",
      "protocol": "http"
    }
  ]
}
```

Then set `USE_MULTIPLE_PROXIES=true` in your `.env` file.

## Security Considerations

- Never use free public proxies for trading applications
- Ensure your proxy connection is encrypted
- Consider using proxies with dedicated IPs to prevent being blocked
- Regularly rotate proxy credentials for additional security

## Support and Resources

If you continue to experience issues with proxy connectivity:

1. Check if your proxy provider has specific configuration requirements
2. Verify that your proxy provider allows connections to Binance API domains
3. Consider using a VPN service with API capabilities as an alternative

For additional help, please open an issue in the project repository with your connection logs (with sensitive information redacted).