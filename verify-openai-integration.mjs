/**
 * Verify OpenAI Integration for Autonomous Agent Functions
 * 
 * This is a small curl test script to verify that the OpenAI integration
 * is working correctly in the autonomous agent.
 */

// Using curl to test the endpoints and avoid module issues
import { execSync } from 'child_process';

// ANSI color codes for nice output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

// Testing endpoints
const tests = [
  {
    name: 'Analyze Code',
    command: `curl -s -X POST http://localhost:5000/api/agent/api/analyze-code -H "Content-Type: application/json" -d '{"task": "Check OpenAI integration", "filePath": "server/agent/openai-service.ts"}'`
  },
  {
    name: 'Find Relevant Files',
    command: `curl -s -X POST http://localhost:5000/api/agent/api/find-relevant-files -H "Content-Type: application/json" -d '{"task": "Find files related to OpenAI integration"}'`
  },
  {
    name: 'Agent Status Check',
    command: `curl -s -X GET http://localhost:5000/api/agent/status -H "Content-Type: application/json"`
  }
];

// Run all tests
console.log(`${colors.bright}${colors.blue}=== VERIFYING OPENAI INTEGRATION FOR AUTONOMOUS AGENT ===${colors.reset}\n`);

let allTestsPassed = true;

tests.forEach((test, index) => {
  console.log(`${colors.cyan}Test ${index + 1}: ${test.name}${colors.reset}`);
  
  try {
    // Execute the curl command
    const output = execSync(test.command).toString();
    const result = JSON.parse(output);
    
    // Check if the result is successful
    if (result && (result.success || result.status === 'ok')) {
      console.log(`${colors.green}✅ Success: ${test.name} - OpenAI integration working${colors.reset}`);
      
      // Log a snippet of the result for verification
      if (result.analysis) {
        console.log(`  Analysis length: ${result.analysis.length} characters`);
        console.log(`  Sample: ${result.analysis.substring(0, 100)}...`);
      } else if (result.result && Array.isArray(result.result)) {
        console.log(`  Found ${result.result.length} relevant files`);
        if (result.result.length > 0) {
          console.log(`  Top file: ${result.result[0].path} (Relevance: ${result.result[0].relevance})`);
        }
      } else if (result.services && result.services.openai) {
        console.log(`  OpenAI Service Status: ${result.services.openai ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`  Response: ${JSON.stringify(result).substring(0, 100)}...`);
      } else {
        console.log(`  Response: ${JSON.stringify(result).substring(0, 100)}...`);
      }
    } else {
      console.log(`${colors.red}❌ Failed: ${test.name} - Unexpected response${colors.reset}`);
      console.log(`  Response: ${JSON.stringify(result).substring(0, 200)}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Failed: ${test.name} - Error: ${error.message}${colors.reset}`);
    if (error.stdout) {
      console.log(`  Output: ${error.stdout.toString()}`);
    }
    allTestsPassed = false;
  }
  
  console.log(); // Add a blank line between tests
});

// Final result
if (allTestsPassed) {
  console.log(`${colors.bright}${colors.green}✅ ALL TESTS PASSED: OpenAI integration is working correctly in the autonomous agent${colors.reset}`);
} else {
  console.log(`${colors.bright}${colors.red}❌ SOME TESTS FAILED: OpenAI integration might have issues${colors.reset}`);
}