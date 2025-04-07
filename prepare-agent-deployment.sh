#!/bin/bash
#
# Prepare Agent Deployment Package
# 
# This script creates a deployment package with all the files needed for the agent
# to run on an external VPS.
#

# Create deployment directory if it doesn't exist
DEPLOY_DIR="agent-deployment"
mkdir -p "$DEPLOY_DIR"
echo "Created deployment directory: $DEPLOY_DIR"

# Copy agent files
cp agent-file-utils.js enhanced-agent-server.js run-enhanced-agent.js "$DEPLOY_DIR/"
cp start-agent.sh stop-agent.sh "$DEPLOY_DIR/"
cp AGENT_DEPLOYMENT.md "$DEPLOY_DIR/README.md"

# Create a sample .env file (without sensitive data)
cat > "$DEPLOY_DIR/.env.sample" << 'ENVFILE'
# Tradeliy Agent Configuration
# Replace the values below with your actual API keys

# OpenAI API Key (Required)
OPENAI_API_KEY=your_openai_api_key_here

# Agent server port (Optional, defaults to 5002)
AGENT_PORT=5002
ENVFILE

echo "Created .env.sample file"

# Create deployment package
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ZIP_FILE="agent-deployment-$TIMESTAMP.zip"
zip -r "$ZIP_FILE" "$DEPLOY_DIR"

echo "Created deployment package: $ZIP_FILE"
echo "This package contains all the files needed to run the agent on a VPS."
echo "Please follow the instructions in the README.md file inside the package."

# Clean up deployment directory
rm -rf "$DEPLOY_DIR"
echo "Cleaned up temporary deployment directory"
