import { readFile, writeFile, listFiles } from './services/openaiService';
import path from 'path';

/**
 * Test file operations
 * This will verify that the file operations work correctly
 */
async function testFileOperations() {
  console.log('Testing file operations...');
  
  // Test directory for operations
  const testDir = './data';
  const testFilePath = path.join(testDir, 'test-file.txt');
  const testContent = 'This is a test file created at ' + new Date().toISOString();
  
  try {
    // Test write operation
    console.log(`Writing test file: ${testFilePath}`);
    const writeResult = await writeFile(testFilePath, testContent);
    console.log(`Write result: ${writeResult ? 'SUCCESS' : 'FAILED'}`);
    
    if (!writeResult) {
      throw new Error('Failed to write test file');
    }
    
    // Test read operation
    console.log(`Reading test file: ${testFilePath}`);
    const readContent = await readFile(testFilePath);
    console.log(`Read content: ${readContent ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Content: ${readContent}`);
    
    if (!readContent || readContent !== testContent) {
      throw new Error('Read content does not match written content');
    }
    
    // Test list operation
    console.log(`Listing files in directory: ${testDir}`);
    const files = await listFiles(testDir);
    console.log(`Files in directory: ${files.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Found ${files.length} files: ${files.join(', ')}`);
    
    // Verify the test file is in the list
    const testFileName = path.basename(testFilePath);
    if (!files.includes(testFileName)) {
      throw new Error(`Test file ${testFileName} not found in directory listing`);
    }
    
    console.log('All file operations tests PASSED!');
    return true;
  } catch (error) {
    console.error('File operations test FAILED:', error);
    return false;
  }
}

// Run the test
testFileOperations()
  .then((result) => {
    console.log(`File operations test ${result ? 'PASSED' : 'FAILED'}`);
    process.exit(result ? 0 : 1);
  })
  .catch((error) => {
    console.error('Error running file operations test:', error);
    process.exit(1);
  });