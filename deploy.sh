#!/bin/bash
# Tradeliy Deployment Script for Hetzner VPS
# This script helps prepare your application for deployment

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Tradeliy Deployment Preparation ===${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm 8 or higher.${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.10 or higher.${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites check passed.${NC}"
echo ""

# Step 2: Create backup
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_FILE="tradeliy_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf $BACKUP_FILE --exclude="node_modules" --exclude=".git" .
echo -e "${GREEN}Backup created as $BACKUP_FILE${NC}"
echo ""

# Step 3: Check environment file
echo -e "${YELLOW}Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}No .env file found.${NC}"
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env with your production settings.${NC}"
    else
        echo -e "${RED}No .env.example file found either. Please create an .env file manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}.env file exists.${NC}"
fi
echo ""

# Step 4: Run the deployment configuration utility
echo -e "${YELLOW}Would you like to run the deployment configuration utility? (y/n)${NC}"
read run_config

if [[ $run_config == "y" || $run_config == "Y" ]]; then
    echo -e "${YELLOW}Running deployment configuration utility...${NC}"
    node deploy-config.js
    echo -e "${GREEN}Configuration completed.${NC}"
else
    echo -e "${YELLOW}Skipping configuration utility.${NC}"
    echo -e "${YELLOW}Please ensure your .env file has the correct production settings.${NC}"
fi
echo ""

# Step 5: Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}Dependencies installed.${NC}"
echo ""

# Step 6: Build the application
echo -e "${YELLOW}Building the application...${NC}"
npm run build
echo -e "${GREEN}Build completed.${NC}"
echo ""

# Step 7: Create ecosystem.config.cjs file for pm2
echo -e "${YELLOW}Creating PM2 ecosystem config file...${NC}"
cat > ecosystem.config.cjs << EOL
module.exports = {
  apps: [
    {
      name: 'tradeliy-server',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'tradeliy-ml-api',
      script: 'python_app/run_flask_service.py',
      interpreter: 'python3',
      env: {
        PORT: 5001
      },
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
EOL
echo -e "${GREEN}PM2 ecosystem config created.${NC}"
echo ""

# Step 8: Completion
echo -e "${GREEN}=== Deployment Preparation Complete ===${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy the application files to your server"
echo "2. Install PM2 globally on the server: npm install -g pm2"
echo "3. Start the application with PM2: pm2 start ecosystem.config.cjs"
echo "4. Save the PM2 process list: pm2 save"
echo "5. Configure PM2 to start on boot: pm2 startup"
echo ""
echo -e "${YELLOW}Refer to DEPLOYMENT_GUIDE.md for more detailed instructions.${NC}"