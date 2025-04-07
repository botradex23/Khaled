#!/bin/bash

# Build and deployment script for Tradeliy on Replit

echo "Starting build process for Tradeliy..."

# Build frontend and backend
echo "Building frontend with Vite and backend with ESBuild..."
npm run build

echo "Build complete!"

# Change permission for execution
chmod +x start.sh
chmod +x deploy.sh

echo "Created executable scripts"
echo "To deploy, run ./deploy.sh"