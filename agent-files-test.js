/**
 * Agent Files Endpoint Test
 * 
 * This script tests the files endpoint
 */

async function testAgentFiles() {
  console.log('\n--- AGENT FILES TEST ---\n');

  // Test the files endpoint
  console.log('Testing: /api/agent/files');
  try {
    const filesResponse = await fetch('http://localhost:5000/api/agent/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Test-Admin': 'true'
      },
      body: JSON.stringify({
        directory: './'
      })
    });
    
    const filesData = await filesResponse.json();
    console.log('✅ files endpoint:', filesResponse.status, filesData.success ? 'SUCCESS' : 'FAILED');
    console.log('  Files found:', filesData.files ? filesData.files.length : 0);
    if (filesData.files && filesData.files.length > 0) {
      console.log('  Sample files:', filesData.files.slice(0, 3));
    } else {
      console.log('  Files response:', filesData);
    }
  } catch (error) {
    console.log('❌ files endpoint FAILED:', error.message);
  }

  console.log('\n--- END OF AGENT FILES TEST ---\n');
}

// Run the test
testAgentFiles();