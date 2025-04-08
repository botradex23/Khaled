/**
 * Stop Agent Terminal Server
 * 
 * This script stops the agent-terminal-server.js process
 * using the saved PID.
 */

import fs from 'fs';

// Configuration
const PID_FILE = 'agent-terminal-server.pid';

// Function to stop the server
function stopServer() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('No Agent Terminal Server PID file found. Server may not be running.');
    return;
  }
  
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
    
    console.log(`Stopping Agent Terminal Server (PID: ${pid})...`);
    
    // Try to kill the process gracefully
    process.kill(pid, 'SIGTERM');
    
    // Remove the PID file
    fs.unlinkSync(PID_FILE);
    
    console.log('Server stopped successfully');
  } catch (error) {
    console.error('Error stopping server:', error.message);
    
    // If the process is not running, remove the PID file
    if (error.code === 'ESRCH') {
      fs.unlinkSync(PID_FILE);
      console.log('PID file was stale. Removed it.');
    }
  }
}

// Run the stop function
stopServer();