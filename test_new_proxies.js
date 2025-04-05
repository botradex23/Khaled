import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// New proxy credentials from the list
const proxies = [
  { ip: '154.36.110.199', port: 6853, username: 'xzwdlrlk', password: 'yrv2cpbyo1oa' },
  { ip: '45.151.162.198', port: 6600, username: 'xzwdlrlk', password: 'yrv2cpbyo1oa' },
  { ip: '185.199.229.156', port: 7492, username: 'xzwdlrlk', password: 'yrv2cpbyo1oa' },
  { ip: '185.199.228.220', port: 7300, username: 'xzwdlrlk', password: 'yrv2cpbyo1oa' },
  { ip: '161.123.152.115', port: 6360, username: 'xzwdlrlk', password: 'yrv2cpbyo1oa' }
];

// Function to check if a proxy can connect to Binance API
async function checkProxy(proxy) {
  const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.ip}:${proxy.port}`;
  const httpsAgent = new HttpsProxyAgent(proxyUrl);
  
  console.log(`Testing proxy: ${proxy.ip}:${proxy.port}`);
  
  try {
    // Try to make a request to Binance API
    const response = await axios.get('https://api.binance.com/api/v3/ping', {
      httpsAgent,
      timeout: 5000, // 5 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (response.status === 200) {
      console.log(`✅ Success: ${proxy.ip}:${proxy.port} connected to Binance API`);
      
      // Try a more complex request to verify data access
      try {
        const tickerResponse = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
          httpsAgent,
          timeout: 5000
        });
        
        if (tickerResponse.status === 200 && tickerResponse.data && tickerResponse.data.price) {
          console.log(`✅ Data verified: BTC price is ${tickerResponse.data.price}`);
          return { success: true, data: tickerResponse.data };
        }
      } catch (dataError) {
        console.log(`❌ Data verification failed: ${dataError.message}`);
      }
      
      return { success: true };
    } else {
      console.log(`❌ Failed: ${proxy.ip}:${proxy.port} - Status: ${response.status}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    const statusCode = error.response ? error.response.status : 'unknown';
    console.log(`❌ Failed: ${proxy.ip}:${proxy.port} - Error code: ${statusCode}`);
    return { success: false, error: error.message, status: statusCode };
  }
}

// Test all proxies
async function testAllProxies() {
  console.log('Starting proxy tests for Binance API connection...');
  console.log('===================================================');
  
  const results = [];
  
  for (const proxy of proxies) {
    const result = await checkProxy(proxy);
    results.push({ proxy, result });
  }
  
  console.log('\n===================================================');
  console.log('Results summary:');
  
  const successfulProxies = results.filter(r => r.result.success);
  console.log(`\nTotal successful proxies: ${successfulProxies.length} out of ${proxies.length}`);
  
  if (successfulProxies.length > 0) {
    console.log('\nWorking proxies:');
    successfulProxies.forEach(r => {
      console.log(`✅ ${r.proxy.ip}:${r.proxy.port}`);
    });
    
    // Return the first working proxy
    const bestProxy = successfulProxies[0].proxy;
    console.log(`\n✅ Best proxy found: ${bestProxy.ip}:${bestProxy.port}`);
    return bestProxy;
  } else {
    console.log('\nNo working proxies found. Continue with fallback mode.');
    console.log('❌ Proxy test failed. No working proxies found.');
    return null;
  }
}

// Run the tests
testAllProxies().then(bestProxy => {
  if (bestProxy) {
    console.log('\nRecommended .env configuration:');
    console.log(`PROXY_IP=${bestProxy.ip}`);
    console.log(`PROXY_PORT=${bestProxy.port}`);
    console.log(`PROXY_USERNAME=${bestProxy.username}`);
    console.log(`PROXY_PASSWORD=${bestProxy.password}`);
    console.log('USE_PROXY=true');
  }
});
