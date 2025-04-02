/**
 * Replit Environment Adapter for Load Testing
 * 
 * This script modifies the load test configuration to work with the Replit environment,
 * updating URLs and adjusting parameters as needed.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const LOAD_TEST_FILES = [
  'load_tester.js',
  'queue_stress_test.js',
  'ml_prediction_test.js'
];

// Get Replit domain from environment variables or detect it
function getReplitDomain() {
  // Try to get from environment variable
  const domain = process.env.REPLIT_DOMAIN || execSync('hostname -f').toString().trim();
  
  if (domain.includes('replit')) {
    return `https://${domain}`;
  }
  
  // Fallback to local URLs if no Replit domain detected
  return null;
}

// Adapt load test files for Replit
function adaptForReplit() {
  const baseDir = path.join(__dirname);
  const domain = getReplitDomain();
  
  console.log('🔄 Adapting load test scripts for Replit environment');
  
  if (!domain) {
    console.log('⚠️ No Replit domain detected. Tests will run against localhost.');
    return;
  }
  
  console.log(`🌐 Detected Replit domain: ${domain}`);
  
  // Process each load test file
  for (const file of LOAD_TEST_FILES) {
    const filePath = path.join(baseDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${filePath}`);
      continue;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Update baseUrl and pythonBaseUrl in CONFIG object
      content = content.replace(
        /baseUrl: ['"]http:\/\/localhost:5000['"]/g,
        `baseUrl: '${domain}'`
      );
      
      content = content.replace(
        /pythonBaseUrl: ['"]http:\/\/localhost:5001['"]/g,
        `pythonBaseUrl: '${domain}'`
      );
      
      // Adjust test parameters for Replit environment (reduce load)
      if (file === 'load_tester.js') {
        content = content.replace(
          /concurrentUsers: \[\d+, \d+, \d+, \d+\]/g,
          'concurrentUsers: [5, 10, 20, 50]'
        );
      } else if (file === 'queue_stress_test.js') {
        content = content.replace(
          /concurrentBatches: \[\d+, \d+, \d+, \d+\]/g,
          'concurrentBatches: [2, 5, 10, 20]'
        );
      } else if (file === 'ml_prediction_test.js') {
        content = content.replace(
          /concurrentRequests: \[\d+, \d+, \d+, \d+\]/g,
          'concurrentRequests: [5, 10, 20, 50]'
        );
      }
      
      // Write modified content back to file
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Adapted ${file} for Replit environment`);
    } catch (error) {
      console.error(`❌ Failed to adapt ${file}:`, error.message);
    }
  }
  
  console.log('\n🚀 Load tests are now configured for the Replit environment');
  console.log('   You can run the tests with: node load_test/run_load_tests.js');
}

// Run the adapter
adaptForReplit();