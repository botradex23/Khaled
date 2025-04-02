import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// Function to load proxies from WebShare file
function loadProxiesFromFile(filePath = 'attached_assets/Webshare 3 proxies 3.txt') {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    return lines.map(line => {
      const parts = line.split(':');
      if (parts.length >= 4) {
        return {
          ip: parts[0],
          port: parseInt(parts[1]),
          username: parts[2],
          password: parts[3]
        };
      }
      return null;
    }).filter(proxy => proxy !== null);
  } catch (error) {
    console.error(`Error loading proxies from ${filePath}:`, error.message);
    return [];
  }
}

// Load proxies from WebShare file first
let proxies = loadProxiesFromFile();

// If no proxies found in file, use environment variables or defaults
if (proxies.length === 0) {
  console.log('No proxies found in file. Using environment or default values.');
  
  // Get from environment or use defaults
  const proxyIp = process.env.PROXY_IP || "38.154.227.167";
  const proxyPort = parseInt(process.env.PROXY_PORT || "5868");
  const username = process.env.PROXY_USERNAME || "ahjqspco";
  const password = process.env.PROXY_PASSWORD || "dzx3r1prpz9k";
  
  proxies = [
    { ip: proxyIp, port: proxyPort, username, password },
    { ip: "38.153.152.244", port: 9594, username, password },
    { ip: "185.199.228.220", port: 7300, username, password },
    { ip: "185.199.231.45", port: 8382, username, password },
    { ip: "188.74.210.207", port: 6286, username, password },
    { ip: "188.74.183.10", port: 8279, username, password },
    { ip: "188.74.210.21", port: 6100, username, password }
  ];
}

console.log(`Loaded ${proxies.length} proxies for testing`);

// Default credentials if not provided in proxy objects
const defaultUsername = process.env.PROXY_USERNAME || "ahjqspco";
const defaultPassword = process.env.PROXY_PASSWORD || "dzx3r1prpz9k";

// Function to check if a proxy can connect to Binance API
async function checkProxy(proxy) {
  // Use credentials from proxy object or fall back to defaults
  const username = proxy.username || defaultUsername;
  const password = proxy.password || defaultPassword;
  const proxyUrl = `http://${username}:${password}@${proxy.ip}:${proxy.port}`;
  const httpsAgent = new HttpsProxyAgent(proxyUrl);
  
  console.log(`Testing proxy: ${proxy.ip}:${proxy.port}`);
  
  try {
    // Try to make a simple request to Binance API
    const response = await axios.get('https://api.binance.com/api/v3/ping', {
      httpsAgent,
      timeout: 5000, // 5 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'application/json'
      }
    });
    
    // If we get here, the request was successful
    console.log(`✅ Success: ${proxy.ip}:${proxy.port} - Status: ${response.status}`);
    return { success: true, proxy, status: response.status };
  } catch (error) {
    // Analyze the error
    let errorMessage = 'Unknown error';
    let statusCode = null;
    
    if (error.response) {
      // Server responded with error code
      statusCode = error.response.status;
      errorMessage = `Error code: ${statusCode}`;
      if (error.response.data && error.response.data.msg) {
        errorMessage += `, Message: ${error.response.data.msg}`;
      }
    } else if (error.code) {
      // Network/proxy error
      errorMessage = `Network error: ${error.code}`;
      if (error.message) {
        errorMessage += ` - ${error.message}`;
      }
    }
    
    console.log(`❌ Failed: ${proxy.ip}:${proxy.port} - ${errorMessage}`);
    return { success: false, proxy, error: errorMessage, statusCode };
  }
}

// Main function that checks all proxies and displays results
async function checkAllProxies() {
  console.log('Starting proxy tests for Binance API connection...');
  console.log('===================================================');
  
  const results = [];
  
  for (const proxy of proxies) {
    const result = await checkProxy(proxy);
    results.push(result);
    // Short delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Display summary of results
  console.log('\n===================================================');
  console.log('Results summary:');
  
  const successfulProxies = results.filter(r => r.success);
  console.log(`\nTotal successful proxies: ${successfulProxies.length} out of ${proxies.length}`);
  
  if (successfulProxies.length > 0) {
    console.log('\nWorking proxies:');
    successfulProxies.forEach(result => {
      console.log(`- ${result.proxy.ip}:${result.proxy.port}`);
    });
    
    // Recommendation to change current proxy
    if (successfulProxies[0].proxy.ip !== proxies[0].ip) {
      console.log(`\nRecommendation: Change current proxy to ${successfulProxies[0].proxy.ip}:${successfulProxies[0].proxy.port}`);
      
      // Update .env file with the best proxy
      console.log('\nUpdating .env file with the best proxy...');
      try {
        const fs = require('fs');
        const bestProxy = successfulProxies[0].proxy;
        
        // Read current .env file
        const env = fs.readFileSync('.env', 'utf8');
        
        // Replace proxy values
        let updatedEnv = env;
        
        // Update or add proxy values
        const updateEnvVar = (name, value) => {
          const regex = new RegExp(`^${name}=.*`, 'm');
          if (regex.test(updatedEnv)) {
            updatedEnv = updatedEnv.replace(regex, `${name}=${value}`);
          } else {
            updatedEnv += `\n${name}=${value}`;
          }
        };
        
        updateEnvVar('PROXY_IP', bestProxy.ip);
        updateEnvVar('PROXY_PORT', bestProxy.port);
        updateEnvVar('PROXY_USERNAME', bestProxy.username || defaultUsername);
        updateEnvVar('PROXY_PASSWORD', bestProxy.password || defaultPassword);
        updateEnvVar('USE_PROXY', 'true');
        
        // Write updated .env back to file
        fs.writeFileSync('.env', updatedEnv);
        console.log('Successfully updated .env file with the best proxy configuration.');
      } catch (err) {
        console.error('Error updating .env file:', err.message);
      }
    }
  } else {
    console.log('\nNo working proxies found. Continue with fallback mode.');
  }
  
  return successfulProxies.length > 0;
}

// Run the test
checkAllProxies().then(success => {
  if (success) {
    console.log('✅ Proxy test completed successfully! Found working proxy configuration.');
  } else {
    console.error('❌ Proxy test failed. No working proxies found.');
  }
}).catch(error => {
  console.error('Error during proxy testing:', error);
});