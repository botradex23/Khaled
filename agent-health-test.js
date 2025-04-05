/**
 * Agent Health Endpoint Test
 * 
 * This script tests just the health endpoint to avoid timeouts
 */

async function testAgentHealth() {
  console.log('\n--- AGENT HEALTH TEST ---\n');

  // Test the direct-health endpoint
  console.log('Testing: /api/agent/direct-health');
  try {
    const healthResponse = await fetch('http://localhost:5000/api/agent/direct-health', {
      headers: {
        'Accept': 'application/json',
        'X-Test-Admin': 'true'
      }
    });
    
    const healthData = await healthResponse.json();
    console.log('✅ direct-health endpoint:', healthResponse.status, healthData.success ? 'SUCCESS' : 'FAILED');
    console.log('  Details:', healthData);
  } catch (error) {
    console.log('❌ direct-health endpoint FAILED:', error.message);
  }

  console.log('\n--- END OF AGENT HEALTH TEST ---\n');
}

// Run the test
testAgentHealth();