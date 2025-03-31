/**
 * בדיקת פרוקסי שונים עבור חיבור WebSocket של Binance
 * נבדוק מספר כתובות IP ופורטים שונים כדי למצוא פתרון עובד
 */

import WebSocket from 'ws';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from 'axios';

// רשימת כתובות IP לבדיקה - מתוך רשימת פרוקסי Webshare ואחרים
const proxyConfigurations = [
  // הכתובת הנוכחית שיש לנו
  { 
    host: '38.154.227.167', 
    port: 5868, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'https',
    description: 'Current Webshare proxy (marketPriceService.ts)'
  },
  { 
    host: '185.199.228.220', 
    port: 7300, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'https',
    description: 'Current Webshare proxy (proxy-config.ts)'
  },
  // כתובות נוספות לניסיון
  { 
    host: '104.234.10.181', 
    port: 7230, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'https',
    description: 'Webshare proxy server - UK'
  },
  { 
    host: '45.155.68.129', 
    port: 8133, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'https',
    description: 'Webshare proxy server - Germany'
  },
  { 
    host: '84.39.176.142', 
    port: 6746, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'https',
    description: 'Webshare proxy server - Netherlands'
  },
  { 
    host: '38.154.119.44', 
    port: 5868, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'https',
    description: 'Webshare proxy server - US'
  },
  { 
    host: '185.199.231.45', 
    port: 8382, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'https',
    description: 'Webshare proxy server - Singapore'
  },
  // סוקס פרוקסי לניסיון
  { 
    host: '104.234.10.180', 
    port: 7230, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'socks',
    description: 'SOCKS proxy - UK' 
  },
  { 
    host: '45.155.68.140', 
    port: 8133, 
    username: 'ahjqspco', 
    password: 'dzx3r1prpz9k', 
    type: 'socks',
    description: 'SOCKS proxy - Germany'
  },
  // עוד ניסיונות אפשריים...
];

/**
 * בדיקת פרוקסי ספציפי עם שרת Binance
 */
