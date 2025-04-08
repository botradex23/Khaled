/**
 * Stop Agent Terminal Server
 * 
 * This script stops the running agent terminal server by reading the PID
 * from the PID file and sending a SIGTERM signal.
 */

import { existsSync } from 'fs';
import { promises as fs } from 'fs';

// Configuration
const PID_FILE = './agent-terminal-server.pid';

// Check if the PID file exists
if (!existsSync(PID_FILE)) {
  console.error(`❌ PID file not found: ${PID_FILE}`);
  console.error(`Server may not be running or was started differently`);
  process.exit(1);
}

// Read the PID from the file
async function main() {
  try {
    const pidData = await fs.readFile(PID_FILE, 'utf-8');
    const pid = parseInt(pidData.trim(), 10);
    
    if (isNaN(pid)) {
      console.error(`❌ Invalid PID in file: ${pidData}`);
      process.exit(1);
    }
    
    console.log(`📋 Stopping server with PID: ${pid}`);
    
    // Try to kill the process
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`✅ Server stopped successfully`);
      
      // Remove the PID file
      await fs.unlink(PID_FILE);
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.warn(`⚠️ Process with PID ${pid} not found - it may have already exited`);
        // Clean up the PID file anyway
        await fs.unlink(PID_FILE);
      } else {
        console.error(`❌ Error stopping server:`, error);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading PID file:`, error);
    process.exit(1);
  }
}

main();