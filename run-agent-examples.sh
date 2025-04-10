#!/bin/bash

# Run Agent Client Examples
# This script provides a simple way to run the Agent Client examples
# that demonstrate bypassing the Vite middleware

echo "====================================="
echo "Tradeliy Agent Client Examples Runner"
echo "====================================="
echo ""

# Ensure environment variables are loaded
if [ -f .env ]; then
    echo "Loading environment variables from .env"
    export $(grep -v '^#' .env | xargs)
else
    echo "No .env file found. Make sure OPENAI_API_KEY is set in your environment."
fi

# Check for OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "ERROR: OPENAI_API_KEY environment variable is not set."
    echo "Please create a .env file with your OpenAI API key or set it in your environment."
    exit 1
fi

echo "OpenAI API key is set. Continuing..."
echo ""

# Function to run an example
run_example() {
    local example=$1
    local description=$2
    
    echo "-----------------------------------"
    echo "Running: $description"
    echo "-----------------------------------"
    echo ""
    
    npx tsx "src/$example.ts"
    
    echo ""
    echo "Example completed."
    echo ""
}

# Menu function
show_menu() {
    echo "Available Examples:"
    echo "1) Basic Agent Client Example"
    echo "2) Run Agent Example"
    echo "3) Complete Agent Client Example (comprehensive)"
    echo "4) Start Standalone API Server"
    echo "5) Run All Examples"
    echo "6) Exit"
    echo ""
    read -p "Select an option [1-6]: " option
    
    case $option in
        1)
            run_example "agent-client-example" "Basic Agent Client Example"
            show_menu
            ;;
        2)
            run_example "run-agent-example" "Run Agent Example"
            show_menu
            ;;
        3)
            run_example "agent-client-complete-example" "Complete Agent Client Example"
            show_menu
            ;;
        4)
            echo "Starting Standalone API Server..."
            ./start-agent-server.sh
            echo "Server is now running in the background on port 3099."
            echo "Use 'kill $(cat agent-standalone-api.pid)' to stop it."
            show_menu
            ;;
        5)
            echo "Running all examples sequentially..."
            run_example "agent-client-example" "Basic Agent Client Example"
            run_example "run-agent-example" "Run Agent Example"
            run_example "agent-client-complete-example" "Complete Agent Client Example"
            echo "All examples completed successfully!"
            show_menu
            ;;
        6)
            echo "Exiting. Thank you for exploring the Agent Client examples!"
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            show_menu
            ;;
    esac
}

# Show the menu
show_menu