async function testBinanceAPIWithProxy(proxyConfig) {
  console.log(`\nTesting ${proxyConfig.description}`);
  console.log(`Host: ${proxyConfig.host}:${proxyConfig.port}`);
  console.log(`Type: ${proxyConfig.type}`);
  
  try {
    let agent;
    const auth = `${proxyConfig.username}:${proxyConfig.password}`;
    
    // יצירת סוכן פרוקסי מתאים
    if (proxyConfig.type === 'https') {
      const proxyUrl = `http://${auth}@${proxyConfig.host}:${proxyConfig.port}`;
      agent = new HttpsProxyAgent(proxyUrl);
      console.log(`Using HTTPS proxy URL: ${proxyUrl}`);
    } else {
      const proxyUrl = `socks5://${auth}@${proxyConfig.host}:${proxyConfig.port}`;
      agent = new SocksProxyAgent(proxyUrl);
      console.log(`Using SOCKS proxy URL: ${proxyUrl}`);
    }
    
    // בדיקת API רגיל
    console.log('Testing Binance REST API...');
    try {
      const axiosInstance = axios.create({
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'application/json'
        }
      });
      
      const response = await axiosInstance.get('https://api.binance.com/api/v3/ping');
      console.log(`✓ REST API Success: ${response.status === 200 ? 'OK' : 'Failed'}`);
      console.log(`  Response status: ${response.status}`);
      
      // בדיקת נתוני מחירים
      const pricesResponse = await axiosInstance.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      if (pricesResponse.status === 200 && pricesResponse.data?.price) {
        console.log(`✓ Price API Success - BTC Price: ${pricesResponse.data.price}`);
      } else {
        console.log(`✗ Price API Failed`);
      }
      
    } catch (error) {
      console.log(`✗ REST API Failed: ${error.message}`);
      if (error.response) {
        console.log(`  Status: ${error.response.status}`);
        console.log(`  Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // בדיקת WebSocket
    console.log('Testing Binance WebSocket...');
    return new Promise((resolve) => {
      try {
        const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@ticker';
        console.log(`Connecting to ${wsUrl}`);
        
        const wsOptions = {
          agent: agent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://www.binance.com'
          },
          timeout: 10000
        };
        
        const ws = new WebSocket(wsUrl, wsOptions);
        
        const timeoutId = setTimeout(() => {
          console.log('✗ WebSocket connection timeout');
          ws.terminate();
          resolve({ 
            success: false, 
            message: 'Connection timeout',
            proxy: proxyConfig 
          });
        }, 15000);
        
        ws.on('open', () => {
          console.log('✓ WebSocket connection successful!');
          clearTimeout(timeoutId);
          
          setTimeout(() => {
            ws.close();
            resolve({ 
              success: true, 
              message: 'Connection successful',
              proxy: proxyConfig 
            });
          }, 5000); // נשאר מחובר ל-5 שניות כדי לוודא שהחיבור יציב
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data);
          console.log(`✓ WebSocket data received: ${message.s} price: ${message.c}`);
        });
        
        ws.on('error', (error) => {
          console.log(`✗ WebSocket error: ${error.message}`);
          clearTimeout(timeoutId);
          resolve({ 
            success: false, 
            message: error.message,
            proxy: proxyConfig 
          });
        });
        
        ws.on('close', (code, reason) => {
          console.log(`WebSocket closed with code ${code} ${reason ? `: ${reason}` : ''}`);
        });
      } catch (error) {
        console.log(`✗ WebSocket setup error: ${error.message}`);
        resolve({ 
          success: false, 
          message: error.message,
          proxy: proxyConfig 
        });
      }
    });
  } catch (error) {
    console.log(`✗ Overall test error: ${error.message}`);
    return { 
      success: false, 
      message: error.message,
      proxy: proxyConfig
    };
  }
}

/**
 * בדיקה של כל הפרוקסי ברשימה
 */
async function testAllProxies() {
  console.log('=========================================');
  console.log('TESTING BINANCE PROXIES FOR WEBSOCKET');
  console.log('=========================================');
  
  const results = [];
  
  for (const proxyConfig of proxyConfigurations) {
    const result = await testBinanceAPIWithProxy(proxyConfig);
    results.push(result);
    console.log('----------------------------------------');
  }
  
  // סיכום התוצאות
  console.log('\n=========================================');
  console.log('PROXY TEST RESULTS SUMMARY');
  console.log('=========================================');
  
  const successfulProxies = results.filter(r => r.success);
  console.log(`Total proxies tested: ${results.length}`);
  console.log(`Successful proxies: ${successfulProxies.length}`);
  
  console.log('\nSuccessful proxies:');
  successfulProxies.forEach(result => {
    const proxy = result.proxy;
    console.log(`- ${proxy.description}: ${proxy.host}:${proxy.port} (${proxy.type})`);
  });
  
  console.log('\nFailed proxies:');
  results.filter(r => !r.success).forEach(result => {
    const proxy = result.proxy;
    console.log(`- ${proxy.description}: ${proxy.host}:${proxy.port} (${proxy.type}) - ${result.message}`);
  });
  
  console.log('\n=========================================');
  console.log('RECOMMENDATION');
  console.log('=========================================');
  
  if (successfulProxies.length > 0) {
    const bestProxy = successfulProxies[0].proxy;
    console.log(`Recommended proxy: ${bestProxy.host}:${bestProxy.port}`);
    console.log(`Type: ${bestProxy.type}`);
    console.log(`Description: ${bestProxy.description}`);
    
    console.log(`\nTo use this proxy, update these values in server/api/binance/marketPriceService.ts and server/api/binance/proxy-config.ts:`);
    if (bestProxy.type === 'https') {
      console.log(`PROXY_IP = '${bestProxy.host}';`);
      console.log(`PROXY_PORT = '${bestProxy.port}';`);
      console.log(`type: 'https',`);
    } else {
      console.log(`PROXY_IP = '${bestProxy.host}';`);
      console.log(`PROXY_PORT = '${bestProxy.port}';`);
      console.log(`type: 'socks',`);
    }
  } else {
    console.log('None of the tested proxies were successful with WebSocket.');
    console.log('Recommendation: Try using a paid VPN service or a different proxy provider.');
  }
}

// הרצת הבדיקה
testAllProxies().catch(console.error);