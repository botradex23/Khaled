# Agent Deployment Guide

This guide provides instructions for deploying the AI Agent component to an external VPS (Virtual Private Server). The agent is designed to operate independently from the main application and requires specific setup steps for proper operation in a production environment.

## Prerequisites

Before deploying the agent, ensure you have:

1. A VPS with:
   - Node.js 18+ installed
   - Sufficient disk space (~500MB minimum)
   - At least 1GB RAM
   - SSH access

2. Required API keys:
   - OpenAI API key with GPT-4 access

## Deployment Steps

### 1. Set Up Your VPS

Ensure your VPS has Node.js installed:

```bash
# Update package lists
sudo apt-get update

# Install Node.js and npm
sudo apt-get install -y nodejs npm

# Verify installation
node --version  # Should show v18.x or higher
npm --version   # Should show 8.x or higher
```

### 2. Copy Files to VPS

Copy these essential agent files to your VPS:

```
agent-file-utils.js
enhanced-agent-server.js
run-enhanced-agent.js
start-agent.sh
stop-agent.sh
.env (with your API keys)
```

You can use SCP, SFTP, or rsync to copy the files:

```bash
# Example using scp - run this from your local machine
scp agent-file-utils.js enhanced-agent-server.js run-enhanced-agent.js start-agent.sh stop-agent.sh .env user@your-vps-ip:~/tradeliy-agent/
```

### 3. Configure Environment Variables

Create or update the .env file on your VPS:

```
OPENAI_API_KEY=your_openai_api_key
AGENT_PORT=5002  # Port for the agent server (adjust if needed)
```

### 4. Start the Agent Server

```bash
# Navigate to your project directory
cd ~/tradeliy-agent

# Make scripts executable (if not already)
chmod +x start-agent.sh stop-agent.sh

# Start the agent server
./start-agent.sh
```

The script will:
- Start the agent in the background
- Create a PID file to track the process
- Set up logging in the logs directory

You should see confirmation that the agent has started.

### 5. Verify Agent Operation

Check if the agent is running:

```bash
# Check the process
ps aux | grep enhanced-agent

# Check the latest log
tail -f logs/agent-*.log

# Test the API endpoint
curl http://localhost:5002/health
```

You should receive a JSON response with status "ok" and a timestamp.

### 6. Stop the Agent

To stop the agent server:

```bash
./stop-agent.sh
```

## Authentication & Security

The agent server uses a simple authentication mechanism for admin operations:

- For Replit development environment: Include `X-Test-Admin: true` header in API requests
- For production: Implement a proper authentication system by modifying the `isAdminAuthenticated` function in enhanced-agent-server.js

## Troubleshooting

### Agent server not starting

Check logs in the logs directory:

```bash
tail -f logs/agent-*.log
```

Common issues:
- Missing OpenAI API key
- Port already in use
- Node.js version incompatibility

### OpenAI API Key not working

Verify your API key is valid:

```bash
curl http://localhost:5002/verify-openai-key
```

## Automatic Startup on Server Reboot

To ensure the agent starts automatically when your VPS reboots, add it to crontab:

```bash
# Open crontab in edit mode
crontab -e

# Add this line (adjust the path to your installation directory)
@reboot cd ~/tradeliy-agent && ./start-agent.sh
```

## API Endpoints

The agent server provides these endpoints:

- **GET /health**: Check server status
- **GET /verify-openai-key**: Verify OpenAI API key is working
- **POST /chat**: Send a prompt to the AI and get a response
- **POST /files**: List files in a directory
- **POST /read-file**: Read a file's contents
- **POST /write-file**: Write content to a file
- **POST /append-file**: Append content to a file
- **POST /delete-file**: Delete a file
- **POST /ensure-directory**: Create directory if it doesn't exist
- **POST /file-exists**: Check if a file exists

All POST endpoints require authentication.

## File Structure

- **enhanced-agent-server.js**: Main server implementation
- **agent-file-utils.js**: File system utilities
- **run-enhanced-agent.js**: Process management and logging
- **start-agent.sh**: Shell script to start agent as background process
- **stop-agent.sh**: Shell script to safely stop the agent

## Monitoring and Maintenance

Check server logs periodically:

```bash
# Check recent log entries
tail -n 100 logs/agent-*.log

# Monitor logs in real-time
tail -f logs/agent-*.log
```

Consider setting up a monitoring system like PM2:

```bash
# Install PM2
npm install -g pm2

# Start the agent with PM2
pm2 start run-enhanced-agent.js --name "tradeliy-agent"

# Set up PM2 to start on boot
pm2 startup
pm2 save
```

## Notes for Production

1. For a production environment, update the authentication mechanism with a secure implementation
2. Consider setting up HTTPS for encrypted connections
3. Implement rate limiting to prevent abuse
4. Regularly backup agent files and logs