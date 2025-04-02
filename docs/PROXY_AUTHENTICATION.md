# Proxy Authentication Methods

This document provides detailed information about proxy authentication methods used in the application, focusing on URL encoding techniques and troubleshooting authentication issues.

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication Methods](#authentication-methods)
3. [URL Encoding](#url-encoding)
4. [Proxy URL Format](#proxy-url-format)
5. [Common Authentication Errors](#common-authentication-errors)
6. [Implementation Details](#implementation-details)
7. [Testing Authentication Methods](#testing-authentication-methods)

## Introduction

When using authenticated proxies (those requiring username and password), proper encoding of credentials is crucial. Different proxy servers may require different encoding methods for credentials, especially when those credentials contain special characters.

## Authentication Methods

The application supports three primary authentication methods for proxies:

1. **Basic Authentication**: Username and password passed in the proxy URL
2. **Headers-based Authentication**: Username and password provided in request headers
3. **Direct Authentication**: Authentication embedded in proxy connection parameters

For most proxy servers, Basic Authentication is used, which requires proper URL encoding of credentials.

## URL Encoding

The application supports three URL encoding methods:

### 1. No Encoding (`none`)

Credentials are used as-is, without any encoding. This works only if the username and password contain no special characters.

Example:
```
http://username:password@proxy-server:port
```

### 2. Standard URL Encoding (`quote`)

Using `urllib.parse.quote()` in Python, this method encodes special characters according to the URL specification.

- Spaces become `%20`
- Special characters like `@`, `:`, `/` are encoded with percent-encoding

Example:
```
http://user%40domain:pass%23word@proxy-server:port
```

### 3. Enhanced URL Encoding (`quote_plus`)

Using `urllib.parse.quote_plus()` in Python, this method is similar to standard encoding but additionally:

- Spaces become `+` instead of `%20`
- More aggressive encoding of certain characters

Example:
```
http://user%40domain:pass%2Bword@proxy-server:port
```

This is the default method used in the application and works with most proxy servers.

## Proxy URL Format

The full proxy URL format used in the application is:

```
<protocol>://<encoded_username>:<encoded_password>@<ip_address>:<port>
```

Where:
- `<protocol>` is typically `http` or `https`
- `<encoded_username>` is the username with proper URL encoding
- `<encoded_password>` is the password with proper URL encoding
- `<ip_address>` is the proxy server IP
- `<port>` is the proxy server port

## Common Authentication Errors

### 1. 407 Proxy Authentication Required

This error indicates that the proxy server rejected the authentication credentials. Common causes include:

- Incorrect username or password
- Improper URL encoding of credentials
- Missing or malformed authentication header

When you see this error, try using the `fix_proxy_connection.py` script to test different encoding methods:

```bash
python fix_proxy_connection.py
```

### 2. Proxy Connection Timeout

If the proxy connection times out during authentication, it may indicate:

- The proxy server is down or unreachable
- Network issues between your application and the proxy
- Proxy server is overloaded

### 3. Invalid Credentials Format

Some proxy servers have specific requirements for credential format. If you experience authentication issues, try:

1. Using a different encoding method
2. Checking if the proxy supports basic authentication
3. Verifying the credential format with your proxy provider

## Implementation Details

### Python Implementation

In Python, the proxy URL is formed using the following pattern:

```python
# Get encoding method from config
encoding_method = getattr(config, "PROXY_ENCODING_METHOD", "quote_plus") 

# Apply URL encoding based on the method
if encoding_method == "none":
    username = config.PROXY_USERNAME
    password = config.PROXY_PASSWORD
elif encoding_method == "quote":
    username = urllib.parse.quote(config.PROXY_USERNAME)
    password = urllib.parse.quote(config.PROXY_PASSWORD)
else:  # Default to quote_plus
    username = urllib.parse.quote_plus(config.PROXY_USERNAME)
    password = urllib.parse.quote_plus(config.PROXY_PASSWORD)

# Create proxy URL
proxy_url = f"http://{username}:{password}@{config.PROXY_IP}:{config.PROXY_PORT}"

# Create proxies dictionary
proxies = {
    "http": proxy_url,
    "https": proxy_url
}
```

### JavaScript Implementation

In JavaScript/Node.js, a similar approach is used:

```javascript
const encodeCredentials = (username, password, method) => {
  switch (method) {
    case 'none':
      return { username, password };
    case 'quote':
      return { 
        username: encodeURIComponent(username), 
        password: encodeURIComponent(password) 
      };
    case 'quote_plus':
    default:
      return { 
        username: encodeURIComponent(username).replace(/%20/g, '+'),
        password: encodeURIComponent(password).replace(/%20/g, '+')
      };
  }
};

// Usage
const { username, password } = encodeCredentials(
  process.env.PROXY_USERNAME,
  process.env.PROXY_PASSWORD,
  process.env.PROXY_ENCODING_METHOD || 'quote_plus'
);

const proxyUrl = `http://${username}:${password}@${process.env.PROXY_IP}:${process.env.PROXY_PORT}`;
```

## Testing Authentication Methods

The application includes several tools to test different authentication methods:

### Automatic Testing

The `fix_proxy_connection.py` script automatically tests all encoding methods:

```bash
python fix_proxy_connection.py
```

This script:
1. Tests all three encoding methods (`none`, `quote`, `quote_plus`)
2. Updates the `.env` file with the best working method
3. Verifies the connection after applying changes

### Manual Testing

To manually test a specific encoding method, you can use `python_app/update_proxy_settings.py`:

```bash
python python_app/update_proxy_settings.py <proxy_ip> <proxy_port> <username> <password>
```

### Testing Multiple Proxies

The `test_proxy_list.py` script tests multiple proxies from a list and identifies which ones work best for accessing Binance API:

```bash
python test_proxy_list.py
```

This is useful when you have multiple proxy options and want to find the most reliable one.

---

## Additional Resources

- [RFC 3986: Uniform Resource Identifier](https://datatracker.ietf.org/doc/html/rfc3986) - Standard for URL formatting and encoding
- [Python urllib.parse documentation](https://docs.python.org/3/library/urllib.parse.html) - Details on Python's URL encoding functions
- [PROXY_SETUP.md](./PROXY_SETUP.md) - General proxy setup and configuration guide