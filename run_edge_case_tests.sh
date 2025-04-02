#!/bin/bash

# Run Edge Case Tests
# This script runs the edge case testing framework

# Set up colorized output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}Cryptocurrency Trading Platform${NC}"
echo -e "${CYAN}Edge Case Testing Framework${NC}"
echo -e "${CYAN}=========================================${NC}"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required but not found.${NC}"
    exit 1
fi

# Check if required Python packages are installed
echo -e "${YELLOW}Checking dependencies...${NC}"
python3 -c "import colorama" 2>/dev/null || { 
    echo -e "${YELLOW}Installing required packages...${NC}"
    pip install colorama 
}

# Create results directory if it doesn't exist
mkdir -p tests/edge_cases/results

# Check for category parameter
CATEGORY=""
if [ "$1" = "--category" ] && [ -n "$2" ]; then
    CATEGORY="--category $2"
    echo -e "${YELLOW}Running tests for category: ${2}${NC}"
else
    echo -e "${YELLOW}Running all edge case tests${NC}"
fi

# Run the tests
echo -e "${YELLOW}Starting test execution...${NC}"
echo ""

python3 tests/edge_cases/run_edge_case_tests.py $CATEGORY

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Edge case tests completed successfully!${NC}"
else
    echo -e "\n${RED}Edge case tests failed. See results for details.${NC}"
fi

echo -e "\nResults saved to: ${CYAN}tests/edge_cases/results/${NC}"
echo -e "${CYAN}Log file: ${CYAN}tests/edge_cases/edge_case_tests.log${NC}"
echo -e "${CYAN}=========================================${NC}"