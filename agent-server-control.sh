#!/bin/bash

# Agent Server Control Script
# This script helps to start, stop, restart, and check status of the agent server

# Configuration
AGENT_SERVER_FILE="agent-terminal-server.js"
AGENT_SERVER_PORT=5021  # Using a higher port to avoid conflicts with other services
AGENT_SERVER_LOG="logs/agent-server.log"
AGENT_SERVER_PID="agent-terminal-server.pid"

# Export port as environment variable for the Node.js script
export AGENT_PORT=$AGENT_SERVER_PORT

# Make sure logs directory exists
mkdir -p logs

# Function to check if the agent server is running
is_running() {
  pid=$(ps aux | grep "node.*$AGENT_SERVER_FILE" | grep -v grep | awk '{print $2}' | head -n 1)
  if [ -n "$pid" ]; then
    # Found a running process
    if [ -f "$AGENT_SERVER_PID" ]; then
      saved_pid=$(cat "$AGENT_SERVER_PID")
      if [ "$pid" != "$saved_pid" ]; then
        # Update PID file with the correct PID
        echo "⚠️ Updating PID file with correct PID: $pid (was: $saved_pid)" >&2
        echo $pid > "$AGENT_SERVER_PID"
      fi
    else
      # Create PID file if it doesn't exist
      echo "⚠️ Creating PID file for running process: $pid" >&2
      echo $pid > "$AGENT_SERVER_PID"
    fi
    return 0  # Running
  else
    # No running process found
    if [ -f "$AGENT_SERVER_PID" ]; then
      echo "⚠️ Found stale PID file. Removing it." >&2
      rm -f "$AGENT_SERVER_PID"
    fi
    return 1  # Not running
  fi
}

# Function to start the agent server
start() {
  if is_running; then
    echo "🔄 Agent server is already running with PID: $(cat $AGENT_SERVER_PID)"
    return 1
  fi
  
  echo "🚀 Starting agent server on port $AGENT_SERVER_PORT..."
  
  # Try using PM2 if available (preferred method for production)
  if command -v pm2 &> /dev/null; then
    # Make sure to export environment variables to PM2
    AGENT_PORT=$AGENT_SERVER_PORT pm2 start $AGENT_SERVER_FILE --name agent-server
    pm2 save
    pm2 list | grep agent-server
    pid=$(pm2 jlist | grep -o '"pid":[0-9]*' | grep -o '[0-9]*' | head -n 1)
    if [ -n "$pid" ]; then
      echo $pid > "$AGENT_SERVER_PID"
      echo "✅ Agent server started with PM2, PID: $pid"
    else
      echo "⚠️ PM2 start failed, falling back to direct node execution"
    fi
  fi
  
  # If PM2 isn't available or failed, use direct node execution
  if ! is_running; then
    # Start with Node.js
    NODE_RUNNING=$(/usr/bin/env node -e "console.log('NODE OK')" 2>/dev/null)
    if [ "$NODE_RUNNING" = "NODE OK" ]; then
      # Create a wrapper script to ensure proper error handling and logging
      WRAPPER_SCRIPT="logs/agent-server-wrapper.js"
      cat > "$WRAPPER_SCRIPT" << 'WRAPPER'
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
WRAPPER

      # Start the wrapper script which will manage the server process
      node "$WRAPPER_SCRIPT" "$AGENT_SERVER_FILE" "$AGENT_SERVER_LOG" > /dev/null 2>&1 &
      
      # Give it a moment to start
      sleep 3
      
      if is_running; then
        echo "✅ Agent server started with PID: $(cat $AGENT_SERVER_PID)"
        echo "📝 Logs are being written to $AGENT_SERVER_LOG"
      else
        echo "❌ Failed to start agent server"
        return 1
      fi
    else
      echo "❌ Node.js is not available or not working properly"
      return 1
    fi
  fi
  
  return 0
}

# Function to stop the agent server
stop() {
  if ! is_running; then
    echo "❌ Agent server is not running"
    return 1
  fi
  
  pid=$(cat "$AGENT_SERVER_PID")
  echo "🛑 Stopping agent server with PID: $pid..."
  
  # Try using PM2 first if available
  if command -v pm2 &> /dev/null && pm2 list | grep -q agent-server; then
    pm2 stop agent-server
    pm2 delete agent-server
    pm2 save
    echo "✅ Agent server stopped via PM2"
  else
    # Otherwise kill the process
    kill $pid
    
    # Wait for process to stop
    count=0
    while ps -p $pid > /dev/null 2>&1; do
      if [ $count -gt 10 ]; then
        echo "⚠️ Force killing agent server process..."
        kill -9 $pid
        break
      fi
      count=$((count + 1))
      sleep 1
    done
    
    echo "✅ Agent server stopped"
  fi
  
  rm -f $AGENT_SERVER_PID
  return 0
}

# Function to restart the agent server
restart() {
  echo "🔄 Restarting agent server..."
  stop
  sleep 2
  start
  return 0
}

# Function to check the status of the agent server
status() {
  if is_running; then
    pid=$(cat "$AGENT_SERVER_PID")
    echo "✅ Agent server is running with PID: $pid"
    echo "📝 Log file: $AGENT_SERVER_LOG"
    
    # Check if the server is responding
    if command -v curl &> /dev/null; then
      response=$(curl -s http://localhost:$AGENT_SERVER_PORT/health 2>&1)
      if [ $? -eq 0 ] && [ -n "$response" ]; then
        echo "🌐 Server health endpoint is responding: $response"
      else
        echo "⚠️ Server health endpoint is not responding"
      fi
    else
      echo "⚠️ curl is not installed, cannot check server health endpoint"
    fi
    
    # Also show the process details
    echo "📊 Process details:"
    ps -p $pid -o pid,ppid,cmd,etime,rss
  else
    echo "❌ Agent server is not running"
  fi
  return 0
}

# Main logic
case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

exit 0
