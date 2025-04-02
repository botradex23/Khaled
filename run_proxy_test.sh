#!/bin/bash

# Run the multiple proxy tester
echo "Starting multiple proxy testing script..."
python test_multiple_proxies.py

# Check if the script succeeded
if [ $? -eq 0 ]; then
  echo "Proxy test completed successfully!"
  
  # Restart the application
  echo "Restarting the application to apply proxy changes..."
  npm run dev &
else
  echo "Proxy test failed. Please check the logs for details."
fi