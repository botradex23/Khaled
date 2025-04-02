#!/bin/bash

# Setup script for the load testing environment
# This script creates the necessary directory structure and ensures permissions are correct

# Define colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Setting up Load Testing Environment ===${NC}"

# Create base directories
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p load_test/results
mkdir -p load_test/charts
mkdir -p load_test/results/api
mkdir -p load_test/results/queue
mkdir -p load_test/results/ml
mkdir -p load_test/logs

# Create results subdirectories for different test types
echo -e "${YELLOW}Creating results subdirectories...${NC}"
mkdir -p load_test/results/api/raw
mkdir -p load_test/results/api/processed
mkdir -p load_test/results/queue/raw
mkdir -p load_test/results/queue/processed
mkdir -p load_test/results/ml/raw
mkdir -p load_test/results/ml/processed

# Create sample results files to ensure proper structure
echo -e "${YELLOW}Creating sample results files...${NC}"
echo '{"test": "api", "status": "pending"}' > load_test/results/api/test_structure.json
echo '{"test": "queue", "status": "pending"}' > load_test/results/queue/test_structure.json
echo '{"test": "ml", "status": "pending"}' > load_test/results/ml/test_structure.json

# Set permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chmod -R 755 load_test/
chmod -R 777 load_test/results/
chmod -R 777 load_test/charts/
chmod -R 777 load_test/logs/

# Create .gitkeep files to preserve directory structure in git
echo -e "${YELLOW}Creating .gitkeep files...${NC}"
touch load_test/results/.gitkeep
touch load_test/charts/.gitkeep
touch load_test/logs/.gitkeep
touch load_test/results/api/raw/.gitkeep
touch load_test/results/api/processed/.gitkeep
touch load_test/results/queue/raw/.gitkeep
touch load_test/results/queue/processed/.gitkeep
touch load_test/results/ml/raw/.gitkeep
touch load_test/results/ml/processed/.gitkeep

echo -e "${GREEN}Load Testing Environment setup complete!${NC}"
echo ""
echo -e "Directory structure:"
echo -e "  load_test/"
echo -e "  ├── results/      - For test results data"
echo -e "  │   ├── api/      - API test results"
echo -e "  │   ├── queue/    - Queue test results"
echo -e "  │   └── ml/       - ML test results"
echo -e "  ├── charts/       - Generated charts and visualizations"
echo -e "  └── logs/         - Test run logs"
echo ""
echo -e "To run load tests, use: ${YELLOW}./run_load_tests.sh${NC}"