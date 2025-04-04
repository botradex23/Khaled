/**
 * AI Agent Route Diagnostic Tool
 * 
 * This script performs detailed diagnostics on the AI Agent routes,
 * focusing on isolating issues with authentication, routing, and error responses.
 */
require('dotenv').config();
const axios = require('axios');
const http = require('http');

// Helper function to make direct HTTP requests with detailed logging
function makeDirectRequest(options) {
  return new Promise((resolve, reject) => {
    console.log(`\nMaking request to ${options.hostname}:${options.port}${options.path}`);
    console.log('Headers:', JSON.stringify(options.headers, null, 2));
    
    const req = http.request(options, (res) => {
      console.log(`StatusCode: ${res.statusCode}`);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Try to parse as JSON first
          const jsonData = JSON.parse(data);
          console.log('Response data (JSON):', JSON.stringify(jsonData, null, 2));
          resolve({ statusCode: res.statusCode, headers: res.headers, data: jsonData, isJson: true });
        } catch (e) {
          // If not JSON, treat as text
          console.log('Response is not JSON. First 200 chars:');
          console.log(data.substring(0, 200) + '...');
          resolve({ statusCode: res.statusCode, headers: res.headers, data, isJson: false });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.end();
  });
}

async function runDiagnostics() {
  console.log('===== AI Agent Route Diagnostics =====');
  console.log('Testing environment:', process.env.NODE_ENV || 'development');
  
  // Test 1: Basic route without auth headers
  console.log('\n***** TEST 1: Basic Route Health Check *****');
  try {
    const basicOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/my-agent/health',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    
    const basicResult = await makeDirectRequest(basicOptions);
    
    if (basicResult.isJson) {
      console.log('✅ Route returned JSON response');
    } else {
      console.log('❌ Route returned non-JSON response (likely HTML)');
      console.log('This suggests the Vite middleware is intercepting the request');
    }
  } catch (error) {
    console.error('Test 1 failed:', error);
  }
  
  // Test 2: With test admin header
  console.log('\n***** TEST 2: With X-Test-Admin Header *****');
  try {
    const adminOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/my-agent/health',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Test-Admin': 'true'
      }
    };
    
    const adminResult = await makeDirectRequest(adminOptions);
    
    if (adminResult.isJson) {
      console.log('✅ Route returned JSON with test admin header');
      
      if (adminResult.data.success) {
        console.log('✅ Agent health check successful');
      } else {
        console.log('❌ Agent health check failed:', adminResult.data.message);
      }
    } else {
      console.log('❌ Route returned non-JSON response with test admin header');
    }
  } catch (error) {
    console.error('Test 2 failed:', error);
  }
  
  // Test 3: Try with different content types
  console.log('\n***** TEST 3: Testing with Different Content Types *****');
  try {
    const contentTypeOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/my-agent/health',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Test-Admin': 'true'
      }
    };
    
    const contentTypeResult = await makeDirectRequest(contentTypeOptions);
    
    if (contentTypeResult.isJson) {
      console.log('✅ Route returned JSON with explicit Content-Type');
    } else {
      console.log('❌ Route returned non-JSON with explicit Content-Type');
    }
  } catch (error) {
    console.error('Test 3 failed:', error);
  }
  
  // Test 4: Check if OpenAI service is initialized
  console.log('\n***** TEST 4: Verify OpenAI Service Initialization *****');
  try {
    const apiKeyPresent = !!process.env.OPENAI_API_KEY;
    console.log('OpenAI API key present in environment:', apiKeyPresent);
    
    if (apiKeyPresent) {
      console.log('API key length:', process.env.OPENAI_API_KEY.length);
      console.log('API key prefix:', process.env.OPENAI_API_KEY.substring(0, 3) + '...');
    }
    
    // This will be tested as part of Test 2 result analysis
  } catch (error) {
    console.error('Test 4 failed:', error);
  }
  
  // Test 5: Try a different API route for comparison
  console.log('\n***** TEST 5: Testing Another API Route for Comparison *****');
  try {
    const otherApiOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/check',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    
    const otherApiResult = await makeDirectRequest(otherApiOptions);
    
    if (otherApiResult.isJson) {
      console.log('✅ Other API route returned JSON');
    } else {
      console.log('❌ Other API route returned non-JSON (suggests a general routing issue)');
    }
  } catch (error) {
    console.error('Test 5 failed:', error);
  }
  
  console.log('\n===== DIAGNOSTICS SUMMARY =====');
  console.log('If test 1 returns HTML but test 2 returns JSON, there may be an authentication issue.');
  console.log('If all tests return HTML, there may be a general routing issue with the Express server.');
  console.log('Check the logs for more detailed information about each test.');
}

runDiagnostics();