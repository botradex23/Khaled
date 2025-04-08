/**
 * Run File Test
 * 
 * This script runs the direct file test to verify the OpenAI agent's
 * ability to perform file operations.
 */

import { spawn } from 'child_process';

console.log('Running file operation test...');

const testProcess = spawn('node', ['direct-file-test.js'], {
  stdio: 'inherit'
});

testProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('\nTest completed successfully. The OpenAI agent can perform file operations.');
  } else {
    console.error('\nTest failed with exit code:', code);
  }
});