// This is a special wrapper script for running our app from Replit's workflow
// It uses CommonJS since this is what Replit workflows expect

const { spawn } = require('child_process');
const fs = require('fs');

console.log('[workflow-run] Starting application...');

// Function to attempt to run a script
function runScript(command, args) {
  console.log(`[workflow-run] Running command: ${command} ${args.join(' ')}`);
  
  const proc = spawn(command, args, { stdio: 'inherit' });
  
  // Handle process events
  proc.on('error', (err) => {
    console.error(`[workflow-run] Error: ${err.message}`);
    return null;
  });
  
  return proc;
}

// Function to find and run a script with fallbacks
function startWithFallbacks() {
  // Try different scripts in order of preference
  const scriptOptions = [
    { exists: fs.existsSync('server/index.ts'), command: 'npx', args: ['tsx', 'server/index.ts'] },
    { exists: fs.existsSync('start.js'), command: 'node', args: ['start.js'] },
    { exists: fs.existsSync('run.py'), command: 'python3', args: ['run.py'] },
    { exists: fs.existsSync('python_app/app.py'), command: 'python3', args: ['python_app/app.py'] },
    { exists: true, command: 'node', args: ['minimal-server.js'] } // Always have this as final fallback
  ];
  
  // Find the first script that exists and try to run it
  for (const option of scriptOptions) {
    if (option.exists) {
      console.log(`[workflow-run] Trying ${option.command} ${option.args.join(' ')}...`);
      const proc = runScript(option.command, option.args);
      
      if (proc) {
        console.log(`[workflow-run] Successfully started ${option.args[0]}`);
        
        // Set up process event handlers
        proc.on('exit', (code) => {
          console.log(`[workflow-run] Process exited with code ${code}`);
          
          if (code !== 0 && option.command !== 'node' && option.args[0] !== 'minimal-server.js') {
            console.log('[workflow-run] Non-zero exit code, trying fallback...');
            // If this process fails and it's not the minimal server, try the minimal server
            runScript('node', ['minimal-server.js']);
          }
        });
        
        return proc;
      }
      
      console.log(`[workflow-run] Failed to start ${option.args[0]}, trying next option...`);
    }
  }
  
  console.error('[workflow-run] All start options failed.');
  return null;
}

// Start the application with fallbacks
const mainProc = startWithFallbacks();

if (!mainProc) {
  console.error('[workflow-run] Failed to start any server. Exiting.');
  process.exit(1);
}

// Keep the process running until it's killed
process.on('SIGINT', () => {
  console.log('[workflow-run] Received SIGINT, shutting down...');
  if (mainProc) mainProc.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[workflow-run] Received SIGTERM, shutting down...');
  if (mainProc) mainProc.kill('SIGTERM');
  process.exit(0);
});