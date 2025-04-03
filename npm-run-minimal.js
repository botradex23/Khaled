// ESM version of minimal server startup
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Config
const projectRoot = process.cwd();
console.log('Working directory:', projectRoot);

// Minimal server path
const minimalServerPath = join(projectRoot, 'minimal_server.cjs');
console.log('Using minimal server at:', minimalServerPath);

// Check if minimal_server.cjs exists
if (!existsSync(minimalServerPath)) {
  console.error(`Error: minimal_server.cjs not found at ${minimalServerPath}`);
  process.exit(1);
}

console.log('Starting minimal cryptocurrency trading platform...');

// Run minimal_server.cjs using spawn
const serverProcess = spawn('node', [minimalServerPath], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: process.env.PORT || '5000',
    HOST: '0.0.0.0' // Ensure it's accessible from Replit
  },
  stdio: 'inherit' // This passes stdio/stderr to the parent process
});

// Handle process exit
serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle errors
serverProcess.on('error', (err) => {
  console.error('Failed to start server process:', err);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  serverProcess.kill('SIGINT');
});

console.log('Server startup script is running...');