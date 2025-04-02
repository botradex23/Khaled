#!/bin/bash

# Run Load Tests Script
# This script provides a convenient way to run the load tests from the command line

# Define colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cryptocurrency Trading Platform Load Testing ===${NC}"
echo ""

# Create results directory if not exists
mkdir -p load_test/results

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js to run the load tests."
    exit 1
fi

# Check for the system environment
if [ -n "$REPLIT_ID" ]; then
    echo -e "${YELLOW}Running in Replit environment${NC}"
    
    # Adapt the tests for Replit
    echo -e "${YELLOW}Adapting tests for Replit environment...${NC}"
    cd load_test && node replit_adapter.js
    cd ..
fi

# Check if the application is running
echo -e "${YELLOW}Checking if the application is running...${NC}"
cd load_test && node system_check.js
SYSTEM_CHECK=$?
cd ..

if [ $SYSTEM_CHECK -ne 0 ]; then
    echo -e "${RED}System check failed. Please make sure the application is running.${NC}"
    exit 1
fi

# Show menu
while true; do
    echo ""
    echo "Select a test to run:"
    echo "1) General API Load Test"
    echo "2) Trade Execution Queue Stress Test"
    echo "3) ML Prediction Load Test"
    echo "4) Run All Tests"
    echo "5) Generate Charts"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            echo -e "${GREEN}Running General API Load Test...${NC}"
            cd load_test && node load_tester.js
            cd ..
            ;;
        2)
            echo -e "${GREEN}Running Trade Execution Queue Stress Test...${NC}"
            cd load_test && node queue_stress_test.js
            cd ..
            ;;
        3)
            echo -e "${GREEN}Running ML Prediction Load Test...${NC}"
            cd load_test && node ml_prediction_test.js
            cd ..
            ;;
        4)
            echo -e "${GREEN}Running All Tests...${NC}"
            cd load_test && node run_load_tests.js
            cd ..
            ;;
        5)
            echo -e "${GREEN}Generating Charts...${NC}"
            cd load_test && node generate_charts.js
            cd ..
            
            # Check if charts were created
            if [ -d "load_test/charts" ]; then
                echo -e "${GREEN}Charts generated successfully!${NC}"
                echo "Charts are available in the load_test/charts directory."
            else
                echo -e "${RED}Failed to generate charts.${NC}"
            fi
            ;;
        6)
            echo -e "${GREEN}Exiting...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            ;;
    esac
done