#!/bin/bash

# Start Enhanced Agent Script
# This script starts the enhanced agent terminal server with the autonomous capabilities

# Check if the server is already running
if [ -f "agent-terminal-server.pid" ]; then
  echo "Agent Terminal Server is already running with PID $(cat agent-terminal-server.pid)"
  echo "To restart, run: ./stop-agent-server.js && ./start-enhanced-agent.sh"
  exit 1
fi

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
  # Try to load from .env file
  if [ -f ".env" ]; then
    export $(grep -v '^#' .env | grep OPENAI_API_KEY | xargs)
  fi
  
  # Check again after trying to load from .env
  if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️ OPENAI_API_KEY environment variable is not set!"
    echo "The agent server will start, but OpenAI-related features won't work."
    echo "Please set the OPENAI_API_KEY in your .env file or environment."
  fi
fi

# Start the server
echo "🤖 Starting Enhanced Agent Terminal Server..."
node agent-terminal-server.js > agent-terminal.log 2>&1 &

# Save the process ID
echo $! > agent-terminal-server.pid

echo "✅ Enhanced Agent Terminal Server started with PID $!"
echo "📄 Logs are being written to agent-terminal.log"
echo ""
echo "🔍 Available endpoints:"
echo "  GET  /health - Check if server is running"
echo "  POST /agent-task - Execute an agent task with full workspace access"
echo "  POST /agent-file-operation - Perform file operations with agent assistance"
echo "    - readFile: Read a file with agent assistance"
echo "    - writeFile: Write content to a file"
echo "    - generateAndWrite: Generate new file content based on requirements"
echo "    - modifyFile: Intelligently modify an existing file based on instructions"
echo "    - analyzeAndFix: Find and fix bugs, issues or improvements in a file"
echo ""
echo "🌐 Server running at: http://localhost:5002"
echo "📚 For more details, see AGENT_README.md and OPENAI_AGENT_CAPABILITIES.md"

# Make the script executable
chmod +x start-enhanced-agent.sh