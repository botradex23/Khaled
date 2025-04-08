const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const serverScript = process.argv[2];
const logPath = process.argv[3];

// Create a log file stream
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

// Log startup
const startupMessage = `\n[${new Date().toISOString()}] Starting agent server wrapper\n`;
logStream.write(startupMessage);
console.log(startupMessage);

// Start the server process
const serverProcess = spawn('node', [serverScript], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

// Pipe the output to both console and log file
serverProcess.stdout.pipe(logStream);
serverProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

serverProcess.stderr.pipe(logStream);
serverProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process events
serverProcess.on('error', (err) => {
  const errorMsg = `\n[${new Date().toISOString()}] Failed to start server: ${err.message}\n`;
  logStream.write(errorMsg);
  console.error(errorMsg);
  process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
  const exitMsg = `\n[${new Date().toISOString()}] Server exited with code: ${code}, signal: ${signal}\n`;
  logStream.write(exitMsg);
  console.log(exitMsg);
  
  // If the process exits unexpectedly, restart it
  if (code !== 0 && !signal) {
    const restartMsg = `\n[${new Date().toISOString()}] Restarting server...\n`;
    logStream.write(restartMsg);
    console.log(restartMsg);
    
    setTimeout(() => {
      const restartProcess = spawn('node', [serverScript], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      restartProcess.stdout.pipe(logStream);
      restartProcess.stderr.pipe(logStream);
    }, 5000);
  }
});

// Unref the child process so the wrapper can exit independently
serverProcess.unref();

// Write PID file
fs.writeFileSync(path.join(process.cwd(), 'agent-terminal-server.pid'), serverProcess.pid.toString());

// Keep wrapper alive for 30 seconds to ensure server starts properly
setTimeout(() => {
  const closeMsg = `\n[${new Date().toISOString()}] Wrapper exiting, server should continue running with PID: ${serverProcess.pid}\n`;
  logStream.write(closeMsg);
  console.log(closeMsg);
  logStream.end();
  process.exit(0);
}, 30000);
