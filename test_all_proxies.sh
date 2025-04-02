#!/bin/bash

# Test Binance proxies with both JavaScript and Python tools
# This script attempts to find a working proxy configuration for Binance API connections

echo "===== Binance Proxy Test Tool ====="
echo "This tool will test available proxies for Binance API connections."
echo "--------------------------------------"

# 1. First run the JavaScript test
echo -e "\n[1/3] Running JavaScript proxy test..."
node check_proxy.js

# 2. Then run the Python multi-proxy test
echo -e "\n[2/3] Running Python multi-proxy test..."
python test_multiple_proxies.py

# 3. Finally, run the enhanced proxy connection fix
echo -e "\n[3/3] Running enhanced proxy connection fix..."
python fix_proxy_connection.py

# Check if the tests were successful
if [ $? -eq 0 ]; then
  echo -e "\n✅ Proxy testing completed successfully!"
  echo "A working proxy configuration has been configured in your .env file."
  echo "The Binance services will use this proxy for API connections."
  
  # Ask user if they want to restart the application
  read -p "Do you want to restart the application to apply changes? (y/n): " restart
  if [[ $restart == "y" || $restart == "Y" ]]; then
    echo "Restarting the application..."
    npm run dev
  else
    echo "Please restart the application manually when ready."
  fi
else
  echo -e "\n❌ Proxy testing completed with issues."
  echo "Please check the logs above for details."
  echo "You may need to configure the proxy settings manually in the .env file."
fi