/**
 * System Check for Load Testing
 * 
 * This script performs a quick system check before running load tests,
 * verifying that all required services are available and responding correctly.
 */

const axios = require('axios');
const os = require('os');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Base URLs for API endpoints (will be updated by replit_adapter.js if necessary)
  baseUrl: 'http://localhost:5000',
  pythonBaseUrl: 'http://localhost:5001',
  
  // Endpoints to check
  endpoints: [
    { name: 'Express server', url: '/', isBase: true },
    { name: 'Python Flask server', url: '/api/status', isFlask: true },
    { name: 'Trade logs API', url: '/api/trade-logs', isBase: true },
    { name: 'Market data API', url: '/api/market/prices', isBase: true },
    { name: 'ML prediction API', url: '/api/ml/status', isFlask: true },
    { name: 'Trade execution queue', url: '/api/trading/queue/status', isFlask: true }
  ],
  
  // Timeout for requests (ms)
  timeout: 5000
};

/**
 * Check system resources
 */
function checkSystemResources() {
  console.log('🖥️ Checking system resources');
  
  const cpuCount = os.cpus().length;
  const totalMemory = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const freeMemory = Math.round(os.freemem() / (1024 * 1024 * 1024));
  const usedMemoryPercentage = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1);
  
  console.log(`CPU cores: ${cpuCount}`);
  console.log(`Memory: ${freeMemory}GB free of ${totalMemory}GB total (${usedMemoryPercentage}% used)`);
  
  // Check load average
  const loadAvg = os.loadavg();
  console.log(`Load average (1m, 5m, 15m): ${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}`);
  
  // Check disk space
  try {
    const diskSpace = execSync('df -h / | tail -1 | awk \'{print $5}\'').toString().trim();
    console.log(`Disk usage: ${diskSpace}`);
  } catch (error) {
    console.log('Disk usage check failed');
  }
  
  // Analyze if the system might have resource issues during load testing
  if (loadAvg[0] > cpuCount * 0.7) {
    console.warn('⚠️ CPU load is already high. This might affect load test results.');
  }
  
  if (usedMemoryPercentage > 80) {
    console.warn('⚠️ Memory usage is high. This might affect load test results.');
  }
  
  try {
    const diskSpaceNum = parseInt(execSync('df -h / | tail -1 | awk \'{print $5}\'').toString().trim().replace('%', ''));
    if (diskSpaceNum > 90) {
      console.warn('⚠️ Disk space is critically low. This might affect load test results.');
    }
  } catch (error) {
    // Ignore disk space check errors
  }
}

/**
 * Check if a URL is accessible
 */
async function checkEndpoint(name, url, isFlask = false) {
  const fullUrl = isFlask ? `${CONFIG.pythonBaseUrl}${url}` : `${CONFIG.baseUrl}${url}`;
  
  try {
    console.log(`🔍 Checking ${name} (${fullUrl})`);
    const startTime = Date.now();
    const response = await axios.get(fullUrl, { timeout: CONFIG.timeout });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${name} is available (${duration}ms)`);
    return { name, status: 'success', duration, statusCode: response.status };
  } catch (error) {
    console.error(`❌ ${name} is not available: ${error.message}`);
    return { 
      name, 
      status: 'failed', 
      error: error.message,
      statusCode: error.response?.status,
      details: error.response?.data
    };
  }
}

/**
 * Main function to run the system check
 */
async function runSystemCheck() {
  console.log('🚀 Starting system check for load testing');
  
  // Get the domain from environment if running in Replit
  const replitDomain = process.env.REPLIT_DOMAIN;
  if (replitDomain) {
    CONFIG.baseUrl = `https://${replitDomain}`;
    CONFIG.pythonBaseUrl = `https://${replitDomain}`;
    console.log(`📌 Running in Replit environment: ${CONFIG.baseUrl}`);
  } else {
    console.log(`📌 Running in local environment: ${CONFIG.baseUrl}`);
  }
  
  // Check system resources
  checkSystemResources();
  
  // Check if the required services are running
  console.log('\n📡 Checking service availability');
  
  const results = [];
  
  for (const endpoint of CONFIG.endpoints) {
    const result = await checkEndpoint(endpoint.name, endpoint.url, endpoint.isFlask);
    results.push(result);
  }
  
  // Print summary
  console.log('\n📊 System Check Summary');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;
  
  console.log(`✅ ${successCount} services available`);
  console.log(`❌ ${failCount} services unavailable`);
  
  // Check if critical services are available
  const criticalServices = ['Express server', 'Python Flask server'];
  const criticalServiceResults = results.filter(r => criticalServices.includes(r.name));
  const allCriticalServicesAvailable = criticalServiceResults.every(r => r.status === 'success');
  
  if (allCriticalServicesAvailable) {
    console.log('\n✅ All critical services are available. Ready for load testing.');
    return true;
  } else {
    console.error('\n❌ Some critical services are unavailable. Load testing may fail.');
    return false;
  }
}

// Run the system check if this script is executed directly
if (require.main === module) {
  runSystemCheck()
    .then(result => {
      if (!result) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('System check failed:', error);
      process.exit(1);
    });
}

module.exports = { runSystemCheck };